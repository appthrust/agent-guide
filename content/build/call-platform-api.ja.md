---
title: "アプリから Platform API を呼ぶ"
summary: "アプリは、サインイン中のユーザーとして Platform API を呼びます。audience を要求し、サーバーからベアラートークンを転送し、エラーと変更操作を正しく扱います。"
audience: "developer"
section: "build"
order: 40
tags: ["platform-api", "bearer", "audience", "idempotency"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/publish.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/handler/publish_access.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/auth/oidc_keycloak.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/apierror/apierror.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "appthrust-operator/pkg/controllers/platformservice/oidcclient_controller.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "pkg/installation/render/surface.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/api-schema/openapi.platform-api.json", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# アプリから Platform API を呼ぶ

機能が Project `{{.ProjectID}}` のリソースを読み書きする必要があるときに使います。インストール済みのアプリを一覧する、呼び出し元の Project でのロールを表示する、人を検索する、ユーザーに代わって Project の操作を始める、といった場合です。

ユーザーに**アプリの中で**何を許すかを決めるだけなら、代わりに[アプリのパーミッション]({{.PublicURL}}/md/build/app-permissions.md)を使ってください。そちらは Platform API 用の audience を必要としません。

## 誰の権限で呼ぶか

アプリ自身の身元はありません。アプリはサインイン中のユーザーのベアラートークンを転送し、Platform API はそのユーザーの Project でのロールでリクエストを認可します。したがって次のとおりです。

- アプリにできるのは、そのユーザーが `apth` でできることと同じです。破壊的な操作も含みます。ユーザーにない権限をアプリが得ることはありません。
- この Project でロールを持たないユーザーは、Project のルートで `403` を受け取ります。障害ではなく、通常の応答として扱ってください。
- バックグラウンドジョブは Platform API を呼べません。そこにユーザーがいないからです。あとで使うためにベアラートークンを保存したり、回避のためにクライアントやキーを作ったりしないでください。

## 1. Platform API 用の audience を要求する

Platform API がユーザートークンを受け付けるのは、audience `appthrust-platform-api` が付いているときだけです。エッジが転送するトークンには、既定では付いていません。

| アプリの種類 | audience の要求方法 |
| --- | --- |
| Marketplace アプリ | 定義の `spec.access.audiences: [appthrust-platform-api]` |
| 自分の Application | 公開のアクセス設定。下のとおり |

```bash
apth publishes access get {{.ProjectID}} "$PUBLISH"
apth publishes access set {{.ProjectID}} "$PUBLISH" --mode Authenticated --audience appthrust-platform-api
apth publishes access get {{.ProjectID}} "$PUBLISH"
```

`set` は認証の設定を置き換えるため、残したいフラグはすべて指定し直してください。発行者が許可するのは、自分が列挙している audience だけです。拒否された場合（`AudienceNotAllowed`）、アクセス設定は型付きの理由とともに `pending` のままになります。変更が効いたと決めつけず、設定を読み直してください。

**これは実質的な信頼の付与です。** 以後、サインインしたすべてのユーザーが、Platform API がそのユーザーの全権限で受け付けるトークンを、あなたのサーバーに渡すことになります。audience は機能に必要なときだけ要求し、ベアラートークンが通る経路をすべて見直してください。

## 2. サーバーから呼ぶ

処理中のリクエストの `Authorization` ヘッダーを、そのまま `PLATFORM_API_URL` に対して使います。

```ts
// Server code only. Never run this in the browser.
const base = process.env.PLATFORM_API_URL
const project = process.env.PLATFORM_PROJECT_ID

export async function projectAccess(request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization) return new Response(null, { status: 401 })
  const response = await fetch(`${base}/api/v1/projects/${project}/access`, {
    headers: { authorization },
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  })
  if (response.status === 401 || response.status === 403) return new Response(null, { status: response.status })
  if (!response.ok) return new Response(null, { status: 503 })
  return Response.json(await response.json(), { headers: { 'Cache-Control': 'no-store' } })
}
```

- ベアラートークンを送る先は `PLATFORM_API_URL` だけです。リダイレクトは拒否し、リダイレクトによってトークンがほかへ運ばれないようにします。
- タイムアウトを設定します。プラットフォームが遅いときに、リクエストハンドラーを止めてはいけません。
- ブラウザから Platform API への汎用的な中継を公開しないでください。機能に必要な操作だけを個別に提供し、その入力を検証します。
- レスポンスをユーザー間で共有してはいけません。キャッシュする場合は、発行者とサブジェクトをキーにして、短い時間にとどめます。
- 毎回、現在のリクエストのヘッダーを使います。トークンの有効期間は短く、エッジが更新します。手元に残したコピーは期限切れになります。

Go では、`github.com/appthrust/appserver-go/appserver/platformclient` が、下の読み取りモデルを同じルールで扱います。

## アプリがよく使うルート

| ルート | 返すもの |
| --- | --- |
| `GET /api/v1/auth/whoami` | Platform API から見た呼び出し元 |
| `GET /api/v1/projects/{id}/access` | Project における呼び出し元の立場: `member`、`roles`、`actions`、`platformRoles` |
| `GET /api/v1/projects/{id}` | Project の表示用の情報 |
| `GET /api/v1/projects/{projectId}/app-installations` | インストール済みの Marketplace アプリと、その URL やリンク |
| `GET /api/v1/application-stack-definitions` | カタログ。ランチャー向け |
| `GET /api/v1/identity/search?q=...` | 呼び出し元が検索を許可されている人 |

`apth` が管理する Project のリソースには、どれも `/api/v1/projects/{projectId}/...` の下にルートがあります。グループの一覧は [apth の範囲]({{.PublicURL}}/md/apth/scope.md)にあります。Platform API は OpenAPI ドキュメントを配信していません。リクエストやレスポンスの形が必要なときは、対応する `apth` コマンドを `--json` 付きで実行し、入力は `apth <group> --help` で確認してください。ルートやフィールドを推測しないでください。

access ルートの `roles` は Project のロールです。答えているのは「このユーザーは Project を操作してよいか」で、「このユーザーは私のアプリで何をしてよいか」ではありません。アプリのパーミッションとして使わないでください。

## エラー

2xx 以外のレスポンスは、すべて同じ形です。

```json
{ "error": { "code": "forbidden", "message": "...", "details": {} } }
```

| ステータス | `code` | アプリがすべきこと |
| --- | --- | --- |
| 400 | `invalid_argument` | リクエストを直す。同じ内容で再試行しない |
| 401 | `unauthenticated` | 401 を返す。ユーザーはサインインし直す必要がある |
| 403 | `forbidden` | 403 を返す。ユーザーの Project でのロールでは許可されない |
| 404 | `not_found` | 存在しないものとして扱う。呼び出し元に見る権限がないリソースの場合もある |
| 409 | `conflict`、`failed_precondition`、`idempotency_conflict` | 理由を読む。`delivery_pending` は一時的。`delivery_blocked` は運用者の対応が必要 |
| 429 | `resource_exhausted` | `Retry-After` の時間だけ待つ |
| 5xx | `internal`、`service_unavailable` | 503 を返す。既定値で代用しない |

分岐には `code` と型付きの `details` を使い、人向けの `message` は使いません。配送に関する理由は[トラブルシューティング]({{.PublicURL}}/md/apth/troubleshooting.md)を参照してください。

## 変更操作

- `Idempotency-Key` ヘッダーを送ります。ユーザーの 1 つの操作につきシークレットでないキーを 1 つ用意し、その操作を再試行するときは同じキーを使います。このヘッダーがない変更を拒否するルートもあります。
- 受け付けられた変更は、完了した変更ではありません。レスポンスはリソースと operation を返し、`pendingSync` のようなフィールドは収束がまだ進行中であることを示します。完了したとユーザーに伝える前に、リソースを読み直してください。
- 再試行するのは、一時的と型で示されたものだけにして、回数に上限を設けます。別の 409 は最終的な拒否のことがあります。
- 破壊的な操作には、UI でのユーザーの明示的な操作が必要です。アプリが副作用として Project のリソースを削除してはいけません。

## 確かめる

公開された URL に、Project のメンバーと、この Project でロールを持たないユーザーで、それぞれ新しいセッションからサインインします。前者では機能が動き、後者には「アクセスなし」の状態がはっきり表示される必要があります。そのあとサーバーのログを見て、ベアラートークン、キー、データベースの URL が書き出されていないことを確かめます。

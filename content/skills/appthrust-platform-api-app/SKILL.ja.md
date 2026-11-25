---
name: "appthrust-platform-api-app"
description: "この Project のアプリの中から AppThrust プラットフォームを使う機能を作る際に使用します。サインインの必須化、ユーザーの識別、アプリのロールとパーミッションによる認可、サインイン中のユーザーとしての Platform API 呼び出しを扱います。自分の Application と Marketplace アプリの両方が対象です。apth で Project を操作する作業には使いません。"
title: "AppThrust Platform API アプリ開発"
summary: "この Project のアプリの中から AppThrust プラットフォームを使う機能を作る際に使用します。サインインの必須化、ユーザーの識別、アプリのロールとパーミッションによる認可、サインイン中のユーザーとしての Platform API 呼び出しを扱います。自分の Application と Marketplace アプリの両方が対象です。apth で Project を操作する作業には使いません。"
audience: "developer"
section: "build"
order: 100
tags: ["skill", "platform-api", "authorization", "apps"]
sources:
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/app-authorization.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/app-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/component_connections.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/publish.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# AppThrust Platform API アプリ開発

タスクが、プラットフォームに依存する**アプリの中のコード**であるときに使います。誰が呼んでいるか、その人に何を許すか、アプリが表示や変更をする Project のデータ、が対象です。アプリ自体の作成、デプロイ、デバッグには、先に[アプリ開発スキル]({{.PublicURL}}/skills/appthrust-app-dev/SKILL.md)を使ってください。

## 環境と安全

- Platform API: `{{.PlatformAPIURL}}`
- Project: `{{.ProjectID}}`
- ガイド: `{{.PublicURL}}`

アプリは、Platform API に対して自分の身元を持ちません。呼び出しはすべて、サインイン中のユーザーのベアラートークンを使い、そのユーザーの権限で実行されます。アプリに独自のアクセスを持たせるために、クライアント、キー、保存したトークンを作らないでください。

ベアラートークン、キー、データベースの URL を、ブラウザ、ソース、ログ、チャットに出さないでください。`$APP`、`$COMPONENT`、`$PUBLISH` は、タスクと取得した一覧から決めます。稼働中のアプリに到達できる人の変更、Platform API 用の audience の要求、アクセスモデルの変更には、どれもタスクとしての権限が必要です。このガイドのアクセスキーは、そのどれも与えません。

## 0. 機能を分類する

| 機能に必要なもの | 行うこと | 詳細 |
| --- | --- | --- |
| サインイン済みのユーザーだけ | 手順 1 と 2 | [platform 接続]({{.PublicURL}}/md/build/platform-connection.md) |
| ユーザーごとに許す操作を変える | 手順 1〜4 | [アプリのパーミッション]({{.PublicURL}}/md/build/app-permissions.md) |
| ユーザーとして Project のデータを読む、または Project を操作する | 手順 1、2、5 | [Platform API を呼ぶ]({{.PublicURL}}/md/build/call-platform-api.md) |
| 同じアプリをどの Project にもインストールできるようにする | 止まって読む | [Marketplace アプリ]({{.PublicURL}}/md/build/marketplace-app.md)。公開にはカタログの権限が必要 |

タスクを満たす最小の行を選んでください。アプリのパーミッションに Platform API 用の audience は不要です。そのために要求しないでください。

## 1. この環境が対応していることを確かめる

```bash
apth whoami
apth component-connections create --help
curl -sS -o /dev/null -w '%{http_code}\n' -X POST '{{.PlatformAPIURL}}/api/v1/access/user-token'
```

ヘルプには `--destination-platform` が載っている必要があります。認証なしの確認は `401` を返す必要があります。`404` なら、このプラットフォームのリリースにはユーザートークンの交換がありません。契約が欠けているときは運用者に報告し、別の仕組みで代用しないでください。

## 2. アプリをプラットフォームに接続する

```bash
apth apps get "$APP"
apth components list {{.ProjectID}}
apth component-connections create {{.ProjectID}} "$COMPONENT" --destination-platform --name platform
apth publishes list {{.ProjectID}}
apth publishes access get {{.ProjectID}} "$PUBLISH"
apth publishes access set {{.ProjectID}} "$PUBLISH" --mode Authenticated
apth apps env get "$APP"
```

- `publishes access set` は認証の設定を置き換えます。先に読み、残すフラグをすべて指定してください。
- 接続は `PLATFORM_API_URL`、`PLATFORM_PROJECT_ID`、`PLATFORM_OIDC_ISSUER`、`PLATFORM_OIDC_ISSUER_CA_PEM`、`PLATFORM_ACCESS_ISSUER`、`PLATFORM_APPLICATION` を渡します。環境から読み、どれも直接書かないでください。
- これ以降、各リクエストは `Authorization: Bearer <user access token>` 付きでサーバーに届きます。サインイン、コールバック、`/logout` はエッジが処理します。
- `Authenticated` は、この環境にサインインできるすべてのユーザーを通します。Project のメンバーに限りません。

## 3. アクセスモデルを宣言する

パーミッションを `<type>:<action>` の形で書き、ロールにまとめます。Dashboard で Application の **Access** タブを使うか、ドキュメントで書きます。

```yaml
kind: ApplicationAccess
id: expense
projectId: {{.ProjectID}}
spec:
  applicationRef: { name: expense }
  model:
    permissions:
      - { name: "reports:read" }
      - { name: "reports:approve" }
    roles:
      - { name: member, permissions: ["reports:read"] }
      - { name: approver, permissions: ["reports:read", "reports:approve"] }
```

```bash
apth apply -f access.yaml --dry-run --output table
apth apply -f access.yaml
```

`--prune` は決して付けません。モデルは、`project.manage` を持つユーザーが Access タブで承認し、ロールをユーザーや Group にバインドするまで何も付与しません。自分で承認できない場合は止まり、管理者に正確なモデルを渡してください。アクセスを与える別の方法を探さないでください。名前は追加だけができます。

## 4. サーバーで強制する

TypeScript では `@appthrust/app-access` を使います（GitHub Packages。インストールには `read:packages` を持つトークンが必要で、ビルド時のシークレットとして渡します）。

```ts
import { fromEnv, toResponse } from '@appthrust/app-access'

const appAccess = fromEnv('PLATFORM') // one instance per server process

export async function POST(request: Request) {
  try {
    const access = await appAccess.getAppAccess(request)
    access.require('reports:approve')
    // Perform the operation; store access.principal as the actor.
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return toResponse(error)
  }
}
```

その他の言語では、次の契約を実装します。

1. 転送された `Authorization` ヘッダーを付け、ボディなしで `POST {PLATFORM_API_URL}/api/v1/access/user-token` を呼ぶ。
2. 返ってきた ES256 のアサーションを `{PLATFORM_ACCESS_ISSUER}/jwks.json` で検証する。確かめるのは、発行者、有効期限、`aud` がベアラートークンの `azp` と等しいこと、`appthrust.io/project`、`appthrust.io/application`。
3. 署名された `scope` クレームだけで認可する。レスポンスのプレーンな `roles` と `scopes` は判断に使わない。
4. 交換の `401` は 401 に、`429`、その他のステータス、タイムアウト、検証の失敗は 503 に対応させる。発行者、サブジェクト、`azp` の組ごとに期限の直前までキャッシュし、失敗はキャッシュしない。

保護されたデータを読む、または変更するすべてのハンドラーで、パーミッションを確認してください。所有者のキーには署名された `principal`（`u_...`）を保存し、トークンのクレームから導いた値は使いません。

## 5. ユーザーとして Platform API を呼ぶ

機能が Project のリソースを必要とするときだけ行います。

```bash
apth publishes access set {{.ProjectID}} "$PUBLISH" --mode Authenticated --audience appthrust-platform-api
apth publishes access get {{.ProjectID}} "$PUBLISH"
```

そのうえで、現在のリクエストの `Authorization` ヘッダーを、サーバーから `{PLATFORM_API_URL}/api/v1/...` へ転送します。タイムアウトを設定し、リダイレクトは拒否します。結果を決めるのはユーザーの Project でのロールです。`403` はエラーページではなく「アクセスなし」として表示してください。変更操作には `Idempotency-Key` を送り、成功を報告する前にリソースを読み直します。リクエストとレスポンスの形は `apth <group> ... --json` から得て、ルートを推測しないでください。

これにより、すべてのユーザーのトークンが、あなたのサーバーから Platform API に対して使えるようになります。汎用的な中継、ベアラートークンを使い回すバックグラウンドジョブ、ユーザー間で共有するキャッシュは作らないでください。

## 6. ユーザーとして確かめる

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
```

公開された URL で、新しいセッションから次を確かめます。

1. ロールを持つユーザーが、保護された操作を完了できる。
2. ロールを持たないユーザーが、サーバーから 403 を受け取る。
3. バインディングを外すと、1 人目のユーザーがおよそ 1 分以内に拒否される。

サインインへのリダイレクト、コンポーネントの Ready、ローカルでの成功は、このどれの証明にもなりません。

## 再試行する前に診断する

- `PLATFORM_*` の変数がない: 接続が保留中か、接続名によって別の接頭辞になっている。
- `Authorization` ヘッダーがない: 公開が `Public` か、リクエストが公開された URL を通っていない。
- 交換が全員に `401` を返す: Application にアクセスモデルがないか、トークンがこの公開のクライアントのものではない。
- 交換が `404` を返す: プラットフォームのリリースがこのルートより古い。運用者に相談する。
- `require` が全員に 403 を返す: モデルが承認待ちか、一致するバインディングがない。
- セッションは有効なのに Platform API が `401` を返す: トークンに Platform API 用の audience がない。公開のアクセス設定を読む。
- ヘルパーが `503` を返す: プラットフォームまたはその鍵に到達できなかった。フォールバックを追加しない。

## 報告

実装した方法、適用した公開のアクセス設定とモデルの正確な内容、承認とバインドを行った人、公開された URL での 2 人のユーザーによる確認、観測できなかった境界を述べてください。承認待ちのモデルや、検証していないトークンの経路を、動作する認可として説明しないでください。

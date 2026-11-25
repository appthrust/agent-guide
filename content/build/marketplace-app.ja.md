---
title: "Marketplace アプリを作る"
summary: "カタログのアプリとプラットフォームの間の契約を説明します。定義、環境変数と HTTP の提供面、Go のサーバー SDK、アクセスとアクセスキー、そして公開に必要なものです。"
audience: "developer"
section: "build"
order: 50
tags: ["marketplace", "catalog", "definition", "appserver-go", "access-keys"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/first-party-app-repositories.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/app-authorization.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/access-keys/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "model/api/core/v1alpha1/application_stack_definition.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "appthrust-operator/pkg/controllers/core/publish/accesspolicy/render.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# Marketplace アプリを作る

Marketplace アプリは、どの Project にもインストールできる 1 つのカタログ定義です。インストールすると、`AppInstallation` と、Project が所有する通常の Application のグラフが作られます。インストール済みのアプリを運用する方法は [Marketplace のクックブック]({{.PublicURL}}/md/apth/cookbook/marketplace-apps.md)にあります。このページは、アプリを作る側に向けたものです。

## 始める前に

- **公開にはカタログの公開権限が必要です。** 定義がプラットフォームに届く経路は、署名付きカタログだけです。記載したリビジョン時点で公開できるのは、カタログの認証情報を持つファーストパーティのリポジトリです。サードパーティが公開する経路はなく、アプリのロールもファーストパーティのカタログアプリ向けです。
- その権限がない場合は、この Project に[自分の Application]({{.PublicURL}}/md/build/platform-connection.md) を作ってください。サインイン、パーミッション、Platform API へのアクセスは同じように使えます。
- Agent Guide は公開の権限を与えません。このページのどの記述も、公開を許可するものではありません。

## リポジトリの構成

アプリは専用のリポジトリに置き、プラットフォームとは独立してビルドとリリースを行います。

```text
<app>/
  cmd/server/           Go server: API, static SPA, probes
  web/                  SPA
  catalog/entry.yaml    the ApplicationStackDefinition document
  Dockerfile            multi-stage; a non-root runtime image
  .github/workflows/    CI and the tag-driven publish
```

サーバーは、プラットフォームのチェックアウトも非公開のモジュールも必要としません。依存するのは、公開されている `github.com/appthrust/appserver-go` です。

## 定義

`catalog/entry.yaml` に、インストール時に展開される内容をすべて宣言します。次は、データベースを持ち、ユーザーをサインインさせて Platform API を呼ぶ Web アプリの例です。

```yaml
apiVersion: appthrust.io/v1alpha1
kind: ApplicationStackDefinition
metadata: { name: expense }
spec:
  display: { title: Expense, category: collaborate, description: "Submit and approve expense reports." }
  components:
    - id: web
      definitionRef: { name: web-service, version: v1 }
      defaultValues: { port: 8080, minScale: 1, readinessProbePath: /readyz, livenessProbePath: /healthz, publicURLEnv: EXPENSE_PUBLIC_URL }
    - id: database
      definitionRef: { name: postgresql, version: v1 }
      defaultValues: { provider: CNPG, storageSize: 2Gi }
  connections:
    - { name: database, from: web, to: database }
  publish: { hostnameLabel: expense }
  access:
    audiences: [appthrust-platform-api]
    scopes: [openid, profile, email]
    tokenClaims: [groups]
    permissions:
      - { name: "reports:read" }
      - { name: "reports:approve" }
    roles:
      - { name: member, permissions: ["reports:read"] }
      - { name: approver, permissions: ["reports:read", "reports:approve"] }
    defaultBindings:
      - { role: member, subject: { kind: Authenticated } }
  releaseIdentityEnvPrefix: EXPENSE
  updatePolicy: { default: pinned, allowed: [pinned, follow] }
  versions: []   # written by the publisher on each release
```

| フィールド | 意味 |
| --- | --- |
| `metadata.name` | 定義の名前。インストールの名前にもなる。1 つの Project が持てる同じ定義のインストールは 1 つだけ |
| `components`、`connections` | グラフ。コンポーネント定義を参照するスロットと、スロット間の接続 |
| `publish.hostnameLabel` | Project でのアプリの URL に使うホストのラベル |
| `access` | エッジでのサインインと、アプリの認可。下を参照 |
| `dependencies[]` | このアプリがリンクするほかの定義: `definition`、`urlEnv`、任意の `publicURLEnv`、`installPolicy` |
| `requirements[]` | アプリが使えるようになるために必要な設定（8 個まで）。インストールの `Ready` ではなく `Configured` 条件に反映される |
| `releaseIdentityEnvPrefix` | プラットフォームが渡すリリース関連の変数の接頭辞 |
| `updatePolicy` | `follow` または `pinned`。インストールする人がどちらを選べるかも決める |
| `versions[]` | リリース済みのバージョン: `name`、`images`、`stream`、`served`、`default`、`minPlatformVersion` |

カタログは厳密にデコードされます。あるフィールドより前のプラットフォームのリリースは、そのフィールドを使うエントリを読めません。スキーマに追加するときは新しいバージョンとして公開し、`minPlatformVersion` に、それを理解する最初のリリースを指定してください。

## アクセス

| `access` のフィールド | 効果 |
| --- | --- |
| `scopes` | エッジが要求する OIDC のスコープ。既定は `openid`、`profile`、`email` |
| `audiences` | 転送されるトークンに必須の audience。`appthrust-platform-api` を指定すると、アプリが[ユーザーとして Platform API を呼べる]({{.PublicURL}}/md/build/call-platform-api.md) |
| `tokenClaims` | 追加で要求するクレーム。エッジのルールは増えない |
| `bearerPassThrough` | サインインの Cookie がなくても、`Authorization` の検証済み JWT を受け付ける。API クライアントとアクセスキーに必要 |
| `permissions`、`roles`、`defaultBindings` | アプリのアクセスモデル |
| `accessKeys` | アプリの API 用のアクセスキーのスペースを公開する |

アクセスモデルは、[アプリのパーミッション]({{.PublicURL}}/md/build/app-permissions.md)のルールに従います。Application の代わりにインストールが単位になります。

- ロールのパーミッションは宣言済みのパーミッションでなければなりません。デフォルトバインディングは宣言済みのロールを指す必要があります。パーミッションを 1 つでも宣言したら、アクセスキーのスコープ名も宣言済みのパーミッションでなければなりません。
- パーミッションとロールの名前は、バージョンをまたいで追加だけができます。
- Project の管理者が、インストールごとにモデルを承認します。`project.manage` なしでインストールしても、付与は作られません。カタログが更新されただけでは、既存のインストールは何も変わりません。変わるのは、モデルがあらためて承認されたときです。
- リンクで呼ばれる側が受け取るのは、呼び出し側アプリのベアラートークンで、ユーザー自身のセッションではありません。そのため、リンク経由でしか呼ばれないアプリはロールを宣言しません。

## サーバーが受け取るもの

| 変数 | 出どころ |
| --- | --- |
| `PLATFORM_API_URL`、`PLATFORM_PROJECT_ID`、`PLATFORM_OIDC_ISSUER`、`PLATFORM_OIDC_ISSUER_CA_PEM`、`PLATFORM_ACCESS_ISSUER`、`PLATFORM_APPLICATION` | インストール時に追加される `platform` 接続 |
| `DATABASE_URL` | データベース接続 |
| `<PREFIX>_PUBLIC_URL` | 公開されたオリジン。変数名は `publicURLEnv` で指定したもの |
| `<PREFIX>_OIDC_AUDIENCES` | `access.audiences` の audience |
| `<PREFIX>_ACCESS_AUDIENCE` | アクセスキーの audience。変数名は `accessKeys.audienceEnv` で指定したもの |
| `<PREFIX>_RELEASE_VERSION`、`<PREFIX>_ARTIFACT_DIGEST` | 実行中のカタログのバージョン |
| 各依存の `urlEnv` と `publicURLEnv` で指定した名前 | リンク先のアプリのアドレス |

環境固有のホスト、Project ID、発行者を直接書かないでください。同じイメージが、どのインストールでも正しく動く必要があります。

## サーバーが提供するもの

| ルート | 目的 |
| --- | --- |
| `/readyz`、`/healthz` | プローブ。必須の依存に接続中の間は ready でないと報告し、プロセスは生かしておく |
| `GET /config` | SPA 向けの、公開してよいシークレットでない設定 |
| `GET /releasez` | 提供中のカタログのバージョンとダイジェスト |
| `GET /.well-known/appthrust/health` | インストールの読み取りモデルに使われる、アプリ自身のヘルスレポート |
| `/authz`（任意） | 外部認可のエンドポイント。ほかの公開が、アクセスの判断をこのアプリに委ねる場合に使う |

サインイン、`/logout`、コールバックはエッジが処理します。アプリはどれも実装しません。

## Go のサーバー SDK

`github.com/appthrust/appserver-go` は、プラットフォームとアプリが共有する、バージョン付きの契約です。マイナーバージョンごとに、必要なプラットフォームの最小バージョンが決まっています。アップグレードの前に `COMPATIBILITY.md` を読んでください。古い環境で新しい SDK を使うときは、先に Platform API を更新します。

| パッケージ | 用途 |
| --- | --- |
| `appserver/platformenv` | platform 接続を読んで検証する |
| `appserver/identity` | 転送されたユーザートークン、またはアクセスキーのアサーションを検証する。ミドルウェア。アプリのパーミッション（オプトイン） |
| `appserver/platformclient` | Platform API の読み取りモデル。ユーザーのベアラートークンで呼ぶ |
| `appserver/link` | リンク先のアプリを解決して呼ぶ |
| `appserver/launcher` | 共通のアプリ切り替えのデータ |
| `appserver/health`、`appserver/releaseidentity`、`apphealth` | プローブ、`/releasez`、ヘルスレポート |
| `appserver/httpx`、`appserver/requestlog` | 共通の JSON エラーの形と、リクエストごとに 1 行の構造化ログ |
| `appserver/pgstore` | PostgreSQL のトランザクションと、組み込みのマイグレーション |
| `accesskey` | アサーションのクレーム、検証器、JWKS の扱い |

Go でのアプリのパーミッション:

```go
trust := identity.FromEnv("EXPENSE")
appAccess := identity.AppAccessFromEnv("expense") // the definition name
appAccess.RequirePermissions = true
trust.AppAccess = &appAccess
auth, err := identity.New(trust)
if err != nil {
    return err
}
handler := auth.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    user, _ := identity.FromContext(r.Context())
    if !user.Principal.Has("reports:approve") {
        httpx.WriteError(w, httpx.Forbidden(), "expense")
        return
    }
    // Perform the app-owned operation.
}))
```

人もキーも、同じ `Principal.Has` で確認します。`Identity.Access.Principal` が、保存すべき永続的な人のキーです。交換や検証に失敗すると 503 `access_unavailable` になります。クレームへのフォールバックはありません。

## 機械からの呼び出し用のアクセスキー

スペースを宣言すると、スクリプト、エージェント、ほかのコンポーネントが、ブラウザのセッションなしでアプリの API を呼べます。

```yaml
access:
  bearerPassThrough: true
  accessKeys:
    audience: expense
    audienceEnv: EXPENSE_ACCESS_AUDIENCE
    keyPrefix: exp
    scopes: [{ name: "reports:read", description: "Read expense reports" }]
    defaultConnectionScopes: ["reports:read"]
    defaultTTL: 720h0m0s
    maxTTL: 8760h0m0s
```

1. ユーザーがスペースにキーを作り、シークレットを一度だけ受け取ります: `apth access-keys create --project {{.ProjectID}} --space expense --scope reports:read --env`
2. 呼び出し側は、`{{.AccessURL}}/api/v1/access/token` でキーを短命のアサーションに交換し、ベアラートークンとしてアサーションを送ります。キーそのものは送りません。
3. エッジがアサーションの発行者と audience を検証します。サーバーは `appserver/identity` でもう一度検証し、`Principal.Has(scope)` を確認します。

アプリがロールを宣言している場合、ユーザーのキーには、発行時点でそのユーザーが実際に持つアプリのパーミッションを超えるスコープを付けられません。また、キーには必ず有効期限が付きます。ベアラートークンとして生のキーが送られてきたら、アプリは拒否しなければなりません。呼び出し側の手順は[アクセスキーのクックブック]({{.PublicURL}}/md/apth/cookbook/access-keys.md)を参照してください。

## リリース

SemVer のタグを打つと、マルチアーキテクチャのイメージをビルドし、そのインデックスに署名し、新しい `versions[]` の要素を加えたカタログエントリを提出します。そのうえで、署名付きカタログにそのバージョンとダイジェストが入るまで待ちます。ワークフローを起動しただけでは公開の証拠になりません。証拠は署名付きカタログです。公開済みのイメージは変更できず、以前のバージョンは提供されたままになります。

インストールがリリースを取り込む方法は、そのポリシーで決まります。`follow` は、宣言された stream の中でイメージを進めます。`pinned` は更新があることを報告し、人の操作を待ちます。グラフのメンバーの追加や削除には、インストールした側でのバージョン変更が必ず必要です。

## 確かめる

リリースしたバージョンを Project にインストールし、[Marketplace のクックブック]({{.PublicURL}}/md/apth/cookbook/marketplace-apps.md)にある Ready の段階を順に確かめます。受け付け、グラフの Ready、依存の解決、設定済み、正常、の順です。最後に、公開された URL でサインインして実際の操作を行います。アプリがロールを宣言している場合は、[アプリのパーミッション]({{.PublicURL}}/md/build/app-permissions.md)にある、許可されるユーザーと拒否されるユーザーの組でも確かめてください。

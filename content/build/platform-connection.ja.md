---
title: "アプリをプラットフォームに接続する"
summary: "platform 接続を追加し、公開にサインインを必須にして、エッジがサーバーへ転送するユーザートークンを扱います。"
audience: "developer"
section: "build"
order: 20
tags: ["apps", "platform-connection", "sign-in", "oidc"]
sources:
  - { path: "apth-cli/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/component_connections.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/internal/cmd/apth/publish.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "appthrust-operator/pkg/controllers/core/componentconnection/platform.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "appthrust-operator/pkg/controllers/core/publish/accesspolicy/render.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/handler/publish_access.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# アプリをプラットフォームに接続する

このページは、Project `{{.ProjectID}}` にある自分の Application が対象です。Marketplace アプリは同じ設定を定義から受け取ります。[Marketplace アプリを作る]({{.PublicURL}}/md/build/marketplace-app.md)を参照してください。

`$APP`、`$COMPONENT`、`$PUBLISH` は、タスクと取得した一覧から決めます。推測しないでください。

```bash
apth apps get "$APP"
apth components list {{.ProjectID}}
apth publishes list {{.ProjectID}}
```

## 1. platform 接続を追加する

```bash
apth component-connections create {{.ProjectID}} "$COMPONENT" --destination-platform --name platform
apth component-connections list {{.ProjectID}}
apth apps env get "$APP"
```

- 接続元は、この Project の Container コンポーネントでなければなりません。実行には Editor または Admin のロールが必要です。
- 1 つのコンポーネントが持てる platform 接続は、名前にかかわらず 1 つだけです。2 つ目のリクエストは競合として返ります。
- レスポンスはリクエストの受け付けを示すだけです。`apth component-connections get` で接続を読み、変数がコンポーネントの環境に現れてから使ってください。接続が理由 `PlatformEndpointUnresolved` で待機している場合、環境がエンドポイントまたは発行者をまだ公開していません。これは運用者が対処する事項で、再試行を繰り返しても解決しません。

変数の接頭辞は、接続名を大文字にして、ハイフンをアンダースコアに置き換えたものです。`--name platform` の場合は次のとおりです。

| 変数 | 意味 |
| --- | --- |
| `PLATFORM_API_URL` | サーバー側から呼ぶ Platform API のオリジン。この環境では `{{.PlatformAPIURL}}` |
| `PLATFORM_PROJECT_ID` | コンポーネントが属する Project。ここでは `{{.ProjectID}}` |
| `PLATFORM_OIDC_ISSUER` | エッジが転送するユーザートークンの発行者 |
| `PLATFORM_OIDC_ISSUER_CA_PEM` | 発行者がプライベート CA を使う場合の証明書バンドル。空のこともある |
| `PLATFORM_ACCESS_ISSUER` | プラットフォームが署名するアサーションの発行者。鍵は `<issuer>/jwks.json` にある |
| `PLATFORM_APPLICATION` | コンポーネントが属する Application のリソース名。Application に属さないコンポーネントには付かない |

この接続が渡すのはエンドポイントの情報で、権限ではありません。アプリに Platform API へのアクセスを与えることはありません。`PLATFORM_APPLICATION` も設定値です。プラットフォームは Application を呼び出し元のトークンから導き、この名前からは導きません。値は起動時に環境から読みます。オリジンや Project ID をソースに直接書かないでください。

## 2. 公開にサインインを必須にする

```bash
apth publishes access get {{.ProjectID}} "$PUBLISH"
apth publishes access set {{.ProjectID}} "$PUBLISH" --mode Authenticated
```

`set` は認証の設定を**置き換えます**。`--audience` を省略すると audience は空に戻り、`--bearer-pass-through` を省略すると false に戻ります。先に現在の設定を読み、残したい値をすべて指定してください。IP 許可リストだけは例外で、`--allow-cidr` または `--clear-allow-cidrs` を指定しない限り保持されます。稼働中のアプリに到達できる人を変える操作には、タスクとしての権限が必要です。

| モード | サーバーに届くもの |
| --- | --- |
| `Public` | 匿名のリクエスト。ユーザートークンがないため、アプリは呼び出し元を識別できない |
| `Authenticated` | サインイン済みのユーザーからのリクエストだけ。それぞれにそのユーザーのアクセストークンが付く |

`Authenticated` にすると、プラットフォームはこの公開のために OIDC クライアントを登録します。エッジは、セッションのないブラウザをサインインへリダイレクトし、セッションをアプリのオリジンの Cookie に保持し、トークンを更新します。アプリのホスト上の `/logout` と `/oauth2/callback` もエッジが処理します。これらのパスや別のログイン処理をアプリに実装しないでください。

**サインイン済みであることは、認可されていることではありません。** ほかのルールがない `Authenticated` は、この環境の ID プロバイダーにサインインできるすべてのユーザーを通します。この Project のメンバーに限りません。各ユーザーにアプリの中で何を許すかは、別に決めてください。[アプリのパーミッション]({{.PublicURL}}/md/build/app-permissions.md)を参照してください。

`--bearer-pass-through` を付けると、セッション Cookie がなくても、`Authorization` に検証済みの JWT を持つリクエストを受け付けます。ブラウザ以外のクライアントが呼ぶ API にだけ有効にしてください。

## 3. 転送されたトークンを扱う

エッジを通過したリクエストには、必ず `Authorization: Bearer <access token>` が付きます。

- トークンは `PLATFORM_OIDC_ISSUER` が署名した JWT です。`azp` クレームは、この公開の OIDC クライアントです。
- 公開のアクセス設定で要求しない限り、Platform API 用の audience は付きません。追加する前に[アプリから Platform API を呼ぶ]({{.PublicURL}}/md/build/call-platform-api.md)を読んでください。
- 人は、発行者とサブジェクトの組（`iss`、`sub`）で識別します。メールアドレスや表示名はプロフィールの情報で、アクセスを与える根拠にはなりません。

トークンをデコードしただけのクレームを信頼しないでください。次のどちらかを使います。

| 必要なもの | 方法 |
| --- | --- |
| パーミッションと、人を表す永続的なキー | トークンをプラットフォームと交換する。プラットフォームがトークンを検証し、署名したアサーションを返す。これが[アプリのパーミッション]({{.PublicURL}}/md/build/app-permissions.md)の契約 |
| 「サインイン済みのユーザーか、それは誰か」だけ | 発行者が公開している鍵（`<issuer>/.well-known/openid-configuration` から見つかる）で JWT を検証し、発行者と有効期限を確かめる。そのうえで `iss` と `sub` を身元として使う |

トークンはサーバーの外に出しません。ブラウザに返す、ログに書く、保存する、`PLATFORM_API_URL` 以外のオリジンへ送る、のどれも行わないでください。

## 4. ローカル開発

ローカルで動かすときは手前にエッジがないため、`Authorization` ヘッダーは届かず、サインインも起きません。認証に依存しないロジックはローカルで、認証が関わる経路は公開された URL で確かめてください。未検証のクレームを受け付ける開発用モードをコードに持たせる場合は、ループバックのリスナーに限定し、デプロイ先の設定からは有効にできないようにします。

## 5. 確かめる

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
```

返された URL を新しいブラウザセッションで開き、サインインを完了して、呼び出し元の身元に依存する操作を 1 つ行います。サインインページへのリダイレクトが示すのはエッジのポリシーが効いていることで、アプリがトークンを受け取って処理できたことではありません。

## うまくいかないとき

| 症状 | 考えられる原因 |
| --- | --- |
| `PLATFORM_*` の変数がない | 接続がまだ保留中か、別の `--name` で作られていて接頭辞が違う |
| サーバーに `Authorization` ヘッダーが届かない | 公開が `Public` か、リクエストが公開された URL を通っていない |
| サインインが繰り返される、またはエラーで終わる | `apth publishes access get` と `apth publishes readiness {{.ProjectID}}` を読み、型付きの理由を報告する。再インストールで直そうとしない |
| Project の外のユーザーがアプリを開ける | `Authenticated` だけなら想定どおり。アプリのパーミッションを追加する |

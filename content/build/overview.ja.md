---
title: "Platform API を使って機能を作る"
summary: "アプリが実行時にプラットフォームから受け取るもの、用意されている連携の方法、そして自分の Application と Marketplace アプリのどちらに何が当てはまるかを示します。"
audience: "developer"
section: "build"
order: 10
tags: ["apps", "platform-api", "authorization", "marketplace"]
sources:
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/app-authorization.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/app-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# Platform API を使って機能を作る

`apth` のページは、ターミナルから Project `{{.ProjectID}}` を操作する方法を扱います。このセクションが扱うのは逆向きで、**アプリの中で動くコード**がプラットフォームを使う方法です。誰が呼んでいるかを知る、その人に何を許すかを決める、Project のリソースを読み書きする、機械からの呼び出しを受け付ける、といった機能が対象です。

## 2 種類のアプリ

| | 自分の Application | Marketplace アプリ |
| --- | --- | --- |
| 何か | チームが `apth apps create` または Dashboard でこの Project に作る Application | Project が `AppInstallation` としてインストールするカタログ定義（`ApplicationStackDefinition`） |
| プラットフォームとの接続を設定する人 | 自分。この Project で platform 接続と公開のアクセス設定を行う | 定義に一度書く。インストール時に展開される |
| サインイン | 公開のアクセスモードを `Authenticated` にする | 定義の `spec.access` |
| アプリのパーミッション（ロール） | Application のアクセスモデル。Project の管理者が承認する | `spec.access.permissions`、`roles`、`defaultBindings`。インストールごとに承認する |
| ユーザートークンの Platform API 用 audience | 公開のアクセス設定で要求したときだけ付く | `spec.access.audiences` |
| 機械からの呼び出し用のアクセスキー | このガイドでは扱わない | `spec.access.accessKeys` |
| サーバー側のヘルパー | `@appthrust/app-access`（TypeScript）。ほかの言語は HTTP の契約を実装する | `github.com/appthrust/appserver-go`（Go） |
| 届け方 | リポジトリに push すると、リリースが追随する | 署名付きカタログへの公開。カタログの公開権限が必要 |

同じアプリを複数の Project にインストールさせる必要がなければ、自分の Application から始めてください。

## アプリが実行時に受け取るもの

- **エッジでのサインイン。** 認証付きの公開では、アプリの手前のゲートウェイが OIDC のサインインを行い、セッションをアプリのオリジンの Cookie に保持します。バックエンドには、ユーザーのアクセストークンを `Authorization: Bearer ...` として転送します。ブラウザがトークンを持つことはありません。
- **platform 接続。** Platform API の場所、コンポーネントが属する Project、信頼する発行者を環境変数として渡します。認証情報は発行しません。
- **マネージドなデータ接続。** データベース接続は `DATABASE_URL` とその各要素を渡します。[データベースのクックブック]({{.PublicURL}}/md/apth/cookbook/databases.md)を参照してください。
- **クレデンシャルスロット。** アプリが必要とする外部サービスのシークレット用です。値は Project の Admin が設定し、読み取りで返ることはありません。

**アプリは、Platform API に対して自分自身の身元を持ちません。** アプリからの呼び出しはすべて、サインイン中のユーザーのベアラートークンを使い、そのユーザーとして認可されます。このセクションの手順でアプリ専用の認証情報が得られることはありません。別の手段で作ることもしないでください。

## 進む先を選ぶ

| やりたいこと | 読むページ |
| --- | --- |
| サインインを必須にして、呼び出し元が誰かを知る | [アプリをプラットフォームに接続する]({{.PublicURL}}/md/build/platform-connection.md) |
| アプリの中で誰に何を許すかを、Project の管理者が決められるようにする | [ロールとパーミッションでアプリの利用者を認可する]({{.PublicURL}}/md/build/app-permissions.md) |
| ユーザーに代わって Project のリソースを読み書きする | [アプリから Platform API を呼ぶ]({{.PublicURL}}/md/build/call-platform-api.md) |
| どの Project にもインストールできるアプリを届ける | [Marketplace アプリを作る]({{.PublicURL}}/md/build/marketplace-app.md) |

この作業を行うエージェントは、手順を要約したスキルを取得できます: [Platform API アプリのスキル]({{.PublicURL}}/skills/appthrust-platform-api-app/SKILL.md)

## 2 つの権限の領域

| 領域 | 問い | 付与するもの | 強制するもの |
| --- | --- | --- | --- |
| プラットフォーム | この呼び出し元は Project を操作してよいか | Project のロールバインディング | Platform API |
| アプリ | この呼び出し元はアプリの中で何をしてよいか | アプリのロールバインディング | アプリ。プラットフォームが署名したアサーションをもとに判断する |

2 つの領域は互いに影響しません。アプリのパーミッションは、プラットフォームの操作を何も許可しません。Project のロールも、アプリのパーミッションを与えません。例外は、管理者が Project のアクションの保持者にアプリのロールをバインドした場合だけです。アプリ内の認可を、Project のロール名や生の `groups` クレームから導かないでください。

## どの方法でも守るルール

- 認可はサーバーで行います。ボタンを隠すことは認可ではありません。
- 失敗したら拒否します。プラットフォームに到達できない、または署名された事実を検証できないときは 503 を返します。未検証のクレームや以前の結果で代用しないでください。
- ベアラートークンはサーバーの外に出しません。ブラウザに返す、ログに書く、保存する、Platform API 以外のオリジンへ送る、のどれも行わないでください。
- 設定に書かれた名前は設定として扱います。付与がどの Application と Project のものかを示すのは、環境変数ではなく署名されたアサーションです。
- 公開された URL で、ユーザーとして機能を確かめます。ビルドの成功やコンポーネントの Ready は別の主張です。[Ready の考え方]({{.PublicURL}}/md/concepts/readiness.md)を参照してください。

## この環境が対応しているか確かめる

これらのページは、記載したプラットフォームのリビジョン時点の契約を説明しています。環境で動いているのは、そこに配られたプラットフォームのリリースです。機能を作り始める前に、ルートがあることを確かめてください。次のリクエストは認証情報を送らず、何も変更しません。

```bash
curl -sS -o /dev/null -w '%{http_code}\n' -X POST '{{.PlatformAPIURL}}/api/v1/access/user-token'
curl -sS -o /dev/null -w '%{http_code}\n' '{{.PlatformAPIURL}}/access/jwks.json'
apth component-connections create --help
```

1 つ目が `401` なら、ユーザートークンの交換は提供されていて、ベアラートークンがないために拒否されています。`404` なら、このプラットフォームのリリースにはまだその機能がありません。2 つ目が `200` なら、アクセス発行者が鍵を公開しています。ヘルプには `--destination-platform` が載っている必要があります。契約が欠けている場合は、該当するルートをこの環境の運用者に伝えてください。別の認証情報で回避しないでください。

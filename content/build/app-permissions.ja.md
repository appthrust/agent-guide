---
title: "ロールとパーミッションでアプリの利用者を認可する"
summary: "Application のアクセスモデルを宣言し、Project の管理者が承認してロールをバインドしたうえで、プラットフォームが署名したアサーションをもとにサーバーでパーミッションを確認します。"
audience: "developer"
section: "build"
order: 30
tags: ["authorization", "roles", "permissions", "assertion"]
sources:
  - { path: "design/platform/application-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "design/platform/marketplace-apps/app-authorization.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/app-access/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "dashboard/packages/api-schema/openapi.platform-api.json", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "sdk/document_validation_test.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "apth-cli/README.md", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
  - { path: "platform-api/internal/handler/access_user_token.go", revision: "e4df1169d00ac084a11874b5298b1c175e044074" }
---

# ロールとパーミッションでアプリの利用者を認可する

1 つのアプリの中で、利用者ごとに許す操作を変えたいときに使います。たとえば「経理グループのメンバーは承認でき、ほかの人は閲覧だけ」という場合です。アプリがパーミッションに名前を付け、Project が誰に持たせるかを決め、プラットフォームがその結果に署名します。

前提: アプリに [platform 接続と `Authenticated` の公開]({{.PublicURL}}/md/build/platform-connection.md)があること。

## 用語

| 用語 | 意味 | 持ち主 |
| --- | --- | --- |
| パーミッション | `reports:approve` のような、アプリが定義する単位。大文字と小文字を区別し、完全一致で比べる。ワイルドカードはない | アプリ |
| ロール | 名前を付けたパーミッションの集合 | アプリ |
| アクセスモデル | アプリのパーミッション、ロール、デフォルトバインディング | アプリ。`project.write` を持つユーザーが書く |
| 承認 | モデルの特定の版を、Project の管理者が認めること | `project.manage` を持つユーザー |
| バインディング | ロールをサブジェクトに付与するもの。付与の手段はこれだけ | `project.manage` を持つユーザー |
| アサーション | プラットフォームが署名した JWT。有効期間は 60 秒で、このアプリに対する呼び出し元のパーミッションを運ぶ | Platform API |

パーミッションを宣言しただけでは、誰にも付与されません。承認されたモデルとバインディングがそろって、はじめて付与されます。

## 1. アクセスモデルを宣言する

パーミッションは小文字で `<type>:<action>` の形にします。例: `reports:read`。Dashboard はパーミッションを type ごとにまとめ、`read`、`write`、`manage` というアクションを段階的に強いレベルとして表示します。

Dashboard では、Application を開いて **Access** タブを使います。同じモデルをドキュメントとして書くこともできます。

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
    defaultBindings:
      - { role: member, subject: { kind: Authenticated } }
```

```bash
apth apply -f access.yaml --dry-run --output table
apth apply -f access.yaml
```

`id` と `applicationRef.name` は、Application のリソース名です。先にドライランを実行して計画を読んでください。この作業で `--prune` を付けてはいけません。お使いの `apth` がこの kind を受け付けない場合は Dashboard を使い、別のコマンドを作り出さないでください。

制限とルール:

- パーミッションは 1〜64 個、ロールは 1〜16 個。1 つのロールには宣言済みのパーミッションを 1〜64 個。デフォルトバインディングは 8 個まで。
- デフォルトバインディングのサブジェクトは、`Authenticated` か、`project.read`、`project.write`、`project.manage` のいずれかを指定した `ProjectAccess` です。デフォルトバインディングは、モデルが承認されたときに一度だけ作られます。削除したものは作り直されません。
- パーミッションとロールの名前は、追加だけができます。語彙を取り除くにはモデル全体を削除します。そのとき、バインディングも削除されます。
- Marketplace からインストールした Application は、そのインストールのモデルに従います。ここでモデルを宣言しようとすると拒否されます。

## 2. 承認

モデルは、`project.manage` を持つユーザーが承認するまで効力を持ちません。

- 管理者が Access タブでモデルを保存すると、同じ操作で承認されます。
- それ以外のユーザーが書いたモデルや、ドキュメントとして書いたモデルは保留になり、管理者が承認するまで何も付与しません。
- モデルを変更しても、新しい版が承認されるまでは、以前に承認された版が有効なままです。

ドキュメントに承認を含めることはできません。含めると `apth apply` が拒否します。承認とバインディングは、管理者が Access タブで行います。対応するルートは `PUT /api/v1/projects/{projectId}/applications/{app}/access/acceptance` と、`.../applications/{app}/role-bindings` への `POST` または `DELETE` で、どちらも `project.manage` が必要です。記載したリビジョン時点では、`apth` にこれら専用のコマンドはありません。作り出さないでください。

## 3. ロールを人にバインドする

バインディングは、1 つのロールをサブジェクトに付与します。

| サブジェクトの種類 | 一致する対象 |
| --- | --- |
| `User` | 1 人。発行者とサブジェクトの完全一致で決まる |
| `Group` | 既存のプラットフォームの Group のメンバー |
| `ProjectAccess` | Project のアクション `project.read`、`project.write`、`project.manage` のいずれかの保持者 |
| `Authenticated` | この環境の発行者が検証したすべての身元 |

承認されたモデルにないロールへのバインディングは、何も付与しません。

## 4. サーバーでパーミッションを確認する

契約は、どの言語でも同じです。

1. エッジが転送した `Authorization` ヘッダーを受け取ります。
2. そのヘッダーをそのまま付け、ボディなしで `POST {PLATFORM_API_URL}/api/v1/access/user-token` を呼びます。
3. 返ってきた `token` を検証します。これは型が `appthrust-access+jwt` の ES256 の JWT で、`PLATFORM_ACCESS_ISSUER` が署名しています（鍵は `<issuer>/jwks.json`）。発行者、有効期限、`aud` が転送されたトークンの `azp` であること、`appthrust.io/project` が `PLATFORM_PROJECT_ID` であること、`appthrust.io/application` が `PLATFORM_APPLICATION` であることを確かめます。
4. アサーションの署名された `scope` クレームで認可します。これは、パーミッション名を空白で区切ったリストです。

アクセスを与えるのは、署名された `scope` だけです。レスポンスには `roles` と `scopes` もプレーンな JSON として含まれますが、これは参考情報で、判断に使ってはいけません。アサーションはサーバー内部のものです。ネットワーク越しのベアラートークンとして受け付けることも、ほかへ転送することもしないでください。

| 交換の結果 | 呼び出し元への応答 |
| --- | --- |
| `200` で、アサーションの検証に成功 | パーミッションの確認に進む |
| `401` | `401`。トークンが無効か期限切れ、または Application にアクセスモデルがない |
| `429` | `503`。受け取った `Retry-After` を付ける |
| それ以外のステータス、タイムアウト、検証の失敗 | `503` |

結果は、発行者、サブジェクト、`azp` の組ごとに 1 つ、アサーションの期限の数秒前までキャッシュします。期限切れのエントリを返さない、失敗をキャッシュしない、キャッシュの大きさに上限を設ける、の 3 点を守ってください。各レプリカは、アクティブなユーザーごとにおよそ 1 分に 1 回交換します。それより短い間隔で繰り返すと、レート制限を受けます。

### TypeScript

`@appthrust/app-access` は、Node.js 20 以上、Bun、エッジランタイム向けに手順 2〜4 を実装しています。配布先は GitHub Packages で、公開パッケージであってもインストール時に `read:packages` を持つトークンが必要です。トークンはビルド時のシークレットとして渡してください。コミットしたり、イメージのレイヤーに残したりしてはいけません。

```ini
@appthrust:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```ts
// lib/app-access.ts (server code only)
import { fromEnv } from '@appthrust/app-access'

export const appAccess = fromEnv('PLATFORM')
```

```ts
// app/api/reports/[id]/approve/route.ts
import { toResponse } from '@appthrust/app-access'
import { appAccess } from '@/lib/app-access'

export async function POST(request: Request) {
  try {
    const access = await appAccess.getAppAccess(request)
    access.require('reports:approve')
    // Perform the operation; record access.principal as the actor.
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return toResponse(error)
  }
}
```

ヘルパーはサーバープロセスごとに 1 つ作り、リクエスト間でキャッシュを共有させます。`getAppAccess` は、`Request` のほか、Next.js の `await headers()` の結果のようなヘッダーオブジェクトも受け取ります。そのため、同じ確認を Server Action でも使えます。`require` は `Forbidden`（403）を投げます。ベアラートークンがない、または拒否された場合は `Unauthenticated`（401）、プラットフォームや検証の失敗はすべて `Unavailable`（503）です。`toResponse` がこれらを HTTP のレスポンスに変換します。

### Go とその他の言語

`github.com/appthrust/appserver-go` は、Marketplace のインストール向けにこの交換を実装しています。設定で指定するのはインストールで、Application ではありません。自分の Application を Go やその他の言語で書く場合は、上の 4 つの手順を JOSE ライブラリで実装してください。

## 5. 署名された身元を使う

- `principal`（`u_...`）は、その人を表す永続的なキーです。プラットフォームが、検証済みの発行者とサブジェクトから導きます。作成者や所有者のキーとして、この文字列 1 つを保存してください。トークンのクレームからキーを作らないでください。
- `groupGrants` には、アプリごとの不透明なグループのキー（`g_...`）と、各グループがもたらすパーミッションが並びます。グループ名ではなく、ユーザーが IdP で属する全グループでもありません。
- グループ名を表示するには、モデルでパーミッションに `platformCapabilities: [GroupDirectory]` を付けます。管理者がそれを承認したあと、そのパーミッションを持つ呼び出し元は、同じベアラートークンで `POST {PLATFORM_API_URL}/api/v1/access/groups` を呼び、キーと表示名の組を受け取れます。この指定がなければ、ルートは 403 を返します。

パーミッションはアイテムの種類ごとのもので、個々のアイテムごとのものではありません。「請求書を編集できる」はモデルに書きます。「請求書 42 を編集できる」はアプリ自身のデータのルールとして持ち、パーミッションを確認したあとで判定します。

## 変更が効くまで

- バインディングや承認の変更は、およそ 1 分以内に実行中のリクエストへ届きます。これはアサーションの有効期間です。
- すでに動いているアプリにモデルを宣言しても、セッションは切れません。変更前からサインインしていたユーザーの場合、クレームに基づく Group 経由の付与は、エッジがトークンを更新したあとに届きます。既定ではおよそ 5 分以内です。
- モデルを削除すると、交換は全員に 401 を返します。この確認を有効にしたアプリは利用できなくなります。制限なしの状態になることはありません。

## 確かめる

公開された URL に、ロールを持つユーザーと持たないユーザーで、それぞれ新しいセッションからサインインします。前者は保護された操作を完了でき、後者はサーバーから 403 を受け取る必要があります。ボタンが隠れているだけでは不十分です。そのあとバインディングを外し、前者がおよそ 1 分以内に拒否されることを確かめます。

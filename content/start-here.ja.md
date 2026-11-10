---
title: "はじめに"
summary: "この Project を安全に運用し、認証を行い、環境に紐づいたエージェント向けガイダンスを取得するために、最初にお読みください。"
audience: "both"
section: "start-here"
order: 10
tags: ["bootstrap", "safety", "agents"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/accesskeys.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "sdk/access.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:appthrust/cli/install.sh", revision: "cf7ae703425a682d97a84a204baf8a455014087b" }
---

# はじめに

## 10 行でわかる AppThrust

1. AppThrust は、アプリケーションの意図をマネージドなランタイムリソースに変換します。
2. Project は、アプリケーション、権限、設定のスコープです。
3. このガイドは Project `{{.ProjectID}}` に紐づいています。
4. その Platform API は `{{.PlatformAPIURL}}` です。
5. Application は、Component、ブランチ、リリースをまとめます。
6. Component は、ワークロード、データベース、またはその他の宣言された構成要素です。
7. ApplicationStack は、接続されたアプリケーショングラフを宣言します。
8. Publish は、マネージドなエンドポイントを通じてアプリケーションに到達できるようにします。
9. Marketplace のインストールでは、署名済みのカタログ定義と通常のアプリケーショングラフを使用します。
10. Project の作業には `apth` を使います。`apthctl` は別個の権限を必要とする、別の運用者向けツールです。

## 運用ルール

- 割り当てられたアプリケーションそのものを変更する前に、現在の状態を読み取ってください。記憶しているデフォルト値から別の環境を推測しないでください。
- 生の Platform API リクエストよりも `apth` を優先してください。フラグを創作しないでください。入力が異なる場合はコマンドのヘルプを確認してください。
- トークン、アクセスキー、データベース URL、kubeconfig を出力したり、チャットに貼り付けたり、ログに記録したり、コミットしたりしないでください。シークレットを扱う箇所ではシェルのトレースを無効にしてください。
- 破壊的な CLI の例では `--yes` が必要です。このフラグは確認であり、認可ではありません。
- 変更の監視は `--wait --timeout` で上限を設けてください。アプリケーション待機専用のコマンドは独自の `--timeout` を使用し、デバイスログインには独自の承認期限があります。
- 意図したリリースと、実際の公開されたインタラクションを証明してください。Pod の Ready、配送の成功、認証、プロダクトとしての受け入れは、それぞれ異なる主張です。
- 関連する最小限のチェックを使用してください。失敗した観測を、広範なリトライやより長いタイムアウトで置き換えないでください。
- このアプリは、クラスタへのアクセスも PMC の書き込みリースも付与しません。

## ブートストラップ

公開インストーラーで `apth` をインストールしてください。認証やトークンは不要です。インストール先を `PATH` に追加してください。デフォルトは `~/.local/bin` で、`APTH_INSTALL_DIR` に export したディレクトリに変更できます。

```bash
curl -fsSL https://raw.githubusercontent.com/appthrust/cli/main/install.sh | sh -s -- apth
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth skills install
```

ブラウザで、表示されたデバイスログイン URL そのものを承認してください。`whoami` は有効な認証情報を報告する必要があります。期限切れの場合は、表示されるログインのヒントに従ってください。スキルインストーラーは CLI に同梱されたコピーをインストールするものであり、このガイドの環境に紐づいたスキルでは**ありません**。このインストール環境の値を使用するには、以下のバージョンを取得してください。ローカルで編集したスキルは、内容を確認せずに上書きしないでください。

## テキストとして取得する

[このガイド]({{.PublicURL}}/) の**エージェントの設定**（Agent setup）を使用して、読み取り専用のキーを作成してください。一度だけ表示されるキーは、シークレットストアまたはプライベートなプロセス環境に保管してください。交換先のオリジンは `{{.AccessURL}}`（Platform API）で、ドキュメントのオリジンは `{{.PublicURL}}` です。

`AGENT_GUIDE_API_KEY` を非公開で渡した状態で、以下の Bash の例はアサーションを出力せずに取得します。この HTTP リクエストは Platform API ではなく、このアプリを読み取ります。

```bash
set +x
assertion="$(apth access-keys exchange --access-url '{{.AccessURL}}' <<<"${AGENT_GUIDE_API_KEY:?Supply the key privately}")" || exit
printf 'Authorization: Bearer %s\n' "$assertion" |
  curl --fail --silent --show-error --header @- '{{.PublicURL}}/llms.txt'
unset assertion
```

詳細な HTTP ログは使用しないでください。以下の取得にも、この認証付き取得パターンを再利用してください。

- 単一のドキュメントには `{{.PublicURL}}/md/start-here.md` および `/md/<slug>.md`
- すべてのドキュメントには `{{.PublicURL}}/llms-full.txt`
- スキルファイルの検出には `{{.PublicURL}}/skills/index.json`
- 環境に紐づいたスキルには `{{.PublicURL}}/skills/<name>/SKILL.md`

## 次の手順を選ぶ

- アプリを構築または更新する: [アプリ開発スキル]({{.PublicURL}}/skills/appthrust-app-dev/SKILL.md)
- Marketplace アプリをインストールする: [Marketplace クックブック]({{.PublicURL}}/md/apth/cookbook/marketplace-apps.md)
- 失敗したリクエストや保留中のリリースを説明する: [トラブルシューティング]({{.PublicURL}}/md/apth/troubleshooting.md)
- 既存の権限でインフラストラクチャを運用する: [運用者向け概要]({{.PublicURL}}/md/apthctl/overview.md)

このコンテンツは Agent Guide `{{.ReleaseVersion}}` に同梱されています。ソースのリビジョンは作成された契約を示すものであり、お使いの環境の現在の健全性を示すものではありません。

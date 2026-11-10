---
title: "kubeconfig なしで apth にできること"
summary: "apth に必要なのは Platform API とログインだけです。それでできる範囲と、kubeconfig と運用者向けツールが必要になる境界を示します。"
audience: "both"
section: "apth"
order: 5
tags: ["scope", "authority", "kubeconfig"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/root.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/cluster.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# kubeconfig なしで apth にできること

`apth` が通信する相手は `{{.PlatformAPIURL}}` の Platform API だけです。kubeconfig、`KUBECONFIG`、`~/.kube/config` は読みませんし、`kubectl` も実行しません。1 つ目の表の作業は、次のログインだけで行えます。

```bash
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
```

Project `{{.ProjectID}}` の作業で kubeconfig が必要に見えたら、まず下の表を確認してください。Project の作業の大半には不要です。

## apth だけでできること

どの操作が許可されるかは Project でのロールで決まります。クラスタの認証情報はどれにも必要ありません。

| 作業 | コマンドグループ |
| --- | --- |
| ログイン、Project の選択、profile の管理 | `login`、`whoami`、`profiles`、`context`、`projects` |
| アプリケーションの作成、設定、公開、削除 | `apps`、`applications`、`application-stacks`、`components`、`component-connections`、`publishes` |
| アプリケーションの最近のログの確認と Ready 待ち | `apps logs`、`apps wait` |
| リリースとコンテナのリリース状態 | `releases`、`container-instances` |
| データサービス | `databases`、`caches`、`storage` |
| Marketplace アプリ | `app-installations` |
| レジストリ、ソースリポジトリ、GitHub 連携 | `registries`、`registry-connections`、`source-connections`、`github` |
| ドメイン、DNS ゾーン、ゲートウェイ | `domains`、`zones`、`gateways` |
| Project のリソースとしてのクラスタ（作成、更新、状態、疎通確認） | `clusters` |
| 運用、監視、ランタイムの読み取りモデル | `operations`、`monitoring`、`runtime` |
| アクセスキーとエージェントスキル | `access-keys`、`skills` |

`apth clusters` は Platform API を通じてクラスタを管理します。状態を報告し、宣言された意図を変更するものです。kubeconfig は発行しませんし、`kubectl` の代わりにもなりません。

正確なサブコマンドとフラグは `apth --help` と `apth <グループ> --help` で確認してください。創作しないでください。

## kubeconfig が必要なこと（運用者のみ）

以下は `apth` の範囲外です。`apthctl` か `kubectl` を使い、それぞれ認証情報が必要です。このガイドとそのアクセスキーは、その認証情報を付与しません。

| 作業 | ツール | 受け取る必要がある認証情報 |
| --- | --- | --- |
| ワークロードクラスタ内での `kubectl`（Pod、イベント、exec） | `kubectl` | そのクラスタに対して発行された Gateway kubeconfig |
| プラットフォームのリリース選択、ロールアウト、チャンネルの状態 | `apthctl pmc ...` | この環境の管理用（PMC）kubeconfig とコンテキスト |
| runtime-path とクラスタの診断 | `apthctl runtime-path ...`、`apthctl cluster check` | この環境の管理用（PMC）kubeconfig とコンテキスト |
| プラットフォームの更新 | `apthctl pmc update` | 上記に加えて、PMC の書き込みリースと明示的な権限 |

## 手元の kubeconfig はこの環境のものではありません

`~/.kube/config` や `KUBECONFIG` にすでにある kubeconfig は、ほぼ確実に別の環境を指しています。この Project を操作するために、それを `apthctl` や `kubectl` に渡さないでください。失敗するか、悪ければ別のクラスタに届きます。

- Project の作業は `apth` のまま進めてください。kubeconfig は関係しません。
- `apth` がリクエストを拒否したら、[トラブルシューティング]({{.PublicURL}}/md/apth/troubleshooting.md) を読んでください。Project のリクエストが拒否されるのは権限か入力の問題であり、ツールを切り替える理由にはなりません。
- 作業が本当に 2 つ目の表に当たる場合は、そこで止めて、この環境の運用者に正確な認証情報を依頼してください。そのうえで [運用者向け概要]({{.PublicURL}}/md/apthctl/overview.md) を読んでください。

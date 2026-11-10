---
title: "運用者向けトラックと権限境界"
summary: "Project へのアクセスと管理クラスターの権限を混同せずに、運用者の観測点を選択します。"
audience: "operator"
section: "apthctl"
order: 10
tags: ["operators", "authority"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/cluster.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# 運用者向けトラックと権限境界

**必要な権限：** 運用者として認可されたアイデンティティ、PMC の読み取りには正確な管理用 kubeconfig/コンテキスト、テナントの読み取りにはプロダクトが発行した Gateway kubeconfig が必要です。共有 PMC への書き込みには、さらにその環境の正規の PMC ライターリースと、対象を明示的に限定した変更権限が必要です。**Agent Guide はこれらのいずれも付与しません。** 読み取り専用のガイドキーは運用者の認証情報ではありません。

`apth` は Public API を通じて Project リソースを操作します。`apthctl` はインフラストラクチャとリリースのライフサイクルを操作します。開発者向け API にリクエストを拒否されたという理由だけで、運用者向けツールに切り替えないでください。

## 観測点を選択する

| 問い | 必要な観測点 |
| --- | --- |
| Application、Component、公開、または Marketplace のライフサイクル | まず Project API と `apth` |
| プラットフォームのリリース選択、派生ロールアウト、配送 | 認可された PMC 管理コンテキスト |
| テナントのワークロードとログ | 適切な読み取り権限を持つプロダクトの Gateway kubeconfig |
| ホスティング/コントロールプレーン基盤またはマシンの健全性 | 別途認可された基盤またはマシン管理へのアクセス |

PMC は platform management cluster（プラットフォーム管理クラスター）を意味します。ワークロードクラスター、ストレージクラスター、ホスティング/コントロールプレーン基盤はそれぞれ異なる役割です。コンテキスト名だけでは、どれに到達したかは証明されません。

元のブリングアップ文書は、隔離されたローカルのブートストラップ構成を説明しています。そのローカルレジストリ、名前、kubeconfig のパス、広範なブートストラップ操作を共有環境にコピーしないでください。

## 行動する前に読み取る

運用者に `$PMC_KUBECONFIG` と `$PMC_CONTEXT` を正確な認可済みターゲットに解決してもらってください。kubeconfig は決して出力しないでください：

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc status
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc channel status
```

チャンネルが存在しないことは正当な場合があります。その status コマンドが失敗しても、チャンネルを有効化する権限が与えられるわけではありません。選択されたリリースの識別情報と観測されたコンディションは、プロダクトの健全性に関する主張とは分けて記録してください。

テナントへのアクセスについては、文書化されたプロダクトのフローは、運用者のログインに続いて `--from-platform-api` と出力ファイルを指定した `apthctl cluster kubeconfig` を実行するものです。正確なアイデンティティとクラスターは認可された運用者に提供してもらってください。`{{.BaseDomain}}` から Gateway URL を導出したり、管理用キーを抽出したりしないでください。

次へ：[診断]({{.PublicURL}}/md/apthctl/debug.md)、[リリース更新]({{.PublicURL}}/md/apthctl/pmc-update-and-releases.md)、または [権限とリース]({{.PublicURL}}/md/apthctl/authority-and-leases.md)。

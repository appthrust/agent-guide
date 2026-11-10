---
title: "apthctl でインフラストラクチャを診断する"
summary: "現行の runtime-path 診断とクラスター診断を使い、保存済みのヘルスとアクティブな製品エビデンスを区別して扱います。"
audience: "operator"
section: "apthctl"
order: 30
tags: ["operators", "diagnostics", "gateway"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# apthctl でインフラストラクチャを診断する

**必要な権限：** 管理系の読み取りには、承認済みの PMC kubeconfig/context が必要です。member/tenant の調査には、別途付与された製品 Gateway へのアクセスが必要です。共有 PMC への変更には、明示的な対象権限と正規の PMC リースが必要です。**このアプリはこれらのいずれも付与しません。** 以下の診断は読み取り専用です。障害を観測したからといって、それを修復する許可が与えられるわけではありません。

参照しているリビジョンの時点では、汎用の `apthctl debug` コマンドは存在しません。実際の診断インターフェースには、`runtime-path status`、`runtime-path check`、`cluster check`、および PMC status があります。このページのタイトルからコマンドを推測して作らないでください。

## 正確な runtime path から始める

運用者は、承認済みの対象のインベントリから `$RUNTIME_PATH` と `$NAMESPACE` を取得する必要があります。これらは Project ID から推測されるものではありません。

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" runtime-path status --id "$RUNTIME_PATH" --namespace "$NAMESPACE" --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" runtime-path check --id "$RUNTIME_PATH" --namespace "$NAMESPACE" --output json
```

`status` は、保存済みの 7 レイヤーのヘルスと、generation に紐づくアクティブなエビデンスを報告します。status が健全であっても、アクティブなエビデンスが存在しない、無効化されている、古い、または不一致である場合は、部分的な証明にすぎません。`check` は、最新の管理リソースと範囲を限定したプロバイダー DNS の観測結果を突き合わせます。古い Gateway status だけでは、システム全体に及ぶ根本原因は立証できません。

デフォルトでは、check は member に立ち入りません。明示的な member 診断には、別途承認された Product API/Gateway へのアクセスが必要です。単により多くの出力を得るためにこれを有効にしないでください。読み取り専用の観測には、patch、restart、exec、secret のダンプといった手順は含まれません。

## クラスターレベルの状態

ローカルのセットアップガイドでも、この範囲を限定したチェックが提供されています。その kubeconfig で選択されるスコープ全体が承認されている場合にのみ使用してください。無関係な共有クラスターに対して広いスコープを向けないでください：

```bash
apthctl cluster check --scope all --wait --timeout 3m --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT"
```

ワークロードについてより詳細なエビデンスが必要な場合は、運用者のトリアージ順序に従ってください：Ready でない Pod → 最近のイベント → 失敗している特定のリソース → 範囲を限定した controller/job のログ → 必要な場合に限りスコープを絞ったバンドル。承認済みの Gateway 経路を使用し、基盤の管理者アクセスで代用しないでください。`BackoffLimitExceeded`、`EOF`、`ExitCode0` は、所有元のイベントとランタイム設定によって説明されるまでは、あくまで症状です。

## 推測ではなく境界を報告する

runtime-path の status/check は、現在の成功が十分な場合は終了コード 0、読み取り/アクセス/予期しないエラーの場合は 1、失敗または部分的/結論の出ないエビデンスの場合は 2、親のタイムアウトの場合は 3、設定/アイデンティティが曖昧な場合は 4 を返します。部分的な、または読み取れない path は、存在しないことのエビデンスではありません。

正確な path、時刻、generation/アイデンティティ、失敗しているレイヤー、型付けされた理由、不足している権限を報告してください。トークン、kubeconfig の内容、内部アドレス、機密性の高いアプリケーションログは報告に含めないでください。不足している具体的な観測をエスカレーションし、status を patch したり、権限を拡大して再実行したりしないでください。

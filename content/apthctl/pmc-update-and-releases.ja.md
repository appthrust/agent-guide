---
title: "PMC の更新とリリースのエビデンス"
summary: "検証済みリリースの選択、型付きの待機、および権限のある更新後に必要となる追加の公開エンドポイントでの読み戻しについて理解します。"
audience: "operator"
section: "apthctl"
order: 20
tags: ["operators", "releases", "pmc"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# PMC の更新とリリースのエビデンス

**必要な権限:** 正確な PMC 管理用 kubeconfig/context、対象のリリースとターゲットに対する明示的な権限、および正規の共有 PMC 書き込みリース。Gateway のみのテナントアクセスでは不十分です。**Agent Guide は認証情報、変更権限、リースのいずれも付与しません。** これらのコマンドは契約のリファレンスであり、環境を更新する権限を与えるものではありません。

## 書き込みの前に

ターゲットを実際のアカウント/context/namespace に結び付け、書き込み主体が 1 つだけであることを確認し、選択されているリリース、チャネルの状態、ロールアウトの condition、影響を受ける公開面を記録してください。意図しているイミュータブルなリリースとその署名を確認してください。新しいエビデンスディレクトリを選び、以前の試行のタイムラインを再利用しないでください。

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc status --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc channel status --output json
```

以下の `$RELEASE_REF` は独立して選択された **PlatformRelease** であり、Agent Guide のアプリバージョンではありません。権限と事前確認が確立した後に実行します。

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc update --release "$RELEASE_REF" --require-verified --wait --timeout 3m --evidence-dir "$EVIDENCE_DIR"
```

3 分はこの観測ウィンドウの上限であり、環境の想定完了時間ではありません。タイムアウトした場合は、エビデンスを保全し、オーナーが報告するブロッカーを確認してください。同じ書き込みをむやみに再実行しないでください。

## update が変更するもの

このコマンドはリリースとアーティファクトを検証し、インストール済みスキーマとの互換性を確認したうえで、所有する API を通じて選択リリースを更新します。また、宣言された self-Klusterlet のフィードバック設定を、専用の dry-run 優先のマネージャーを通じて reconcile することもあります。派生したロールアウト、Argo リソース、ManifestWork を編集して配送を修復することはありません。

`--require-verified` は、一致する署名済みのリリース/検証ダイジェストのエビデンスを要求します。デフォルトでは保留中の CI エビデンスを受け入れる場合があり、それは別の主張です。拒否された更新を通すために、未検証、強制、フェンス回避のフラグを追加しないでください。

通常のリリース変更では、直前の正確な選択が収束するまで待機します。置き換え（supersession）とロールバックは別個の判断であり、どちらも暗黙の再試行ではありません。ロールバックでは、自動取り込みがすぐに再び進まないよう、チャネルの一時停止と連携する必要があります。リースだけではどちらの操作も許可されません。

## 型付きの結果を読む

- **Ready**: 現在の generation での受け入れ、一致するリリース ID、および現在の Ready condition。
- **Skipped**: `Placed=False/NoClustersSelected` で受け入れられたロールアウト。別に集計し、決して Ready とは呼ばないでください。
- **Failed**: 終端的な拒否または配送の失敗。その理由と所有する子リソースを保全してください。
- **Pending/timeout**: 未達の観測であり、捏造された失敗や成功ではありません。

コマンドの実行後、正確な選択と影響を受けたロールアウトを読み戻し、ターゲット以外のリソースを事前スナップショットと比較し、その後、新しい接続で実際の公開エンドポイントを確認してください。収束したロールアウトや正常な Pod は製品としての証明の代わりにはなりません。範囲を限定したエビデンスを保全し、タスクが所有する一時的なアクセス資材のみを削除し、所有するワークフローを通じて PMC リースを解放してください。

古いインストール済みスキーマの場合、`apthctl release hops --from "$CURRENT_RELEASE" --to "$RELEASE_REF"` は許容される公開済みのブリッジチェーンを計画します。これはレジストリ/署名/スキーマのエビデンスであり、実際のロールアウトやロールバックの証明ではありません。

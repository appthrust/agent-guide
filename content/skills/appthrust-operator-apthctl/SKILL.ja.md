---
name: "appthrust-operator-apthctl"
description: "運用者専用です。apth による Project の作業には使いません。この環境用に発行された kubeconfig が必要です。apthctl による権限のあるインフラ診断、正確な PMC または Gateway アクセス、範囲を限定した証拠収集、安全なエスカレーションに使用します。このスキルは認証情報、リース、変更権限のいずれも付与しません。"
title: "AppThrust 運用者向け診断"
summary: "運用者専用です。apth による Project の作業には使いません。この環境用に発行された kubeconfig が必要です。apthctl による権限のあるインフラ診断、正確な PMC または Gateway アクセス、範囲を限定した証拠収集、安全なエスカレーションに使用します。このスキルは認証情報、リース、変更権限のいずれも付与しません。"
audience: "operator"
section: "apthctl"
order: 100
tags: ["skill", "operators", "diagnostics"]
sources:
  - { path: "cmd/apthctl/ARCHITECTURE.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/pmc.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/apthctl/platform.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-kubernetes-debug/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "docs/reference/cli/cluster.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "skills/apthctl-live-cluster-retention/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:appthrust/cli/install.sh", revision: "cf7ae703425a682d97a84a204baf8a455014087b" }
---

# AppThrust 運用者向け診断

**必要な権限:** 運用者が承認したアイデンティティと正確なターゲット、PMC の読み取りには管理用 kubeconfig/context、テナント/メンバーの読み取りにはプロダクトが発行した Gateway アクセスが必要です。共有 PMC への書き込みには、さらに明示的なスコープと正規の PMC writer リースが必要です。**Agent Guide とそのアクセスキーは、これらのいずれも付与しません。** その権限なしに、Project のアプリタスクをインフラ修復に変えないでください。

このガイドの Project は `{{.ProjectID}}`、Platform API は `{{.PlatformAPIURL}}` です。どちらの値も管理 context を特定するものではなく、クラスタへのアクセスを付与するものでもありません。

## apthctl のインストール

`apthctl` が未インストールなら、公開インストーラーを使ってください。認証やトークンは不要です。

```bash
curl -fsSL https://raw.githubusercontent.com/appthrust/cli/main/install.sh | sh -s -- apthctl
```

インストール先を `PATH` に追加してください。デフォルトは `~/.local/bin` で、`APTH_INSTALL_DIR` で変更できます。バージョンの指定、チェックサムの検証、`apthctl version` での確認、チャートのデフォルトが `dev` になる点については、[運用者向け概要]({{.PublicURL}}/md/apthctl/overview.md) を参照してください。バイナリのインストールは、上記の権限を付与するものではありません。

## 1. 読み取る前に境界を特定する

障害がアプリケーション、リリースの配送、Gateway パス、テナントワークロード、基盤のどれに属するかを判断してください。PMC、ワークロード、ストレージ、ホスティング/コントロールプレーンの役割は区別して扱ってください。実際の context の紐付けを確認し、権限のあるパスのみを使用してください。ローカル kubeconfig に見慣れた名前があるだけでは不十分です。

アプリに関する質問には Project API を優先してください。テナントの調査には、生の管理者キーではなくプロダクトの Gateway kubeconfig を使用します。kubeconfig、トークン、証明書、秘密鍵、プロバイダーの認証情報、Secret の内容を出力しないでください。

## 2. 実在する診断コマンドを使う

このソースリビジョンには、汎用の `apthctl debug` コマンドは存在しません。ソースと連動した現行のインターフェースを使用してください。変数は権限のあるインベントリから解決してください。

```bash
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc status --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" pmc channel status --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" runtime-path status --id "$RUNTIME_PATH" --namespace "$NAMESPACE" --output json
apthctl --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT" runtime-path check --id "$RUNTIME_PATH" --namespace "$NAMESPACE" --output json
```

リリースチャネルが存在しないことは、それを作成してよいという許可ではありません。runtime-path の status は、保存されたヘルスと、現在の generation に紐付いたアクティブな証拠を区別します。欠落した証拠や古い証拠は部分的なものであり、プロダクトとしての受け入れではありません。デフォルトの check は正確な管理リソースと範囲を限定した DNS の証拠を読み取るだけで、メンバーに入ることも何かを変更することもありません。メンバーの診断には、別途明示的な権限のある選択が必要です。

kubeconfig で選択されるすべてのクラスタを対象とする権限のあるスコープの場合:

```bash
apthctl cluster check --scope all --wait --timeout 3m --kubeconfig "$PMC_KUBECONFIG" --kubeconfig-context "$PMC_CONTEXT"
```

この例に all と書かれているという理由だけで、共有の読み取りスコープを広げないでください。正確なターゲットインベントリと、有用な範囲で最も狭い観測を優先してください。

## 3. 障害が発生しているレイヤーの証拠を集める

クラスタの condition で障害を説明できない場合、運用者のトリアージ手順は、非 Ready の Pod → 最近のイベント → 正確なリソースの describe → 範囲を限定したコントローラー/ジョブのログ → 必要に応じてスコープを限定したバンドル、の順です。承認された Gateway/管理用の観測ポイントと既存の運用者ツールを使用してください。生の認証情報を収集したり、Secret のペイロードを LLM に送ったりしないでください。

`EOF`、`BackoffLimitExceeded`、`ExitCode0` は、裏付けとなる証拠がなければ根本原因ではありません。正確なリソースのアイデンティティ、generation、型付きの condition/reason、観測時刻を保持してください。収集中にアイデンティティが変わった場合、異なるインカネーションの観測を混ぜないでください。

runtime-path の診断は、十分な成功（0）、読み取り/アクセス/予期しない失敗（1）、失敗/部分的な証拠（2）、タイムアウト（3）、設定/アイデンティティの曖昧さ（4）を区別します。見えないことは、存在しないことではありません。

## 4. 権限のない修復の前に止まる

診断で問題が見つかったというだけで、コントローラーのプロジェクションにパッチを当てたり、status を偽造したり、ワークロードを再起動したり、より広いアクセスを付与したり、リリースを置き換えたりしないでください。リースは writer を調整するものであり、許可を付与するものではありません。別途権限が与えられた変更には、所有元の API/入力を使用してください。

リリースタスクの場合は [PMC の更新]({{.PublicURL}}/md/apthctl/pmc-update-and-releases.md) を読んでください。不変のリリースアイデンティティを固定し、変更前の状態を記録し、writer リースを 1 つ保持し、`--wait --timeout` を付けたサポート対象の検証付き更新を使用し、影響を受けた選択と対象外の状態を読み戻してください。ローカルの bring-up ドキュメントにあるレジストリ/context の前提を共有環境に持ち込まないでください。

## 5. 正直に報告し、後片付けする

正確なターゲット/パス、失敗したレイヤー、理由、証拠の期間、アクセス上の制約、所有者が次に取るべき最小のアクションを報告してください。Pod の Ready、リリースの確定、新しい認証、プロダクトとしての受け入れはそれぞれ別の主張です。公開プロダクトの確認には、新しい接続と実際のユーザー操作が必要です。

失敗した使い捨て環境は、所有者の保持ポリシーのもとで証拠としての価値がある間のみ保持してください。その保持リースは PMC の変更リースではありません。完了したら、タスクが所有するプライベートファイルを削除し、一時的な付与はその所有者を通じて取り消し、writer の調整を解放してください。無関係なリソースを削除したり、関連する境界を観測せずに完全に後片付けしたと主張したりしないでください。

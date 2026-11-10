---
title: "Component とリリースを調査する"
summary: "Component サーフェスを使って、Stack を配送、ランタイムステータス、現在のリリースまでたどります。"
audience: "developer"
section: "apth"
order: 40
tags: ["components", "releases"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/delivery.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Component とリリースを調査する

所有元の Stack から始めてください。Stack 名、Application ID、Component ID が相互に置き換え可能だと想定しないでください。

```bash
apth application-stacks list {{.ProjectID}}
apth application-stacks get {{.ProjectID}} "$STACK"
apth components list {{.ProjectID}}
apth components get {{.ProjectID}} "$COMPONENT"
```

割り当てられた Application について返された ID から `$STACK` と `$COMPONENT` を設定してください。これらのコマンドは、プロファイルにデフォルトが設定されている場合でも、Project を位置引数として必要とします。

## 証拠の連鎖をたどる

```bash
apth components delivery {{.ProjectID}} "$COMPONENT"
apth components release-state {{.ProjectID}} "$COMPONENT"
apth components runtime-status {{.ProjectID}} "$COMPONENT"
```

- **配送**: 宣言された入力はランタイムのターゲットに配送されたか？
- **リリース状態**: どのリリースが選択中、移行中、ブロック中、または安定しているか？
- **ランタイムステータス**: 実際のワークロードは何を報告しているか？
- **プロダクトでの読み戻し**: 正確な公開エンドポイントが、新しい認証済みリクエストを受け付け、意図したアクションを実行するか？

ID、generation、condition の type/reason、観測時刻を記録してください。配送が成功しても、最新のイメージが提供されていることの証明にはなりません。新しい移行が失敗している間も、安定した古いリリースが引き続き利用可能な場合があります。

## 最新のリリースサーフェスを使う

Component のリリース操作を優先してください。README では、ContainerInstance のリリースコマンドはレガシー互換のためのアクセスであると明記されています。それらを中心に新しいワークフローを構築しないでください。

自動リリースが意図的に一時停止されていた場合は、まずその理由と、その判断を誰が所有しているかを確認してください。再開する明示的な権限を得た後に、次を実行します。

```bash
apth components resume-auto {{.ProjectID}} "$COMPONENT" --wait --timeout 2m
apth components release-state {{.ProjectID}} "$COMPONENT"
```

ロールバックとワークロードの再起動は、それぞれ異なる結果をもたらします。どちらかを提案する前に、その正確な仕様を確認してください。

```bash
apth components rollback --help
apth components restart-workload --help
```

ロールバックのリクエストボディを捏造したり、すべての Component を再起動したり、ダッシュボードを緑にするために失敗ステータスをクリアしたりしないでください。所有元のソース/入力を修正し、サポートされているリリースの仕組みを使ってください。そうしないと、管理されたプロジェクションがリコンシリエーションによって上書きされる可能性があります。

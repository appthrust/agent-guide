---
title: "Marketplace のインストールを運用する"
summary: "Dashboard でインストールと更新を行い、apth で状態を確認し、ブロックされたリリースを再インストールせずにリトライします。"
audience: "developer"
section: "apth"
order: 60
tags: ["marketplace", "follow", "pinned"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/app_installations.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/delivery.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "platform-api/internal/handler/app_installation.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Marketplace のインストールを運用する

Marketplace アプリは、カタログを供給元とする Application であり、プラットフォームが所有するアドオンではありません。インストールすると、`AppInstallation` と、ユーザーが所有する通常の `ApplicationStack` グラフが作成されます。1 つの定義のインストールは、Project ごとに最大 1 つまでです。

> **既知の CLI の制約:** 参照しているリビジョンでは、marketplace の CLI グループは `retry-release` のみを実装しています。install/create、list、get、update、uninstall/delete のサブコマンドはありません。これらを捏造しないでください。ライフサイクル操作には Dashboard を使い、状態の確認には既存の開発者向けコマンドを使ってください。

## インストール、更新、アンインストール

1. Dashboard で Project `{{.ProjectID}}` を選択し、続いて **Marketplace** を選択します。インストールする前に、定義、サポートされるバージョン、依存関係、設定要件を確認してください。
2. 意図する更新ポリシーを選択します。インストール時に、Automatic の依存関係が先に作成される場合があります。これらは独立したインストールであり、使い捨ての実装詳細ではありません。
3. Project の **Marketplace / Applications** ビューで、インストールされたアプリを確認します。インストール名、スタック ID、選択されたバージョン、解決されたイメージ、返された URL を記録してください。
4. バージョンまたはポリシーを変更する場合は、インストールのコントロールを使います。バージョンを変更するとグラフが再レンダリングされます。適用する前に、メンバーの変更とリポジトリの置き換えの有無を確認してください。
5. アンインストールする場合は、`dependents` とデータ保持への影響を確認してから、Dashboard で削除を明示的に確定します。ライフサイクルによって、インストールのレコードとスタックが削除されます。依存しているものは劣化する可能性があります。それらを自動的にアンインストールしないでください。

基盤となる Platform API のリソースは `AppInstallation` で、コレクションは `/api/v1/projects/{{.ProjectID}}/app-installations`、アイテムは `/api/v1/projects/{{.ProjectID}}/app-installations/<name>` です。コレクションへの POST で作成し、GET で読み取り、アイテムへの PATCH でバージョン/ポリシーを変更し、DELETE でアンインストールします。これはサポートされている API の境界を説明するものであり、Dashboard を迂回したり、bearer 認証情報を出力したりすることを許可するものではありません。

## follow と pinned の違い

| ポリシー | 選択対象 | 約束しないこと |
| --- | --- | --- |
| `follow` | エントリーで宣言されたストリーム内の、カタログに受け入れられたイメージタグ | 任意のレジストリタグ、推測した semver 範囲、グラフ/スキーマの自動移行 |
| `pinned` | カタログに受け入れられたダイジェスト。タグフィルターのセレクターはなし | 利用可能なバージョンの自動採用 |

pinned のインストールは `UpdateAvailable` を報告し、バージョンはユーザーが選択します。follow では、インストールで宣言されたバージョンが変わらないまま、実行中のイメージが進むことがあります。グラフメンバーの追加/削除にはバージョンの変更が必要です。ダイジェストとタグフィルターの指定は相互に排他的です。イメージリポジトリのパスの変更は、レビューを要するリポジトリの置き換えであり、通常の follow による更新ではありません。

## 確認と復旧

```bash
apth application-stacks list {{.ProjectID}}
apth application-stacks get {{.ProjectID}} "$STACK"
apth components list {{.ProjectID}}
apth components release-state {{.ProjectID}} "$COMPONENT"
apth publishes readiness {{.ProjectID}}
```

ブロックされたリリースの原因が修正され、リトライが許可されている場合:

```bash
apth app-installations retry-release "$INSTALLATION" --project {{.ProjectID}} --idempotency-key "$RETRY_KEY" --wait --timeout 2m
apth components release-state {{.ProjectID}} "$COMPONENT"
```

同じ論理的なリクエストには、秘密情報を含まない 1 つの冪等キーを使ってください。レスポンスは新しい復旧の発生を受け付けたことを示すものであり、リリースの収束を確定するものでは**ありません**。リリースをリトライするためにアンインストールしないでください。

## Ready のラダー

`Accepted` → グラフ/現在の世代の `Ready` → `DependenciesResolved` → 宣言されている場合は要件の `Configured` → `Healthy` → 認証済みユーザーによる実際の操作、の順に確認してください。これらは診断上の階層であり、時間的な順序を保証するものではありません。

`Pending` は進行が未完了であることを意味します。`NeedsConfiguration` は、要件が満たされていない状態でもグラフが Ready になり得ることを意味します。`Degraded` は正確な reason を確認する必要があり、すべての安定したワークロードが停止したことの証拠ではありません。`UpdateAvailable` はそれ自体がサービス提供の障害ではありません。アドレス可能でも Unconfigured の依存関係は、使用可能でなくてもリンクを解決できます。成功を宣言する前に [readiness]({{.PublicURL}}/md/concepts/readiness.md) を読んでください。

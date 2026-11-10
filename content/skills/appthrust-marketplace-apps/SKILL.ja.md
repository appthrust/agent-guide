---
name: "appthrust-marketplace-apps"
description: "この Project でカタログの Marketplace アプリをインストール、更新、診断、再試行、またはアンインストールする際に使用します。Dashboard でのライフサイクル、既存の apth による確認、follow と pinned の違い、段階的な Ready 状態について説明します。"
title: "AppThrust Marketplace の運用"
summary: "この Project でカタログの Marketplace アプリをインストール、更新、診断、再試行、またはアンインストールする際に使用します。Dashboard でのライフサイクル、既存の apth による確認、follow と pinned の違い、段階的な Ready 状態について説明します。"
audience: "developer"
section: "apth"
order: 110
tags: ["skill", "marketplace", "readiness"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/app_installations.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/delivery.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "platform-api/internal/handler/app_installation.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# AppThrust Marketplace の運用

`{{.PlatformAPIURL}}` を通じて Project `{{.ProjectID}}` のみを対象にしてください。このスキルはカタログアプリ向けです。独自ソースのアプリケーションのビルドやプラットフォームリリースの変更には使用しないでください。

## ブートストラップ

```bash
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth context show
```

すべてのキーとトークンは非公開に保ってください。このガイドは変更操作の権限を付与するものではありません。タスクを対象のインストールに正確に紐付け、何かをアンインストールする前にデータ損失への影響を確認してください。

> **既知の CLI の不足:** 参照しているソースリビジョン時点では、Marketplace の CLI グループには `retry-release` しかありません。install/create、list、get、update、uninstall/delete のコマンドは存在しません。これらのコマンドを捏造したり、非推奨の addon コマンドを使用したりしないでください。これらの操作には Dashboard を使用し、確認には既存の `apth` コマンドを使用してください。

## 1. Dashboard でインストールする

正しい Project → **Marketplace** を開きます。定義を選択し、サポートされているバージョン、必須の設定、依存関係を確認します。許可されたバージョン／ポリシーでインストールしてください。Automatic の依存関係は、それぞれ独立したリソースとして先にインストールされます。

基盤となる `AppInstallation` API のコレクションは `/api/v1/projects/{{.ProjectID}}/app-installations` です。コレクションへの POST で作成、GET で一覧を取得し、アイテムへの GET/PATCH/DELETE で読み取り、更新、アンインストールを行います。この API は通常のユーザー所有の ApplicationStack グラフを投影します。このリソースの説明は、認証を回避したりトークンを露出したりするための指示ではありません。

Dashboard の **Marketplace / Applications** ビューから、インストール名、Stack と Component の ID、選択したバージョン、更新ポリシー、解決済みイメージ、返された URL を記録してください。

## 2. follow と pinned を意図して選択する

- **Follow** は、エントリで宣言されたストリーム内のカタログで許可されたタグのみを選択します。任意のレジストリの latest、無制限の semver 範囲、グラフの自動移行を意味するものではありません。
- **Pinned** は、タグフィルターの意図を持たずに許可されたダイジェストを選択します。`UpdateAvailable` はユーザーに通知するもので、新しいバージョンへの変更は明示的に行います。
- バージョンを変更すると、変更されたメンバーを含めてグラフが再レンダリングされます。イメージパスの変更には、レビュー済みのリポジトリ置換が必要になる場合があります。
- 宣言されたバージョン、解決済みイメージ、公開リリースのメタデータは異なる場合があります。それぞれを確認し、不一致を単一のバージョンラベルの陰に隠さないでください。

許可されたバージョン／ポリシーの変更は、インストールのコントロールから適用してください。更新を強制するために、許可イメージのリストにパッチを当てたり、データベースを削除・再作成したりしないでください。

## 3. 利用可能な CLI で確認する

```bash
apth application-stacks list {{.ProjectID}}
apth application-stacks get {{.ProjectID}} "$STACK"
apth components list {{.ProjectID}}
apth components get {{.ProjectID}} "$COMPONENT"
apth components delivery {{.ProjectID}} "$COMPONENT"
apth components release-state {{.ProjectID}} "$COMPONENT"
apth components runtime-status {{.ProjectID}} "$COMPONENT"
apth publishes readiness {{.ProjectID}}
```

返された正確な ID を使用してください。わかりやすいフェーズだけでなく、選択済み／stable のリリースと現在の世代の condition を確認してください。

## 4. アンインストールせずにブロックされたリリースを再試行する

まず原因を修正してください。許可された 1 回の復旧リクエストについて、秘密ではない `$RETRY_KEY` を選び、同じリクエストに対してのみ再利用してください。

```bash
apth app-installations retry-release "$INSTALLATION" --project {{.ProjectID}} --idempotency-key "$RETRY_KEY" --wait --timeout 2m
apth components release-state {{.ProjectID}} "$COMPONENT"
```

受理は復旧の発生を確認するものであり、収束を意味しません。ブロックされたままの場合は、型付きの理由を確認してください。ループしたりアンインストールしたりしないでください。HTTP 401 はログインが必要であり、`delivery_pending` にはすでに上限付きの SDK リトライがあり、`delivery_blocked` は再試行ではなく運用者の対応が必要です。

## 5. Ready の段階を順に確認する

受理された意図、現在のグラフの Ready 状態、解決済みの依存関係、宣言された要件、アプリのヘルス、実際のユーザー操作をそれぞれ個別に確認してください。

- `Pending`: 進行が未完了です。欠けている condition を確認してください。
- `NeedsConfiguration`: グラフは Ready ですが設定が不足しています。許可された認証情報／プロバイダーのみをバインドしてください。
- `Degraded`: 正確な失敗内容を確認してください。古い stable なワークロードがまだ提供中である場合があります。
- `UpdateAvailable`: 利用可能な pinned の更新であり、自動的に提供停止を意味するものではありません。
- Ready リンク: アドレス可能な依存関係であり、必ずしも設定済みまたは有用な機能であるとは限りません。

新しい公開接続を使用し、必要な認証を完了してください。アプリ本来の目的を実際に実行し、状態を読み戻してください。別のアプリのリリースエンドポイントを証拠として使用しないでください。

## 6. 安全にアンインストールする

Dashboard のインストールのコントロールで、依存先、所有権、保持を確認してから、要求されたインストールのみの削除を確定してください。ライフサイクルはそのレコードと Stack を削除します。依存先は劣化する可能性があり、自動的には対象範囲に含まれません。完了／不在を確認し、保持されたリソースや可視性の欠如を正直に報告してください。子リソースの直接削除や捏造した CLI の delete コマンドで代替しないでください。

インストールと確認したイメージの識別情報、ポリシー、現在の Ready の各段階、正確なユーザー操作、未充足の前提条件を報告してください。

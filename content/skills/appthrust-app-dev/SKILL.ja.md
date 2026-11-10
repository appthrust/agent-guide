---
name: "appthrust-app-dev"
description: "この AppThrust Project で apth を使って Web アプリケーションをビルド、デプロイ、設定、デバッグします。アプリの作成、ソースの更新、マネージドデータベース、公開、ログ、リリース準備状況の確認に使用してください。"
title: "AppThrust アプリ開発"
summary: "この AppThrust Project で apth を使って Web アプリケーションをビルド、デプロイ、設定、デバッグします。アプリの作成、ソースの更新、マネージドデータベース、公開、ログ、リリース準備状況の確認に使用してください。"
audience: "developer"
section: "apth"
order: 100
tags: ["skill", "apps", "deploy"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/databases.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# AppThrust アプリ開発

依頼されたアプリケーションに対する Claude Code、Codex、または OMP の作業には、このスキルを使用してください。操作は `apth` とソースリポジトリの通常のビルド/公開経路を通じて行ってください。サポートされている CLI コマンドが存在する場合は、生の HTTP で Platform API を呼び出さないでください。

## 環境と安全性

- Platform API: `{{.PlatformAPIURL}}`
- Project: `{{.ProjectID}}`
- インストールのベースドメイン: `{{.BaseDomain}}`
- ガイド: `{{.PublicURL}}`

別の環境を推測したり、記憶している配置 ID をハードコードしたり、隣接するアプリケーションを変更したりしないでください。`$APP`、`$COMPONENT`、`$DATABASE`、`$SOURCE_REPO` は、承認されたタスクコンテキストと返されたインベントリから解決してください。ソースリポジトリ変数は owner/repository のペアです。

トークン、クライアントシークレット、データベース URL は、コード、スクリーンショット、ログ、`NEXT_PUBLIC_*` に含めないでください。機密値を扱う前後ではシェルのトレースを無効にしてください。削除には正確なタスク権限と `--yes` が必要です。ガイドのアクセスキーは、開発者としての変更権限も運用者権限も付与しません。

## 計測済みの開発ループ

```text
edit source → push main → image build/push → image selection → release → public product readback
```

2026-09-16 時点の上流 `nextjs-postgres` ワークフローでの過去の計測値: 作成から Stack が Ready になり公開 URL で配信されるまで約 **3.5 分**、その後の push からリリースまで約 **1 分**、テンプレートからカスタムアプリ、公開検証までを並行して進めたループは **5〜6 分** に収まりました。push からリリースまでの典型的な範囲は **1〜3 分** でした。これらは 1 つの環境での計測値であり、このインストールでの保証ではありません。

## 1. ブートストラップと認証

```bash
apth --help
gh auth status
node --version
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth skills install
apth context show
apth projects list
apth placement-zones list
```

リポジトリのツールチェーンに合わせてください。計測に使ったテンプレートは Node 24 と Next.js 16 を使用していました。デバイスログインは承認 URL/コードを表示し、トークンを非公開で保存し、トークン自体は決して表示しません。人間が承認するまで実行したままにしてください。`whoami` で有効性と意図した ID であることを確認する必要があります。HTTP 401 の場合は、CLI が示すプロファイル固有のログインヒントに従ってください。

インストーラーが更新するのは **バンドルされた** スキルであり、この環境に紐づいたエディションではありません。`--force` を使う前に、内容が異なるインストール済みスキルを確認してください。

## 2. 実装と並行して作成する

DNS ラベル形式の名前（小文字、数字、ハイフン。最大 63 文字）を選んでください。まず利用可能なテンプレートを確認してください:

```bash
apth application-templates list {{.ProjectID}}
apth apps create "$APP" --template nextjs-postgres --visibility public --publish --wait --timeout 15m
```

公開ソースと公開にはタスク権限が必要です。テンプレートは、ソース、イメージワークフロー、Web/データベースの Stack、生成された接続、公開インテントを作成します。独立した作業を進めている間も作成の進行を見える状態にしておいてください。リポジトリが存在した時点で（過去の実績では約 30 秒）、データベース/DNS/証明書のプロビジョニングを待って開発を直列化するのではなく、clone して実装を始めてください。作成が完了したらその結果を記録してください。

既存の自己完結型イメージの場合:

```bash
apth apps create "$APP" --image "$IMAGE_REF" --publish --wait --timeout 15m
```

検証済みのイメージ参照はクォートしてください。固定タグはそのイメージを選択し、`:^edge-` は一致するタグに追従します。テンプレートのデフォルトは、Automatic 更新付きのマネージド `nodejs-24` ランタイムです。`--image` はこのテンプレートのデフォルトを適用しません。コードのみのイメージには `--runtime nodejs-24` が必要で、`--runtime none` は自己完結型イメージ用です。プライベートレジストリへのアクセスを推測しないでください。

部分的に失敗した作成では、同じワークフローで既に作成されたリポジトリを再利用できます。再実行する前に失敗した状態を調べ、原因を修正してください。名前の衝突はリポジトリを削除してよい理由にはなりません。

## 3. 実装、push、正しいリリースを待機する

```bash
gh repo clone "$SOURCE_REPO"
# Enter the cloned repository and read its AGENTS.md / CLAUDE.md.
npm ci
```

依頼された動作を実装し、そのリポジトリが指定する最小限のチェックを実行してください。Dockerfile、デプロイワークフロー、lockfile/パッケージマネージャー、該当する場合は Next.js の standalone 出力、`0.0.0.0:$PORT` のリスナーを維持してください。無関係な儀式としてリポジトリ全体の検証を実行しないでください。

イメージビルドにはデータベースがなく、データベースに依存してはいけません。データベース/プロセス環境のモジュールはサーバー専用とし、共有の型/定数は別モジュールに置いてください。安全な非接続時の経路がない限り、データベースクエリをプリレンダリングしないでください。記憶している API に頼らず、インストールされているフレームワークのローカルドキュメントを確認してください。

タスクがソースの配送を承認している場合にのみ、意図したソース変更だけをコミットして push してください。その後:

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
```

この専用の待機はイメージビルドとリリースの両方をカバーしています。その前に GitHub ワークフロー全体の待機を挟まないでください。Actions のクリーンアップはイメージの公開より長くかかることがあります。`gh run list` と `gh run view --log-failed` は、リリースが現れない場合に使用し、毎回のイテレーションでは使わないでください。

コミット/バージョンの区切りを指定しない待機は、古い正常なリリースを受け入れてしまう可能性があります。`Release:` はデプロイ済みの状態で、`Image:` は Stack の初期イメージです。固定の想定リリースは、代わりにソースがサポートする `--release-version` フラグで選択できます。

## 4. データベースと設定

接続は `DATABASE_URL`、ホスト、ポート、名前、ユーザー、パスワード、読み取り可用性のメタデータを提供します。生成された値をコピーしたり、ビルド時に要求したりしないでください。ローカルでの非接続レンダリングは、マネージドデータベースの証明にはなりません。

```bash
apth databases list {{.ProjectID}}
apth databases tables {{.ProjectID}} "$DATABASE"
apth databases changes create --help
apth apps env get "$APP"
apth apps env set "$APP" LOG_LEVEL=debug FEATURE_X=on
apth apps env unset "$APP" FEATURE_X --yes
apth apps logs "$APP" --tail 200
```

デモ専用のスキーマ作成は遅延的かつ冪等にしても構いません。プロダクトのスキーマ変更は、宣言された変更/承認の経路を使うべきです。環境変数の設定は指定したキーをマージし、Web ワークロードをロールします。シークレットを含むキーには `--sensitive` を使い、トレースを無効にし、チャットにシークレットを含めないでください。生成された接続の認証情報を置き換えないでください。

## 5. 公開とユーザーとしての検証

```bash
apth apps publish "$APP" --wait --timeout 5m
apth publishes readiness {{.ProjectID}}
apth apps get "$APP"
```

ベースドメインから推測したホスト名ではなく、返された公開 URL を使用してください。新しい接続を開始し、必要な認証を完了し、関連する安全なユーザー操作を実行して、永続化された状態を読み戻してください。インタラクティブな UI では、一貫したブラウザ操作と安定したセマンティックセレクターを使用してください。リダイレクト、既存の Cookie、Pod Ready、成功した Operation エンベロープだけでは不十分です。

## 6. 再試行の前に診断する

- 生成された Web 環境変数の `SecretNotFound`: 接続の進行状況を調べてください。過去の実績では投影に約 1 分かかりました。
- `ImagePullBackOff`: イメージの可視性/プル権限と、失敗したビルドの出力を調べてください。
- 公開の DNS が保留中: 公開の準備状況を調べてください。過去の実績では伝播は通常 3 分未満でした。
- HTTP 401: このプロファイルのログインを更新してください。
- HTTP 409 `delivery_pending`: SDK が既に約 30 秒再試行しています。範囲を限定した再実行を 1 回行う前に進行状況を調べてください。
- HTTP 409 `delivery_blocked`: プラットフォームの運用者に連絡してください。再試行では根本原因は解決しません。
- 5 分経っても新しいリリースがない: 古い安定したワークロードを再起動するのではなく、イメージビルドを調べてください。

ここでは Actor が利用可能であるとは想定されていません。上流のオプションの Actor ワークフローには、別途プロビジョニングされたクライアント認証情報と、確認済みのランタイム機能コントラクトが必要です。通常のデバイスログインの認証情報は代わりになりません。新しいクライアントを発行したり、過去のデモ手法がこの Project に存在すると想定したりしないでください。

## 7. クリーンアップと報告

削除が明示的に依頼され、データ保持への影響が理解されている場合にのみ実行してください:

```bash
apth apps delete "$APP" --yes --wait --timeout 5m
```

付随的なクリーンアップとして、ソースリポジトリや Project を削除しないでください。意図したソース/イメージ、観測したリリース、実行した正確な公開操作、範囲を限定したチェック、クリーンアップ、観測できなかった境界を報告してください。タイムアウトを成功と呼んだり、このガイドがインフラへのアクセスを承認したかのように示唆したりしないでください。

---
title: "マネージドデータベースを安全に使う"
summary: "接続シークレットを露出させずにデータベースの状態を確認し、管理されたスキーマ変更の手順を選択します。"
audience: "developer"
section: "apth"
order: 50
tags: ["databases", "schema", "secrets"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/databases.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# マネージドデータベースを安全に使う

アプリケーションテンプレートは PostgreSQL をプロビジョニングし、web Component に接続できます。Agent Guide 自体はデータベースを持ちません。これらのドキュメントを読むためだけにデータベースをプロビジョニングしないでください。

## 発見してから確認する

```bash
apth databases list {{.ProjectID}}
apth databases get {{.ProjectID}} "$DATABASE"
apth databases runtime-topology {{.ProjectID}} "$DATABASE"
apth databases tables {{.ProjectID}} "$DATABASE"
```

`$DATABASE` は、割り当てられた Application の Component グラフから選択してください。行の確認が許可されている場合は、`$SCHEMA` と `$TABLE` を対象テーブルに正確に設定し、結果の件数を制限してください。

```bash
apth databases rows {{.ProjectID}} "$DATABASE" "$SCHEMA" "$TABLE" --limit 10
```

行には個人情報や機密データが含まれる場合があります。出力を制限したからといって、それをチャットに貼ってよいという許可にはなりません。可能な場合は、件数や秘匿化した事実を優先してください。

## 接続の所有権

接続により `DATABASE_URL`、`DATABASE_HOST`、`DATABASE_PORT`、`DATABASE_NAME`、`DATABASE_USER`、`DATABASE_PASSWORD`、`DATABASE_READ_AVAILABLE` が注入されます。アプリの環境ビューでは、生成された値が接続の所有であることが示されます。これらの値をコピーしたり、パスワードをハードコードしたり、生成された設定を別の認証情報ソースで置き換えたりしないでください。

ビルドにはデータベース接続がありません。データベースアクセスはサーバー側に限定し、クライアントバンドルに含めないでください。イメージの作成中に稼働中のデータベースを必要としないでください。データベースなしのローカル開発ページで証明できるのは、未接続時の動作だけです。マネージド接続は、デプロイされた Application を通じて証明してください。

## スキーマ変更

使い捨てのデモでは、ソースのワークフローは冪等な遅延テーブル作成を許容しています。プロダクトでは、宣言的なデータベース変更と、そのレビュー／承認ポリシーを使用してください。

```bash
apth databases changes list {{.ProjectID}} "$DATABASE"
apth databases changes ledger {{.ProjectID}} "$DATABASE"
apth databases changes create --help
apth databases sql --help
```

create コマンドは型付きのリクエストボディを受け取ります。実行する前に、現在のスキーマを取得し、正確なマイグレーションを準備してください。フラグを推測で作り出したり、台帳のドリフトを黙って承認したり、不明な状態の修復として任意の SQL スクリプトを使用したりしないでください。バックアップ／リストア、認証情報の発行、破壊的なスキーマ操作には、別途明示的なスコープが必要です。

データベースの削除はトラブルシューティングの手順ではありません。タスクがこのデータベースの削除を明示的に求めている場合は、まずバックアップと保持を確保し、そのうえで所有する Stack のライフサイクル、またはドキュメント化されたデータベース削除コマンドを `--yes` 付きで使用してください。Application を削除してもデータが保持されると決して想定しないでください。

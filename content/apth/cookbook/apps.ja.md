---
title: "アプリを作成、開発、公開する"
summary: "初期イメージとデプロイ済みのリリースを混同せずに、高レベルの Application ワークフローを使います。"
audience: "developer"
section: "apth"
order: 30
tags: ["apps", "deploy", "logs"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# アプリを作成、開発、公開する

タスクで承認された正確な Application 名を使ってください。以下のコマンドの `$APP` はその DNS ラベル形式の名前であり、Project 識別子ではありません。まず現在のプロファイルを確認してください。

```bash
apth context show
apth apps list
apth application-templates list {{.ProjectID}}
apth placement-zones list
```

## 作成

```bash
apth apps create "$APP" --template nextjs-postgres --visibility public --publish --wait --timeout 15m
apth apps get "$APP"
```

テンプレートを使う方法では、ソースリポジトリ、イメージビルド、web/データベースの Stack、接続、Publish が作成されます。ソースの public 公開設定と公開には承認が必要です。機密コードに対してこの例をそのまま使わないでください。配置が曖昧な場合は、独自に作り出さず、返された placement-zone ID を使ってください。

自己完結型の既存イメージの場合は、`$IMAGE_REF` に検証済みで pull 可能な参照を設定してください。

```bash
apth apps create "$APP" --image "$IMAGE_REF" --publish --wait --timeout 15m
```

固定のイメージタグを指定するとそのタグが選択されます。クォートした `:^edge-` セレクターを指定すると、一致するタグに追従します。Next.js テンプレートはデフォルトでマネージドの `nodejs-24` ランタイムを使います。コードのみのイメージには明示的な `--runtime nodejs-24` が必要です。`--runtime none` は自己完結型イメージ向けのオプトアウトであり、コードのみの成果物に対する修正策ではありません。

## push によるリリースを観察する

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
```

意図したコミットを push した後に実行してください。タイムスタンプにより、すでに正常な古いリリースで待機が満たされてしまうことを防ぎます。`Release:` はロールアウトされたもので、`Image:` は Stack の元のイメージです。このリリースの待機の前に、ビルドワークフロー全体の完了を待たないでください。push 後のクリーンアップはイメージの公開より長くかかることがあります。

## 設定と確認

```bash
apth apps env get "$APP"
apth apps env set "$APP" LOG_LEVEL=debug FEATURE_X=on
apth apps env unset "$APP" FEATURE_X --yes
apth apps logs "$APP" --tail 200
```

環境変数の更新は指定したキーをマージし、web ワークロードをロールします。生成された接続値はプラットフォームが所有します。データベース URL やシークレット値をチケットに絶対にコピーしないでください。必要な非シークレットのフィールドのみを確認してください。安全な変数にすでに保持している非公開の値については、トレースを無効にし、sensitive としてマークしてください。

```bash
set +x
apth apps env set "$APP" SERVICE_SECRET="$SERVICE_SECRET" --sensitive SERVICE_SECRET
```

## 公開と検証

```bash
apth apps publish "$APP" --wait --timeout 5m
apth publishes readiness {{.ProjectID}}
```

推測したホスト名ではなく、アプリが実際に返した URL を使ってください。`{{.BaseDomain}}` はインストール環境のベースドメインであり、すべての Application のルートを保証するものではありません。新しい接続を開始し、該当するブラウザ/API の操作を実行して、永続化された状態を読み戻してください。認証リダイレクトは、認証済みのプロダクト操作が成功したことを意味しません。

## 割り当てられたアプリのみを削除する

```bash
apth apps delete "$APP" --yes --wait --timeout 5m
```

これにより、ApplicationStack と、データベースや Publish リソースを含むその管理対象のグラフが削除されます。事前に保持/データ損失の影響を確認してください。クリーンアップの近道として、Project 全体や無関係なソースリポジトリを削除しないでください。

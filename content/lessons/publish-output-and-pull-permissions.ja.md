---
title: "公開された成果物と pull 権限を検証する"
summary: "公開されたパッケージ、ディスパッチされたワークフロー、利用可能なランタイム成果物は、それぞれ異なる結果です。"
audience: "both"
section: "lessons"
order: 80
tags: ["publication", "permissions", "artifacts"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-06-first-party-app-repo-separation-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-first-party-apps-own-repositories.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-catalog-publisher-and-follow-semantics.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# 公開された成果物と pull 権限を検証する

## 過去の観察

ファーストパーティアプリの分離作業により、ソース上には存在するものの、デプロイ済みの設定が欠けている公開経路が見つかりました。カタログ API の受領応答だけでは、署名済み成果物が公開されたことの証明にはなりませんでした。これとは別に、誤った GitHub 権限を持つ認証情報や、可視性の設定によって利用者が pull できないパッケージに起因する障害も発生しました。

## 再利用可能なルール

次の段階で消費されるプロダクトの出力を検証してください。具体的には、署名済みカタログの内容、正確なイメージダイジェスト、到達可能な依存パッケージ、ランタイムでの pull 可否です。ワークフローのディスパッチや API による受け付けは中間イベントであり、最終的な証拠ではありません。

権限は用途ごとに異なります。リポジトリへのアクセス権があっても、ワークフローのディスパッチ、パッケージへのアクセス、カタログの公開、ランタイムでのイメージ pull の権限があるとは限りません。公開者の ID で成功しても、ランタイムが同じアクセス権を持つことの証明にはなりません。公開を動作させるためだけに、管理者用の認証情報を新しいアプリリポジトリへコピーしないでください。

## エージェントの対応

イメージの pull に失敗した場合は、アプリケーションコードを変更したりワークロードを再起動したりする前に、失敗したビルド／公開ステップ、イメージ参照、パッケージの可視性、承認済みのランタイムアクセスを確認してください。外部パッケージが、公開者のローカルワークスペースだけでなく、実際のツールチェーンから利用可能であることを確認してください。

公開が Project タスクの権限の範囲外である場合は、欠けている成果物または権限をその所有者に報告してください。スコープを広げたり、別の環境のトークンを再利用したり、署名済みカタログの検証を任意のイメージ上書きで置き換えたりしないでください。

これらは過去の教訓です。引用した issue で提案されている公開者ごとのスコープ設定やストリーム拡張を、現在提供済みの機能として示してはいけません。

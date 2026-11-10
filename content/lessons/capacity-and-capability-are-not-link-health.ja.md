---
title: "容量と能力はリンクの健全性ではない"
summary: "依存リンクを健全と判断する前に、ブランチ単位の容量と、実際に要求される能力を確認してください。"
audience: "both"
section: "lessons"
order: 40
tags: ["readiness", "capacity", "dependencies"]
sources:
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/engineering/2026-11-05-demo-driven-defect-discovery-lessons.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:50-projects/appthrust/issues/2026-11-05-marketplace-managed-staging-consumes-only-gpu.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# 容量と能力はリンクの健全性ではない

## 過去の観察

ある Marketplace の推論アプリが、それぞれ GPU を 1 基ずつ要求する production と staging のワークロードを作成しました。利用可能な GPU は 1 基しかなかったため、staging がそれを確保し、production は pending のままになりました。依存リンクは、production の能力が使用可能でなくても ready に見えることがありました。これとは別に、モデル一覧のエンドポイントは応答していた一方で、コンシューマーのプロンプトはサポートされるコンテキスト予算を超えていました。

ブランチポリシーの修正により、オーナーレベルで有効なブランチの意図が提供されました。このインシデントではカタログ配布のフォローアップも記録されましたが、ソースの解決だけでは、すべてのカタログがそれを採用したことは証明されませんでした。

## 再利用可能なルール

次のコンシューマーが実際に何を必要としているかを確認してください。正しいブランチ、十分な容量、プロバイダー設定、そしてモデルの入力予算のような能力の契約です。到達可能な Service や成功したモデル一覧は、安全で代表的な呼び出しよりも弱い証拠です。

希少なハードウェアを要求する前に、有効なすべてのブランチにわたってリソースを数えてください。ノードの追加はクォータやコストの理由で失敗することがあり、アプリケーションのタスクによって自動的に許可されるものではありません。

## エージェントの対応

モデル、ネットワーク、リトライポリシーを疑う前に、ブランチ単位のリリース状態と割り当てを調べてください。Stack がブランチを管理している場合は、所有元のサポートされた意図を変更してください。子リソースを削除したり、所有関係を外して reconcile を止めたりしないでください。レビューされていない回避策として、production を staging にリルートしないでください。

レポートでは 2 つの主張を分けてください。要求されたブランチでインフラの容量が利用可能だったことと、実際のプロダクトのアクションが成功したことです。どちらかが観測されていない場合は、そのように記載してください。これらのインシデントは過去の障害の類型を説明するものであり、この Project の現在の容量を示すものではありません。

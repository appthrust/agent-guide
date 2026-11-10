---
title: "失敗した境界からトラブルシューティングする"
summary: "何かを変更する前に、認証、配送、イメージ、ランタイム、公開、プロダクトの各失敗を切り分けます。"
audience: "developer"
section: "apth"
order: 90
tags: ["troubleshooting", "readiness"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/components.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "AGENTS.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# 失敗した境界からトラブルシューティングする

何が失敗したか、正確な Project/Application、観測時刻、選択されたリリース、型付きの理由を記録してください。仮説は根本原因ではありません。考えられる原因を切り分けられる最小限の読み取りから始めてください。

```bash
apth whoami
apth apps get "$APP"
apth apps logs "$APP" --tail 200
apth components delivery {{.ProjectID}} "$COMPONENT"
apth components release-state {{.ProjectID}} "$COMPONENT"
apth components runtime-status {{.ProjectID}} "$COMPONENT"
apth publishes readiness {{.ProjectID}}
```

この Application に対して返された ID を使用し、表示タイトルから Component を推測しないでください。CLI が自身の認証情報を保護していても、ログにはアプリケーションのシークレットが含まれる場合があります。範囲を限定し、伏せ字にしてください。

## 結果を解釈する

| 観測 | 意味と次のステップ |
| --- | --- |
| HTTP 401 または無効な `whoami` | このプロファイルに対して出力されたログインのヒントに従ってください。認証情報の期限切れはワークロードの失敗ではありません。 |
| HTTP 409 `delivery_pending` | GitOps 配送が収束中です。SDK のリトライですでに約 30 秒を費やしています。範囲を限定した再実行を 1 回行う前に進捗を確認してください。 |
| HTTP 409 `delivery_blocked` | 配送ルートが不健全です。運用者に連絡し、ループしないでください。 |
| `project is required` | `apth context set --project {{.ProjectID}}` を設定するか、コマンドが必要とする位置引数の Project を指定してください。 |
| 配置があいまい | `apth placement-zones list` を確認し、返されたゾーンのうち認可されたものを選択してください。 |
| 生成された web 環境変数で `SecretNotFound` | 接続のプロジェクションがまだ保留中の可能性があります。過去の実績では作成後約 1 分です。認証情報を捏造せず、進捗を確認してください。 |
| `ImagePullBackOff` または解決済みイメージがない | イメージの可視性、pull の認可、ビルド結果を確認してください。 |
| Publish の DNS が保留中 | Publish の readiness と証明書/DNS の状態を確認してください。過去の伝播は通常 3 分未満でしたが、期限を保証するものではありません。 |
| push 直後に Application の待機がすぐに戻る | 古い健全なリリースを観測しています。コミット時刻/バージョンのフェンスを追加してください。 |
| 5 分経っても新しいリリースがない | `gh run list` とその失敗ログでソースビルドを確認してください。健全な古いワークロードを再起動しないでください。 |
| Marketplace `NeedsConfiguration` | 認可された入力を使って、宣言された認証情報/リンクの要件を満たしてください。レポートにシークレットを含めてはいけません。 |
| Marketplace `Degraded` | その condition を読んでください。現在のグラフ/スキーマの失敗は、健全な古い安定リリースと共存することがあります。 |

新しく push したコミットの場合:

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
```

## readiness のはしごを順にたどる

1. **アイデンティティ**: 正しい API、Project、認証情報、Application、リリース。
2. **受理された意図**: グラフ/スキーマと配置の決定が受理されている。
3. **配送とリリース**: 現在の generation が観測され、目的のイメージが安定状態に達している。
4. **ランタイム**: 関連するワークロードとデータベース接続が機能している。
5. **公開**: 実際に返された URL で、ルート、DNS、TLS、認可が機能している。
6. **プロダクト**: 新しい認証済みリクエストが要求されたアクションを実行し、永続化された状態を読み戻せる。

リダイレクトは、サインインもプロダクトの動作も証明しません。古いブラウザセッションは、新しいトークンの発行も新規の OAuth ログインも証明しません。readiness バッジを変化させるために、ステータスのクリア、Project の削除、権限の拡大、アンインストール/再インストールを行わないでください。失敗している境界が観測できないインフラストラクチャである場合は、伏せ字にした証拠と不足している正確な権限を運用者に送ってください。

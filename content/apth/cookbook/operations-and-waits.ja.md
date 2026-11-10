---
title: "盲目的な再試行をせずに Operation を観察する"
summary: "待機に上限を設け、意図したリリースに結び付け、トランスポートの再試行と新しい復旧リクエストを区別します。"
audience: "developer"
section: "apth"
order: 80
tags: ["operations", "waits", "idempotency"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/app_installations.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "design/platform/marketplace-apps/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# 盲目的な再試行をせずに Operation を観察する

書き込みが成功したというレスポンスは、意図が受理されたことを意味するだけで、プロダクトが稼働していることを意味するとは限りません。進捗を報告する際は、Operation ID、正確な対象、冪等性キー、最後の condition を保持してください。

## 問いに答える待機を選ぶ

| 問い | 仕組み |
| --- | --- |
| Operation エンベロープは完了したか？ | レスポンスに `operation.links.self` がある場合、ミューテーションに `--wait --timeout 2m` を付ける |
| push したコミットのイメージが配信されているか？ | コミット時刻またはバージョンのフェンスを付けた、専用の Application リリース待機 |
| レジストリのタグ一覧取得は完了したか？ | レジストリ同期の待機。これはアプリのリリースを待機しません |
| プロダクトは動作しているか？ | 新しい公開接続と、関連する認証済みのインタラクション |

```bash
apth apps wait "$APP" --released-after "$(git log -1 --format=%cI)" --timeout 10m
apth apps get "$APP"
apth registries sync {{.ProjectID}} "$REGISTRY" --wait --timeout 2m
apth operations overview --project {{.ProjectID}}
```

専用の `apps wait` コマンドには、冗長な `--wait` は不要です。条件を付けずに現在のヘルスを待機すると、push 直後に以前のリリースを観測して即座に返ることがあります。意図したコミットに結び付けてください。レジストリ同期は、タグ一覧取得が `pending` を抜けた時点で返ります。`failed` とタイムアウトはエラーであり、アプリのデプロイの証明ではありません。

## 冪等性は無制限の再試行ではない

ミューテーションは `--idempotency-key` を受け付けます。キーを再利用するのは、同じ論理リクエストと同じボディを安全に再送する場合だけにしてください。ネットワークの結果が不確かになるたびに新しいキーを生成しないでください。まずリソースまたは Operation を確認してください。

Marketplace のグラフが部分的に失敗した場合は、新しい論理的な試行の前に原因を修正してください。Marketplace の契約では、完了して失敗したキーのエラーが保持されます。修正したグラフで試行するには、古いキーが再開することを期待するのではなく、新しいキーが必要です。これは、ブロックされたリリースに対する明示的な復旧の発生とは別物です。

```bash
apth app-installations retry-release "$INSTALLATION" --project {{.ProjectID}} --idempotency-key "$RETRY_KEY" --wait --timeout 2m
```

再試行の受理応答は、リリースの復旧が完了したことを証明しません。その後で Component のリリース状態を読み取ってください。

## エラーは型付けされた意味に従って扱う

- **401**：CLI が示すプロファイル固有のログインのヒントに従ってください。無関係な認証情報で再試行しないでください。
- **409 `delivery_pending`**：SDK がすでに約 30 秒間再試行しています。それでも pending の場合は、進捗を確認し、短く上限のある間隔を置いてから、同じリクエストを一度だけ再試行してください。
- **409 `delivery_blocked`**：中止して、プラットフォームの運用者に連絡してください。再試行を重ねても配送の根本は修復されません。
- **その他の競合または終端的な失敗**：正確なコードを保持し、診断してください。ある型付けされた競合に対するルールは、すべての 409 の再試行を認めるものではありません。
- **タイムアウト**：最後に観測した状態と、満たされなかった述語を報告してください。期限を延長したり何かを変更したりする前に、証拠を確認してください。

独立した開発作業はプロビジョニングと並行して進めてかまいませんが、失敗を無人の再試行ループに隠さないでください。

---
title: "アクセスキーでガイドを読む"
summary: "最小権限のガイド用キーを作成し、そのアサーションを非公開で取得し、不要になったら失効させます。"
audience: "developer"
section: "apth"
order: 70
tags: ["auth", "access-keys", "agents"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/accesskeys.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "sdk/access.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# アクセスキーでガイドを読む

Agent Guide のキーが許可するのはこのガイドの読み取りであり、Project の管理やクラスターの運用ではありません。`agent-guide` スペースが付与するのはスコープ `read` のみです。ユーザーの Platform CLI ログインとアプリのアクセスキーは別々の認証情報です。一方を他方の代わりに使わないでください。

## 確認と作成

```bash
apth access-keys spaces list --project {{.ProjectID}}
apth access-keys list --project {{.ProjectID}} --space agent-guide
```

**エージェントの設定**（Agent setup）パネルは、サインイン中のユーザーの権限でキーを作成し、そのシークレットを一度だけ表示します。シークレットマネージャーに保管してください。アプリは後から取得できるようには保存しません。

CLI で作成する場合、サポートされているコマンドは `--space agent-guide --scope read --env` を使います。標準出力にシークレットが含まれるため、ターミナル、トランスクリプト、CI ログには決して出さず、非公開のファイルへ直接書き出してください。

```bash
set +x
umask 077
key_file="$(mktemp)" || exit
apth access-keys create --project {{.ProjectID}} --space agent-guide --scope read --label agent-session --env > "$key_file"
```

このファイルには `AGENT_GUIDE_API_KEY` と `AGENT_GUIDE_ACCESS_URL` の代入が含まれます。承認済みの非公開シークレット読み込み手段でこれらを受け渡し、その後ファイルを削除してください。ファイルを `cat` したり、添付したり、レビューしていないシェルテキストを source したりしないでください。作成に失敗した場合は、再試行する前にファイルを削除してください。CLI の応答がないことをもって、キーが作成されなかった証拠とみなさないでください。`--external` には Project 管理者の権限が必要であり、このフローには不要です。

## トークンを表示せずに交換と取得を行う

`AGENT_GUIDE_ACCESS_URL` は Platform API のオリジン（`{{.AccessURL}}`）です。交換はそのオリジンの `/api/v1/access/token` に POST します。これはガイドの公開オリジンでは**ありません**。

キーを非公開で読み込んだ状態で、次を実行します。

```bash
set +x
assertion="$(apth access-keys exchange --access-url '{{.AccessURL}}' <<<"${AGENT_GUIDE_API_KEY:?Supply the key privately}")" || exit
printf 'Authorization: Bearer %s\n' "$assertion" |
  curl --fail --silent --show-error --header @- '{{.PublicURL}}/llms.txt'
unset assertion
```

これは短命のアサーションをメモリ上に保持し、ヘッダーを HTTP のコマンドライン引数ではなく標準入力経由で渡します。シェルのトレース、HTTP の詳細モード、ヘッダーのログ記録を有効にしないでください。長期間有効なキーをドキュメントのエンドポイントに直接送らないでください。

アサーションでは `/md/<slug>.md`、`/llms-full.txt`、`/skills/<name>/SKILL.md` を読み取れます。このアプリのユーザー専用のコンテキストエンドポイントは使えません。そこでは `403 key_subject` が想定どおりの結果であり、キーのスコープを広げる理由にはなりません。

## 確認と廃止

`get` が返すのはキーのメタデータであり、シークレットではありません。`$KEY_NAME` はスコープを絞った一覧から選んでください。

```bash
apth access-keys get "$KEY_NAME" --project {{.ProjectID}}
apth access-keys disable "$KEY_NAME" --project {{.ProjectID}} --yes
apth access-keys enable "$KEY_NAME" --project {{.ProjectID}}
apth access-keys revoke "$KEY_NAME" --project {{.ProjectID}} --reason completed --yes
```

これらは選択肢であり、何も考えずに順番に実行するものではありません。無効化は元に戻せますが、失効は恒久的です。作業が終わったらローカルのキー情報を削除してください。`access_key_expired`、`access_key_revoked`、`access_key_disabled` が返された場合は作業を止め、所有者にキーのライフサイクルを修復してもらってください。ブラウザの Cookie を取得して使わないでください。

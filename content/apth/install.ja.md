---
title: "apth とエージェントスキルのインストール"
summary: "開発者向け CLI をソースからビルドし、同梱スキルと環境固有スキルの違いを理解します。"
audience: "developer"
section: "apth"
order: 10
tags: ["install", "skills"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "vault:appthrust/cli/install.sh", revision: "cf7ae703425a682d97a84a204baf8a455014087b" }
---

# apth とエージェントスキルのインストール

`apth` は開発者向けの CLI です。AppThrust Go SDK を通じて Public API を呼び出します。運用者向け CLI のエイリアスではありません。

## CLI のインストール

`appthrust/cli` の公開インストーラーを使ってください。認証やトークンは不要です。

```bash
curl -fsSL https://raw.githubusercontent.com/appthrust/cli/main/install.sh | sh -s -- apth
```

- バージョンを省略すると、最新の `apth` リリースが選ばれます。公開済みのバージョンを指定するには、ツール名の接頭辞を除いたタグを末尾に追加してください。たとえば `apth-v0.1.0` ではなく `v0.1.0` です。
- Linux と macOS（`linux`/`darwin`）の `amd64`、`arm64` に対応しています。インストール前に、リリースの `SHA256SUMS` を使ってアーカイブのチェックサムを検証します。
- インストール先のデフォルトは `~/.local/bin` です。変更する場合は、実行前に `APTH_INSTALL_DIR` を export してください。インストール先をシェルの `PATH` に追加する必要があります。

最初の公開リリースは `apth-v0.1.0` です。インストーラーを使えない場合は、代わりに以下の手順でソースからビルドしてください。プラットフォームリポジトリへのアクセス権、チェックアウト、Go ツールチェーンが必要です。

```bash
# Run from the platform repository root.
go build -o ~/.local/bin/apth ./apth-cli/cmd/apth
apth --help
```

ソースビルドの出力先は `~/.local/bin` です。シェルの `PATH` に追加してください。バイナリリリースの URL を推測しないでください。

```bash
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth skills list
apth skills install
```

## スキルのインストール先

デフォルトのインストールでは、同梱スキルが `~/.claude/skills`、`~/.codex/skills`、`~/.agents/skills` に書き込まれます。OMP は agents ディレクトリに加えて、Claude と Codex のディレクトリも読み込みます。これらのファイルは CLI に埋め込まれているため、インストールにネットワークは不要です。

同梱スキルの内容を確認する場合、または現在のリポジトリにのみインストールする場合は次のようにします。

```bash
apth skills show appthrust-app-dev
apth skills install --agent claude --scope project
```

インストール済みのコピーが同一であれば、そのまま残されます。内容が異なるコピーは、確認のうえで明示的に `--force` を指定しない限り上書きされません。同梱スキルのテキストには、別の環境向けのデフォルト値が含まれている場合があります。環境固有の版は `{{.PublicURL}}/skills/appthrust-app-dev/SKILL.md` で提供されています。[はじめに]({{.PublicURL}}/md/start-here.md) に記載された認証付きの手順で取得してください。CLI は、ガイドの URL からのリモートスキルインストールを実装していません。

以前にインストールした同梱スキルのみを削除するには、明示的な権限のもとで次を実行します。

```bash
apth skills uninstall appthrust-app-dev --yes
```

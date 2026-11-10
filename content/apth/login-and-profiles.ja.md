---
title: "ログインして Project を選択する"
summary: "この Platform API にはデバイスログインを使い、環境ごとの profile を分けて管理します。"
audience: "developer"
section: "apth"
order: 20
tags: ["auth", "profiles"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# ログインして Project を選択する

```bash
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}}
apth whoami
apth context show
```

トークンを指定しない場合、login はデバイス認可フローを開始します。CLI が出力する検証 URL とユーザーコードを人間に提示し、承認が完了するまでコマンドを実行したままにしてください。ヘッドレスなホストでは、その URL をそのまま別のマシンで開いてください。ブラウザ起動に関する警告は認証失敗ではありません。CLI は認証情報を非公開で保存し、トークンを出力することはありません。

`whoami` は API を呼び出します。`tokenValid: true` と想定どおりのログインが返れば、保存された認証情報が受け入れられていることが確認できます。オフラインでの確認では有効性は確認できません。`authenticated: false`、`tokenValid: false`、または HTTP 401 が返った場合は、出力されたログインのヒントに従ってください。より強い権限で変更操作を再試行しないでください。

## 環境ごとに profile を分ける

```bash
apth profiles list
apth login --api-url {{.PlatformAPIURL}} --project {{.ProjectID}} --profile guide-project
apth profiles use guide-project
apth context set --project {{.ProjectID}}
apth projects list
```

書き込みの前に、API URL、Project、ID を確認してください。保存済みの kubeconfig や見慣れたドメインサフィックスは、正しい対象であることの根拠にはなりません。別の profile の認証情報をログやチャットにコピーしないでください。

秘密情報を含まない profile 設定と秘密の認証情報は別々に管理されます。認証情報ストアは `~/.config/appthrust/credentials.json` で、モード `0600` で書き込まれます。トラブルシューティングの根拠としてその内容を読んだり添付したりしないでください。

Cloud アカウントでのログインと Platform API への直接ログインでは、ルーティングが異なります。Cloud セッションがあっても、Platform リソースを直接操作するコマンドが自動的に Cloud の project プロキシルートを使うようにはなりません。このガイドでは `{{.PlatformAPIURL}}` を対象とする Platform profile を維持してください。

## セッションのライフサイクル

元のアプリ開発ワークフローでは、Dashboard が発行する CLI 認証情報の有効期間はおよそ 12 時間と計測されていました。ここではその期間を前提とせず、API が返す有効性の結果を正としてください。必要に応じてデバイスログインで更新してください。Platform の logout はローカルの認証情報を消去します。

```bash
apth logout --profile guide-project
```

logout は、別途発行された Agent Guide のアクセスキーを失効させません。そのキーは [アクセスキーのクックブック]({{.PublicURL}}/md/apth/cookbook/access-keys.md) を参照して管理してください。

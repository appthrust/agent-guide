// The Agent setup panel on the home page.
import { defineDashboardMessages } from '@appthrust/platform-dashboard-i18n'

export const setupMessages = defineDashboardMessages({
  'guide.setup.title': { defaultMessage: 'Agent setup', translations: { ja: 'エージェントの設定' } },
  'guide.setup.lead': {
    defaultMessage: 'Connect a coding agent such as Claude Code, Codex or OMP to this Project.',
    translations: { ja: 'Claude Code、Codex、OMP などのコーディングエージェントをこの Project につなぎます。' },
  },
  'guide.setup.signedInAs': { defaultMessage: 'Signed in as {login}', translations: { ja: '{login} としてサインイン中' } },
  'guide.setup.role': { defaultMessage: 'Role: {role}', translations: { ja: 'ロール: {role}' } },
  'guide.setup.project': { defaultMessage: 'Project', translations: { ja: 'Project' } },
  'guide.setup.platformApi': { defaultMessage: 'Platform API', translations: { ja: 'Platform API' } },
  'guide.setup.release': { defaultMessage: 'Guide release', translations: { ja: 'ガイドのリリース' } },
  'guide.setup.apps': { defaultMessage: 'Apps in this Project', translations: { ja: 'この Project のアプリ' } },
  'guide.setup.loginTitle': { defaultMessage: 'Log in with apth', translations: { ja: 'apth でログイン' } },
  'guide.setup.loginBody': {
    defaultMessage: 'Run once on the machine the agent uses. It starts a device login against this environment and selects this Project.',
    translations: { ja: 'エージェントを動かすマシンで一度だけ実行します。この環境へのデバイスログインを始め、この Project を選択します。' },
  },
  'guide.setup.keyTitle': { defaultMessage: 'Give the agent read access to this guide', translations: { ja: 'このガイドを読む権限をエージェントに渡す' } },
  'guide.setup.keyBody': {
    defaultMessage: 'Creates a read-only Access Key in the agent-guide space with your own apth login, then exchanges it for a short-lived assertion.',
    translations: { ja: 'あなたの apth ログインで、agent-guide スペースに読み取り専用の Access Key を作り、有効期間の短いアサーションに交換します。' },
  },
  'guide.setup.labelField': { defaultMessage: 'Key label', translations: { ja: 'キーのラベル' } },
  'guide.setup.labelHint': {
    defaultMessage: 'Shown in the key list so you can tell keys apart, for example the machine or agent it is for.',
    translations: { ja: 'キーの一覧で見分けるための名前です。使うマシンやエージェントの名前などを入れます。' },
  },
  'guide.setup.labelRequired': { defaultMessage: 'Enter a label.', translations: { ja: 'ラベルを入力してください。' } },
  'guide.setup.create': { defaultMessage: 'Create agent key', translations: { ja: 'エージェント用のキーを作成' } },
  'guide.setup.another': { defaultMessage: 'Start over', translations: { ja: 'やり直す' } },
  'guide.setup.blockTitle': { defaultMessage: 'Run this in the agent’s shell', translations: { ja: 'エージェントのシェルで実行' } },
  'guide.setup.onceTitle': { defaultMessage: 'The key secret is shown only once', translations: { ja: 'キーのシークレットは一度しか表示されません' } },
  'guide.setup.onceBody': {
    defaultMessage:
      'apth prints the secret a single time and this page never receives or stores it. Never paste the key or the assertion into chats, issues or logs; if one leaks, revoke the key with apth access-keys revoke.',
    translations: {
      ja: 'シークレットは apth が一度だけ出力し、このページが受け取ったり保存したりすることはありません。キーやアサーションをチャット、Issue、ログに貼らないでください。漏れた場合は apth access-keys revoke でキーを失効させてください。',
    },
  },
  'guide.setup.whyCommand': {
    defaultMessage: 'Why a command instead of a button? Your session token stays with the sign-in edge, so this page cannot call the Platform API for you.',
    translations: { ja: 'ボタンではなくコマンドなのは、セッションのトークンがサインインのエッジにとどまり、このページからは Platform API を呼べないためです。' },
  },
})

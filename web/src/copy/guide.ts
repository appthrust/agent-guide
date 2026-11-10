// Home, document, skills and llms.txt pages.
import { defineDashboardMessages } from '@appthrust/platform-dashboard-i18n'

export const guideMessages = defineDashboardMessages({
  'guide.home.lead': {
    defaultMessage: 'Everything a coding agent needs to operate this AppThrust Project with apth and apthctl, rendered with this environment’s real values.',
    translations: { ja: 'コーディングエージェントが apth と apthctl でこの AppThrust Project を操作するための情報を、この環境の実際の値で表示しています。' },
  },
  'guide.home.noStartHere': {
    defaultMessage: 'This release has no Start here document. Pick a document from the list.',
    translations: { ja: 'このリリースには「はじめに」のドキュメントがありません。一覧からドキュメントを選んでください。' },
  },
  'guide.doc.showOriginal': { defaultMessage: 'View the original (English)', translations: { ja: '原文（English）を見る' } },
  'guide.doc.showTranslation': { defaultMessage: 'Back to the translation', translations: { ja: '日本語訳に戻る' } },
  'guide.doc.untranslated': {
    defaultMessage: 'This document has no translation yet, so the English original is shown.',
    translations: { ja: 'このドキュメントはまだ日本語に翻訳されていないため、原文（English）を表示しています。' },
  },
  'guide.doc.copyMarkdown': { defaultMessage: 'Copy as Markdown', translations: { ja: 'Markdown をコピー' } },
  'guide.doc.raw': { defaultMessage: 'Open raw .md', translations: { ja: '.md をそのまま開く' } },
  'guide.doc.sources': { defaultMessage: 'Sources', translations: { ja: '出典' } },
  'guide.doc.sourcesLead': {
    defaultMessage: 'Distilled from these platform repository files, at the revision shown.',
    translations: { ja: 'プラットフォームのリポジトリにある次のファイルの、記載したリビジョン時点の内容をもとにしています。' },
  },
  'guide.doc.tags': { defaultMessage: 'Tags', translations: { ja: 'タグ' } },
  'guide.skills.lead': {
    defaultMessage: 'Agent skills rendered for this Project. Each snippet installs one skill into $SKILLS_DIR (default ~/.claude/skills) and needs the assertion from Agent setup.',
    translations: {
      ja: 'この Project 向けに値を埋め込んだエージェントスキルです。スニペットはスキルを $SKILLS_DIR（既定は ~/.claude/skills）にインストールします。実行には「エージェントの設定」で取得したアサーションが必要です。',
    },
  },
  'guide.skills.files': { defaultMessage: 'Files', translations: { ja: 'ファイル' } },
  'guide.skills.install': { defaultMessage: 'Install', translations: { ja: 'インストール' } },
  'guide.skills.openSkill': { defaultMessage: 'Open SKILL.md', translations: { ja: 'SKILL.md を開く' } },
  'guide.skills.empty': { defaultMessage: 'This release ships no skills.', translations: { ja: 'このリリースにはスキルがありません。' } },
  'guide.skills.setupLink': { defaultMessage: 'Get an assertion in Agent setup', translations: { ja: '「エージェントの設定」でアサーションを取得' } },
  'guide.llms.lead': {
    defaultMessage: 'The index an agent reads first: every document as a raw Markdown link grouped by section, then the skills. Agents fetch it with an Access Key assertion.',
    translations: {
      ja: 'エージェントが最初に読む索引です。すべてのドキュメントがセクションごとに Markdown へのリンクとして並び、最後にスキルが続きます。エージェントはアクセスキーのアサーションで取得します。',
    },
  },
  'guide.llms.open': { defaultMessage: 'Open llms.txt', translations: { ja: 'llms.txt を開く' } },
  'guide.llms.openFull': { defaultMessage: 'Open llms-full.txt', translations: { ja: 'llms-full.txt を開く' } },
  'guide.llms.fetchTitle': { defaultMessage: 'Fetch it from an agent', translations: { ja: 'エージェントから取得する' } },
  'guide.llms.contentTitle': { defaultMessage: 'Contents', translations: { ja: '内容' } },
})

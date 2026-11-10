package content

import (
	"os"
	"strings"
	"testing"

	"github.com/appthrust/agent-guide/cmd/server/internal/render"
	"github.com/stretchr/testify/require"
)

func testValues(t *testing.T) render.Values {
	t.Helper()
	values, err := render.NewValues("https://api.example.test", "pj-test", "https://agent-guide.pj-test.example.test", "0.1.0")
	require.NoError(t, err)
	return values
}

func TestLoadRejectsInvalidContent(t *testing.T) {
	for _, test := range []struct{ directory, message string }{
		{"missing-frontmatter", "missing frontmatter"},
		{"unclosed-frontmatter", "unterminated frontmatter"},
		{"invalid-yaml", "frontmatter"},
		{"invalid-audience", "valid audience/section"},
		{"invalid-section", "valid audience/section"},
		{"missing-order", "order is required"},
		{"missing-sources", "sources are required"},
		{"unknown-frontmatter", "field tytle not found"},
		{"missing-placeholder", "MissingValue"},
		{"invalid-template", "unclosed action"},
		{"template-control", "only Values placeholders"},
		{"invalid-source", "repository-relative path"},
		{"missing-skill", "SKILL.md is required"},
		{"invalid-skill", "skill name must match"},
		{"orphan-variant", "apth/missing.ja.md: variant has no English apth/missing.md"},
		{"variant-mismatch", "start-here.ja.md: audience, section, order, tags and sources must match start-here.md"},
		{"orphan-skill-variant", "skills/example/references/setup.ja.md: variant has no English skills/example/references/setup.md"},
		{"invalid-skill-variant", "skill name must match"},
	} {
		t.Run(test.directory, func(t *testing.T) {
			catalog, err := Load(os.DirFS("testdata/"+test.directory), testValues(t))
			require.ErrorContains(t, err, test.message)
			require.Nil(t, catalog)
		})
	}
}

func TestLoadRendersAndOrdersDocumentsAndSkills(t *testing.T) {
	catalog, err := Load(os.DirFS("testdata/valid"), testValues(t))
	require.NoError(t, err)
	guide := catalog.Guide(English)
	require.Len(t, guide.Docs, 3)
	require.Equal(t, []string{"start-here", "apth/install", "apth/login"}, []string{guide.Docs[0].Slug, guide.Docs[1].Slug, guide.Docs[2].Slug})
	require.Equal(t, "Run `apth login --api-url https://api.example.test --project pj-test`.\n", guide.Documents["start-here"].Markdown)
	require.Equal(t, []Skill{{Name: "example", Description: "Operate this Project.", Files: []string{"SKILL.md", "references/setup.md"}, Lang: English, AvailableLangs: []string{English, Japanese}}}, guide.Skills)
	require.Equal(t, "Exchange at https://api.example.test. Domain: example.test; release: 0.1.0.\n", guide.SkillFiles["example/references/setup.md"])
	require.Contains(t, guide.SkillFiles["example/SKILL.md"], "---\nname: example\n")
	require.NotContains(t, guide.SkillFiles, "example/SKILL.ja.md")
	require.Equal(t, "apth-cli/README.md", guide.Documents["start-here"].Sources[0].Path)
}

func TestJapaneseVariantsPairWithTheirOriginalsAndFallBackToEnglish(t *testing.T) {
	catalog, err := Load(os.DirFS("testdata/valid"), testValues(t))
	require.NoError(t, err)
	english, japanese := catalog.Guide(English), catalog.Guide(Japanese)
	require.Same(t, english, catalog.Guide("fr"))
	require.NotContains(t, english.Documents, "start-here.ja")
	require.NotContains(t, japanese.Documents, "start-here.ja")

	start := japanese.Documents["start-here"]
	require.Equal(t, "はじめに", start.Title)
	require.Equal(t, "この Project で進む道を選びます。", start.Summary)
	// Links to documents and skill files with a variant keep the reader in Japanese; others stay as written.
	require.Equal(t, "`apth login --api-url https://api.example.test --project pj-test` を実行します。\n[はじめに](https://agent-guide.pj-test.example.test/md/start-here.md?lang=ja)、[apth のインストール](https://agent-guide.pj-test.example.test/md/apth/install.md)、[スキル](https://agent-guide.pj-test.example.test/skills/example/SKILL.md?lang=ja)。\n", start.Markdown)
	require.Equal(t, Japanese, start.Lang)
	require.Equal(t, []string{English, Japanese}, start.AvailableLangs)
	require.Equal(t, english.Documents["start-here"].Sources, start.Sources)
	require.Equal(t, English, english.Documents["start-here"].Lang)
	require.Equal(t, []string{English, Japanese}, english.Documents["start-here"].AvailableLangs)

	// A document without a variant is the English one in both guides, in the same order.
	require.Equal(t, english.Documents["apth/install"], japanese.Documents["apth/install"])
	require.Equal(t, []string{English}, japanese.Documents["apth/install"].AvailableLangs)
	require.Equal(t, []string{"start-here", "apth/install", "apth/login"}, []string{japanese.Docs[0].Slug, japanese.Docs[1].Slug, japanese.Docs[2].Slug})

	require.Equal(t, "この Project を操作します。", japanese.Skills[0].Description)
	require.Equal(t, Japanese, japanese.Skills[0].Lang)
	require.Equal(t, english.Skills[0].Files, japanese.Skills[0].Files)
	require.Equal(t, "---\nname: example\ndescription: この Project を操作します。\nsources: []\n---\npj-test のために https://api.example.test へ接続します。\n", japanese.SkillFiles["example/SKILL.md"])
	require.Equal(t, english.SkillFiles["example/references/setup.md"], japanese.SkillFiles["example/references/setup.md"])
}

func TestLLMSLayout(t *testing.T) {
	catalog, err := Load(os.DirFS("testdata/valid"), testValues(t))
	require.NoError(t, err)
	for lang, file := range map[string]string{English: "testdata/expected-llms.txt", Japanese: "testdata/expected-llms.ja.txt"} {
		expected, err := os.ReadFile(file)
		require.NoError(t, err)
		require.Equal(t, string(expected), catalog.Guide(lang).Index, lang)
	}
	require.Equal(t, "# Start here\n\nRun `apth login --api-url https://api.example.test --project pj-test`.\n\n# Install apth\n\nGuide: https://agent-guide.pj-test.example.test\n\n# Log in\n\nProject: pj-test\n\n", catalog.Guide(English).Full)
	require.True(t, strings.HasPrefix(catalog.Guide(Japanese).Full, "# はじめに\n\n`apth login"))
}

func TestLanguageTags(t *testing.T) {
	for tag, want := range map[string]string{"ja": Japanese, "ja-JP": Japanese, " JA ": Japanese, "en": English, "en-US": English} {
		lang, ok := ParseLang(tag)
		require.True(t, ok, tag)
		require.Equal(t, want, lang, tag)
	}
	for _, tag := range []string{"", "fr", "jav", "*"} {
		_, ok := ParseLang(tag)
		require.False(t, ok, tag)
	}
	for header, want := range map[string]string{
		"":                        English,
		"ja":                      Japanese,
		"ja-JP,ja;q=0.9,en;q=0.8": Japanese,
		"en-US,en;q=0.9,ja;q=0.8": English,
		"fr-FR,fr;q=0.9,ja;q=0.5": Japanese,
		"en;q=0.2, ja;q=0.7":      Japanese,
		"ja;q=0, en;q=0.1":        English,
		"fr, de":                  English,
		"ja;q=bogus, en":          English,
	} {
		require.Equal(t, want, NegotiateLang(header), header)
	}
}

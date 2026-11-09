package content

import (
	"os"
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
	require.Len(t, catalog.Docs, 3)
	require.Equal(t, []string{"start-here", "apth/install", "apth/login"}, []string{catalog.Docs[0].Slug, catalog.Docs[1].Slug, catalog.Docs[2].Slug})
	require.Equal(t, "Run `apth login --api-url https://api.example.test --project pj-test`.\n", catalog.Documents["start-here"].Markdown)
	require.Equal(t, []Skill{{Name: "example", Description: "Operate this Project.", Files: []string{"SKILL.md", "references/setup.md"}}}, catalog.Skills)
	require.Equal(t, "Exchange at https://api.example.test. Domain: example.test; release: 0.1.0.\n", catalog.SkillFiles["example/references/setup.md"])
	require.Contains(t, catalog.SkillFiles["example/SKILL.md"], "---\nname: example\n")
	require.Equal(t, "apth-cli/README.md", catalog.Documents["start-here"].Sources[0].Path)
}

func TestLLMSLayout(t *testing.T) {
	catalog, err := Load(os.DirFS("testdata/valid"), testValues(t))
	require.NoError(t, err)
	expected, err := os.ReadFile("testdata/expected-llms.txt")
	require.NoError(t, err)
	require.Equal(t, string(expected), catalog.Index)
	require.Equal(t, "# Start here\n\nRun `apth login --api-url https://api.example.test --project pj-test`.\n\n# Install apth\n\nGuide: https://agent-guide.pj-test.example.test\n\n# Log in\n\nProject: pj-test\n\n", catalog.Full)
}

package render

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestValuesDeriveOnlyTheExactInstallationPrefix(t *testing.T) {
	for _, test := range []struct{ url, domain string }{
		{"https://agent-guide.pj-test.example.test/", "example.test"},
		{"https://agent-guide.other.example.test", "agent-guide.other.example.test"},
		{"https://guide.example.test", "guide.example.test"},
		{"http://localhost:8080", "localhost"},
		{"http://[::1]:8080", "::1"},
	} {
		t.Run(test.url, func(t *testing.T) {
			values, err := NewValues("https://api.example.test/", "pj-test", test.url, "0.1.0")
			require.NoError(t, err)
			require.Equal(t, test.domain, values.BaseDomain)
			require.Equal(t, "https://api.example.test", values.AccessURL)
			require.Equal(t, "https://api.example.test", values.PlatformAPIURL)
		})
	}
	for _, invalid := range []string{"", "https://user:password@example.test", "https://example.test/path", "https://example.test?x=1", "https://example.test#", "file:///tmp/guide"} {
		_, err := NewValues("https://api.example.test", "pj-test", invalid, "0.1.0")
		require.Error(t, err)
	}
}

func TestMissingFieldIsARenderError(t *testing.T) {
	source, err := os.ReadFile("../content/testdata/missing-placeholder/start-here.md")
	require.NoError(t, err)
	_, err = Markdown("fixture", string(source), Values{})
	require.ErrorContains(t, err, "MissingValue")
}

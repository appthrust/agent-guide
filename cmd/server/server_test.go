package main

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/appthrust/agent-guide/cmd/server/internal/content"
	"github.com/appthrust/agent-guide/cmd/server/internal/render"
	guidecontent "github.com/appthrust/agent-guide/content"
	"github.com/appthrust/appserver-go/accesskey"
	"github.com/stretchr/testify/require"
)

func environment(t *testing.T) {
	t.Helper()
	for _, name := range []string{"PLATFORM_OIDC_ISSUER", "PLATFORM_OIDC_ISSUER_CA_PEM", "PLATFORM_ACCESS_ISSUER", "AGENT_GUIDE_ACCESS_AUDIENCE", "AGENT_GUIDE_OIDC_AUDIENCES", "AGENT_GUIDE_RELEASE_FILE", "AGENT_GUIDE_SOURCE_REVISION"} {
		t.Setenv(name, "")
	}
	t.Setenv("AGENT_GUIDE_PUBLIC_URL", "https://agent-guide.pj-test.example.test")
	t.Setenv("AGENT_GUIDE_RELEASE_VERSION", "0.1.0")
	t.Setenv("AGENT_GUIDE_ARTIFACT_DIGEST", "sha256:"+strings.Repeat("a", 64))
}

func fixtureHandler(t *testing.T, fixture, upstream string) http.Handler {
	t.Helper()
	handler, err := newHandler("internal/content/testdata/static", upstream, "pj-test", os.DirFS("internal/content/testdata/"+fixture))
	require.NoError(t, err)
	return handler
}

func call(handler http.Handler, path, bearer string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(http.MethodGet, path, nil)
	if bearer != "" {
		r.Header.Set("Authorization", bearer)
	}
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	return w
}

// Unverified claims are supported only by the SDK's loopback development mode.
func userBearer(subject, email string) string {
	claims, _ := json.Marshal(map[string]string{"sub": subject, "email": email, "name": "Display Name"})
	return "Bearer eyJhbGciOiJub25lIn0." + base64.RawURLEncoding.EncodeToString(claims) + "."
}

func TestPublicRoutesAndBearerBoundaries(t *testing.T) {
	environment(t)
	handler := fixtureHandler(t, "valid", "https://api.example.test")
	for _, path := range []string{"/healthz", "/readyz", "/releasez", "/config", "/", "/docs/apth/install", "/skills", "/llms"} {
		response := call(handler, path, "")
		require.Equal(t, 200, response.Code, path)
	}
	require.JSONEq(t, `{"projectId":"pj-test","publicUrl":"https://agent-guide.pj-test.example.test"}`, call(handler, "/config", "").Body.String())
	for _, path := range []string{"/launcher", "/llms.txt", "/llms-full.txt", "/md/start-here.md", "/skills/index.json", "/skills/example/SKILL.md", apiBase + "/config", apiBase + "/docs", apiBase + "/docs/start-here", apiBase + "/skills", apiBase + "/context", "/api/unknown"} {
		t.Run(path, func(t *testing.T) {
			response := call(handler, path, "")
			require.Equal(t, 401, response.Code)
			require.Contains(t, response.Body.String(), `"error":"unauthenticated"`)
		})
	}
	require.Equal(t, 404, call(handler, "/assets/missing.js", "").Code)
}

func TestRenderedContentHTTPContracts(t *testing.T) {
	environment(t)
	handler := fixtureHandler(t, "valid", "https://api.example.test")
	bearer := userBearer("user-one", "one@example.test")
	for _, path := range []string{"/md/start-here.md", "/skills/example/SKILL.md", "/skills/example/references/setup.md"} {
		response := call(handler, path, bearer)
		require.Equal(t, 200, response.Code, path)
		require.Equal(t, "text/markdown; charset=utf-8", response.Header().Get("Content-Type"))
		require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
		require.NotContains(t, response.Body.String(), "{{")
	}
	expected, err := os.ReadFile("internal/content/testdata/expected-llms.txt")
	require.NoError(t, err)
	require.Equal(t, string(expected), call(handler, "/llms.txt", bearer).Body.String())
	require.Contains(t, call(handler, "/llms-full.txt", bearer).Body.String(), "# Start here\n\nRun `apth login")
	require.JSONEq(t, `{"projectId":"pj-test","publicUrl":"https://agent-guide.pj-test.example.test","platformApiUrl":"https://api.example.test","baseDomain":"example.test","accessUrl":"https://api.example.test","releaseVersion":"0.1.0"}`, call(handler, apiBase+"/config", bearer).Body.String())
	var index struct {
		Docs []map[string]any `json:"docs"`
	}
	require.NoError(t, json.Unmarshal(call(handler, apiBase+"/docs", bearer).Body.Bytes(), &index))
	require.Len(t, index.Docs, 3)
	require.Equal(t, "start-here", index.Docs[0]["slug"])
	require.Contains(t, index.Docs[0], "order")
	require.NotContains(t, index.Docs[0], "sources")
	require.NotContains(t, index.Docs[0], "markdown")
	var document map[string]any
	require.NoError(t, json.Unmarshal(call(handler, apiBase+"/docs/start-here", bearer).Body.Bytes(), &document))
	require.NotContains(t, document, "order")
	require.Contains(t, document, "sources")
	require.Equal(t, call(handler, "/md/start-here.md", bearer).Body.String(), document["markdown"])
	skills := call(handler, "/skills/index.json", bearer)
	require.JSONEq(t, `{"lang":"en","skills":[{"name":"example","description":"Operate this Project.","files":["SKILL.md","references/setup.md"],"lang":"en","availableLangs":["en","ja"]}]}`, skills.Body.String())
	require.JSONEq(t, skills.Body.String(), call(handler, apiBase+"/skills", bearer).Body.String())
	for _, path := range []string{"/md/start-here", "/md/missing.md", apiBase + "/docs/missing", "/skills/example/missing.md", "/api/unknown"} {
		response := call(handler, path, bearer)
		require.Equal(t, 404, response.Code, path)
		require.Contains(t, response.Body.String(), `"error":"not_found"`)
	}
}

func TestLangSelectsJapaneseVariantsWithEnglishFallback(t *testing.T) {
	environment(t)
	handler := fixtureHandler(t, "valid", "https://api.example.test")
	bearer := userBearer("user-one", "one@example.test")
	withLanguage := func(path, acceptLanguage string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodGet, path, nil)
		r.Header.Set("Authorization", bearer)
		r.Header.Set("Accept-Language", acceptLanguage)
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}

	// Agent text routes: English by default, Japanese only through ?lang=ja.
	japanese := call(handler, "/md/start-here.md?lang=ja", bearer)
	require.Equal(t, 200, japanese.Code)
	require.True(t, strings.HasPrefix(japanese.Body.String(), "`apth login --api-url https://api.example.test --project pj-test` を実行します。\n[はじめに](https://agent-guide.pj-test.example.test/md/start-here.md?lang=ja)"), japanese.Body.String())
	require.Equal(t, "ja", japanese.Header().Get("Content-Language"))
	require.Equal(t, "text/markdown; charset=utf-8", japanese.Header().Get("Content-Type"))
	english := withLanguage("/md/start-here.md", "ja-JP,ja;q=0.9")
	require.Equal(t, "Run `apth login --api-url https://api.example.test --project pj-test`.\n", english.Body.String())
	require.Equal(t, "en", english.Header().Get("Content-Language"))
	require.Equal(t, english.Body.String(), call(handler, "/md/start-here.md?lang=fr", bearer).Body.String())
	fallback := call(handler, "/md/apth/install.md?lang=ja", bearer)
	require.Equal(t, "Guide: https://agent-guide.pj-test.example.test\n", fallback.Body.String())
	require.Equal(t, "en", fallback.Header().Get("Content-Language"))
	require.Equal(t, 404, call(handler, "/md/start-here.ja.md", bearer).Code)
	expected, err := os.ReadFile("internal/content/testdata/expected-llms.ja.txt")
	require.NoError(t, err)
	require.Equal(t, string(expected), call(handler, "/llms.txt?lang=ja", bearer).Body.String())
	require.True(t, strings.HasPrefix(call(handler, "/llms-full.txt?lang=ja", bearer).Body.String(), "# はじめに\n\n"))
	require.Contains(t, call(handler, "/skills/example/SKILL.md?lang=ja", bearer).Body.String(), "pj-test のために https://api.example.test へ接続します。")
	require.Contains(t, withLanguage("/skills/example/SKILL.md", "ja").Body.String(), "Connect to https://api.example.test for pj-test.")
	require.Equal(t, 404, call(handler, "/skills/example/SKILL.ja.md", bearer).Code)
	require.Contains(t, call(handler, "/skills/index.json?lang=ja", bearer).Body.String(), `"description":"この Project を操作します。"`)

	// SPA API: ?lang= wins, else Accept-Language, else English.
	type docs struct {
		Lang string           `json:"lang"`
		Docs []map[string]any `json:"docs"`
	}
	var index docs
	response := call(handler, apiBase+"/docs?lang=ja", bearer)
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &index))
	require.Equal(t, "ja", index.Lang)
	require.Equal(t, "はじめに", index.Docs[0]["title"])
	require.Equal(t, "ja", index.Docs[0]["lang"])
	require.Equal(t, []any{"en", "ja"}, index.Docs[0]["availableLangs"])
	require.Equal(t, "Install apth", index.Docs[1]["title"])
	require.Equal(t, "en", index.Docs[1]["lang"])
	require.Equal(t, []any{"en"}, index.Docs[1]["availableLangs"])
	require.Contains(t, response.Header().Values("Vary"), "Accept-Language")
	require.NoError(t, json.Unmarshal(withLanguage(apiBase+"/docs", "ja-JP,ja;q=0.9,en;q=0.8").Body.Bytes(), &index))
	require.Equal(t, "ja", index.Lang)
	require.NoError(t, json.Unmarshal(withLanguage(apiBase+"/docs?lang=en", "ja").Body.Bytes(), &index))
	require.Equal(t, "en", index.Lang)
	require.Equal(t, "Start here", index.Docs[0]["title"])
	require.NoError(t, json.Unmarshal(call(handler, apiBase+"/docs", bearer).Body.Bytes(), &index))
	require.Equal(t, "en", index.Lang)

	var document map[string]any
	require.NoError(t, json.Unmarshal(call(handler, apiBase+"/docs/start-here?lang=ja", bearer).Body.Bytes(), &document))
	require.Equal(t, "はじめに", document["title"])
	require.Equal(t, "ja", document["lang"])
	require.Equal(t, []any{"en", "ja"}, document["availableLangs"])
	require.Equal(t, japanese.Body.String(), document["markdown"])
	require.NoError(t, json.Unmarshal(withLanguage(apiBase+"/docs/apth/install", "ja").Body.Bytes(), &document))
	require.Equal(t, "en", document["lang"])
	require.Equal(t, "Install apth", document["title"])
	require.Contains(t, withLanguage(apiBase+"/skills", "ja").Body.String(), `"lang":"ja"`)
}

// The shipped guide renders in both languages and the Japanese locale is fully Japanese.
func TestEmbeddedGuideRendersEveryDocumentAndSkillInJapanese(t *testing.T) {
	values, err := render.NewValues("https://api.example.test", "pj-test", "https://agent-guide.pj-test.example.test", "0.1.0")
	require.NoError(t, err)
	catalog, err := content.Load(guidecontent.Files, values)
	require.NoError(t, err)
	english, japanese := catalog.Guide(content.English), catalog.Guide(content.Japanese)
	require.Len(t, japanese.Docs, len(english.Docs))
	for _, metadata := range japanese.Docs {
		require.Equal(t, content.Japanese, metadata.Lang, "add content/%s.ja.md", metadata.Slug)
		require.NotContains(t, japanese.Documents[metadata.Slug].Markdown, "{{", metadata.Slug)
	}
	for _, skill := range japanese.Skills {
		require.Equal(t, content.Japanese, skill.Lang, "add content/skills/%s/SKILL.ja.md", skill.Name)
		require.Contains(t, japanese.SkillFiles[skill.Name+"/SKILL.md"], "name: \""+skill.Name+"\"")
	}
}

func TestInvalidContentKeepsProcessHealthyButUnready(t *testing.T) {
	for _, fixture := range []string{"missing-placeholder", "invalid-yaml", "invalid-template"} {
		t.Run(fixture, func(t *testing.T) {
			environment(t)
			handler := fixtureHandler(t, fixture, "https://api.example.test")
			require.Equal(t, 200, call(handler, "/healthz", "").Code)
			response := call(handler, "/readyz", "")
			require.Equal(t, 503, response.Code)
			require.Contains(t, response.Body.String(), `"error":"content_unavailable"`)
			require.Equal(t, 200, call(handler, "/", "").Code)
			require.Equal(t, 401, call(handler, "/llms.txt", "").Code)
			require.Equal(t, 503, call(handler, "/llms.txt", userBearer("one", "one@example.test")).Code)
		})
	}
}

func assertionSigner(t *testing.T) func(string, ...string) string {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	require.NoError(t, err)
	signer := accesskey.NewES256Signer("test-key", key)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/access/jwks.json" {
			http.NotFound(w, r)
			return
		}
		_ = json.NewEncoder(w).Encode(signer.JWKS())
	}))
	t.Cleanup(server.Close)
	issuer := accesskey.IssuerURL(server.URL)
	t.Setenv("PLATFORM_ACCESS_ISSUER", issuer)
	t.Setenv("AGENT_GUIDE_ACCESS_AUDIENCE", "agent-guide")
	return func(project string, scopes ...string) string {
		token, err := signer.Sign(accesskey.Claims{
			Issuer: issuer, Audience: "agent-guide", Project: project, KeyName: "test-key",
			Subject: accesskey.Subject{Kind: accesskey.SubjectComponent, ID: "component"},
			Scopes:  scopes, JTI: "test", IssuedAt: time.Now(), ExpiresAt: time.Now().Add(time.Minute),
		})
		require.NoError(t, err)
		return "Bearer " + token
	}
}

func TestAccessKeySubjectAndScopeBoundaries(t *testing.T) {
	environment(t)
	assertion := assertionSigner(t)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("Access key must not reach the Platform API")
		w.WriteHeader(500)
	}))
	defer upstream.Close()
	handler := fixtureHandler(t, "valid", upstream.URL)
	read := assertion("pj-test", "read")
	for _, test := range []struct {
		path, bearer string
		status       int
		code         string
	}{
		{"/llms.txt", read, 200, ""},
		{"/md/apth/install.md", read, 200, ""},
		{apiBase + "/context", read, 403, "key_subject"},
		{apiBase + "/context", assertion("pj-test"), 403, "key_subject"},
		{"/launcher", read, 403, "key_not_permitted"},
		{"/llms.txt", assertion("pj-other", "read"), 401, "unauthenticated"},
		{"/llms.txt", assertion("pj-test", "write"), 403, "insufficient_scope"},
	} {
		response := call(handler, test.path, test.bearer)
		require.Equal(t, test.status, response.Code, test.path)
		if test.code != "" {
			require.Contains(t, response.Body.String(), `"error":"`+test.code+`"`)
		}
	}
	secret, err := accesskey.Generate("agg", rand.Reader)
	require.NoError(t, err)
	response := call(handler, "/llms.txt", "Bearer "+secret.String())
	require.Equal(t, 401, response.Code)
	require.Contains(t, response.Body.String(), `"error":"raw_key_not_accepted"`)
}

func TestContextForwardsBearerVerbatimWithoutSharingCallerState(t *testing.T) {
	environment(t)
	first := strings.Replace(userBearer("one", "one@example.test"), "Bearer ", "bEaReR  ", 1)
	second := userBearer("two", "two@example.test")
	calls := map[string]int{}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bearer := r.Header.Get("Authorization")
		if bearer != first && bearer != second {
			t.Error("caller bearer was changed")
		}
		calls[r.URL.Path]++
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/api/v1/projects/pj-test/access":
			role := "Viewer"
			if bearer == first {
				role = "Admin"
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"member": true, "roles": []string{role}, "actions": []string{}})
		case "/api/v1/projects/pj-test/app-installations":
			_, _ = w.Write([]byte(`{"data":[{"id":"agent-guide","display":{"name":"Agent Guide"},"version":"0.1.0","url":"https://guide.example.test","phase":"Ready"}],"meta":{"total":1}}`))
		default:
			http.NotFound(w, r)
		}
	}))
	defer upstream.Close()
	handler := fixtureHandler(t, "valid", upstream.URL)
	for _, test := range []struct{ bearer, login, role string }{{first, "one@example.test", "Admin"}, {second, "two@example.test", "Viewer"}, {first, "one@example.test", "Admin"}} {
		response := call(handler, apiBase+"/context", test.bearer)
		require.Equal(t, 200, response.Code)
		var result struct {
			Me            struct{ Login, Role string }
			Installations []map[string]string
		}
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &result))
		require.Equal(t, test.login, result.Me.Login)
		require.Equal(t, test.role, result.Me.Role)
		require.Equal(t, []map[string]string{{"name": "agent-guide", "version": "0.1.0", "url": "https://guide.example.test", "phase": "Ready"}}, result.Installations)
	}
	require.Equal(t, map[string]int{"/api/v1/projects/pj-test/access": 3, "/api/v1/projects/pj-test/app-installations": 3}, calls)
}

func TestContextUpstreamFailuresAreUnavailable(t *testing.T) {
	for _, failure := range []string{"access", "installations", "malformed", "truncated", "redirect"} {
		t.Run(failure, func(t *testing.T) {
			environment(t)
			upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if failure == "redirect" {
					w.Header().Set("Location", "/must-not-follow")
					w.WriteHeader(http.StatusFound)
					if r.URL.Path == "/must-not-follow" {
						t.Error("upstream redirect followed")
					}
					return
				}
				switch r.URL.Path {
				case "/api/v1/projects/pj-test/access":
					if failure == "access" {
						w.WriteHeader(500)
						return
					}
					_, _ = w.Write([]byte(`{"member":true,"roles":["Editor"],"actions":[]}`))
				case "/api/v1/projects/pj-test/app-installations":
					if failure == "installations" {
						w.WriteHeader(500)
						return
					}
					if failure == "malformed" {
						_, _ = w.Write([]byte(`{"data":`))
						return
					}
					_, _ = w.Write([]byte(`{"data":[],"meta":{"total":1}}`))
				default:
					http.NotFound(w, r)
				}
			}))
			defer upstream.Close()
			response := call(fixtureHandler(t, "valid", upstream.URL), apiBase+"/context", userBearer("one", "one@example.test"))
			require.Equal(t, 503, response.Code)
			require.Contains(t, response.Body.String(), `"error":"platform_unavailable"`)
		})
	}
}

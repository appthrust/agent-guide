package main

import (
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"

	"github.com/appthrust/agent-guide/cmd/server/internal/api"
	"github.com/appthrust/agent-guide/cmd/server/internal/content"
	"github.com/appthrust/agent-guide/cmd/server/internal/render"
	"github.com/appthrust/appserver-go/appserver/httpx"
	"github.com/appthrust/appserver-go/appserver/identity"
	"github.com/appthrust/appserver-go/appserver/launcher"
	"github.com/appthrust/appserver-go/appserver/platformclient"
	"github.com/appthrust/appserver-go/appserver/platformenv"
	"github.com/appthrust/appserver-go/appserver/releaseidentity"
)

const apiBase = "/api/agent-guide/v1"

func newHandler(staticDir, upstreamURL, projectID string, files fs.FS) (http.Handler, error) {
	origin, err := platformenv.Validate(upstreamURL, projectID)
	if err != nil {
		return nil, err
	}
	upstreamURL = origin.String()
	authenticator, err := identity.New(identity.FromEnv("AGENT_GUIDE"))
	if err != nil {
		return nil, err
	}
	values, contentErr := render.NewValues(upstreamURL, projectID, os.Getenv("AGENT_GUIDE_PUBLIC_URL"), os.Getenv("AGENT_GUIDE_RELEASE_VERSION"))
	var guide *content.Catalog
	if contentErr == nil {
		guide, contentErr = content.Load(files, values)
	}
	if contentErr != nil {
		log.Printf("agent-guide content validation failed: %v", contentErr)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte("ok\n"))
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if contentErr != nil {
			httpx.WriteError(w, httpx.Fail(503, "content_unavailable", "Guide content is unavailable"), "agent-guide")
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte("ok\n"))
	})
	mux.Handle("GET /releasez", releaseidentity.NewHandler("AGENT_GUIDE", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteError(w, httpx.Fail(503, "release_unavailable", "Release identity is unavailable"), "agent-guide")
	}))
	mux.HandleFunc("GET /config", func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"projectId": projectID, "publicUrl": os.Getenv("AGENT_GUIDE_PUBLIC_URL")})
	})
	catalog := launcher.NewCatalog(platformclient.New(upstreamURL, projectID, platformclient.WithHTTPClient(authenticator.HTTPClient())), "agent-guide")
	mux.Handle("GET /launcher", launcher.NewHandler(catalog, authenticator.Authenticate))

	protect := func(handler func(http.ResponseWriter, *http.Request, identity.Identity)) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			caller, _, err := authenticator.Authenticate(r.Context(), r.Header.Get("Authorization"))
			if err != nil {
				code, status, message := "unauthenticated", http.StatusUnauthorized, "A valid bearer token is required"
				if errors.Is(err, identity.ErrUnavailable) {
					code, status, message = "identity_unavailable", http.StatusServiceUnavailable, "The identity provider is temporarily unavailable"
				} else if errors.Is(err, identity.ErrRawKeyNotAccepted) {
					code, message = "raw_key_not_accepted", "Exchange the access key for an assertion before calling this API"
				}
				httpx.WriteError(w, httpx.Fail(status, code, message), "agent-guide")
				return
			}
			if caller.Principal.Kind == "key" {
				if caller.Principal.Project != projectID {
					httpx.WriteError(w, httpx.Fail(401, "unauthenticated", "A valid bearer token is required"), "agent-guide")
					return
				}
				if r.URL.Path == apiBase+"/context" {
					httpx.WriteError(w, httpx.Fail(403, "key_subject", "Access keys cannot read user context"), "agent-guide")
					return
				}
				if !slices.Contains(caller.Principal.Scopes, "read") {
					httpx.WriteError(w, httpx.Fail(403, "insufficient_scope", "The access key does not permit this operation"), "agent-guide")
					return
				}
			}
			w.Header().Set("Cache-Control", "no-store")
			w.Header().Set("X-Content-Type-Options", "nosniff")
			handler(w, r, caller)
		}
	}
	contentRoute := func(pattern string, handler http.HandlerFunc) {
		mux.HandleFunc(pattern, protect(func(w http.ResponseWriter, r *http.Request, _ identity.Identity) {
			if contentErr != nil {
				httpx.WriteError(w, httpx.Fail(503, "content_unavailable", "Guide content is unavailable"), "agent-guide")
				return
			}
			handler(w, r)
		}))
	}
	// Agent text routes are English unless `?lang=` asks otherwise; the SPA API
	// also honours Accept-Language when no query is given.
	textGuide := func(r *http.Request) *content.Guide {
		lang, _ := content.ParseLang(r.URL.Query().Get("lang"))
		return guide.Guide(lang)
	}
	apiGuide := func(w http.ResponseWriter, r *http.Request) *content.Guide {
		w.Header().Add("Vary", "Accept-Language")
		if query := r.URL.Query().Get("lang"); query != "" {
			return textGuide(r)
		}
		return guide.Guide(content.NegotiateLang(r.Header.Get("Accept-Language")))
	}
	contentRoute("GET /llms.txt", func(w http.ResponseWriter, r *http.Request) {
		g := textGuide(r)
		writeMarkdown(w, g.Lang, g.Index)
	})
	contentRoute("GET /llms-full.txt", func(w http.ResponseWriter, r *http.Request) {
		g := textGuide(r)
		writeMarkdown(w, g.Lang, g.Full)
	})
	contentRoute("GET /md/{slug...}", func(w http.ResponseWriter, r *http.Request) {
		slug, ok := strings.CutSuffix(r.PathValue("slug"), ".md")
		document, found := textGuide(r).Documents[slug]
		if !ok || !found {
			httpx.WriteError(w, httpx.NotFound(), "agent-guide")
			return
		}
		writeMarkdown(w, document.Lang, document.Markdown)
	})
	writeSkills := func(w http.ResponseWriter, g *content.Guide) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"lang": g.Lang, "skills": g.Skills})
	}
	contentRoute("GET /skills/index.json", func(w http.ResponseWriter, r *http.Request) { writeSkills(w, textGuide(r)) })
	contentRoute("GET /skills/{name}/{file...}", func(w http.ResponseWriter, r *http.Request) {
		file := r.PathValue("file")
		body, found := textGuide(r).SkillFiles[r.PathValue("name")+"/"+file]
		if !found {
			httpx.WriteError(w, httpx.NotFound(), "agent-guide")
			return
		}
		if strings.HasSuffix(file, ".md") {
			writeMarkdown(w, "", body)
			return
		}
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		_, _ = w.Write([]byte(body))
	})
	contentRoute("GET "+apiBase+"/config", func(w http.ResponseWriter, r *http.Request) { httpx.WriteJSON(w, http.StatusOK, values) })
	contentRoute("GET "+apiBase+"/docs", func(w http.ResponseWriter, r *http.Request) {
		g := apiGuide(w, r)
		httpx.WriteJSON(w, http.StatusOK, map[string]any{"lang": g.Lang, "docs": g.Docs})
	})
	contentRoute("GET "+apiBase+"/docs/{slug...}", func(w http.ResponseWriter, r *http.Request) {
		document, found := apiGuide(w, r).Documents[r.PathValue("slug")]
		if !found {
			httpx.WriteError(w, httpx.NotFound(), "agent-guide")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, document.Detail())
	})
	contentRoute("GET "+apiBase+"/skills", func(w http.ResponseWriter, r *http.Request) { writeSkills(w, apiGuide(w, r)) })
	mux.HandleFunc("GET "+apiBase+"/context", protect(func(w http.ResponseWriter, r *http.Request, caller identity.Identity) {
		result, err := api.ReadContext(r.Context(), caller, r.Header.Get("Authorization"), upstreamURL, projectID, authenticator.HTTPClient())
		if err != nil {
			httpx.WriteError(w, err, "agent-guide")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, result)
	}))
	mux.HandleFunc("/api/", protect(func(w http.ResponseWriter, r *http.Request, _ identity.Identity) {
		httpx.WriteError(w, httpx.NotFound(), "agent-guide")
	}))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) { serveStatic(w, r, staticDir) })
	return mux, nil
}

// writeMarkdown serves a text route; lang becomes Content-Language when the body's language is known.
func writeMarkdown(w http.ResponseWriter, lang, body string) {
	w.Header().Set("Content-Type", "text/markdown; charset=utf-8")
	if lang != "" {
		w.Header().Set("Content-Language", lang)
	}
	_, _ = w.Write([]byte(body))
}

func serveStatic(w http.ResponseWriter, r *http.Request, root string) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		httpx.WriteError(w, httpx.Fail(405, "method_not_allowed", "Only GET and HEAD are supported"), "agent-guide")
		return
	}
	name := filepath.Join(root, filepath.FromSlash(strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")))
	info, err := os.Stat(name)
	asset := strings.HasPrefix(r.URL.Path, "/assets/")
	if err != nil || !info.Mode().IsRegular() {
		if asset {
			http.NotFound(w, r)
			return
		}
		name = filepath.Join(root, "index.html")
	}
	file, err := os.Open(name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()
	info, err = file.Stat()
	if err != nil || !info.Mode().IsRegular() {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	if filepath.Base(name) == "index.html" {
		w.Header().Set("X-Content-Type-Options", "nosniff")
	} else if asset {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	}
	http.ServeContent(w, r, filepath.Base(name), info.ModTime(), file)
}

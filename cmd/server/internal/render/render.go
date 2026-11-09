// Package render binds curated Markdown to one Agent Guide installation.
package render

import (
	"bytes"
	"fmt"
	"net/url"
	"strings"
	"text/template"
	"text/template/parse"
)

type Values struct {
	PlatformAPIURL string `json:"platformApiUrl"`
	ProjectID      string `json:"projectId"`
	PublicURL      string `json:"publicUrl"`
	BaseDomain     string `json:"baseDomain"`
	AccessURL      string `json:"accessUrl"`
	ReleaseVersion string `json:"releaseVersion"`
}

func NewValues(platformAPIURL, projectID, publicURL, releaseVersion string) (Values, error) {
	u, err := url.Parse(publicURL)
	if err != nil || u.Hostname() == "" || u.User != nil || (u.Scheme != "https" && u.Scheme != "http") || (u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.ForceQuery || strings.Contains(publicURL, "#") {
		return Values{}, fmt.Errorf("AGENT_GUIDE_PUBLIC_URL must be an HTTP(S) origin without credentials, path, query, or fragment")
	}
	host := strings.ToLower(u.Hostname())
	baseDomain := host
	prefix := "agent-guide." + projectID + "."
	if strings.HasPrefix(host, prefix) && len(host) > len(prefix) {
		baseDomain = strings.TrimPrefix(host, prefix)
	}
	publicURL = strings.TrimRight(publicURL, "/")
	return Values{PlatformAPIURL: strings.TrimRight(platformAPIURL, "/"), ProjectID: projectID, PublicURL: publicURL, BaseDomain: baseDomain, AccessURL: strings.TrimRight(platformAPIURL, "/"), ReleaseVersion: releaseVersion}, nil
}

// Markdown accepts only literal text and the six Values fields. In particular,
// template functions, conditionals and definitions cannot hide an invalid field.
func Markdown(name, source string, values Values) (string, error) {
	t, err := template.New(name).Option("missingkey=error").Parse(source)
	if err != nil {
		return "", err
	}
	if len(t.Templates()) != 1 {
		return "", fmt.Errorf("%s: only Values placeholders are allowed", name)
	}
	for _, node := range t.Tree.Root.Nodes {
		switch node := node.(type) {
		case *parse.TextNode:
		case *parse.ActionNode:
			if len(node.Pipe.Decl) != 0 || len(node.Pipe.Cmds) != 1 || len(node.Pipe.Cmds[0].Args) != 1 {
				return "", fmt.Errorf("%s: only Values placeholders are allowed", name)
			}
			field, ok := node.Pipe.Cmds[0].Args[0].(*parse.FieldNode)
			if !ok || len(field.Ident) != 1 {
				return "", fmt.Errorf("%s: only Values placeholders are allowed", name)
			}
		default:
			return "", fmt.Errorf("%s: only Values placeholders are allowed", name)
		}
	}
	var out bytes.Buffer
	if err := t.Execute(&out, values); err != nil {
		return "", err
	}
	return out.String(), nil
}

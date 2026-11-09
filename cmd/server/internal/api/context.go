// Package api provides the caller-specific Platform context projection.
package api

import (
	"context"
	"net/http"

	"github.com/appthrust/appserver-go/appserver/httpx"
	"github.com/appthrust/appserver-go/appserver/identity"
	"github.com/appthrust/appserver-go/appserver/platformclient"
)

type Me struct {
	Login string `json:"login"`
	Role  string `json:"role"`
}

type Installation struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	URL     string `json:"url"`
	Phase   string `json:"phase"`
}

type Context struct {
	Me            Me             `json:"me"`
	Installations []Installation `json:"installations"`
}

func ReadContext(ctx context.Context, caller identity.Identity, bearer, origin, projectID string, transport *http.Client) (Context, error) {
	if caller.Principal.Kind == "key" {
		return Context{}, httpx.Fail(http.StatusForbidden, "key_subject", "Access keys cannot read user context")
	}
	// A fresh client prevents its role cache from outliving this request. Every
	// Platform request carries the original Authorization header unchanged.
	client := platformclient.New(origin, projectID, platformclient.WithHTTPClient(transport))
	access, err := client.Access(ctx, caller.Principal.Subject, bearer)
	if err != nil || access.NotMember || access.Role == "" {
		return Context{}, unavailable()
	}
	installations, err := client.AppInstallations(ctx, bearer)
	if err != nil {
		return Context{}, unavailable()
	}
	// The shared identity verifier requires a valid email claim. Use that login
	// rather than a display name, which is not necessarily a username.
	result := Context{Me: Me{Login: caller.Email, Role: access.Role}, Installations: make([]Installation, len(installations))}
	for i, installation := range installations {
		result.Installations[i] = Installation{Name: installation.ID, Version: installation.Version, URL: installation.URL, Phase: installation.Phase}
	}
	return result, nil
}

func unavailable() error {
	return httpx.Fail(http.StatusServiceUnavailable, "platform_unavailable", "The Platform API is temporarily unavailable")
}

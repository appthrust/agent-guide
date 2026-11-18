package main

import (
	"context"
	"errors"
	"flag"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/appthrust/agent-guide/content"
	"github.com/appthrust/appserver-go/appserver/platformenv"
	"github.com/appthrust/appserver-go/appserver/requestlog"
)

func main() {
	listen := flag.String("listen", ":8080", "HTTP listen address")
	defaultStaticDir := os.Getenv("AGENT_GUIDE_STATIC_DIR")
	if defaultStaticDir == "" {
		defaultStaticDir = "/srv/agent-guide"
	}
	staticDir := flag.String("static-dir", defaultStaticDir, "static SPA agent-guide")
	flag.Parse()
	if flag.NArg() != 0 {
		log.Fatal("usage: agent-guide-server [--listen :8080] [--static-dir /srv/agent-guide]")
	}
	// Validate platform identity before binding the listener.
	platform, err := platformenv.FromEnv()
	if err != nil {
		log.Fatal(err)
	}
	if err := platformenv.ValidateIdentityListen(*listen, platform.OIDCIssuer); err != nil {
		log.Fatal(err)
	}
	handler, err := newHandler(*staticDir, platform.APIURL, platform.ProjectID, content.Files)
	if err != nil {
		log.Fatal(err)
	}
	server := newServer(*listen, handler, os.Stderr)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdown); err != nil {
			log.Printf("shutdown: %v", err)
		}
	}()
	log.Printf("agent-guide-server listening on %s", *listen)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func newServer(addr string, handler http.Handler, logOutput io.Writer) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           requestlog.Wrap(handler, requestlog.Options{Service: "agent-guide", Output: logOutput}),
		ReadHeaderTimeout: 10 * time.Second,
	}
}

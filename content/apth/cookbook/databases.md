---
title: "Use managed databases safely"
summary: "Inspect database state and choose a controlled schema-change path without exposing connection secrets."
audience: "developer"
section: "apth"
order: 50
tags: ["databases", "schema", "secrets"]
sources:
  - { path: "apth-cli/README.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/skills/appthrust-app-dev/SKILL.md", revision: "1572ae7afa15df418cad36501f237b4595349428" }
  - { path: "apth-cli/internal/cmd/apth/databases.go", revision: "1572ae7afa15df418cad36501f237b4595349428" }
---

# Use managed databases safely

The application template can provision PostgreSQL and connect it to the web component. Agent Guide itself has no database. Do not provision one just to read these documents.

## Discover, then inspect

```bash
apth databases list {{.ProjectID}}
apth databases get {{.ProjectID}} "$DATABASE"
apth databases runtime-topology {{.ProjectID}} "$DATABASE"
apth databases tables {{.ProjectID}} "$DATABASE"
```

Choose `$DATABASE` from the assigned application's component graph. If row inspection is authorized, bind `$SCHEMA` and `$TABLE` to the exact table and keep the result bounded:

```bash
apth databases rows {{.ProjectID}} "$DATABASE" "$SCHEMA" "$TABLE" --limit 10
```

Rows can contain personal or confidential data; bounded output is not automatic permission to put it in chat. Prefer counts or redacted facts when possible.

## Connection ownership

The connection injects `DATABASE_URL`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, and `DATABASE_READ_AVAILABLE`. The app environment view identifies generated values as connection-owned. Do not copy their values, hardcode passwords, or replace generated settings with a second credential source.

A build has no database connection. Keep database access server-side and out of client bundles; do not require a live database while producing the image. A local development page without a database proves only its disconnected behavior. Prove the managed connection through the deployed application.

## Schema changes

For a disposable demo, the source workflow allows idempotent lazy table creation. For a product, use a declared database change and its review/approval policy:

```bash
apth databases changes list {{.ProjectID}} "$DATABASE"
apth databases changes ledger {{.ProjectID}} "$DATABASE"
apth databases changes create --help
apth databases sql --help
```

The create command takes a typed request body; obtain the current schema and prepare the exact migration before executing it. Do not invent flags, silently acknowledge ledger drift, or use an arbitrary SQL script as a repair for an unknown state. Backup/restore, credential issuance, and destructive schema operations require separate explicit scope.

Database deletion is not a troubleshooting step. If the task explicitly calls for deleting this database, first establish backups and retention, then use the owning stack lifecycle or the documented database delete command with `--yes`. Never assume deleting an application preserves its data.

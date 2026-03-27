# Code Kit Ultra - InsForge-First Repo-Ready Implementation Pack

This pack converts the InsForge-first architecture into a repo-oriented implementation blueprint for Code Kit Ultra.

## Purpose
Use this pack to migrate Code Kit Ultra from:
- API-key-first control plane assumptions
- partially local/manual backend coupling
- extension-centric auth bootstrapping

to:

- InsForge-session-first authentication
- org/workspace/project multi-tenancy
- authenticated control plane APIs
- shared audit and event model
- repo-scaffolded service boundaries
- staged migration with verification gates

## Designed around the current Code Kit Ultra direction
This pack assumes Code Kit Ultra already includes or has recently validated:
- orchestrator and CLI flow
- governed execution lifecycle
- control-service APIs
- VS Code extension as an operator surface
- policy, audit, and execution concerns
- extension health / setup remediation

## Included
- docs/                implementation specifications
- diagrams/            mermaid source diagrams
- db/                  Postgres schema starter
- contracts/           OpenAPI + event schemas
- config/env/          environment contract
- tickets/             backlog for phased implementation
- scaffolds/           repo-ready TypeScript starter contracts

## Recommended adoption order
1. docs/09-migration-plan.md
2. db/schema.sql
3. contracts/openapi/control-service.yaml
4. scaffolds/
5. tickets/implementation-backlog.csv
6. docs/10-testing-verification.md

## Intended target repo shape
```text
apps/
  cli/
  control-service/
  web-control-plane/
extensions/
  code-kit-vscode/
packages/
  adapters/
  auth/
  audit/
  events/
  execution/
  learning/
  orchestrator/
  policy/
  realtime/
  shared/
infra/
  insforge/
config/
docs/
```

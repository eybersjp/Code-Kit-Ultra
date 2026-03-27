# Recommended Repo Structure

```text
apps/
  cli/
    src/
  control-service/
    src/
      routes/
      middleware/
      handlers/
      presenters/
  web-control-plane/
    src/
      app/
      components/
      hooks/
      lib/

extensions/
  code-kit-vscode/
    src/
      auth/
      api/
      status/
      commands/
      panels/

packages/
  adapters/
    src/
  audit/
    src/
  auth/
    src/
      insforge/
      tokens/
      middleware/
  events/
    src/
  execution/
    src/
  learning/
    src/
  orchestrator/
    src/
  policy/
    src/
  realtime/
    src/
  shared/
    src/
      contracts/
      types/
      schemas/

db/
  migrations/
  seeds/

contracts/
  openapi/
  events/

config/
  env/
  policy/

infra/
  insforge/
    functions/
    sql/
    storage/
```

## Immediate repo additions
- packages/auth
- packages/realtime
- apps/web-control-plane
- contracts/openapi/control-service.yaml
- db/schema.sql
- infra/insforge/functions/*

# SPEC — OpenAPI 3.1 Specification

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`
**Implements:** Master spec Section 9.3 — OpenAPI Baseline
**Unblocks:** T2-5 implementation
**Risk refs:** R-22

---

## Objective

Generate and serve a complete OpenAPI 3.1.0 specification for the Code Kit Ultra control-service. Every endpoint must be documented with request/response schemas, authentication requirements, permission requirements, and error codes.

---

## Scope

**In scope:**
- OpenAPI 3.1.0 spec file at `openapi.yaml`
- Auto-served at `GET /v1/openapi.json` and `GET /v1/openapi.yaml`
- Swagger UI at `GET /v1/docs` (dev mode only)
- Error code documentation (401, 403, 404, 409, 422, 500)
- All `/v1/` routes documented

**Out of scope:**
- Client SDK generation (future tooling step)
- Schema registry integration

---

## OpenAPI Baseline — `openapi.yaml`

```yaml
openapi: 3.1.0
info:
  title: Code Kit Ultra — Control Service API
  version: 1.0.0
  description: |
    The Code Kit Ultra control-service is the stable API façade for all operator surfaces.
    Authentication uses InsForge-issued bearer tokens.
  contact:
    url: https://github.com/eybersjp/Code-Kit-Ultra

servers:
  - url: http://localhost:7474/v1
    description: Local development
  - url: https://api.codekit.io/v1
    description: Production

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: string

    RunCreateRequest:
      type: object
      required: [idea, mode]
      properties:
        idea:
          type: string
          description: The project idea or goal
          example: "Build a CRM for solar installers"
        mode:
          type: string
          enum: [safe, balanced, god, turbo, builder, pro, expert]
        skillLevel:
          type: string
          enum: [beginner, intermediate, advanced]
          default: intermediate
        priority:
          type: string
          enum: [speed, quality, cost]
          default: quality
        deliverable:
          type: string
          enum: [app, api, script, report]
          default: app
        projectId:
          type: string
          description: Required project scope for multi-tenant isolation

    RunResponse:
      type: object
      properties:
        runId:
          type: string
        status:
          type: string
          enum: [planned, running, paused, completed, failed, cancelled]
        mode:
          type: string
        summary:
          type: string
        gates:
          type: array
          items:
            $ref: '#/components/schemas/GateDecision'
        createdAt:
          type: string
          format: date-time

    GateDecision:
      type: object
      properties:
        gate:
          type: string
          enum: [clarity, scope, architecture, build, qa, security, cost, deployment, launch]
        status:
          type: string
          enum: [pass, needs-review, blocked, pending, approved, rejected]
        shouldPause:
          type: boolean
        reason:
          type: string
        decidedBy:
          type: string
        decidedAt:
          type: string
          format: date-time

    SessionResponse:
      type: object
      properties:
        actor:
          type: object
          properties:
            actorId: { type: string }
            actorType: { type: string, enum: [human, service-account, system] }
            email: { type: string }
        tenant:
          type: object
          properties:
            orgId: { type: string }
            workspaceId: { type: string }
            projectId: { type: string }
        permissions:
          type: array
          items: { type: string }
        authMode:
          type: string
          enum: [session, service-account, legacy-api-key]

security:
  - bearerAuth: []

paths:
  /session:
    get:
      summary: Get current session
      operationId: getSession
      responses:
        '200':
          description: Authenticated session details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SessionResponse'
        '401':
          description: Not authenticated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /runs:
    post:
      summary: Create a run
      operationId: createRun
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RunCreateRequest'
      responses:
        '201':
          description: Run created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/RunResponse'
        '401': { description: Not authenticated }
        '403': { description: Insufficient permission or scope }
        '422': { description: Invalid request payload }

  /runs/{runId}/resume:
    post:
      summary: Resume a paused run
      parameters:
        - name: runId
          in: path
          required: true
          schema: { type: string }
      responses:
        '200': { description: Run resumed }
        '404': { description: Run not found }
        '409': { description: Run is not in a resumable state }

  /gates/{gateId}/approve:
    post:
      summary: Approve a gate
      parameters:
        - name: gateId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                note: { type: string }
      responses:
        '200': { description: Gate approved }
        '403': { description: Missing gate:approve permission }
        '404': { description: Gate not found }
        '409': { description: Gate already decided }

  /gates/{gateId}/reject:
    post:
      summary: Reject a gate
      parameters:
        - name: gateId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [note]
              properties:
                note: { type: string }
      responses:
        '200': { description: Gate rejected }
        '403': { description: Missing gate:reject permission }
        '409': { description: Gate already decided }

  /events/stream:
    get:
      summary: Subscribe to realtime events
      description: Server-Sent Events stream filtered by runId, projectId, or orgId
      parameters:
        - name: runId
          in: query
          schema: { type: string }
        - name: projectId
          in: query
          schema: { type: string }
        - name: orgId
          in: query
          schema: { type: string }
      responses:
        '200':
          description: SSE stream
          content:
            text/event-stream:
              schema:
                type: string
        '422': { description: No filter parameters provided }
```

---

## Serving the Spec

### `apps/control-service/src/index.ts`

```typescript
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const openApiSpec = YAML.load('./openapi.yaml');

v1Router.get('/openapi.json', (req, res) => res.json(openApiSpec));
v1Router.get('/openapi.yaml', (req, res) => {
  res.set('Content-Type', 'text/yaml');
  res.sendFile('./openapi.yaml');
});

// Swagger UI in non-production only
if (process.env.NODE_ENV !== 'production') {
  v1Router.use('/docs', swaggerUi.serve);
  v1Router.get('/docs', swaggerUi.setup(openApiSpec));
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `openapi.yaml` | Create — full OpenAPI spec |
| `apps/control-service/src/index.ts` | Modify — serve spec at `/v1/openapi.json` |

---

## Definition of Done

- [ ] `GET /v1/openapi.json` returns valid OpenAPI 3.1.0 JSON
- [ ] `GET /v1/docs` shows Swagger UI in dev mode
- [ ] All documented endpoints have request/response schemas
- [ ] All 6 error codes (401, 403, 404, 409, 422, 500) documented
- [ ] OpenAPI spec validates without errors against `openapi-cli validate`
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`

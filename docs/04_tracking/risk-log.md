# Risk Log

> All identified risks must be tracked here. Status: Open / Mitigated / Closed.

| # | Risk | Severity | Area | Mitigation | Owner | Status |
|---|------|----------|------|------------|-------|--------|
| R-01 | Hardcoded fallback secret in `service-account.ts:4` — `"internal-sa-secret-change-me"` is in git history and signs valid JWTs if env var is unset | 🔴 Critical | Security | Throw at startup if `CKU_SERVICE_ACCOUNT_SECRET` is not set; no fallback | Engineering | Open |
| R-02 | Hardcoded API keys in `packages/core/src/auth.ts:4-9` — `"admin-key"`, `"operator-key"` committed to source | 🔴 Critical | Security | Move to `.env`; gate behind `CKU_LEGACY_API_KEYS_ENABLED` | Engineering | Open |
| R-03 | Tenant isolation bypass in `authorize.ts:54` — `orgId === "default"` exempted from cross-org checks | 🔴 Critical | Security | Remove the "default" exemption unconditionally | Engineering | Open |
| R-04 | PostgreSQL not connected to runtime — state in-memory and file-based | 🔴 Critical | Architecture | Wire DB in T1-4; implement migrations runner | Engineering | Open |
| R-05 | API routes unversioned — all clients break on first breaking API change | 🔴 Critical | Architecture | Add `/v1/` prefix to all routes | Engineering | Open |
| R-06 | No gate rejection endpoint — reviewers cannot block runs | 🔴 Critical | Governance | Implement `POST /v1/gates/{gateId}/reject` | Engineering | Open |
| R-07 | Gate taxonomy misaligned — 8 of 9 spec governance gates not implemented | 🔴 Critical | Governance | Implement scope, architecture, security, cost, deployment, qa, build, launch gates | Engineering | Open |
| R-08 | No Docker or Kubernetes manifests — cannot deploy to hosted environment | 🟠 High | Infrastructure | Create Dockerfile and k8s/ manifests | Engineering | Open |
| R-09 | No structured observability — production incidents cannot be diagnosed | 🟠 High | Operations | Add Pino logger, Prometheus metrics, OpenTelemetry tracing | Engineering | Open |
| R-10 | Weak random ID generation using `Math.random()` for service account IDs | 🟠 High | Security | Replace with `crypto.randomUUID()` | Engineering | Open |
| R-11 | Session token stored in localStorage in web control plane — XSS exposure | 🟠 High | Security | Move to `httpOnly` + `Secure` cookies via control-service | Engineering | Open |
| R-12 | No input validation on run creation — `idea` and `mode` passed unvalidated to orchestrator | 🟠 High | Security | Add Zod schema guard at create-run handler boundary | Engineering | Open |
| R-13 | No session revocation mechanism — compromised tokens cannot be invalidated | 🟠 High | Security | Implement revocation list in Redis or DB | Engineering | Open |
| R-14 | Service account store in-memory Map — lost on every server restart | 🟠 High | Architecture | Persist service accounts to PostgreSQL | Engineering | Open |
| R-15 | SSE realtime endpoint missing — clients must poll for run updates | 🟠 High | Architecture | Implement `GET /v1/events/stream` | Engineering | Open |
| R-16 | Operator role has `gate:approve` + `execution:high_risk` — too broad | 🟡 Medium | Governance | Move `gate:approve` and `execution:high_risk` to reviewer/admin only | Engineering | Open |
| R-17 | JWT `claims.roles` cast directly to `Role[]` without validation | 🟡 Medium | Security | Filter roles against known `Role` union before assignment | Engineering | Open |
| R-18 | Audit hash chain uses module-level `lastHash` — breaks in multi-process environments | 🟡 Medium | Architecture | Compute `lastHash` from last DB row on each write | Engineering | Open |
| R-19 | JWT `expiresAt` unit mismatch in VS Code extension — `Date.now()` (ms) vs JWT `exp` (seconds) | 🟡 Medium | Auth | Normalize to consistent unit | Engineering | Open |
| R-20 | `db:migrate` and `db:seed` npm scripts are console.log placeholders | 🟡 Medium | Architecture | Implement actual migration runner | Engineering | Open |
| R-21 | Scoped execution tokens may not be used in adapter call paths | 🟡 Medium | Security | Trace and confirm `issueExecutionToken` is called before adapter invocation | Engineering | Open |
| R-22 | OpenAPI spec absent — no machine-readable API contract | 🟡 Medium | Architecture | Generate and publish OpenAPI 3.1 spec | Engineering | Open |

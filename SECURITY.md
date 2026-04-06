# Security Policy

## Reporting a Vulnerability

We take the security of Code Kit Ultra seriously. If you discover a security vulnerability, please **do NOT open a public GitHub issue**.

Instead, report privately via one of these channels:

| Channel | Details |
|---------|---------|
| **Email** | eybers.jp@gmail.com |
| **Subject line** | `[SECURITY] Code-Kit-Ultra: <short description>` |
| **Response SLA** | Acknowledge within **24 hours**, patch within **7 days** for critical severity |

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations

We will acknowledge your report, keep you updated on our progress, and credit you in the release notes (unless you prefer to remain anonymous).

## Supported Versions

| Version | Support Status |
|---------|---------------|
| `1.3.0` | ✅ **Actively supported** — security patches issued within 7 days |
| `1.2.0` | ⚠️ Best-effort only — upgrade to 1.3.0 recommended |
| `< 1.2.0` | ❌ End of life — no security patches |

## Security Model

Code Kit Ultra runs as a multi-tenant orchestration platform. Key security properties:

- **Authentication**: InsForge RS256 JWT → HS256 service account JWT → legacy API key (opt-in)
- **Session management**: Short-lived JWTs (10 min execution tokens); Redis-backed revocation list
- **Tenant isolation**: All queries scoped by `org_id`; cross-tenant requests return `404` not `403`
- **Audit trail**: SHA-256 hash chain in PostgreSQL with advisory lock; tamper-evident
- **Secrets**: Never logged; bcrypt-hashed at rest; plaintext returned once on creation

## Known Mitigated Risks (v1.3.0)

| Risk | Severity | Status |
|------|----------|--------|
| Hardcoded service account secret | Critical | ✅ Fixed in 1.3.0 |
| Hardcoded API keys in source | Critical | ✅ Fixed in 1.3.0 |
| Tenant isolation bypass (`orgId=default`) | Critical | ✅ Fixed in 1.3.0 |
| No session revocation | High | ✅ Fixed in 1.3.0 |
| Math.random() for IDs | High | ✅ Fixed in 1.3.0 |
| In-memory service account store | High | ✅ Fixed in 1.3.0 |
| Module-level audit hash chain | Medium | ✅ Fixed in 1.3.0 |

## Responsible Disclosure

We follow a **90-day coordinated disclosure** policy:
1. Reporter notifies us privately
2. We acknowledge within 24 hours
3. We develop and test a fix
4. Fix released within 7 days (critical) or 30 days (high/medium)
5. CVE filed if applicable
6. Public disclosure after patch is available
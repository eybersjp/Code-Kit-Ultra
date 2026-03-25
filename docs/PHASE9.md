# Phase 9 — Enterprise Release Hardening

This phase transforms Code Kit Ultra into a secure, auditable, and policy-driven platform.

## 🔐 1. Auth & RBAC System
We have implemented a role-based access control system using API keys.

### Roles & Permissions
| Action | Admin | Operator | Reviewer | Viewer |
| :--- | :--- | :--- | :--- | :--- |
| Execute Run | ✅ | ✅ | ❌ | ❌ |
| Approve Gate | ✅ | ❌ | ✅ | ❌ |
| Retry Step | ✅ | ✅ | ❌ | ❌ |
| Rollback | ✅ | ❌ | ❌ | ❌ |
| View Runs | ✅ | ✅ | ✅ | ✅ |

### Security
- **API Key Required**: All Control Service endpoints now require an `x-api-key` header.
- **Environment Override**: Use `CODEKIT_ADMIN_API_KEY` for local development.

## 🧠 2. Policy Engine (Governance)
The system now enforces rules defined in `config/policy.json`.

- **Command Blacklist**: Dangerous terminal commands (e.g., `rm -rf /`) are blocked at the orchestrator level.
- **Adapter Guards**: High-risk adapters like `github` require explicit operator approval by default.
- **Mode-Aware**: Policies can adapt based on the operational mode (Balanced, Safe, etc.).

## 📊 3. Immutable Audit Log
Every action taken by the system or an operator is recorded in a hash-chained, tamper-proof log.

- **Local Logs**: Each run contains an `audit-log.json` in its artifact directory.
- **Global Stream**: All events are appended to `.codekit/audit/events.ndjson`.
- **Integrity**: Each event contains a `hash` and `prevHash`, forming a verifiable chain.

## 🚀 How to Use

1. **Set Admin Key**:
   ```bash
   export CODEKIT_ADMIN_API_KEY="your-secret-key"
   ```

2. **Run the Service**:
   ```bash
   npm run serve
   ```

3. **Access via CLI/API**:
   Include the header `x-api-key: your-secret-key` in your requests.

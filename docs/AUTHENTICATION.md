# Code Kit Ultra: Authentication & Identity

Code Kit Ultra v1.2.0+ uses a unified, governed identity plane powered by **InsForge**. This document describes the transition from legacy API keys to modern, session-first authentication.

## 1. Root Identity Plane: InsForge

All operator identities, whether human or machine, are managed via **InsForge**.

- **Human Operators**: Use Bearer Session tokens obtained via the VS Code Sign-In flow or the InsForge Web UI.
- **Machine/Service Accounts**: Use Service Account JWTs issued by InsForge or the Code Kit Control Service.

## 2. Authorization Layer: Code Kit Policy Engine

Once an identity is verified, Code Kit Ultra enforces Role-Based Access Control (RBAC) via the internal Policy Engine.

- Permissions are mapped to InsForge roles (e.g., `reviewer`, `operator`, `admin`).
- Every request is validated for the required permission before execution.

## 3. Canonical Operator Flows

### VS Code (Preferred)

1. Set `codeKitUltra.authMode` to `bearer-session`.
2. Use the **CK: Sign In** command (click the status bar).
3. Authenticate with InsForge to obtain a session token.
4. The status bar will reflect your online status and role.

### CLI

The CLI automatically picks up the session from the Control Service. For dedicated CLI usage on servers:

1. Issue a Service Account token.
2. Set the `CKU_BEARER_TOKEN` environment variable.

### Web UI

The Control Plane Web UI uses the same session resolution as the extension, providing a consistent view of runs and approvals across all interfaces.

## 4. Legacy Mode (Deprecated)

Legacy API keys are supported for local development and backward compatibility only.

- Enable by setting `codeKitUltra.authMode` to `legacy-api-key`.
- Warning: Human access via legacy keys is tracked as "Unassigned Operator" and triggers deprecation warnings in the audit logs.
- Legacy support will be removed in v1.5.0.

## 5. Metadata Enforcement

All events, runs, and audit records now require:

- `actorId` + `actorType`
- `orgId` + `workspaceId`
- `correlationId` (for trace links)

Failure to provide these via a session will result in 401 Unauthorized errors on protected endpoints.

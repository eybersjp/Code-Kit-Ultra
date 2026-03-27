---
name: Auth Setup
description: Add authentication, authorization, session strategy, and secret handling.
triggers:
  - add login
  - add roles
inputs:
  - auth provider
  - roles
outputs:
  - auth design
  - middleware plan
  - secret checklist
---

# Auth Setup

## Procedure
1. choose auth provider
2. define session or token model
3. define roles and permissions
4. wire middleware and protected routes
5. document secret management

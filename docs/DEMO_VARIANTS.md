# Demo Variants: Choosing the Right Journey

Code Kit Ultra can be demoed to different audiences. Choose the variant that matches your crowd.

---

## 1. The "Visionary" Variant
- **Audience**: Product Managers, Founders, Non-technical stakeholders.
- **Focus**: Idea to Report velocity.
- **Demo Script**: `npm run demo`
- **Primary Asset**: `artifacts/test-runs/<timestamp>/report.md`

## 2. The "Architect" Variant
- **Audience**: Tech Leads, Lead Engineers, Architects.
- **Focus**: Skill modularity and routing policies.
- **Demo Script**: `scripts/demo-crm.sh` followed by `scripts/demo-internal-tool.sh`.
- **Primary Asset**: `config/routing-policy.json` and generated skill packages.

## 3. The "Platform Engineer" Variant
- **Audience**: DevOps, SRE, Platform Teams.
- **Focus**: Governance, Security Gates, and Deployment Safety.
- **Demo Script**: `ck promote-skill` and `ck rollback-skill` flows.
- **Primary Asset**: `config/governance-policy.json` and `execution-audit.log`.

---

*Code Kit Ultra: Specialty-aware demos for specialty-aware audiences.*

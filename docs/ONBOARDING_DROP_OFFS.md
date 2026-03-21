# Onboarding Drop-Off Tracker

**The Goal**: Identify and eliminate every reason a user stops before their first "WOW" moment.

---

## 🛑 Critical Drop-off Points

| Phase | Why they stop | Evidence / Frequency | Potential Fix |
| :--- | :--- | :--- | :--- |
| **Install** | "NPM is too slow/hangs" | 2 reports | Add `--prefer-offline` to docs. |
| **Config** | "Where do I get an API key?" | 5 reports | Add direct link to Antigravity portal. |
| **First Run** | "Command not found (CK)" | 3 reports | Add logic to `doctor.sh` to check Path. |
| **Context** | "I don't know what to build first" | 4 reports | Point to `docs/CASE_STUDY_SIMPLE_CRM.md`. |

---

## 📈 Conversion Rates

- **Repo View -> NPM Install**: -
- **NPM Install -> Doctor Pass**: -
- **Doctor Pass -> First Demo**: -
- **First Demo -> Custom Project**: -

---

## ✅ Friction Fixes Log

- [x] v1.0.1: Added `npm run doctor` to catch system missing deps.
- [x] v1.0.2: Clarified `ck` alias in README.
- [x] v1.0.3: Added `scripts/demo-crm.sh` for one-click success.

---

*Code Kit Ultra: Removing the friction from autonomous engineering.*

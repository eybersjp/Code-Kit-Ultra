# Code Kit Ultra Phase 5

Phase 5 adds:
- real adapter wiring behind the existing contracts
- adapter config + environment validation
- governance policy enforcement for promotion
- audit logging and rollback / demotion support

## Commands

```bash
npm install
npm run typecheck
npm run test:smoke
npm run ck -- adapters
npm run ck -- validate-env
npm run ck -- init "Build a CRM for solar installers" --dry-run
npm run ck -- approve-skill skill_quantum_weather_engine --reviewer lead-architect
npm run ck -- promote-skill skill_quantum_weather_engine --reviewer lead-architect
npm run ck -- rollback-skill skill_quantum_weather_engine --reviewer lead-architect
```
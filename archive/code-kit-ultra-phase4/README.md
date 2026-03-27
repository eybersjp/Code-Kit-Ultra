# Code Kit Ultra — Phase 4

Phase 4 adds:
- adapter base class and registry
- structured real adapter stubs
- adapter health checks
- generated skill review / approval / promotion flow
- memory tracking for promoted skills

## Commands

```bash
npm install
npm run typecheck
npm run test:smoke
npm run ck -- adapters
npm run ck -- init "Build a CRM for solar installers" --dry-run
npm run ck -- review-skill skill_quantum_weather_engine --notes "Looks useful"
npm run ck -- approve-skill skill_quantum_weather_engine
npm run ck -- promote-skill skill_quantum_weather_engine
```

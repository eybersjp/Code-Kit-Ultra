# Release Notes

## v1.2.0-phase10
This release marks the baseline of Phase 10: Complete Self-Learning. The system now autonomously learns from execution outcomes to optimize future planning and adapter selection.

### Phase 10 Highlights
- **Outcome Ingestion**: Every execution is now recorded with detailed success/failure metadata.
- **Learning Store**: Persistent project-wide memory for historical performance tracking.
- **Reliability Scoring**: Dynamic ranking of adapters based on past success rates.
- **Policy Adaptation**: Adaptive timeouts and retry logic tailored to specific adapter performance.
- **Plan Optimization**: Pre-execution middleware that swaps unreliable adapters for premium ones.

### Migration Info
- No breaking schema changes, but `.codekit/memory` will start accumulating data.
- New environment validation ensures all SaaS endpoints are reachable.

## v1.0.0
This is the first public release of Code Kit Ultra.

### Highlights
- governed AI operating system architecture
- Antigravity-first planning and skills flow
- specialist implementation adapters for Cursor and Windsurf
- observability, audit trails, and run metrics
- onboarding, templates, examples, and release-ready docs

### Best first steps
1. copy `.env.example` to `.env`
2. run `npm install`
3. run `npm run bootstrap`
4. run `npm run preflight`
5. run the first dry-run scenario

### Notes
Some adapter paths may remain placeholder-backed depending on your credentials and local setup.
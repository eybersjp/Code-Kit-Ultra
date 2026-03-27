# Hosted Topology

## Core services
- Web Control Plane
- Control Service API
- Execution Workers
- Realtime/Event Bridge
- Audit Store
- Artifact Storage
- Learning/Analytics Service

## Foundation services
- InsForge Auth
- InsForge Postgres
- InsForge Storage
- InsForge Realtime
- Optional queue broker for long-running tasks

## Recommended deployment pattern
- Frontend: Vercel or Netlify
- Control/API: container platform (Cloud Run / Fly.io / Render / ECS)
- Workers: isolated container jobs or dedicated instances
- Database/Storage/Auth: InsForge
- Observability: OpenTelemetry + log aggregation + metrics + alerts

## Isolation model
- Tenant isolation in application layer + DB scope + artifact path prefixes
- Optional dedicated workers for enterprise tier

# Observability

## Metrics
- request latency
- auth failure rate
- run creation rate
- gate approval latency
- execution success/failure rate
- verification pass rate
- worker queue depth
- artifact upload failures
- realtime disconnect rate

## Logs
Structured logs must include:
- correlationId
- actorId
- actorType
- orgId
- projectId
- runId
- route / worker task name
- severity

## Alerts
P0:
- auth service failure
- cross-tenant access detected
- audit write failure
- execution worker backlog critical

P1:
- elevated run failures
- artifact upload failures
- realtime outage

## Dashboards
- Control plane health
- Execution engine health
- Tenant activity
- Learning outcomes

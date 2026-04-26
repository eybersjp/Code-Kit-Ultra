# Troubleshooting Guide

Common issues, debugging techniques, and incident response playbooks for Code Kit Ultra.

## Quick Diagnostics

Run this script to check system health:

```bash
#!/bin/bash
echo "=== Code Kit Ultra Diagnostics ==="
echo ""
echo "Docker Status:"
docker compose ps 2>/dev/null || echo "Docker not running"

echo ""
echo "PostgreSQL Connection:"
psql -h localhost -U postgres -d codekit -c "SELECT version();" 2>&1 | head -1

echo ""
echo "Redis Connection:"
redis-cli ping 2>&1

echo ""
echo "Control-Service Health:"
curl -s http://localhost:7474/health | jq . 2>/dev/null || echo "Service unreachable"

echo ""
echo "Recent Logs (last 10 errors):"
docker compose logs control-service 2>/dev/null | grep -i error | tail -10 || echo "No recent errors"
```

---

## Common Issues by Component

### Control-Service Issues

#### Service Won’t Start

**Symptoms:**
- Container exits immediately
- docker compose logs control-service shows error

**Diagnosis:**
```bash
docker compose logs control-service
docker compose config | grep -A 20 "control-service"
docker compose up control-service
```

**Solutions:**

1. **Missing DATABASE_URL:**
   ```bash
   cat .env | grep DATABASE_URL
   grep -A 5 "DATABASE_URL" docker-compose.yml
   ```

2. **Database not ready:**
   ```bash
   docker compose logs postgres | tail -5
   docker compose exec postgres pg_isready -U postgres
   docker compose down && docker compose up postgres && sleep 10 && docker compose up -d
   ```

3. **Port already in use:**
   ```bash
   lsof -i :7474
   kill -9 PID
   ```

4. **Node.js out of memory:**
   - Update docker-compose.yml memory limit to 2G

#### High Latency or Timeouts

**Symptoms:**
- API responses slow (>5s)
- Request timeouts
- "Timeout waiting for gate evaluation" errors

**Diagnosis:**
```bash
docker compose logs control-service --tail 50 | grep -i "timeout\|duration"
time curl -X POST http://localhost:7474/runs -H "Content-Type: application/json" -d ‘{"intent":"test"}’
```

**Solutions:**

1. **Slow database queries:**
   - Increase indexes on frequently queried columns
   - Optimize query plans with EXPLAIN ANALYZE
   - Run `pnpm run db:optimize`

2. **High Redis memory usage:**
   - Flush expired keys periodically
   - Increase Redis memory limit
   - Enable Redis eviction policies

3. **Gate evaluation timeout:**
   ```bash
   export CODEKIT_TIMEOUT_MS=60000
   ```

#### API Returns 500 Error

**Symptoms:**
- All requests fail with 500
- Specific endpoint fails with 500

**Diagnosis:**
```bash
docker compose logs control-service --tail 100 | grep -A 5 "ERROR\|FAIL"
curl -v http://localhost:7474/runs/run-id
```

**Solutions:**

1. **Database connection lost:**
   ```bash
   docker compose ps postgres
   docker compose exec control-service psql -h postgres -U postgres -d codekit -c "SELECT 1;"
   docker compose restart postgres
   ```

2. **Redis connection lost:**
   ```bash
   docker compose ps redis
   docker compose restart redis
   ```

3. **Unhandled exception:**
   ```bash
   DEBUG=cku:* docker compose up control-service
   ```

#### Authentication Failures

**Symptoms:**
- "Unauthorized" or "401 Unauthorized"
- "Invalid token" errors
- "Token expired" messages

**Diagnosis:**
```bash
curl -v -H "Authorization: Bearer TOKEN" http://localhost:7474/runs
docker compose logs control-service | grep -i "insforge\|auth"
```

**Solutions:**

1. **Missing or invalid token:**
   - Verify token format is: "Authorization: Bearer <JWT_TOKEN>"
   - Generate new token via CLI

2. **Token expired:**
   - Request new token from InsForge
   - Update ANTIGRAVITY_API_KEY

3. **InsForge unavailable:**
   - Verify API connectivity
   - Check if API key is still valid

---

### Database Issues

#### Connection Pool Exhausted

**Symptoms:**
- "FATAL: sorry, too many clients"
- "No more connections available"

**Diagnosis:**
```bash
docker compose exec postgres psql -U postgres -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

**Solutions:**

1. **Increase connection pool size:**
   ```bash
   export DATABASE_POOL_SIZE=20
   docker compose restart control-service
   ```

2. **Close idle connections:**
   - Terminate idle connections older than 10 minutes
   - Implement connection timeout policy

3. **Restart PostgreSQL:**
   ```bash
   docker compose restart postgres
   ```

#### Migration Failures

**Symptoms:**
- "Migration XX failed"
- Database schema mismatch

**Diagnosis:**
```bash
pnpm run db:migrate:status
docker compose exec postgres psql -U postgres -d codekit -c "SELECT * FROM migrations ORDER BY executed_at DESC;"
```

**Solutions:**

1. **Rollback failed migration:**
   ```bash
   pnpm run db:migrate:rollback
   ```

2. **Reset database (WARNING: destroys data):**
   ```bash
   pnpm run db:migrate:reset
   pnpm run db:migrate
   ```

3. **Check for stuck migrations:**
   - Verify no locks are held
   - Retry migration

#### Lock Contention

**Symptoms:**
- Queries slow down after time
- "Deadlock detected" errors

**Diagnosis:**
```bash
docker compose exec postgres psql -U postgres -d codekit -c "SELECT pid, usename, now() - query_start AS duration, query FROM pg_stat_activity WHERE state != ‘idle’ ORDER BY duration DESC;"
```

**Solutions:**

1. **Kill long-running query:**
   - Terminate queries running longer than 5 minutes
   - Implement query timeout

2. **Increase statement timeout:**
   ```bash
   export CODEKIT_STATEMENT_TIMEOUT=120000
   ```

3. **Analyze and optimize queries:**
   - Use EXPLAIN ANALYZE
   - Add missing indexes

---

### Redis Issues

#### Redis Unreachable

**Symptoms:**
- "Connection refused" on port 6379
- "ECONNREFUSED 127.0.0.1:6379"

**Diagnosis:**
```bash
docker compose ps redis
docker compose exec redis redis-cli ping
docker compose logs redis | tail -20
```

**Solutions:**

1. **Start Redis:**
   ```bash
   docker compose up -d redis
   ```

2. **Verify connection string:**
   ```bash
   echo $REDIS_URL
   ```

3. **Reset Redis:**
   ```bash
   docker compose down
   docker volume rm codekit_redis_data
   docker compose up -d redis
   ```

#### High Memory Usage

**Symptoms:**
- Redis using >1GB RAM
- OOM errors in logs

**Diagnosis:**
```bash
docker compose exec redis redis-cli INFO memory
docker compose exec redis redis-cli --bigkeys
```

**Solutions:**

1. **Increase memory limit:**
   ```bash
   docker compose exec redis redis-cli CONFIG SET maxmemory 2gb
   docker compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

2. **Clear unused keys:**
   - Delete expired keys
   - Flush unused cache entries

3. **Enable persistence:**
   - Use appendonly yes for AOF persistence

---

### Orchestrator Issues

#### Gates Stuck on Approval

**Symptoms:**
- Gate remains in "awaiting-approval" for hours
- Run hangs indefinitely

**Diagnosis:**
```bash
docker compose exec postgres psql -U postgres -d codekit -c "SELECT id, run_id, status, created_at FROM gates WHERE status = ‘awaiting-approval’ ORDER BY created_at DESC LIMIT 10;"
docker compose logs control-service | grep -i "gate\|approval"
```

**Solutions:**

1. **Force approve gate:**
   ```bash
   curl -X POST http://localhost:7474/gates/gate-id/approve -H "Authorization: Bearer TOKEN"
   ```

2. **Check for missing approvers:**
   - Verify approvers are assigned to gate

3. **Restart orchestrator:**
   ```bash
   docker compose restart control-service
   ```

#### Step Execution Timeout

**Symptoms:**
- "Step execution timeout after 30s"
- Runs stuck in "executing-step" state

**Diagnosis:**
```bash
docker compose logs control-service | grep -i "duration\|timeout"
time pnpm --filter cli run execute --intent "Test action"
```

**Solutions:**

1. **Increase timeout:**
   ```bash
   export CODEKIT_TIMEOUT_MS=60000
   docker compose restart control-service
   ```

2. **Check step implementation:**
   - Review step handler code
   - Add logging to trace execution
   - Optimize slow operations

3. **Distribute work across steps:**
   - Break large steps into smaller ones
   - Parallelize independent work

#### Healing Failures

**Symptoms:**
- "Healing step failed: ECONNREFUSED"
- Remediation doesn’t trigger

**Diagnosis:**
```bash
docker compose logs control-service | grep -i "healing\|remediat"
docker compose logs control-service | grep -i "adapter.*init"
```

**Solutions:**

1. **Check adapter connectivity:**
   ```bash
   curl -s http://localhost:7474/adapters | jq .
   ```

2. **Enable healing logs:**
   ```bash
   DEBUG=cku:healing docker compose up control-service
   ```

3. **Retry healing manually:**
   ```bash
   curl -X POST http://localhost:7474/runs/RUN_ID/heal
   ```

---

### Network Issues

#### API Endpoint Unreachable

**Symptoms:**
- "curl: (7) Failed to connect to localhost port 7474"
- "Connection refused"

**Diagnosis:**
```bash
netstat -tulpn | grep 7474
curl -v http://localhost:7474/health
```

**Solutions:**

1. **Start service:**
   ```bash
   docker compose up -d control-service
   ```

2. **Check port is available:**
   ```bash
   lsof -i :7474
   ```

3. **Use correct hostname:**
   ```bash
   # From Docker: use service name
   docker compose exec control-service curl http://control-service:7474/health
   # From host: use localhost
   curl http://localhost:7474/health
   ```

#### WebSocket Connection Drops

**Symptoms:**
- "WebSocket connection closed unexpectedly"
- Real-time updates stop

**Diagnosis:**
```bash
docker compose logs control-service | grep -i "websocket\|close"
```

**Solutions:**

1. **Increase timeout:**
   ```bash
   export WEBSOCKET_TIMEOUT=120000
   ```

2. **Enable WebSocket keep-alive:**
   - Verify Express/socket.io is configured

3. **Restart service:**
   ```bash
   docker compose restart control-service
   ```

---

## Performance Issues

### Memory Leaks

**Symptoms:**
- Memory usage grows over time
- Service slows down after hours

**Diagnosis:**
```bash
node --inspect apps/control-service/dist/index.js
docker compose exec control-service node -e "console.log(process.memoryUsage())"
```

**Solutions:**

1. **Enable garbage collection logs:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=2048" docker compose up control-service
   ```

2. **Profile memory:**
   - Use clinic.js or Node.js inspector
   - Check for event listener accumulation
   - Verify timers are cleaned up

### CPU Spikes

**Symptoms:**
- High CPU usage (>80%)
- Requests slow down significantly

**Diagnosis:**
```bash
docker stats control-service
node --prof apps/control-service/dist/index.js
```

**Solutions:**

1. **Profile hot functions:**
   - Use clinic.js or autocannon
   - Identify CPU-bound code

2. **Add caching:**
   - Memoize expensive computations
   - Cache query results

3. **Use worker threads:**
   - Offload CPU-bound work
   - Parallelize computations

---

## Incident Response Playbooks

### On-Call Escalation

1. **Page:** Alert threshold exceeded (5xx errors >1%)
2. **Triage:** Determine severity (Critical/High/Medium/Low)
3. **Assess:** Impact on users
4. **Notify:** Slack #incidents
5. **Mitigate:** Apply quickfix
6. **Investigate:** Root cause analysis

### Control-Service Crashed

**Timeline:**

1. **Immediately (0-2 min):** Restart service
   ```bash
   docker compose restart control-service
   ```

2. **Quickly (2-5 min):** Check status
   ```bash
   curl http://localhost:7474/health
   ```

3. **Verify (5-10 min):** Test endpoints
   ```bash
   curl http://localhost:7474/runs
   ```

4. **Investigate (10+ min):** Root cause
   ```bash
   docker compose logs control-service --tail 200 | grep -i error
   ```

5. **Document:** Post-incident review

### Database Connection Pool Exhausted

**Immediate action (0-5 min):**
- Terminate idle connections older than 10 minutes
- Check connection limits

**Mitigation (5-15 min):**
```bash
docker compose restart control-service
```

**Long-term:**
- Increase pool size
- Add connection monitoring
- Implement timeout

### Complete Service Outage

**Immediate action (0-10 min):**
```bash
docker compose ps
docker compose up -d
curl http://localhost:7474/health
```

**If restart doesn’t help (10-30 min):**
```bash
docker compose down
docker compose up -d
```

**If database is corrupted (30+ min):**
- Restore from latest backup
- Verify data integrity

### Memory/Disk Running Out

**Check status:**
```bash
df -h
free -h
docker system df
```

**Free up space:**
```bash
docker image prune -a
docker volume prune
```

---

## Debugging Techniques

### Enable Verbose Logging

```bash
DEBUG=cku:* docker compose up control-service
DEBUG=cku:orchestrator:* docker compose up control-service
```

### Database Query Debugging

```bash
# Enable slow query log
docker compose exec postgres psql -U postgres -d codekit -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"
```

### API Request Logging

```bash
# Add request timing middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on(‘finish’, () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});
```

---

## Cross-References

**Depends on:**
- [DEPLOYMENT.md](DEPLOYMENT.md) — Environment setup
- [control-service](../apps/control-service/CLAUDE.md) — API internals
- [governance package](../packages/governance/CLAUDE.md) — Gate mechanics
- [orchestrator package](../packages/orchestrator/CLAUDE.md) — Execution flow

**Related guides:**
- [PERFORMANCE.md](PERFORMANCE.md) — Optimization and monitoring
- [SECURITY_RUNBOOKS.md](SECURITY_RUNBOOKS.md) — Security incidents
- [Root CLAUDE.md](../CLAUDE.md) — System overview

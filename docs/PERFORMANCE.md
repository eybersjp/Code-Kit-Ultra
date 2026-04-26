# Performance Guide

Optimization strategies, benchmarking, and monitoring for Code Kit Ultra.

## Performance Targets

Target metrics for production deployments:

| Metric | Target | SLA |
|--------|--------|-----|
| Gate evaluation | <100ms (p99) | 99.9% |
| Step execution | <30s (p99) | 99.0% |
| API response time | <500ms (p99) | 99.5% |
| Database query | <100ms (p99) | 99.0% |
| WebSocket latency | <50ms (p99) | 99.5% |
| Approval workflow | <2s (p50) | 99.0% |

---

## Benchmarking Tools

### Load Testing with wrk

```bash
# Install wrk
brew install wrk  # macOS
apt-get install wrk  # Linux

# Basic load test
wrk -t12 -c400 -d30s --latency http://localhost:7474/health

# With custom script
wrk -t12 -c400 -d30s --script=benchmark.lua http://localhost:7474/runs

# Custom script (benchmark.lua)
request = function()
  return wrk.format("GET", "/runs")
end

response = function(status, headers, body)
  if status ~= 200 then
    print("Error: " .. status)
  end
end
```

### Load Testing with autocannon

```bash
# Install globally
npm install -g autocannon

# Basic load test
autocannon -c 100 -d 30 http://localhost:7474/health

# With more options
autocannon --connections 100 --pipelining 10 --duration 30 \
  http://localhost:7474/runs

# Save results
autocannon -o results.json http://localhost:7474/health
```

### E2E Performance Testing with Playwright

```bash
# Create test file (perf-test.spec.ts)
import { test, expect } from '@playwright/test';

test('list runs performance', async ({ page }) => {
  const start = Date.now();
  await page.goto('http://localhost:3000/runs');
  await page.waitForSelector('[data-test="runs-list"]');
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(3000); // 3 second target
  console.log(`Page load: ${duration}ms`);
});

# Run test
pnpm exec playwright test perf-test.spec.ts
```

---

## Profiling Tools

### Node.js Built-in Profiler

```bash
# CPU profiling
node --prof apps/control-service/dist/index.js

# Process profile output
node --prof-process isolate-0x*.log > profile.txt
less profile.txt

# Check hot functions
grep "name\|dur" profile.txt | head -50
```

### clinic.js

```bash
# Install globally
npm install -g clinic

# Doctor mode (auto-detect issues)
clinic doctor -- node apps/control-service/dist/index.js

# Detailed analysis
clinic flame -- node apps/control-service/dist/index.js
clinic bubbleprof -- node apps/control-service/dist/index.js
```

### Heap Snapshots

```bash
# Start with inspector
node --inspect apps/control-service/dist/index.js

# Connect in Chrome
chrome://inspect

# Take heap snapshot
# Analyze in DevTools > Memory tab

# Via Node API
const heapdump = require('heapdump');
heapdump.writeSnapshot(`./heap-${Date.now()}.heapsnapshot`);
```

### Linux perf

```bash
# CPU flame graph
perf record -F 99 -p PID -g -- sleep 10
perf script | stackcollapse-perf.pl | flamegraph.pl > flame.svg

# Check top functions
perf top -p PID

# Event analysis
perf stat -p PID
```

---

## Optimization Strategies

### 1. Gate Evaluation Optimization

**Problem:** Gates taking 200-500ms to evaluate.

**Solutions:**

```typescript
// 1. Cache gate decisions
const cache = new Map<string, CacheEntry>();
const getCachedDecision = (gateId: string) => {
  const cached = cache.get(gateId);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return cached.decision;
  }
  return null;
};

// 2. Parallel gate evaluation
const decisions = await Promise.all(
  gates.map(g => evaluateGate(g))
);

// 3. Optimize policy evaluation
// Pre-compile policy rules to avoid regex compilation per request
const compiledPolicy = compilePolicy(policy);
const result = compiledPolicy.evaluate(context);

// 4. Early exit on blocking gates
if (gate.type === 'BLOCKING' && decision === 'DENY') {
  return decision; // Don't evaluate remaining gates
}
```

**Metrics to track:**

```bash
# In code
const start = Date.now();
const decision = await evaluateGate(gate);
const duration = Date.now() - start;
metrics.recordGateEvaluation(gate.id, duration);

# Query metrics
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT gate_id, AVG(duration_ms), MAX(duration_ms) 
  FROM gate_evaluations 
  WHERE created_at > now() - interval '1 hour' 
  GROUP BY gate_id 
  ORDER BY AVG DESC;
"
```

### 2. Database Optimization

**Slow Query Analysis:**

```bash
# Enable slow query log
docker compose exec postgres psql -U postgres -d codekit -c "
  ALTER SYSTEM SET log_min_duration_statement = 500;
  SELECT pg_reload_conf();
"

# View slow queries
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT query, calls, mean_time, max_time 
  FROM pg_stat_statements 
  WHERE mean_time > 100 
  ORDER BY max_time DESC LIMIT 20;
"
```

**Index Optimization:**

```sql
-- Find missing indexes
SELECT schemaname, tablename, attname 
FROM pg_stat_user_tables t 
JOIN pg_stat_user_indexes i ON t.relid = i.relid 
WHERE n_tup_read > 10000 AND idx_scan = 0;

-- Create strategic indexes
CREATE INDEX idx_runs_status ON runs(status) WHERE status != 'completed';
CREATE INDEX idx_gates_run_approval ON gates(run_id) WHERE status = 'awaiting-approval';
CREATE INDEX idx_steps_run_duration ON steps(run_id, created_at) WHERE status = 'executing';

-- Composite indexes for common queries
CREATE INDEX idx_approvals_gate_created ON approvals(gate_id, created_at DESC);
CREATE INDEX idx_audit_run_timestamp ON audit_log(run_id, created_at DESC);

-- Verify indexes are used
EXPLAIN ANALYZE SELECT * FROM runs WHERE status = 'pending' LIMIT 100;
```

**Connection Pooling:**

```bash
# Configure in .env
DATABASE_POOL_SIZE=20
DATABASE_POOL_IDLE_TIMEOUT=30000
DATABASE_STATEMENT_TIMEOUT=120000

# Monitor pool usage
docker compose logs control-service | grep -i "connection\|pool"

# Query active connections
docker compose exec postgres psql -U postgres -d codekit -c "
  SELECT COUNT(*) as active, state 
  FROM pg_stat_activity 
  WHERE datname = 'codekit' 
  GROUP BY state;
"
```

**Query Optimization:**

```sql
-- Use EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM runs 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 100;

-- Look for sequential scans, increase pool size if needed
-- Sequential scan = index not being used

-- Add WHERE clause on indexed column
SELECT * FROM runs WHERE status = 'pending';
-- Much better than:
SELECT * FROM runs; -- full table scan
```

### 3. Redis Optimization

**Memory Optimization:**

```bash
# Check memory usage
docker compose exec redis redis-cli INFO memory

# Reduce memory per key
# Use smaller data structures (Hash instead of String)
# Use integer values instead of strings where possible
# Set TTLs to auto-expire old keys

docker compose exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

**Command Optimization:**

```bash
# Use pipeline instead of multiple commands
# Pipeline multiple commands to reduce round-trips

# Before (N round-trips)
redis-cli SET key1 value1
redis-cli SET key2 value2

# After (1 round-trip)
cat <<EOF | redis-cli --pipe
SET key1 value1\r\n
SET key2 value2\r\n
EOF
```

**Eviction Strategy:**

```bash
# Configure eviction policy
docker compose exec redis redis-cli CONFIG SET maxmemory-policy "allkeys-lru"

# Options:
# - noeviction: return error when max memory reached
# - allkeys-lru: evict least recently used keys
# - allkeys-lfu: evict least frequently used keys
# - volatile-lru: evict LRU keys with TTL
# - volatile-lfu: evict LFU keys with TTL
```

### 4. API Performance

**Response Compression:**

```typescript
import compression from 'compression';
app.use(compression({
  level: 6, // balance between speed and compression
  threshold: 1024, // only compress > 1KB
}));
```

**Caching Headers:**

```typescript
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ status: 'ok' });
});

app.get('/runs', (req, res) => {
  // Cache for 1 minute if not filtered
  if (!req.query.filter) {
    res.set('Cache-Control', 'public, max-age=60');
  } else {
    res.set('Cache-Control', 'private, max-age=0'); // No cache for filtered
  }
  res.json(runs);
});
```

**Pagination:**

```typescript
// Always use pagination to limit result size
app.get('/runs', (req, res) => {
  const page = req.query.page || 1;
  const limit = Math.min(req.query.limit || 100, 1000); // Max 1000
  const offset = (page - 1) * limit;
  
  const runs = db.runs.limit(limit).offset(offset).all();
  const total = db.runs.count();
  
  res.json({
    data: runs,
    pagination: { page, limit, total }
  });
});
```

**Async Processing:**

```typescript
// For slow operations, use background jobs
app.post('/runs', async (req, res) => {
  const run = db.runs.create({ status: 'pending' });
  
  // Start job async
  executeRun(run.id).catch(err => {
    logger.error(`Run ${run.id} failed:`, err);
  });
  
  // Return immediately
  res.status(202).json({ id: run.id, status: 'pending' });
});
```

### 5. Frontend Performance

**Code Splitting:**

```typescript
// React lazy loading
const RunsPage = lazy(() => import('./pages/RunsPage'));
const GatesPage = lazy(() => import('./pages/GatesPage'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/gates" element={<GatesPage />} />
      </Routes>
    </Suspense>
  );
}
```

**Lighthouse Optimization:**

```bash
# Run Lighthouse
pnpm exec lighthouse http://localhost:3000 --view

# Targets
# Performance: >90
# Accessibility: >90
# Best Practices: >90
# SEO: >90
```

**Image Optimization:**

```typescript
// Use Next.js Image optimization
import Image from 'next/image';

<Image
  src="/run-diagram.png"
  alt="Run execution flow"
  width={800}
  height={600}
  loading="lazy" // Lazy load
  quality={75} // Reduce quality for smaller size
/>
```

---

## Monitoring & Alerting

### Prometheus Metrics

**Key metrics to expose:**

```typescript
import prom from 'prom-client';

// Gate evaluation
const gateEvaluationDuration = new prom.Histogram({
  name: 'gate_evaluation_duration_ms',
  help: 'Time to evaluate a gate',
  buckets: [10, 50, 100, 200, 500, 1000],
});

// Step execution
const stepExecutionDuration = new prom.Histogram({
  name: 'step_execution_duration_ms',
  help: 'Time to execute a step',
  buckets: [100, 500, 1000, 5000, 30000],
});

// API response time
const httpRequestDuration = new prom.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 500, 1000],
});

// Expose metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', prom.register.contentType);
  res.end(prom.register.metrics());
});
```

**Record metrics:**

```typescript
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration.labels(req.method, req.route.path, res.statusCode).observe(duration);
  });
  next();
});

const timer = gateEvaluationDuration.startTimer();
const decision = await evaluateGate(gate);
timer();
```

### Grafana Dashboards

**Import dashboard:**

```bash
# Query Prometheus
docker compose up -d prometheus

# Access Grafana
http://localhost:3000 (user: admin, pass: admin)

# Add Prometheus data source
# URL: http://prometheus:9090
```

**Dashboard queries:**

```promql
# Gate evaluation latency (p99)
histogram_quantile(0.99, rate(gate_evaluation_duration_ms_bucket[5m]))

# API response time (p50)
histogram_quantile(0.5, rate(http_request_duration_ms_bucket[5m]))

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# Request rate
rate(http_requests_total[5m])
```

### Alerting Rules

**prometheus.yml:**

```yaml
groups:
  - name: codekit
    interval: 30s
    rules:
      # Gate evaluation too slow
      - alert: SlowGateEvaluation
        expr: histogram_quantile(0.99, rate(gate_evaluation_duration_ms_bucket[5m])) > 500
        for: 5m
        annotations:
          summary: "Gate evaluation p99 > 500ms"
      
      # High error rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.01
        for: 2m
        annotations:
          summary: "HTTP 5xx rate > 1%"
      
      # Database connection pool high
      - alert: DatabaseConnPoolHigh
        expr: pg_stat_activity_count > 15
        for: 5m
        annotations:
          summary: "Database connections > 15"
```

---

## Load Testing Procedures

### Preparation

```bash
# 1. Establish baseline
pnpm run preflight
pnpm run test:all

# 2. Set up monitoring
docker compose up prometheus grafana

# 3. Clear caches
docker compose exec redis redis-cli FLUSHDB
```

### Ramp-Up Test

```bash
# Gradually increase load
# 0-5 min: 10 req/s
# 5-10 min: 50 req/s
# 10-15 min: 100 req/s
# 15-20 min: 200 req/s

wrk -t12 -c10 -d300s --script=ramp.lua http://localhost:7474/runs

# ramp.lua
local counter = 0
request = function()
  counter = counter + 1
  -- Ramp up: increase delay over time
  if counter < 50 then
    -- 0-50 requests: max 50 req/s (20ms delay)
  elseif counter < 250 then
    -- 50-250 requests: max 100 req/s (10ms delay)
  else
    -- 250+ requests: max 200 req/s (5ms delay)
  end
  return wrk.format("GET", "/runs")
end
```

### Spike Test

```bash
# Sudden surge in traffic
# 0-5 min: 10 req/s
# 5-6 min: 500 req/s SPIKE
# 6+ min: 10 req/s

autocannon -c 500 -d 60 -w 1 http://localhost:7474/runs
```

### Soak Test

```bash
# Run at moderate load for long duration
# Purpose: find memory leaks, connection issues

wrk -t12 -c100 -d3600s http://localhost:7474/health

# Monitor memory
watch -n 5 'docker stats control-service | grep control-service'
```

### Bottleneck Identification

```bash
# Run profiling during load test
wrk -t12 -c100 -d60s http://localhost:7474/runs &
sleep 10
clinic doctor -- node apps/control-service/dist/index.js

# Analyze results
# Look for:
# - High I/O wait: database bottleneck
# - High CPU: code optimization needed
# - High memory: memory leak or poor GC
```

---

## Common Performance Issues

### Issue: Slow Gate Evaluation

**Symptoms:** Gate evaluation > 500ms

**Root Causes:**
1. Inefficient policy evaluation (regex per request)
2. External API calls in gate logic
3. Missing database indexes

**Fix:**
```typescript
// Before: Regex compiled per request (SLOW)
const isMatch = /rule-\d+/.test(context.gate);

// After: Pre-compile regex (FAST)
const GATE_PATTERN = /rule-\d+/;
const isMatch = GATE_PATTERN.test(context.gate);

// Or use database indexes
CREATE INDEX idx_gates_rules ON gates(rule_id);
```

### Issue: Memory Leak

**Symptoms:** Memory grows 10MB/min, service crashes after hours

**Root Causes:**
1. Accumulating event listeners
2. Unbounded cache growth
3. Circular references preventing GC

**Fix:**
```typescript
// Before: Event listeners accumulate
emitter.on('gate:evaluated', handleEvent);

// After: Clean up listeners
const handler = () => { /* ... */ };
emitter.on('gate:evaluated', handler);
// Later:
emitter.off('gate:evaluated', handler);

// Use WeakMap for cache
const cache = new WeakMap();
cache.set(gate, result);
// Automatically garbage collected when gate is removed
```

### Issue: Database Deadlock

**Symptoms:** Intermittent "Deadlock detected" errors

**Root Causes:**
1. Multiple transactions modifying same rows
2. Long-running transactions
3. Non-deterministic lock order

**Fix:**
```sql
-- Lock rows in deterministic order
BEGIN;
SELECT * FROM gates WHERE id = 'gate-1' FOR UPDATE;
SELECT * FROM approvals WHERE gate_id = 'gate-1' FOR UPDATE;
-- Now modify with no deadlock risk
COMMIT;
```

---

## Cross-References

**Depends on:**
- [DEPLOYMENT.md](DEPLOYMENT.md) — Environment setup
- [control-service](../apps/control-service/CLAUDE.md) — API internals
- [orchestrator package](../packages/orchestrator/CLAUDE.md) — Execution flow

**Related guides:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Debugging performance issues
- [SECURITY_RUNBOOKS.md](SECURITY_RUNBOOKS.md) — Secure optimization
- [Root CLAUDE.md](../CLAUDE.md) — System overview

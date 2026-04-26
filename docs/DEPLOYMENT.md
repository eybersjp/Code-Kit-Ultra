# Deployment Guide

Comprehensive deployment strategies for Code Kit Ultra across development, staging, and production environments. Covers Docker Compose, Kubernetes, and cloud platform setups.

## Overview

Code Kit Ultra supports three primary deployment architectures:

1. **Local Development** — Docker Compose for rapid iteration
2. **Staging** — Multi-container orchestration with persistent storage
3. **Production** — Kubernetes with high availability, scaling, and monitoring

### Quick Start

```bash
# Local development (Docker)
docker compose up -d

# Staging (Docker Compose with overrides)
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Production (Kubernetes)
kubectl apply -f k8s/
kubectl rollout status deployment/control-service
```

---

## Local Development Setup

### Docker Compose (Recommended)

The fastest way to set up a complete local environment.

#### Prerequisites

- Docker Desktop (or Docker + Docker Compose v2+)
- 4GB available RAM
- 2 available CPU cores

#### Setup

```bash
# Start all services
docker compose up -d

# Verify services are running
docker compose ps

# View logs
docker compose logs -f control-service

# Stop all services
docker compose down

# Clean up volumes (WARNING: deletes data)
docker compose down -v
```

#### What Gets Started

- **PostgreSQL 16** (port 5432) — Main database
- **Redis 7** (port 6379) — Session store and cache
- **control-service** (port 7474) — Core API
- **web-control-plane** (port 3000) — Operator UI (optional)

#### Docker Compose Configuration

File: `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: codekit
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  control-service:
    build:
      context: .
      dockerfile: apps/control-service/Dockerfile
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/codekit
      REDIS_URL: redis://redis:6379/0
      NODE_ENV: development
      CODEKIT_PROFILE: local-safe
    ports:
      - "7474:7474"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./:/workspace
    command: pnpm --filter control-service run dev

volumes:
  postgres_data:
  redis_data:
```

#### Common Tasks

```bash
# Run database migrations
docker compose exec control-service pnpm run db:migrate

# Access PostgreSQL CLI
docker compose exec postgres psql -U postgres -d codekit

# Access Redis CLI
docker compose exec redis redis-cli

# Rebuild image after code changes
docker compose up -d --build

# View service logs with timestamps
docker compose logs --timestamps -f control-service
```

### Manual Setup (macOS/Linux)

For development without Docker.

#### PostgreSQL 16

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16

# Create database
createdb codekit

# Run migrations
pnpm run db:migrate
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql-16
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb codekit

# Run migrations
pnpm run db:migrate
```

#### Redis 7

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

#### Environment Variables

Create `.env.local`:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codekit

# Redis
REDIS_URL=redis://localhost:6379/0

# API Keys
ANTIGRAVITY_API_KEY=xxx
ANTIGRAVITY_BASE_URL=https://api.antigravity.dev

CURSOR_API_KEY=xxx
CURSOR_BASE_URL=https://api.cursor.dev

WINDSURF_API_KEY=xxx
WINDSURF_BASE_URL=https://api.windsurf.dev

# Execution
CODEKIT_PROFILE=local-safe
CODEKIT_TIMEOUT_MS=30000
CODEKIT_MAX_RETRIES=3
```

#### Start Services

```bash
# Terminal 1: PostgreSQL (running via services)
# Terminal 2: Redis (running via services)
# Terminal 3: Control service
pnpm --filter control-service run dev

# Terminal 4: Web UI (optional)
pnpm --filter web-control-plane run dev
```

### Windows Setup

Windows users should use Docker Desktop with WSL2 backend (recommended) or GitHub Codespaces for best results.

**Docker Desktop (WSL2):**
```bash
# In WSL2 terminal
docker compose up -d
pnpm install
pnpm --filter control-service run dev
```

**GitHub Codespaces:**
```bash
# Codespaces automatically provides Docker and Node.js
docker compose up -d
pnpm install
pnpm run dev:web
```

---

## Staging Deployment

### Multi-Container Orchestration

Staging uses Docker Compose with production-like overrides and persistent storage.

#### Setup Steps

1. **Prepare staging environment:**

```bash
mkdir -p /opt/codekit/{data,logs,backups}
export CODEKIT_ENV=staging
export CODEKIT_DOMAIN=staging.codekit.local
```

2. **Create `.env.staging`:**

```bash
# Database
DATABASE_URL=postgresql://codekit_user:${CODEKIT_DB_PASSWORD}@postgres:5432/codekit_staging
POSTGRES_USER=codekit_user
POSTGRES_PASSWORD=${CODEKIT_DB_PASSWORD}
POSTGRES_DB=codekit_staging

# Redis
REDIS_URL=redis://redis:6379/1
REDIS_PASSWORD=${CODEKIT_REDIS_PASSWORD}

# API Keys
ANTIGRAVITY_API_KEY=${STAGING_ANTIGRAVITY_KEY}
CURSOR_API_KEY=${STAGING_CURSOR_KEY}
WINDSURF_API_KEY=${STAGING_WINDSURF_KEY}

# Control Service
CODEKIT_PROFILE=staging
CODEKIT_TIMEOUT_MS=60000
CODEKIT_MAX_RETRIES=5
NODE_ENV=production
```

3. **Use staging override file:**

File: `docker-compose.staging.yml`

```yaml
version: '3.8'

services:
  postgres:
    ports:
      - "5433:5432"
    volumes:
      - /opt/codekit/data/postgres:/var/lib/postgresql/data
      - ./backups/staging:/backups
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    restart: always

  redis:
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - /opt/codekit/data/redis:/data
    restart: always

  control-service:
    build:
      context: .
      dockerfile: apps/control-service/Dockerfile.prod
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      NODE_ENV: production
      CODEKIT_PROFILE: ${CODEKIT_PROFILE}
    ports:
      - "7474:7474"
    restart: always
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G

  web-control-plane:
    build:
      context: .
      dockerfile: apps/web-control-plane/Dockerfile.prod
    environment:
      REACT_APP_API_URL: https://${CODEKIT_DOMAIN}:7474
    ports:
      - "3000:80"
    restart: always

volumes:
  postgres_data:
  redis_data:
```

4. **Deploy:**

```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  --env-file .env.staging up -d

# Verify
docker compose -f docker-compose.yml -f docker-compose.staging.yml ps
```

5. **Run migrations:**

```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml \
  exec control-service pnpm run db:migrate
```

#### Backup Strategy

```bash
# Daily backup (add to crontab)
0 2 * * * docker compose exec -T postgres pg_dump -U codekit_user codekit_staging > /opt/codekit/backups/staging/codekit-$(date +\%Y\%m\%d).sql

# Verify backup
docker compose exec postgres ls -lah /backups/

# Restore from backup
docker compose exec -T postgres psql -U codekit_user codekit_staging < /opt/codekit/backups/staging/codekit-20260426.sql
```

#### Monitoring

```bash
# Check service health
docker compose -f docker-compose.yml -f docker-compose.staging.yml ps

# View logs
docker compose -f docker-compose.yml -f docker-compose.staging.yml logs -f --tail=100

# Check database connections
docker compose exec postgres psql -U codekit_user codekit_staging -c "\l"

# Check Redis memory usage
docker compose exec redis redis-cli INFO memory
```

---

## Production Deployment

### Kubernetes Architecture

Production uses Kubernetes for high availability, auto-scaling, and zero-downtime deployments.

#### Cluster Requirements

- **Kubernetes 1.24+**
- **Storage Class** (for persistent volumes)
- **Ingress Controller** (NGINX recommended)
- **Cert Manager** (for TLS)
- **Monitoring Stack** (Prometheus + Grafana optional but recommended)

#### Kubernetes Manifests

File: `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codekit
  labels:
    app: codekit
```

File: `k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: codekit-config
  namespace: codekit
data:
  CODEKIT_PROFILE: "production"
  CODEKIT_TIMEOUT_MS: "120000"
  CODEKIT_MAX_RETRIES: "5"
  NODE_ENV: "production"
  REACT_APP_API_URL: "https://api.codekit.io"
```

File: `k8s/secrets.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: codekit-secrets
  namespace: codekit
type: Opaque
stringData:
  DATABASE_URL: postgresql://codekit_prod:PASSWORD@postgres.default.svc.cluster.local:5432/codekit_prod
  REDIS_URL: redis://:PASSWORD@redis.default.svc.cluster.local:6379/0
  ANTIGRAVITY_API_KEY: "xxx"
  ANTIGRAVITY_BASE_URL: "https://api.antigravity.prod"
  CURSOR_API_KEY: "xxx"
  CURSOR_BASE_URL: "https://api.cursor.prod"
  WINDSURF_API_KEY: "xxx"
  WINDSURF_BASE_URL: "https://api.windsurf.prod"
```

File: `k8s/postgres-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: codekit
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          value: codekit_prod
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: codekit-secrets
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          value: codekit_prod
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
          subPath: postgres
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          exec:
            command: ["pg_isready", "-U", "codekit_prod"]
          initialDelaySeconds: 30
          periodSeconds: 10
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: codekit-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: codekit
spec:
  selector:
    app: postgres
  ports:
  - protocol: TCP
    port: 5432
    targetPort: 5432
  type: ClusterIP
```

File: `k8s/control-service-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: control-service
  namespace: codekit
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: control-service
  template:
    metadata:
      labels:
        app: control-service
    spec:
      containers:
      - name: control-service
        image: codekit/control-service:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 7474
          name: http
        envFrom:
        - configMapRef:
            name: codekit-config
        - secretRef:
            name: codekit-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 7474
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 7474
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000

---
apiVersion: v1
kind: Service
metadata:
  name: control-service
  namespace: codekit
spec:
  selector:
    app: control-service
  ports:
  - protocol: TCP
    port: 7474
    targetPort: 7474
  type: LoadBalancer
```

File: `k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: codekit-ingress
  namespace: codekit
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.codekit.io
    - control.codekit.io
    secretName: codekit-tls
  rules:
  - host: api.codekit.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: control-service
            port:
              number: 7474
  - host: control.codekit.io
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-control-plane
            port:
              number: 80
```

#### Deployment Commands

```bash
# Apply all manifests
kubectl apply -f k8s/

# Watch rollout status
kubectl rollout status deployment/control-service -n codekit --timeout=5m

# Scale replicas
kubectl scale deployment control-service --replicas=5 -n codekit

# View deployments
kubectl get deployments -n codekit

# View pods
kubectl get pods -n codekit

# View services
kubectl get svc -n codekit

# View logs
kubectl logs -f deployment/control-service -n codekit --tail=100

# Port forward for debugging
kubectl port-forward svc/control-service 7474:7474 -n codekit
```

#### Rolling Updates

```bash
# Trigger rolling update with new image
kubectl set image deployment/control-service \
  control-service=codekit/control-service:v1.2.3 \
  -n codekit

# Monitor rollout
kubectl rollout status deployment/control-service -n codekit

# Rollback if needed
kubectl rollout undo deployment/control-service -n codekit

# View rollout history
kubectl rollout history deployment/control-service -n codekit
```

---

## Database Setup

### PostgreSQL Migrations

#### Initial Setup

```bash
# Create database
createdb codekit

# Run migrations
pnpm run db:migrate

# Verify migrations
psql -d codekit -c "\dt" | head -20
```

#### Managing Migrations

```bash
# List pending migrations
pnpm run db:migrate:status

# Rollback last migration
pnpm run db:migrate:rollback

# Reset database (WARNING: destroys data)
pnpm run db:migrate:reset

# View migration history
psql -d codekit -c "SELECT * FROM migrations ORDER BY executed_at DESC LIMIT 20;"
```

#### Schema Backup

```bash
# Export schema
pg_dump -h localhost -U postgres -d codekit --schema-only > schema-backup.sql

# Export full database
pg_dump -h localhost -U postgres -d codekit > codekit-backup-$(date +%Y%m%d).sql

# Import from backup
psql -h localhost -U postgres -d codekit < codekit-backup-20260426.sql
```

---

## Redis Setup

### Local Setup

```bash
# Start Redis
redis-server

# Verify connection
redis-cli ping
# Should return: PONG
```

### Staging/Production Setup

#### Redis Configuration

File: `redis.conf`

```
# General
port 6379
bind 0.0.0.0
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Persistence
save 900 1        # Save after 900 seconds if 1 key changed
save 300 10       # Save after 300 seconds if 10 keys changed
save 60 10000     # Save after 60 seconds if 10000 keys changed
appendonly yes    # Enable AOF
appendfsync everysec

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Replication
replicaof no one  # This is the primary

# Security
requirepass ${REDIS_PASSWORD}

# Logging
loglevel notice
logfile ""
```

#### Redis Cluster (High Availability)

For production, use Redis Cluster or Sentinel:

```bash
# Start Redis with persistence
redis-server --port 6379 --appendonly yes --requirepass ${REDIS_PASSWORD}

# Monitor connectivity
redis-cli -a ${REDIS_PASSWORD} ping

# Check info
redis-cli -a ${REDIS_PASSWORD} INFO stats
```

---

## Environment Variables

### Required Variables

| Variable | Example | Purpose | Required |
|----------|---------|---------|----------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/codekit` | PostgreSQL connection | Yes |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection | Yes |
| `CODEKIT_PROFILE` | `local-safe`, `staging`, `production` | Execution profile | Yes |
| `ANTIGRAVITY_API_KEY` | `xxx` | Identity provider API key | Yes |
| `ANTIGRAVITY_BASE_URL` | `https://api.antigravity.dev` | Identity provider URL | Yes |
| `CURSOR_API_KEY` | `xxx` | Cursor integration key | Yes |
| `CURSOR_BASE_URL` | `https://api.cursor.dev` | Cursor integration URL | Yes |
| `WINDSURF_API_KEY` | `xxx` | Windsurf integration key | Yes |
| `WINDSURF_BASE_URL` | `https://api.windsurf.dev` | Windsurf integration URL | Yes |

### Optional Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `CODEKIT_TIMEOUT_MS` | `30000` | Execution timeout (ms) |
| `CODEKIT_MAX_RETRIES` | `3` | Max retry attempts |
| `NODE_ENV` | `development` | Node environment |
| `DEBUG` | unset | Debug namespace (e.g., `cku:*`) |
| `LOG_LEVEL` | `info` | Logging level |

### Secrets Management

Store sensitive variables in:

1. **Local:** `.env.local` (git-ignored)
2. **Docker:** Secret files referenced in Compose
3. **Kubernetes:** Secret objects
4. **Cloud:** AWS Secrets Manager, Azure Key Vault, GCP Secret Manager

**Never commit secrets to git.**

---

## Monitoring & Health Checks

### Health Endpoints

```bash
# Control-service health
curl http://localhost:7474/health
# Response: { "status": "ok", "timestamp": "2026-04-26T..." }

# Database health (from within control-service)
curl http://localhost:7474/health/db

# Redis health (from within control-service)
curl http://localhost:7474/health/redis
```

### Docker Health Checks

Already configured in docker-compose.yml. To check status:

```bash
docker compose ps
# Shows HEALTH column with "healthy" or "unhealthy"
```

### Kubernetes Liveness & Readiness

Defined in k8s manifests:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 7474
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 7474
  initialDelaySeconds: 10
  periodSeconds: 5
```

### Logging

```bash
# Docker
docker compose logs -f control-service --tail 100

# Kubernetes
kubectl logs -f deployment/control-service -n codekit --tail 100

# Search logs
kubectl logs -f deployment/control-service -n codekit | grep "ERROR"
```

---

## Troubleshooting Deployment Issues

### Service Won't Start

**Check Docker logs:**
```bash
docker compose logs control-service
```

**Common causes:**
- Missing environment variables (check .env file)
- Port already in use (change port or kill process)
- Database not ready (wait 30s and retry)

### Database Connection Failures

```bash
# Test connection
psql -h localhost -U postgres -d codekit -c "SELECT 1;"

# Check Docker network
docker compose exec control-service ping postgres

# Verify DATABASE_URL format
echo $DATABASE_URL
```

### Redis Connection Issues

```bash
# Test connection
redis-cli ping

# Check logs
docker compose logs redis

# Verify REDIS_URL format
echo $REDIS_URL
```

### Kubernetes Pod CrashLoopBackOff

```bash
# Check pod status
kubectl describe pod POD_NAME -n codekit

# View logs
kubectl logs POD_NAME -n codekit --previous

# Check resource limits
kubectl top pods -n codekit
```

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables configured and verified
- [ ] Database backed up
- [ ] SSL certificates installed (TLS/HTTPS)
- [ ] Monitoring and alerting configured
- [ ] Log aggregation enabled (e.g., ELK stack)
- [ ] Rate limiting enabled on API endpoints
- [ ] RBAC policies reviewed and enforced
- [ ] Database connection pooling configured
- [ ] Redis persistence enabled (AOF)
- [ ] Backup recovery procedure tested
- [ ] Disaster recovery plan documented
- [ ] On-call escalation procedures defined
- [ ] Capacity planning completed
- [ ] Load testing passed all thresholds
- [ ] Security audit completed

---

## Cross-References

**Depends on:**
- [control-service](../apps/control-service/CLAUDE.md) — Core API deployment
- [Shared package](../packages/shared/CLAUDE.md) — Shared types
- [Auth package](../packages/auth/CLAUDE.md) — Authentication

**Related guides:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) — Common issues and debugging
- [PERFORMANCE.md](PERFORMANCE.md) — Optimization and monitoring
- [SECURITY_RUNBOOKS.md](SECURITY_RUNBOOKS.md) — Security deployment
- [Root CLAUDE.md](../CLAUDE.md) — System overview

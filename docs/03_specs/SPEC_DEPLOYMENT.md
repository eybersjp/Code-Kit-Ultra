# SPEC — Docker & Kubernetes Deployment

**Status:** Approved
**Version:** 1.0
**Linked to:** `docs/02_architecture/SYSTEM_ARCHITECTURE.md`
**Implements:** Master spec Section 15 — Build, CI/CD, and Infrastructure
**Unblocks:** T2-2 implementation
**Risk refs:** R-08

---

## Objective

Create Docker and Kubernetes deployment artifacts enabling the control-service to run in a hosted container environment on GCP, with local development via Docker Compose.

---

## Scope

**In scope:**
- Multi-stage Dockerfile for the control-service
- Docker Compose for local development (control-service + postgres + redis)
- Kubernetes manifests: Deployment, Service, ConfigMap, HorizontalPodAutoscaler
- GitHub Actions job to build and push Docker image on release

**Out of scope:**
- Web control plane containerisation (separate spec)
- Database cluster management
- TLS termination (handled by ingress/cloud load balancer)
- CI/CD promotion flow (covered in release process docs)

---

## Dockerfile — `Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/control-service ./apps/control-service

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build TypeScript
RUN pnpm --filter=control-service build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# Copy built artefacts
COPY --from=build /app/apps/control-service/dist ./apps/control-service/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

# Copy DB migrations for runtime migration support
COPY db ./db

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["node", "apps/control-service/dist/index.js"]
```

---

## Docker Compose — `docker-compose.yml`

```yaml
version: '3.9'
services:
  control-service:
    build: .
    ports:
      - "8080:8080"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgres://cku:cku@postgres:5432/cku_dev
      REDIS_URL: redis://redis:6379
      CONTROL_SERVICE_PORT: 8080
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: cku
      POSTGRES_PASSWORD: cku
      POSTGRES_DB: cku_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
      - ./db/seeds/local-dev-tenant.sql:/docker-entrypoint-initdb.d/02_seed.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cku"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## Kubernetes Manifests

### Deployment — `k8s/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cku-control-service
  namespace: cku
spec:
  replicas: 2
  selector:
    matchLabels:
      app: cku-control-service
  template:
    metadata:
      labels:
        app: cku-control-service
    spec:
      containers:
        - name: control-service
          image: ghcr.io/eybersjp/code-kit-ultra-control-service:latest
          ports:
            - containerPort: 8080
          envFrom:
            - secretRef:
                name: cku-control-service-secrets
            - configMapRef:
                name: cku-control-service-config
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 1Gi
```

### Service — `k8s/service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cku-control-service
  namespace: cku
spec:
  selector:
    app: cku-control-service
  ports:
    - port: 80
      targetPort: 8080
  type: ClusterIP
```

### ConfigMap — `k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cku-control-service-config
  namespace: cku
data:
  NODE_ENV: production
  CONTROL_SERVICE_PORT: "8080"
  CKU_AUTH_MODE: session-first
  CKU_LEGACY_API_KEYS_ENABLED: "false"
  LOG_LEVEL: info
```

### HPA — `k8s/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cku-control-service-hpa
  namespace: cku
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cku-control-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## GitHub Actions — Image Build and Push

Add to `.github/workflows/ci.yml` under a new `build` job:

```yaml
  docker-build:
    needs: validate
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/eybersjp/code-kit-ultra-control-service:latest
            ghcr.io/eybersjp/code-kit-ultra-control-service:${{ github.sha }}
```

---

## Port Alignment

Spec defines port 8080. Current repo uses 4000. Update:
- `apps/control-service/src/index.ts` — `const PORT = process.env.CONTROL_SERVICE_PORT ?? 8080`
- `apps/web-control-plane/vite.config.ts` — proxy target to `http://localhost:8080`
- `extensions/code-kit-vscode/src/api/client.ts` — default baseURL to `http://localhost:8080/v1`

---

## Files to Create

| File | Description |
|------|-------------|
| `Dockerfile` | Multi-stage build |
| `docker-compose.yml` | Local dev environment |
| `.dockerignore` | Exclude node_modules, .env, dist, .git |
| `k8s/deployment.yaml` | K8s deployment |
| `k8s/service.yaml` | K8s service |
| `k8s/configmap.yaml` | K8s config |
| `k8s/hpa.yaml` | K8s autoscaler |
| `k8s/namespace.yaml` | K8s namespace `cku` |

---

## Definition of Done

- [ ] `docker build -t cku-control-service .` completes without error
- [ ] `docker-compose up` starts control-service, postgres, and redis
- [ ] Control-service connects to postgres and responds at `http://localhost:8080/health`
- [ ] Kubernetes manifests apply cleanly to a local cluster (minikube or kind)
- [ ] GitHub Actions job builds and pushes image on merge to main
- [ ] `CONTROL_SERVICE_PORT` defaults to 8080
- [ ] `.dockerignore` excludes .env and other sensitive files
- [ ] Logged in `progress-log.md`
- [ ] Validated against `VALIDATION_MASTER.md`

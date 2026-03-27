# Deployment Topology

## Stage 1 - Hybrid
- InsForge handles auth, database, storage, realtime
- control-service is self-hosted
- execution workers are self-hosted
- VS Code extension can still trigger local dev flows

## Stage 2 - Hosted control plane
- web control plane hosted
- control-service hosted
- execution workers hosted by CKU
- CLI and extension use InsForge-backed sessions

## Stage 3 - Enterprise split deployment
- customer-hosted execution workers
- shared SaaS control plane
- shared or dedicated InsForge project depending tier
- private networking for execution workers

## Network boundaries
Public:
- web control plane
- control-service ingress

Private:
- execution workers
- internal queueing
- policy internals
- artifact processing jobs

## Secrets
Use per-environment secret stores.
Never expose worker credentials to clients.

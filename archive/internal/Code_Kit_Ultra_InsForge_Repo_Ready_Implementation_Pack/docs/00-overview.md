# Overview

## Objective
Make InsForge a first-class platform dependency for Code Kit Ultra.

That means:
- InsForge owns identity, base tenancy, core persistence, storage, and realtime
- Code Kit Ultra owns orchestration, governance, execution intelligence, policy semantics, and autonomous decision control

## Why this pack exists
Code Kit Ultra has evolved from a planning-oriented system into a governed autonomous engineering platform with:
- orchestrator-driven lifecycle
- approval-aware execution
- verification and audit
- VS Code control-plane UX
- increasing SaaS/platform ambition

The repo now needs a clean implementation path that avoids a split-brain architecture where:
- one auth model exists for the extension
- another exists for web
- another exists for CLI
- another exists for automation

## Architectural outcome
The new target is:

```text
Clients -> Code Kit Ultra Services -> InsForge Foundation
```

Where:
- clients authenticate through InsForge
- Code Kit Ultra validates identity and applies product-specific authorization
- execution uses short-lived internal tokens, not long-lived frontend credentials
- all run, gate, audit, and artifact records are persisted in an InsForge-backed data plane

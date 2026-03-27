# 🚀 Code Kit Ultra (CKU) — Phase 10.5

**Governed Autonomous Engineering & Self-Healing Systems.**

Code Kit Ultra is a production-grade, self-improving engineering platform that automates the entire software lifecycle with high-integrity governance gates.

---

## ⚡ Quick Start: Zero-Config Install

Once published to the NPM registry, install the full suite with a single command:

```bash
npm install cku
```

**Until the package is officially published**, install directly from the repo:

```bash
npm install github:eybersjp/Code-Kit-Ultra#main --prefix ./
```

Or clone and link locally:

```bash
git clone https://github.com/eybersjp/Code-Kit-Ultra.git
npm install ./Code-Kit-Ultra/packages/cku
```

**What happens during install?**

1. 📂 **Nesting**: The CKU core is automatically isolated in a `./codekit` directory.
2. 💻 **IDE Setup**: Detects VS Code and automatically installs the **Code Kit Ultra Control Plane** extension.
3. 🔧 **Integration**: Injects a `cku` script into your `package.json` for immediate usage.

---

## 🛠️ Commands

Now you can run namespaced commands anywhere:

```bash
# Initialize a new project idea
npm run cku /ck-init "Build a multi-tenant SaaS dashboard"

# Run the autonomous pipeline with governance review
npm run cku /ck-run

# Approve a policy gate manually
npm run cku /ck-approve gate_governance_consensus

# Check system health
npm run cku /ck-doctor
```

---

## 🏗️ Architecture & Included Modules

- **Failure Classifier**: Real-time diagnosis of execution anomalies.
- **Healing Engine**: Autonomous strategy selection and recovery.
- **Governed Autonomy**: Consensus-based gate decisions for high-risk actions.
- **Root Identity Plane**: [InsForge](https://docs.insforge.com) (Unified Identity & Attributed Governance).

---

## 🔐 Security & Identity

CKU v1.2.0+ enforces **Session-First Authentication**. Human operators must sign in via InsForge to execute governed actions.
- See [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) for the operator flow.

---

## 📄 License & Governance

Simulate → Assess Risk → Approve → Execute → Verify → Diagnose → Heal → Re-Verify → Learn.
*Powered by Code Kit Ultra Autonomic Intelligence.*

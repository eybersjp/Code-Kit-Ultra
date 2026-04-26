# Skill Engine — Skill Registry and Dispatcher

## Quick Overview

The **skill-engine** package implements dynamic skill selection and routing for Code Kit Ultra. It:

- Maintains a **skill registry** mapping intent/context to available skills
- Routes execution requests to appropriate skills based on project type, objective, and task context
- Provides **skill scoring algorithm** for intelligent skill selection
- Supports **fallback skills** when no perfect match exists
- Enables **skill generation** for dynamic skill creation

Skills represent reusable implementation patterns across the system. Each skill has metadata (name, category, triggers, project types) and a scoring system that matches user intent to the best available skill.

---

## Architecture

### Core Components

**Skill Registry** (`selector.ts`)
- Loads skill definitions from `config/skill-registry.json`
- Validates registry format and structure
- Provides lookup and filtering operations

**Skill Dispatcher** (`selector.ts`)
- Routes intents to skills via scoring algorithm
- Evaluates skills against project type, objective text, and task plan
- Returns ranked `SelectedSkill[]` with explanations

**Skill Manifest** (`manifest.ts`)
- Generates new skill packages with metadata and directory structure
- Creates generated skills from ideas/intents
- Initializes manifest, markdown docs, examples, and tests

**Skill Schema** (`schema.ts`)
- Validates generated skill manifests with Zod
- Tracks skill lifecycle (generated → reviewed → approved → installed → rolled-back)
- Stores audit trail of all skill mutations

### Data Flow

```
User Intent
  ↓
[Skill Selection]
  ├─ Load registry from config/skill-registry.json
  ├─ Normalize project type
  ├─ Extract objective/task keywords
  ├─ Score each skill (project match + keyword matches + priority)
  ├─ Filter by minimum score threshold
  └─ Sort by score + priority + alphabetically
  ↓
Selected Skills[] (ranked by relevance)
  ├─ Primary: Highest-scoring registry skills
  ├─ Fallback: "General Solution Scaffold" if no matches
  └─ Each with reason explaining selection
  ↓
[Dispatcher Routes to Skill]
  ├─ Load skill implementation
  ├─ Prepare execution context
  └─ Invoke skill execute function
```

---

## Skill Interface

### SkillRegistryEntry

A skill registered in the skill registry:

```typescript
interface SkillRegistryEntry {
  skillId: string;                    // Unique identifier (e.g., "deploy-service")
  name: string;                       // Display name
  category: string;                   // Category (e.g., "devops", "frontend", "backend")
  description: string;                // What this skill does
  triggers: string[];                 // Keywords that activate this skill
  projectTypes: string[];             // Project types this applies to
  taskTriggers: string[];             // Specific task IDs (from planning) that trigger this
  priority: number;                   // 0–100; higher = preferred in ties
}
```

### SelectedSkill

Result of skill selection:

```typescript
interface SelectedSkill {
  skillId: string;
  name: string;
  category: string;
  reason: string;                    // Explanation of why selected
  score: number;                      // Numeric score (higher is better)
  source: "registry" | "fallback";   // Where the skill came from
}
```

### SkillPackage

Generated skill with all artifacts:

```typescript
interface SkillPackage {
  manifest: GeneratedSkillManifest;
  skillMarkdown: string;              // SKILL.md documentation
  generatedPath: string;              // Directory path to generated skill
}
```

---

## Skill Registry

### Loading the Registry

```typescript
import { loadSkillRegistry } from '@cku/skill-engine'

const skills = loadSkillRegistry()
// Returns: SkillRegistryEntry[]
// Throws: Error if config/skill-registry.json missing or invalid
```

Registry file format (`config/skill-registry.json`):

```json
[
  {
    "skillId": "deploy-service",
    "name": "Deploy Service",
    "category": "devops",
    "description": "Deploy containerized services to production",
    "triggers": ["deploy", "release", "kubernetes", "docker"],
    "projectTypes": ["web-app", "api"],
    "taskTriggers": ["task-deploy-to-prod"],
    "priority": 90
  },
  {
    "skillId": "frontend-setup",
    "name": "Frontend Setup",
    "category": "frontend",
    "description": "Initialize React/Next.js project with tooling",
    "triggers": ["react", "next.js", "frontend", "ui"],
    "projectTypes": ["website", "web-app"],
    "taskTriggers": ["task-init-frontend"],
    "priority": 85
  }
]
```

### Validating Registry Entries

The `isSkillRegistryEntry` type guard validates:
- All required fields present
- Correct types (string, number, arrays)
- Triggers, projectTypes, and taskTriggers are arrays

---

## Dispatcher: Skill Selection

### Basic Selection

```typescript
import {
  selectSkills,
  selectSkillsFromClarification,
  explainSkillSelection
} from '@cku/skill-engine'

// From clarification + plan
const selected = selectSkillsFromClarification(
  clarification,    // ClarificationResult
  plan,             // Task[]
  { maxSkills: 6, minimumScore: 6 }
)
// Returns: SelectedSkill[] (ranked 1..N)
```

### Skill Scoring Algorithm

Each skill is scored based on:

1. **Project Type Match** (+5 points)
   - Normalize inferred project type (website, web-app, api, ai-agent, automation, unknown)
   - If skill's projectTypes includes normalized type: +5

2. **Objective Keywords** (+4 per match)
   - Extract keywords from user intent (normalizedIdea, projectType, assumptions, questions)
   - For each keyword matching a trigger: +4

3. **Task Plan Keywords** (+2 per match)
   - Extract keywords from task plan (task titles + descriptions)
   - For each keyword matching a trigger: +2

4. **Task Trigger Matches** (+3 per match)
   - For each skillTaskTrigger matching a plan task ID: +3

5. **Priority Bonus** (0–3 points)
   - Priority 95+: +3 points
   - Priority 85–94: +2 points
   - Priority 70–84: +1 point
   - Priority <70: +0 points

#### Example Scoring

Request: Deploy Node.js API to production
- Plan includes: [task-deploy-to-prod, task-configure-env, task-smoke-test]
- Clarification: "Deploy to prod"

Deploy Skill:
- projectTypes: ["api"] → inferred type "api" → +5
- triggers: ["deploy", "release"] → matched "deploy" → +4
- Plan text matches "deploy" → +2
- taskTriggers: ["task-deploy-to-prod"] → exact match → +3
- priority: 90 → +3
- **Total: 17 points**

Fallback Skill:
- **Score: 1 (always below threshold)**

### Filtering and Ranking

1. **Filter** scores ≥ minimumScore (default: 6)
2. **Sort** by: score (desc) → priority (desc) → skillId (asc)
3. **Slice** to maxSkills (default: 6)

If no skills pass threshold → return single fallback skill ("General Solution Scaffold")

### Selection Result

```typescript
const selected = selectSkills(input)

selected.forEach(skill => {
  console.log(`${skill.name} (score: ${skill.score})`)
  console.log(`  Reason: ${skill.reason}`)
  console.log(`  Category: ${skill.category}`)
})
```

Example output:
```
Deploy Service (score: 17)
  Reason: Deploy Service was selected because it matches the api project-type bucket;
          matched idea keywords: deploy; aligned with plan tasks: task-deploy-to-prod;
          reinforced by planning language: deploy, release.
  Category: devops

Frontend Setup (score: 8)
  Reason: Frontend Setup was selected because matched idea keywords: frontend;
          reinforced by planning language: frontend.
  Category: frontend
```

### Explaining Selection

To understand why skills were scored:

```typescript
import { explainSkillSelection } from '@cku/skill-engine'

const breakdowns = explainSkillSelection(input)
// Returns: SkillScoreBreakdown[] (all skills, sorted by score)

breakdowns.forEach(breakdown => {
  console.log(`${breakdown.skillId}: ${breakdown.score}`)
  console.log(`  Project match: ${breakdown.matchedProjectType}`)
  console.log(`  Objective keywords: ${breakdown.objectiveMatches}`)
  console.log(`  Task keywords: ${breakdown.taskMatches}`)
  console.log(`  Task triggers: ${breakdown.taskTriggerMatches}`)
  console.log(`  Priority bonus: ${breakdown.priorityBonus}`)
})
```

---

## Routing Logic

### Intent Parsing

Intent is normalized from clarification result:

```
normalizedIdea: "Deploy to production"
inferredProjectType: "Node.js API"
assumptions: [...assumption.text]
clarifyingQuestions: [...question.text]
     ↓
Full objective text: "deploy to production node.js api [assumptions] [questions]"
     ↓
Project type normalized: "api"
     ↓
Keywords extracted: ["deploy", "production", "api"]
```

### Project Type Normalization

```
User input → Normalized type
─────────────────────────────
"website" | "landing" → "website"
"agent" → "ai-agent"
"automation" → "automation"
"api" → "api"
"app" | "crm" | "portal" | "dashboard" → "web-app"
(other) → "unknown"
```

### Skill Selection Context

Selection considers:
1. **Project type** — Does the skill apply to this project?
2. **User intent** — Which keywords match triggers?
3. **Task plan** — Which tasks need this skill?
4. **Skill priority** — Which skills are preferred in ties?

---

## Skill Generation

### Creating a Generated Skill

```typescript
import { createGeneratedSkillFromIdea } from '@cku/skill-engine'

const skill = createGeneratedSkillFromIdea("Deploy to Kubernetes")
// Returns: SkillPackage

// Generated structure:
// skills/generated/skill_deploy_to_kubernetes/
// ├── manifest.json (metadata + audit trail)
// ├── SKILL.md (documentation)
// ├── examples/example-input.json
// └── tests/README.md
```

### Generated Skill Manifest

```typescript
interface GeneratedSkillManifest {
  skillId: string;                    // "skill_deploy_to_kubernetes"
  version: string;                    // "0.1.0"
  status: "generated" | "reviewed" | "approved" | "installed" | "rolled-back";
  createdAt: string;                  // ISO timestamp
  promotedAt?: string;                // When moved to installed
  rolledBackAt?: string;              // When rolled back
  review?: {
    reviewer?: string;
    notes?: string;
    approved?: boolean;
    reviewedAt?: string;
  };
  auditTrail: {
    action: string;                   // "generated", "reviewed", "approved", etc.
    by?: string;                      // User who performed action
    at: string;                       // ISO timestamp
    notes?: string;                   // Additional context
  }[];
}
```

### Skill Lifecycle

```
1. GENERATED
   ├─ Created from idea via createGeneratedSkillFromIdea
   ├─ manifest.json + docs created
   ├─ Initial audit trail recorded
   └─ Status: "generated"

2. REVIEWED (optional)
   ├─ Reviewer inspects implementation
   ├─ Update manifest.review field
   └─ Status: "reviewed"

3. APPROVED (optional)
   ├─ Reviewer approves implementation
   ├─ promotedAt timestamp set
   └─ Status: "approved"

4. INSTALLED
   ├─ Skill added to config/skill-registry.json
   ├─ Included in skill selection pool
   └─ Status: "installed"

5. ROLLED-BACK (if needed)
   ├─ Skill removed from registry
   ├─ rolledBackAt timestamp set
   └─ Status: "rolled-back"
```

---

## Testing

### Unit Tests

Test skill scoring with mock registry:

```typescript
import { selectSkills } from '@cku/skill-engine'
import { describe, it, expect } from 'vitest'

describe('Skill Selection', () => {
  it('should select skills matching project type', () => {
    const input = {
      clarification: {
        normalizedIdea: 'Deploy to production',
        inferredProjectType: 'Node.js API',
        assumptions: [],
        clarifyingQuestions: []
      },
      plan: [
        { id: 'task-deploy', title: 'Deploy service', description: 'Release to prod' }
      ]
    }

    const selected = selectSkills(input, {
      repoRoot: '/path/to/repo',
      maxSkills: 6,
      minimumScore: 6
    })

    expect(selected).toBeDefined()
    expect(selected[0]?.skillId).toBeTruthy()
    expect(selected[0]?.score).toBeGreaterThan(0)
  })

  it('should return fallback skill if no matches', () => {
    const input = {
      clarification: {
        normalizedIdea: 'xyzzzzz nonsense intent',
        inferredProjectType: 'unknown',
        assumptions: [],
        clarifyingQuestions: []
      },
      plan: []
    }

    const selected = selectSkills(input, { minimumScore: 100 })

    expect(selected).toHaveLength(1)
    expect(selected[0]?.skillId).toBe('general-solution-scaffold')
    expect(selected[0]?.source).toBe('fallback')
  })

  it('should explain skill scoring', () => {
    const breakdowns = explainSkillSelection(input)

    expect(breakdowns).toBeDefined()
    expect(breakdowns[0]?.score).toBeGreaterThanOrEqual(breakdowns[1]?.score)
  })
})
```

### Integration Tests

Test with real registry file:

```typescript
it('should load registry from config/skill-registry.json', () => {
  const registry = loadSkillRegistry()

  expect(Array.isArray(registry)).toBe(true)
  expect(registry.length).toBeGreaterThan(0)
  expect(registry[0]).toHaveProperty('skillId')
  expect(registry[0]).toHaveProperty('triggers')
})
```

### Test Fixtures

Create `__fixtures__/skill-registry.json` for testing:

```json
[
  {
    "skillId": "test-skill-1",
    "name": "Test Skill 1",
    "category": "test",
    "description": "For testing",
    "triggers": ["test", "example"],
    "projectTypes": ["web-app"],
    "taskTriggers": [],
    "priority": 50
  }
]
```

---

## Gotchas

### 1. Registry Not Found

**Problem:** `Error: Skill registry not found at config/skill-registry.json`

**Cause:** config/skill-registry.json missing or path misconfigured

**Solution:**
```bash
# Verify registry exists
ls -la config/skill-registry.json

# If missing, create from template
cat > config/skill-registry.json << 'EOF'
[]
EOF
```

### 2. Empty Registry

**Problem:** `Error: Skill registry file is empty at config/skill-registry.json`

**Cause:** File exists but contains no JSON array

**Solution:**
```json
// Valid but empty
[]

// Add at least one skill
[
  {
    "skillId": "default",
    "name": "Default Skill",
    "category": "general",
    "description": "Fallback for unmatched requests",
    "triggers": [],
    "projectTypes": [],
    "taskTriggers": [],
    "priority": 0
  }
]
```

### 3. Project Type Normalization Issues

**Problem:** Skills never match expected project type

**Cause:** User input doesn't match normalization rules

**Solution:** Check normalization logic:
```typescript
// "Next.js website" → "website" ✓
// "React SPA" → "unknown" ✗ (needs "app" or "web-app" in string)
// "FastAPI backend" → "unknown" ✗ (needs "api" in string)

// Add trigger keywords instead:
// triggers: ["next.js", "react", "fastapi", "sveltekit"]
```

### 4. Score Threshold Too High

**Problem:** No skills selected even though skills exist

**Cause:** minimumScore set too high

**Solution:**
```typescript
// Default: 6 (achievable with 1 exact match + priority bonus)
// If you set minimumScore: 50, you need multiple matches

selectSkills(input, { minimumScore: 6 })  // Default (usually fine)
selectSkills(input, { minimumScore: 3 })  // Relaxed (more fallback risk)
selectSkills(input, { minimumScore: 20 }) // Strict (fewer matches)
```

### 5. Generated Skills Not in Registry

**Problem:** Created skill via `createGeneratedSkillFromIdea` but not selected

**Cause:** Skill created in filesystem but not added to config/skill-registry.json

**Solution:** After generating, manually register:
```json
{
  "skillId": "skill_deploy_to_kubernetes",
  "name": "Deploy to Kubernetes",
  "category": "devops",
  "description": "Deploy containerized services to Kubernetes",
  "triggers": ["kubernetes", "deploy", "k8s"],
  "projectTypes": ["web-app", "api"],
  "taskTriggers": ["task-k8s-deploy"],
  "priority": 85
}
```

### 6. Task Trigger Mismatches

**Problem:** taskTriggers in skill don't match actual plan task IDs

**Cause:** Task IDs in plan don't match skillTaskTriggers

**Solution:** Verify task IDs:
```typescript
// In skill registry:
"taskTriggers": ["task-deploy-to-prod", "task-setup-env"]

// In plan:
plan = [
  { id: "task-deploy-prod", ... }  // ✗ Different ID!
]

// Both must match exactly:
"taskTriggers": ["task-deploy-prod"]  // Fixed
```

---

## Cross-References

**Depends on:**
- `packages/shared` — Type definitions (ClarificationResult, SelectedSkill, Task)

**Used by:**
- `apps/control-service` — Routes user intents to skills via dispatcher
- `packages/prompt-system` — May use skills for prompt generation
- `packages/learning` — Skill performance feedback loop

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md) — Project overview
- [Control Service CLAUDE.md](../../apps/control-service/CLAUDE.md) — API integration
- [Shared Types](../../packages/shared/CLAUDE.md) — Type definitions

# Web Control Plane — React-Based Operator Dashboard

## Quick Overview

The Web Control Plane (`apps/web-control-plane/`) is a React web application that provides an operator-facing dashboard for:
- Real-time monitoring of execution runs
- Interactive gate approval/rejection UI
- Learning and outcome tracking
- Policy editor for governance rules
- Audit trail browsing and forensics
- Timeline visualization of step execution

The control plane is built with **React**, **TypeScript**, and **Vite** for fast development. It communicates with control-service via HTTP REST API and WebSocket for real-time updates. The UI is organized by **pages** (routes) and **components** (reusable UI blocks).

**Key Files:**
- `src/main.tsx` — React entry point
- `src/App.tsx` — Root router and layout
- `src/pages/` — Page components (Runs, Gates, Dashboard, etc.)
- `src/components/` — Reusable UI components
- `src/styles/index.css` — Global styles
- `package.json` — Build config, dev server, dependencies

---

## Directory Structure

```
apps/web-control-plane/
├── src/
│   ├── App.tsx                  # Root component, routing
│   ├── main.tsx                 # Entry point
│   ├── pages/
│   │   ├── Dashboard.tsx        # Overview dashboard
│   │   ├── Runs.tsx             # Runs list page
│   │   ├── RunDetail.tsx        # Single run detail + timeline
│   │   ├── Gates.tsx            # Gate approval interface
│   │   ├── Analytics.tsx        # Learning & metrics
│   │   ├── Audit.tsx            # Audit log viewer
│   │   ├── AuditBrowser.tsx     # Advanced audit search
│   │   ├── Automation.tsx       # Workflow automation settings
│   │   ├── PolicyEditor.tsx     # Edit policy.json
│   │   └── Settings.tsx         # User & system settings
│   ├── components/
│   │   ├── Governance.tsx       # Gate approval component
│   │   ├── Runs.tsx             # Runs table/list
│   │   ├── Shell.tsx            # Terminal emulator
│   │   └── Switcher.tsx         # Theme/mode switcher
│   ├── hooks/                   # Custom React hooks (API calls, state)
│   ├── types/                   # TypeScript type definitions
│   ├── styles/
│   │   └── index.css            # Global CSS
│   └── lib/
│       └── auth-context.tsx     # Auth context provider
├── vite.config.ts               # Vite build config
└── package.json                 # Dependencies & scripts
```

---

## Page Routes & Features

### 1. Dashboard (`/dashboard`)
- **Component:** `src/pages/Dashboard.tsx`
- **Purpose:** High-level overview of system status
- **Features:**
  - Real-time run count (pending, running, completed, failed)
  - Quick-access run cards
  - Recent approvals/rejections
  - System health indicators (control-service, database, Redis)
  - Chart: Execution timeline (last 24 hours)

### 2. Runs (`/runs`)
- **Component:** `src/pages/Runs.tsx`
- **Purpose:** List and manage all execution runs
- **Features:**
  - Filterable table: Status, mode, user, created date
  - Pagination: 20 runs per page
  - Search by run ID, intent, or project
  - Bulk actions: Approve, reject, pause, resume
  - Export to CSV

**Table Columns:**
| Column | Data |
|--------|------|
| ID | Run identifier (run-abc123) |
| Intent | User's input intent |
| Mode | Execution mode (turbo, pro, safe) |
| Status | pending, running, completed, failed |
| Gates | Gates summary (3 pass, 2 blocked) |
| Created | Timestamp |
| User | Operator name |

### 3. Run Detail (`/runs/:id`)
- **Component:** `src/pages/RunDetail.tsx`
- **Purpose:** Deep dive into a single run
- **Features:**
  - Run metadata: ID, intent, mode, user, created/updated time
  - Timeline visualization: Step execution with durations
  - Gate status panel: Per-gate decision, reason, impact
  - Execution log: Step-by-step transcript with timestamps
  - Approval form: Approve/reject gates with custom reason

### 4. Gates (`/gates`)
- **Component:** `src/pages/Gates.tsx`
- **Purpose:** Dedicated approval/rejection interface
- **Features:**
  - Pending gates list (filtered by user)
  - Gate detail modal: Decision rules, why it's blocked, remediation steps
  - Approval form with validation
  - Rate-limited approval: One at a time to prevent race conditions
  - Audit log: Prior approvals for same gate type

### 5. Analytics (`/analytics`)
- **Component:** `src/pages/Analytics.tsx`
- **Purpose:** Learning loop and outcome tracking
- **Features:**
  - Skill effectiveness leaderboard
  - Gate approval rates by type
  - Execution time trends (p50, p95, p99)
  - Agent voting consensus scores
  - Export data for further analysis

### 6. Audit Trail (`/audit`)
- **Component:** `src/pages/Audit.tsx`
- **Purpose:** Compliance and forensics
- **Features:**
  - Chronological audit log (hash chain verified)
  - Filter by: Event type, user, run ID, timestamp range
  - Hash chain verification indicator
  - Event detail modal: Full context and metadata

### 7. Audit Browser (`/audit-browser`)
- **Component:** `src/pages/AuditBrowser.tsx`
- **Purpose:** Advanced audit search and analysis
- **Features:**
  - Full-text search across all audit events
  - Graphical timeline of events
  - Anomaly detection (unusual approval patterns)
  - Export audit range as JSON

### 8. Automation (`/automation`)
- **Component:** `src/pages/Automation.tsx`
- **Purpose:** Configure workflow automation
- **Features:**
  - Rule builder: Create auto-approval rules
  - Test rules against recent runs
  - Enable/disable automation per gate type
  - Notification preferences

### 9. Policy Editor (`/policy-editor`)
- **Component:** `src/pages/PolicyEditor.tsx`
- **Purpose:** Edit governance policy (policy.json)
- **Features:**
  - JSON editor with syntax highlighting
  - Schema validation (warns on invalid structure)
  - Diff view: Show changes before saving
  - Rollback to previous policy
  - Requires admin role to save

### 10. Settings (`/settings`)
- **Component:** `src/pages/Settings.tsx`
- **Purpose:** User and system configuration
- **Features:**
  - User profile: Name, email, role
  - API endpoint configuration
  - Theme: Light/dark mode
  - Notification preferences
  - Token management and rotation

---

## Component Organization

### Layout Components

**`App.tsx`** — Root router and layout wrapper
- Defines all routes using React Router
- Wraps pages with header, sidebar navigation
- Manages global auth state

**`components/Switcher.tsx`** — Theme and mode switcher
- Toggle between light/dark mode
- Select execution mode (turbo, pro, safe, etc.)
- Persists selection to localStorage

### Business Logic Components

**`components/Governance.tsx`** — Gate approval UI
- Displays gate decision details
- Approval form with reason input
- Submit button with optimistic updates

**`components/Runs.tsx`** — Runs list/table
- Reusable runs table for dashboard and /runs page
- Sortable columns, filterable
- Click row to navigate to detail page

**`components/Shell.tsx`** — Terminal emulator
- Displays execution logs as pseudo-terminal
- Syntax highlighting for log levels
- Timestamp on each line

---

## API Integration

### HTTP Client Setup

The control plane uses **Axios** for HTTP requests. Base URL and auth are configured via:

```typescript
// Typical API call pattern
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:7474"

// Axios instance with interceptor
const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/runs` | GET | List runs with filters |
| `/api/runs/:id` | GET | Get single run detail |
| `/api/runs/:id/timeline` | GET | Get step execution timeline |
| `/api/gates/:id` | GET | Get gate details |
| `/api/gates/:id/approve` | POST | Approve gate with reason |
| `/api/gates/:id/reject` | POST | Reject gate with reason |
| `/api/audit` | GET | Query audit logs |
| `/api/policy` | GET/PUT | Get/update policy.json |
| `/api/analytics/skills` | GET | Skill effectiveness metrics |
| `/api/health` | GET | Health check |

### useApi Custom Hook (Pattern)

Most pages use a custom hook for API calls:

```typescript
interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

function useApi<T>(endpoint: string, deps?: any[]): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchData()
  }, deps)

  const fetchData = async () => {
    try {
      const res = await api.get<T>(endpoint)
      setData(res.data)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch: fetchData }
}
```

---

## Real-Time Updates via WebSocket

The control plane connects to the realtime package for live updates:

**File:** `src/lib/realtime.ts` (example pattern)

```typescript
import { io } from 'socket.io-client'

const socket = io(API_BASE, {
  auth: { token: localStorage.getItem('auth_token') }
})

// Subscribe to run updates
socket.on('run:updated', (runId: string, updates: Partial<Run>) => {
  // Update UI with new data
})

// Subscribe to gate approval notifications
socket.on('gate:approved', (gateId: string, approver: string) => {
  // Trigger notification
})

// Subscribe to step completion
socket.on('step:completed', (runId: string, stepId: string) => {
  // Update timeline
})
```

---

## State Management

The control plane uses **React Context** for global state:

**File:** `src/lib/auth-context.tsx`

```typescript
interface AuthContext {
  user: User | null
  token: string | null
  login: (token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth logic here
}
```

### Local State Pattern

Pages use `useState` for local UI state (filters, pagination):

```typescript
function RunsPage() {
  const [filters, setFilters] = useState({ status: 'all', limit: 20 })
  const [page, setPage] = useState(1)
  const { data: runs } = useApi(`/api/runs?...`)
  // ...
}
```

---

## Testing

### Unit Tests

Test location: `apps/web-control-plane/src/**/*.test.tsx`

Test categories:
1. **Component Rendering** — Test pages/components render without crashing
2. **User Interactions** — Form submission, button clicks
3. **API Calls** — Mock Axios responses, test data flow
4. **Routing** — Test navigation between pages

### Component Tests (Vitest + React Testing Library)

```bash
pnpm --filter web-control-plane run test
```

### E2E Tests (Playwright)

Test location: `apps/web-control-plane/e2e/`

Critical user flows:
1. **Login flow** — Sign in, redirect to dashboard
2. **Approve gate workflow** — Navigate to gates, approve, verify update
3. **Run detail navigation** — View run timeline, approve gate from detail page
4. **Policy edit and save** — Open editor, modify policy, save

```bash
pnpm --filter web-control-plane run test:e2e
```

---

## Deployment

### Development

```bash
# Install and start
pnpm install
pnpm --filter web-control-plane run dev

# Runs on http://localhost:5173 (Vite default)
```

### Production Build

```bash
# Build static assets
pnpm --filter web-control-plane run build

# Output: dist/
```

### Environment Configuration

**`.env.production`:**
```
VITE_API_URL=https://api.prod.example.com
VITE_WS_URL=wss://api.prod.example.com
```

At build time, Vite replaces `import.meta.env.VITE_*` with actual values.

### Static Hosting

The built `dist/` can be deployed to:
- **Vercel** — `vercel deploy`
- **Netlify** — Drag-and-drop `dist/`
- **AWS S3 + CloudFront** — Static hosting with CDN
- **Docker** — Nginx container serving static files

---

## Gotchas & Troubleshooting

### 1. API Endpoint Discovery

**Problem:** Control plane can't reach control-service

**Solution:**
- Check environment variable: `echo $VITE_API_URL`
- Default is `http://localhost:7474` (development)
- If deployed remotely, ensure CORS headers are set on control-service
- Test endpoint: `curl http://api.prod.example.com/health`

### 2. Authentication Token Expiry

**Problem:** "Unauthorized" errors after token expires

**Solution:**
- Check token in localStorage: `localStorage.getItem('auth_token')`
- Tokens expire after 24 hours by default (configurable)
- Implement refresh token logic in API interceptor
- Re-login if token invalid: `localStorage.removeItem('auth_token')`

### 3. WebSocket Reconnection

**Problem:** Real-time updates stop after network interruption

**Solution:**
- Socket.io has built-in reconnection (3 attempts, exponential backoff)
- Check browser console for connection errors
- Verify control-service WebSocket is enabled (check `io.listen()` setup)
- Force reconnect: Press F5 to reload page

### 4. CORS Errors

**Problem:** "Access to XMLHttpRequest blocked by CORS policy"

**Solution:**
- Check control-service has CORS middleware enabled
- Whitelist control-plane origin: `cors({ origin: 'http://localhost:5173' })`
- In production, whitelist deployed domain
- Check preflight request (OPTIONS) succeeds

### 5. Build Time Issues

**Problem:** Vite build is slow or fails

**Solution:**
- Clear cache: `rm -rf node_modules/.vite`
- Check for unused imports: `npx unused-exports`
- Profile build: `vite build --profile`
- Common cause: Large JSON files imported (use JSON.parse instead)

---

## Common User Workflows

### Approve a Blocked Gate

1. Navigate to `/gates`
2. Find pending gate in list
3. Click "View Details"
4. Read "Why is this blocked?" explanation
5. Click "Approve"
6. Enter reason in text field
7. Click "Submit Approval"
8. See confirmation notification

### Monitor a Running Execution

1. Navigate to `/runs`
2. Find run by ID or intent
3. Click row to open `/runs/:id`
4. Watch timeline update in real-time (WebSocket)
5. See each step complete with duration
6. If gates block, see notifications
7. Approve gates directly from detail page

### Edit Governance Policy

1. Navigate to `/policy-editor`
2. JSON editor opens with current policy.json
3. Modify gate rules, weights, etc.
4. Click "Validate" to check syntax
5. Click "Show Diff" to see changes
6. Click "Save Policy"
7. Confirmation: Policy applied to new runs

### Check Audit Trail

1. Navigate to `/audit`
2. Filter by date range: Last 7 days
3. Filter by event type: "gate:approved"
4. See chronological list with timestamps
5. Click event to expand and view metadata
6. Verify hash chain: Inspect previous_hash matches prior event

---

## Cross-References

**Phase 1 (Core):**

- [`packages/shared`](../../packages/shared/CLAUDE.md) — Shared types and enums
- [`packages/auth`](../../packages/auth/CLAUDE.md) — Token validation and refresh
- [`packages/policy`](../../packages/policy/CLAUDE.md) — Policy evaluation and schema
- [`packages/governance`](../../packages/governance/CLAUDE.md) — Gate definitions and risk scoring

**Phase 2 (Tier A - Optional):**

- [`packages/realtime`](../../packages/realtime/CLAUDE.md) — WebSocket event bus for live updates
- [`packages/observability`](../../packages/observability/CLAUDE.md) — Metrics and traces
- [`packages/learning`](../../packages/learning/CLAUDE.md) — Learning loop metrics

**Tier B (Orchestration):**

- [`packages/core`](../../packages/core/CLAUDE.md) — Type validation and auth utilities
- [`packages/adapters`](../../packages/adapters/CLAUDE.md) — Adapter recommendations display
- [`packages/storage`](../../packages/storage/CLAUDE.md) — Artifact and log retrieval

**Applications:**

- [`apps/control-service`](../control-service/CLAUDE.md) — Provides API endpoints
- [`apps/cli`](../cli/CLAUDE.md) — Alternative command-line interface to same control-service
- [`apps/web-landing`](../web-landing/CLAUDE.md) — Landing page with links to control plane
- [`extensions/code-kit-vscode`](../../extensions/code-kit-vscode/CLAUDE.md) — Alternative IDE integration

**Cross-Cutting Documentation:**

- [Root CLAUDE.md](../../CLAUDE.md) — Project overview and architecture
- [Architecture Guide](../../docs/ARCHITECTURE.md) — System design and data flow
- [Config Schema](../../docs/CONFIG_SCHEMA.md) — Policy configuration reference
- [Testing Guide](../../docs/TESTING.md) — Test patterns and fixtures
- [Deployment Guide](../../docs/DEPLOYMENT.md) — How to deploy control plane
- [Troubleshooting Guide](../../docs/TROUBLESHOOTING.md) — Common UI issues and fixes
- [Performance Guide](../../docs/PERFORMANCE.md) — Frontend performance optimization

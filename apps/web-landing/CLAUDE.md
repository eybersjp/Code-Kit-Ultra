# Web Landing Page — Public Marketing Site

## Quick Overview

The Web Landing Page (`apps/web-landing/`) is a static/semi-dynamic React application that serves as the public marketing site for Code Kit Ultra. It provides:
- Marketing content and value proposition
- Feature overview and capabilities
- Getting started guides
- API documentation and examples
- Security and governance documentation
- User authentication interface (login/signup)

The landing page is built with **React**, **TypeScript**, and **Vite**. It's primarily **static content** (HTML/CSS/JS) that can be pre-rendered to HTML at build time for fast loading.

**Key Files:**
- `src/App.tsx` — Root router and layout
- `src/main.tsx` — React entry point
- `src/pages/` — Page components (Landing, Login, Signup, Docs, etc.)
- `src/components/` — Reusable UI components
- `src/lib/auth-context.tsx` — Auth context for login/signup
- `src/styles/index.css` — Global styles

---

## Directory Structure

```
apps/web-landing/
├── src/
│   ├── App.tsx                    # Root router
│   ├── main.tsx                   # Entry point
│   ├── pages/
│   │   ├── Landing.tsx            # Marketing homepage
│   │   ├── Login.tsx              # Sign in page
│   │   ├── Signup.tsx             # Create account page
│   │   ├── Dashboard.tsx          # User dashboard (post-login)
│   │   └── docs/
│   │       ├── DocsLayout.tsx     # Docs sidebar + layout
│   │       ├── GettingStarted.tsx # Installation and quickstart
│   │       ├── ApiReference.tsx   # API endpoint documentation
│   │       ├── GovernanceRules.tsx # Governance gates reference
│   │       ├── Security.tsx       # Security & RBAC documentation
│   │       ├── Examples.tsx       # Code examples
│   │       └── FAQ.tsx            # Frequently asked questions
│   ├── components/
│   │   ├── ProtectedRoute.tsx     # Wrapper for authenticated pages
│   │   └── [other reusable UI]
│   ├── lib/
│   │   └── auth-context.tsx       # Auth state and login logic
│   ├── styles/
│   │   └── index.css              # Global CSS
│   └── pages.test.tsx             # Test suite
├── public/
│   ├── logo.svg                   # Brand logo
│   └── [static assets]
├── vite.config.ts                 # Vite build config
└── package.json                   # Dependencies & scripts
```

---

## Page Structure & Content

### 1. Landing Page (`/`)
- **Component:** `src/pages/Landing.tsx`
- **Purpose:** Marketing homepage and product overview
- **Content Sections:**
  - Hero section: Tagline, call-to-action button
  - Feature cards: 6-8 core features with icons
  - Value propositions: Security, governance, speed
  - Testimonials: Customer quotes (if available)
  - Pricing tiers: Free/Pro/Enterprise (if applicable)
  - Call-to-action: "Get Started" button to `/signup`

### 2. Login Page (`/login`)
- **Component:** `src/pages/Login.tsx`
- **Purpose:** User authentication
- **Features:**
  - Email/password form
  - "Remember me" checkbox
  - "Forgot password" link
  - OAuth integrations (GitHub, Google if available)
  - Redirect to control plane on success
  - Error messages for invalid credentials

### 3. Signup Page (`/signup`)
- **Component:** `src/pages/Signup.tsx`
- **Purpose:** Account creation
- **Features:**
  - Registration form: Email, password, name
  - Password validation (min 12 chars, 1 uppercase, 1 number, 1 special)
  - Terms of service checkbox
  - Email verification step
  - Redirect to dashboard on success

### 4. Dashboard (`/dashboard`)
- **Component:** `src/pages/Dashboard.tsx`
- **Purpose:** Post-login user portal
- **Features:**
  - User profile summary
  - Quick links to control plane
  - Recent runs (fetched from control-service)
  - Documentation links
  - Account settings button

### 5. Documentation Pages

#### Getting Started (`/docs/getting-started`)
- **Component:** `src/pages/docs/GettingStarted.tsx`
- **Content:**
  - Prerequisites (Node.js, Docker)
  - Installation: npm, Docker, binary
  - Quick start: 5-minute tutorial
  - Example commands

#### API Reference (`/docs/api-reference`)
- **Component:** `src/pages/docs/ApiReference.tsx`
- **Content:**
  - Base URL and authentication
  - Endpoints table: Method, path, description
  - Request/response examples for each endpoint
  - Error codes and meanings
  - Rate limiting info

#### Governance Rules (`/docs/governance-rules`)
- **Component:** `src/pages/docs/GovernanceRules.tsx`
- **Content:**
  - 9 governance gates overview
  - Each gate: Name, purpose, decision rules
  - How to configure gates in policy.json
  - Examples of custom gate logic

#### Security (`/docs/security`)
- **Component:** `src/pages/docs/Security.tsx`
- **Content:**
  - RBAC overview and roles table
  - Token management and expiry
  - Data encryption (at rest, in transit)
  - Audit logging and compliance
  - Security best practices

#### Examples (`/docs/examples`)
- **Component:** `src/pages/docs/Examples.tsx`
- **Content:**
  - Code examples in multiple languages (Node.js, Python, CLI)
  - Common workflows: Create run, approve gate, check status
  - Integration examples: GitHub Actions, CI/CD
  - Error handling patterns

#### FAQ (`/docs/faq`)
- **Component:** `src/pages/docs/FAQ.tsx`
- **Content:**
  - Q&A entries: Expandable/collapsible
  - Categories: Setup, usage, troubleshooting, pricing
  - Search across FAQs

---

## Content Management

### Adding New Documentation Pages

1. Create new component in `src/pages/docs/`:
   ```typescript
   // src/pages/docs/NewTopic.tsx
   export function NewTopic() {
     return (
       <DocsLayout title="New Topic">
         {/* Content here */}
       </DocsLayout>
     )
   }
   ```

2. Add route to `src/App.tsx`:
   ```typescript
   <Route path="/docs/new-topic" element={<NewTopic />} />
   ```

3. Add sidebar entry to `src/pages/docs/DocsLayout.tsx`:
   ```typescript
   const sidebarItems = [
     // ...existing...
     { label: 'New Topic', path: '/docs/new-topic' }
   ]
   ```

### Updating Promotional Content

Landing page content is hardcoded in `Landing.tsx`. To update:

1. Open `src/pages/Landing.tsx`
2. Modify JSX content: Feature descriptions, testimonials, pricing
3. Update images/logos: Place in `public/` and reference
4. Run `pnpm run dev` to preview
5. Commit and deploy

### Linking to External Resources

Common links:
- Control plane: `/dashboard` (requires login)
- Control service API docs: `/docs/api-reference`
- GitHub repo: `https://github.com/eybersjp/Code-Kit-Ultra`
- Support email: `support@example.com`

---

## Authentication Flow

**File:** `src/lib/auth-context.tsx`

1. User visits `/login` or `/signup`
2. Submits credentials to control-service `/api/auth/login`
3. Control-service returns JWT token
4. Frontend stores token in localStorage
5. Auth context updates: `isAuthenticated = true`
6. Protected routes become accessible
7. Redirects to `/dashboard`

### Protected Route Pattern

```typescript
interface ProtectedRouteProps {
  element: React.ReactElement
}

export function ProtectedRoute({ element }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  
  return element
}
```

Usage:
```typescript
<Route 
  path="/dashboard" 
  element={<ProtectedRoute element={<Dashboard />} />} 
/>
```

---

## Deployment

### Development

```bash
pnpm install
pnpm --filter web-landing run dev

# Runs on http://localhost:5173 (Vite default)
```

### Production Build

```bash
pnpm --filter web-landing run build

# Output: dist/
# Static files ready for hosting
```

### Environment Configuration

**`.env.production`:**
```
VITE_API_URL=https://api.prod.example.com
VITE_APP_NAME="Code Kit Ultra"
VITE_SUPPORT_EMAIL=support@example.com
```

### Hosting Options

#### Option 1: Vercel (Recommended for React apps)
```bash
vercel deploy
# Auto-detects Vite app, builds and deploys
```

#### Option 2: Netlify
```bash
netlify deploy --prod --dir dist
# Drag-and-drop dist/ folder or Git integration
```

#### Option 3: AWS S3 + CloudFront
```bash
# 1. Build
pnpm run build

# 2. Upload to S3
aws s3 sync dist/ s3://my-bucket/

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E123 --paths "/*"
```

#### Option 4: Docker (Nginx)
```dockerfile
# Dockerfile
FROM node:18 AS build
WORKDIR /app
COPY . .
RUN pnpm install && pnpm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
docker build -t codekit-landing .
docker run -p 80:80 codekit-landing
```

### SEO & Meta Tags

Important meta tags for search indexing:

**`src/main.tsx`** (add to `<head>`):
```html
<meta name="description" content="Code Kit Ultra — Governed Autonomous Engineering Platform">
<meta name="keywords" content="automation, governance, engineering, policy">
<meta property="og:title" content="Code Kit Ultra">
<meta property="og:description" content="...">
<meta property="og:image" content="https://...">
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Or use **React Helmet** for dynamic meta tags per page:
```typescript
import { Helmet } from 'react-helmet'

export function GettingStarted() {
  return (
    <>
      <Helmet>
        <title>Getting Started — Code Kit Ultra</title>
        <meta name="description" content="Install Code Kit Ultra in 5 minutes" />
      </Helmet>
      {/* Page content */}
    </>
  )
}
```

### Performance Optimization

#### Code Splitting
Vite auto-splits chunks. Route-based splitting:
```typescript
import { lazy, Suspense } from 'react'

const GettingStarted = lazy(() => import('./pages/docs/GettingStarted'))

// In routes:
<Suspense fallback={<div>Loading...</div>}>
  <Route path="/docs/getting-started" element={<GettingStarted />} />
</Suspense>
```

#### Image Optimization
```typescript
// Use responsive images
<img 
  src="feature.png"
  srcSet="feature-small.png 640w, feature.png 1280w"
  sizes="(max-width: 640px) 640px, 1280px"
  alt="Feature"
/>
```

#### Lighthouse Audit
```bash
# Install lighthouse CLI
npm install -g lighthouse

# Audit production build
lighthouse https://yoursite.com --view
```

Target scores: Lighthouse 90+, Core Web Vitals green.

---

## Testing

### Unit & Component Tests

```bash
pnpm --filter web-landing run test
```

Test categories:
1. **Page rendering** — Verify each page renders
2. **Navigation** — Routes work correctly
3. **Authentication** — Login/signup flows
4. **API mocking** — Test API calls with msw (Mock Service Worker)

### E2E Tests (Playwright)

```bash
pnpm --filter web-landing run test:e2e
```

Critical flows:
1. **Homepage load** — All sections render, links work
2. **Documentation navigation** — Sidebar navigation, page loads
3. **Login flow** — Submit form, redirect to dashboard
4. **Signup flow** — Create account, email verification

---

## Gotchas & Troubleshooting

### 1. API Endpoint Configuration

**Problem:** Login fails with "Cannot reach control-service"

**Solution:**
- Check environment variable: `echo $VITE_API_URL`
- Default: `http://localhost:7474` (local dev)
- Production: Set to actual control-service URL
- Test endpoint: `curl $VITE_API_URL/health`

### 2. Build Time Issues

**Problem:** "Cannot find module" error during build

**Solution:**
- Ensure all imports use correct relative paths
- Check TypeScript errors: `pnpm run typecheck`
- Clear cache: `rm -rf node_modules/.vite`

### 3. Styling Issues

**Problem:** CSS not applying, styles override incorrectly

**Solution:**
- Check CSS specificity: Global > page > component
- Use CSS modules to avoid conflicts: `import styles from './Button.module.css'`
- Inspect in DevTools: Check source is correct file
- Verify imports: `import '../styles/index.css'` in main.tsx

### 4. Asset Paths

**Problem:** Images/fonts don't load in production

**Solution:**
- Use relative paths in imports: `import logo from '../assets/logo.svg'`
- Or use public folder: `/logo.svg` (served from root)
- Vite base path config in vite.config.ts if deploying to subdirectory:
  ```typescript
  export default defineConfig({
    base: '/my-app/'  // if at example.com/my-app/
  })
  ```

### 5. Authentication Token Expiry

**Problem:** Users get logged out after 24 hours

**Solution:**
- Expected behavior (tokens expire)
- Implement token refresh: Exchange expired token for new one
- Show "Session expired, please login" message
- Store refresh token in httpOnly cookie
- Auto-refresh before expiry (check every 5 minutes)

---

## Common Content Updates

### Update Homepage Tagline

**File:** `src/pages/Landing.tsx`
```typescript
<h1>Your new tagline here</h1>
```

### Add New Feature Card

**File:** `src/pages/Landing.tsx`
```typescript
const features = [
  // ...existing...
  {
    title: "New Feature",
    description: "Description...",
    icon: "IconComponent"
  }
]
```

### Update API Documentation

**File:** `src/pages/docs/ApiReference.tsx`
```typescript
const endpoints = [
  {
    method: "POST",
    path: "/api/runs",
    description: "Create new run"
  }
  // Add entries here
]
```

### Add FAQ Entry

**File:** `src/pages/docs/FAQ.tsx`
```typescript
const faqs = [
  {
    q: "How do I...?",
    a: "Answer here..."
  }
]
```

---

## Cross-References

**Depends on:**
- [control-service](../control-service/CLAUDE.md) — Provides API endpoints for auth/data
- [packages/auth](../../packages/auth/CLAUDE.md) — Token generation and validation

**Used by:**
- **Public users** — Landing page entry point
- [web-control-plane](../web-control-plane/CLAUDE.md) — Linked from docs
- [CLI](../cli/CLAUDE.md) — Links to docs from help text

**Related:**
- [Root CLAUDE.md](../../CLAUDE.md) — Main documentation index
- [DEPLOYMENT.md](../../docs/DEPLOYMENT.md) — How to deploy landing page
- [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — System overview for docs
- [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) — Content for troubleshooting page

# Code Kit Ultra - GitHub Pages Deployment Guide

The Code Kit Ultra web portal is ready for deployment to GitHub Pages!

## Quick Start

### Option 1: Deploy via GitHub Web Interface (Easiest)

1. Go to your GitHub repo: https://github.com/eybersjp/code-kit-ultra
2. Create a new branch called `gh-pages` (if it doesn't exist)
3. Upload the contents of `apps/web-landing/dist/` to the root of the `gh-pages` branch:
   - `index.html`
   - `assets/` folder with CSS and JS files

4. Go to **Settings → Pages**
5. Under "Build and deployment":
   - Source: `Deploy from a branch`
   - Branch: `gh-pages`
   - Folder: `/ (root)`
   - Click **Save**

6. Your site will be live at: **https://eybersjp.github.io/code-kit-ultra/**

---

### Option 2: Use GitHub Actions (Automated)

Create a file: `.github/workflows/deploy-pages.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'apps/web-landing/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write

    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build web-landing
        run: cd apps/web-landing && pnpm build
      
      - name: Setup Pages
        uses: actions/configure-pages@v3
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: 'apps/web-landing/dist'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

Then in **Settings → Pages**:
- Source: `GitHub Actions`
- Click **Save**

---

## What's Included

The production build (`apps/web-landing/dist/`) contains:

- **index.html** - Main HTML file (0.65 KB)
- **assets/index-*.css** - Styles with dark theme (4.14 KB gzipped)
- **assets/index-*.js** - React app bundle (84.40 KB gzipped)

### Total Size: ~89 KB gzipped

---

## Build Files Location

```
apps/web-landing/dist/
├── index.html
└── assets/
    ├── index-CJFYl8Q6.css
    └── index-CIrub91C.js
```

---

## Features Included

✅ Landing page with features showcase  
✅ Signup & Login pages  
✅ User dashboard (for token management)  
✅ 6-section documentation (Getting Started, API Reference, Governance Rules, Security, Examples, FAQ)  
✅ Professional dark theme with brand colors  
✅ Responsive design  
✅ Copy-to-clipboard code blocks  

---

## Important Notes

⚠️ **Backend API Not Included**: The app is frontend-only. To fully enable:
- Signup/Login: Connect to your auth backend (POST `/api/v1/auth/signup`, `/api/v1/auth/login`)
- Token Management: Connect to your API (GET/POST/DELETE `/api/v1/tokens`)
- Projects: Connect to your API (GET `/api/v1/projects`)

For now, the UI is fully functional for exploration and demo purposes.

---

## Steps to Deploy (Summary)

1. Go to GitHub repo Settings → Pages
2. Choose `Deploy from a branch`
3. Create/select `gh-pages` branch
4. Upload contents of `apps/web-landing/dist/` folder
5. Save and wait 1-2 minutes for deployment
6. Access at: `https://eybersjp.github.io/code-kit-ultra/`

---

## Need Help?

The app includes:
- 📖 Comprehensive documentation section
- ❓ FAQ with 15+ answers
- 💡 Real-world examples for CI/CD integration
- 🔒 Security best practices guide

Enjoy! 🚀

# Vercel Deployment Setup

## Issues with Current Deployment

The app won't work online on Vercel because:

1. **Puppeteer Chromium is too large** (~200MB) and exceeds Lambda limits
2. **Browser automation isn't supported** on serverless functions by default
3. **60-second timeout** is too short for verification processes
4. **Verification requires browser access** which isn't available on Vercel

## Solutions

### Option 1: Use Browserless API (Recommended)
Replace local Puppeteer with Browserless cloud service:

```bash
npm install @browserless.io/api
```

### Option 2: Custom Domain with VPS
Deploy on a VPS (DigitalOcean, Linode, AWS EC2) instead of Vercel:

```bash
# Traditional Node.js server with full Puppeteer support
npm start
```

### Option 3: Split Architecture
- **Frontend only on Vercel** (static HTML/CSS/JS)
- **Backend on separate VPS** with Puppeteer
- **API calls** between frontend and backend

## Quick Fix for Vercel

Add to `vercel.json`:

```json
{
  "version": 2,
  "env": {
    "BROWSERLESS_API_KEY": "@browserless_key"
  },
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "maxLambdaSize": "50mb",
        "maxDuration": 60,
        "includeFiles": "public/**"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    },
    {
      "src": "/(.*)",
      "dest": "public/index.html"
    }
  ]
}
```

## Recommended: Local Deployment

For **best performance**, run locally or on a VPS:

```bash
# Install
npm install

# Run locally
npm start

# Access at http://localhost:3000
```

## Or Deploy on Docker

```bash
docker build -t ipo-applier .
docker run -p 3000:3000 ipo-applier
```

---

**Status:** Verification features require full browser access - works only locally or on dedicated servers, not on Vercel serverless.

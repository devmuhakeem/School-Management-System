# DEPLOYMENT.md — Deployment & Build Specifications

## 1. Production Build Pipeline

```bash
# 1. Clean previous build artifacts
npm run clean

# 2. Generate Prisma Client
npm run db:generate

# 3. Compile client SPA assets
npm run build

# 4. Start production server
npm start
```

## 2. Environment Verification
Before deploying to production, run the pre-flight checks:
1. `npm run typecheck` (Ensures zero TypeScript errors)
2. `npm run lint` (Verifies code cleanliness)
3. `npm test` (Runs Vitest test suite)

## 3. Container & Cloud Deployment
- **Port:** The service listens on `process.env.PORT` (defaults to `3000`).
- **Static Assets:** Built files are placed in `/dist` and served by Express in production mode.
- **Database Migrations:** Apply migrations during deployment using `npx prisma migrate deploy`.

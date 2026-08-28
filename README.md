# CertiVerify

**Verify Credentials. Trust Talent.** CertiVerify is a multi-tenant certification issuance and public verification MVP for academies, universities, professional organizations, and corporate learning teams.

## What is included

- Vanilla HTML/CSS/ES modules with a responsive, theme-aware premium SaaS interface.
- Secure cookie-based authentication architecture, role checks, request validation, rate-limited public verification, secure random credential identifiers, and centralized API errors.
- PostgreSQL/Prisma data model for organizations, memberships, courses, recipients, certificate templates, versioned certificates, verification events, audit logs, plans, subscriptions, and auth tokens.
- Tenant-scoped certificate, course, recipient, dashboard, analytics, verification, revocation, and reissue APIs.

## Architecture

```
frontend/                 Static vanilla-JS application
backend/
  routes/                 REST endpoint composition
  controllers/            Request / response handling
  services/               Certificate issuance and lifecycle rules
  middleware/             Authentication, RBAC, errors
  validators/             Zod validation schemas
  prisma/                 PostgreSQL schema and demo seed
```

## Prerequisites

Node.js 20+ and PostgreSQL 15+. Copy `.env.example` to `.env` and set a strong `JWT_SECRET` and `SESSION_SECRET`.

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Open `http://localhost:3000`. Development demo accounts: `demo@certiverify.test` / `DemoPassword123!`; super admin: `admin@certiverify.test` / `AdminPassword123!`.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/me`
- `GET|POST /api/courses`, `GET|POST /api/recipients`, `GET|POST /api/certificates`
- `GET /api/certificates/:id`, `POST /api/certificates/:id/revoke`, `POST /api/certificates/:id/reissue`
- `GET /api/verify/:certificateId`, `GET /api/dashboard`, `GET /api/analytics`, `GET /api/health`

## Security and deployment

Protected data is always filtered by the authenticated organization ID; frontend routing is not a security boundary. Keep secrets in deployment environment variables, terminate TLS at the host, set `NODE_ENV=production`, use managed PostgreSQL backups, and supply an S3-compatible storage adapter before storing real PDFs or uploads. Deploy the Node service to Render/Railway and serve `frontend/` from the same origin or configure explicit CORS and cookie policy.

## Checks

```bash
npm test
node --check backend/server.js
```

## Generated credential assets

Certificate issuance renders a server-side PDF and a PNG QR code. The default `local` storage adapter writes generated assets outside source control to `storage/` and serves only generated filenames through `/files/`. The renderer supports the safe `classic`, `modern`, and `minimal` template designs. Set `STORAGE_LOCAL_PATH` to relocate local development assets; an S3/Supabase/Cloudinary adapter should be supplied before horizontally scaled production use.

## Current verification status

The unit suite, lint syntax check, and static build check are runnable without third-party packages. Full PDF/QR rendering, Prisma schema generation/migration, and HTTP/database integration testing require a successful `npm install` and PostgreSQL instance. This environment currently blocks package download with an HTTP 403 from the npm registry, so those integration checks have not been claimed as executed.

# Dare2Care API — Agent Notes

Backend REST API (Express + TypeScript, Prisma/PostgreSQL, Supabase Storage) for the
Dare2Care platform. Layered architecture: routes → middleware → controllers →
services → repositories → Prisma.

## Local development

```bash
npm install
npm run dev             # nodemon, http://localhost:4000
npm run prisma:migrate  # apply migrations (dev)
npm run build           # prisma generate && tsc
```

## Deployment

Deployed to Vercel (project `dare2care-api`); production tracks the `main` branch.

Production deploys are triggered with a **Vercel Deploy Hook**. The hook URL is a
secret and is intentionally **not** committed (this repo is public) — it lives in the
environment variable `DEPLOY_HOOK_API`. Deploy the current `main` with:

```bash
curl -X POST "$DEPLOY_HOOK_API"
```

This builds and promotes `main` to production via the `vercel-build` script
(`prisma generate && prisma migrate deploy && tsc`). Watch progress in the Vercel
dashboard → `dare2care-api` → Deployments.

> Sibling apps deploy the same way: public web via `$DEPLOY_HOOK_WEB`,
> admin portal via `$DEPLOY_HOOK_ADMIN`.

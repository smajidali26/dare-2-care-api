# Dare2Care API — Agent Notes

Express + Prisma (PostgreSQL) API. The public website reads `/api/public/*`; the
admin portal uses `/api/auth/*` and `/api/admin/*`. Deployed to Vercel; production
tracks the `main` branch.

## Local development

```bash
npm install
npx prisma migrate deploy
npx ts-node prisma/seed.ts
npm run dev    # http://localhost:4000
```

Needs a `.env` with `DATABASE_URL`, `DIRECT_URL` and the JWT secrets.
`BASE_URL=http://localhost:4000 ./scripts/smoke-test.sh` checks the routes both
front-ends depend on.

## Branching (gitflow)

All three Dare2Care repos use gitflow. Don't commit straight to `main` or `develop`.

- `main` is production (Vercel deploys every push to it). `develop` is the
  integration branch.
- New work: branch `feature/<name>` from `develop` and open the PR into `develop`.
  A change that spans repos uses the same branch name in each.
- Releasing: branch `release/<version>` from `develop`, PR it into `main`, then
  merge `main` back into `develop`. Release the API before the admin portal and
  website when they depend on a new endpoint.
- Urgent production fix: branch `hotfix/<name>` from `main`, PR it into `main`,
  then merge it into `develop`.
- CI runs on PRs into both `main` and `develop`.

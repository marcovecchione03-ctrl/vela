# DATABASE ARCHITECTURE

Vela uses PostgreSQL managed by Prisma ORM. 

## STAGING DATABASE BOOTSTRAP

Vela treats staging as a real production-like environment. Never use development commands against the staging environment.

### 1. Migration Baseline
Because Vela was heavily developed locally before the first staging deployment, a baseline migration `20261010191500_initial_vela_baseline` was generated. This SQL script contains the comprehensive Phase 1-10 schema (Users, Tenants, Billing, Calendars, etc.).

### 2. Runtime Connection
The application connects to the database via `DATABASE_URL`. This should typically point to a connection pooler (e.g., PgBouncer, Supabase pooler) if using serverless environments.

### 3. Direct Migration Connection
If your hosting provider requires a direct (non-pooled) connection for schema migrations, set `DIRECT_DATABASE_URL` in your environment (and optionally configure `directUrl` in `prisma/schema.prisma`).

### 4. DATABASE_URL_TEST Isolation
To prevent test suites from dropping or polluting real staging data, integration tests require a completely isolated database configured via `DATABASE_URL_TEST`. The test suite actively refuses to run if `DATABASE_URL_TEST` matches `DATABASE_URL`.

### 5. Migration Deploy
For any deployed environment (staging or production), run:
```bash
npx prisma migrate deploy
```
Do NOT run `npx prisma db push` or `npx prisma migrate dev`.

### 6. Seed Policy
The demo seed (`prisma/seed.ts`) is structurally locked out of production environments. To seed a staging environment with demo data, you must explicitly opt-in by running:
```bash
ALLOW_DEMO_SEED=true npx prisma db seed
```
Automatic seeding during deployments is prohibited.

### 7. Super Admin Bootstrap
To safely create the initial platform operator without exposing an insecure web route, a CLI utility is provided. After the target user registers normally, promote them via:
```bash
npx tsx scripts/bootstrap-super-admin.ts <user_email>
```

### 8. Rollback Philosophy
Prisma does not support automatic down migrations natively. 
1. Always take a database snapshot/backup before deploying destructive or complex schema migrations.
2. In the event of a migration failure, the preferred path is to "forward-fix" by deploying a new migration correcting the schema.
3. If data corruption occurs, restore from the snapshot. Never manually alter the `_prisma_migrations` table.

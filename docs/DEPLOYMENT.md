# Vela Staging Deployment Guide

## 1. Prerequisites
- A Vercel Account
- Access to the Vela GitHub repository
- The staging PostgreSQL database connection string (from Supabase/Neon/etc)

## 2. Vercel Project Setup
1. Log in to Vercel and click **Add New... > Project**.
2. Import the Vela repository from GitHub.
3. Configure the Project:
   - **Framework Preset**: Next.js (detected automatically).
   - **Root Directory**: `./` (leave default).
   - **Build Command**: `npm run build` (This correctly runs Prisma generate and Next.js build).
   - **Install Command**: `npm install`.

## 3. Environment Variables
In the Vercel dashboard, add the following variables before deploying:

- `DATABASE_URL`: The **pooled** database connection string (e.g. `postgres://...`).
- `DIRECT_DATABASE_URL`: The **direct** connection string (for migrations, if applicable).
- `NEXTAUTH_SECRET`: A secure random string (e.g. `openssl rand -base64 32`).
- `NEXTAUTH_URL`: The expected staging URL (e.g. `https://vela-staging.vercel.app`).
- `NEXT_PUBLIC_APP_URL`: The same staging URL (e.g. `https://vela-staging.vercel.app`).
- `CRON_SECRET`: A secure random string to protect cron endpoints.
- `CALENDAR_ENCRYPTION_KEY`: A secure 32-byte string for encrypting OAuth tokens.

*Note: Stripe, OAuth (Google/Microsoft), and VAPID keys can be left blank for this step. The application will safely degrade.*

## 4. Deploy
Click **Deploy**. Vercel will install dependencies, generate Prisma Client, build the application, and deploy.

## 5. Post-Deployment Verification
After deployment completes:
1. Verify the public URL loads without crashing.
2. Check the health endpoint: `https://<staging-url>/api/health`.
3. Try navigating to `https://<staging-url>/auth/login`.

Do **NOT** run `npx prisma db push` or `npx prisma migrate reset` against the staging database. Only `npx prisma migrate deploy` is allowed for applying new migrations.

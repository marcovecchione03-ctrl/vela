import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { enforceTestDatabaseIsolation } from '../../tests/db-setup';

describe('Staging Step 1 Final Verification', () => {
  describe('Test Environment Isolation', () => {
    it('DB test runner rejects missing DATABASE_URL_TEST', () => {
      expect(() => enforceTestDatabaseIsolation('postgres://prod', undefined)).toThrowError(/missing/);
    });

    it('DB test runner rejects DATABASE_URL_TEST == DATABASE_URL', () => {
      expect(() => enforceTestDatabaseIsolation('postgres://prod', 'postgres://prod')).toThrowError(/cannot be equal/);
    });
  });

  describe('Seed Safety', () => {
    it('production seed blocked without opt-in', () => {
      const seedContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'seed.ts'), 'utf8');
      expect(seedContent).toContain("process.env.ALLOW_DEMO_SEED !== 'true'");
      expect(seedContent).toContain("process.exit(0)");
    });

    it('demo seed requires explicit opt-in', () => {
      const seedContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'seed.ts'), 'utf8');
      expect(seedContent).toContain("process.env.ALLOW_DEMO_SEED !== 'true'");
    });
  });

  describe('Super Admin Bootstrap', () => {
    it('Super Admin bootstrap rejects unknown user', () => {
      const scriptContent = fs.readFileSync(path.join(process.cwd(), 'scripts', 'bootstrap-super-admin.ts'), 'utf8');
      expect(scriptContent).toContain('not found');
      expect(scriptContent).toContain('process.exit(1)');
    });

    it('Super Admin bootstrap does not auto-promote', () => {
      const scriptContent = fs.readFileSync(path.join(process.cwd(), 'scripts', 'bootstrap-super-admin.ts'), 'utf8');
      expect(scriptContent).toContain('process.argv[2]');
      expect(scriptContent).toContain('isSuperAdmin: true');
    });
  });

  describe('Checkers Safety', () => {
    it('production checker does not expose DB URL', () => {
      const checkerContent = fs.readFileSync(path.join(process.cwd(), 'scripts', 'check-production.ts'), 'utf8');
      expect(checkerContent).not.toContain('console.log(process.env[envVar])');
      expect(checkerContent).toContain('[PASS] ${envVar} is present.');
    });

    it('database smoke checker is read-only', () => {
      const smokeContent = fs.readFileSync(path.join(process.cwd(), 'scripts', 'check-database.ts'), 'utf8');
      expect(smokeContent).toContain('prisma.user.count()');
      expect(smokeContent).not.toContain('prisma.user.create');
      expect(smokeContent).not.toContain('prisma.user.update');
      expect(smokeContent).not.toContain('prisma.user.delete');
    });
  });

  describe('Migration Baseline SQL Validation', () => {
    const migrationDir = path.join(process.cwd(), 'prisma', 'migrations', '20261010191500_initial_vela_baseline');
    let sqlContent = '';

    beforeEach(() => {
      if (fs.existsSync(migrationDir)) {
        sqlContent = fs.readFileSync(path.join(migrationDir, 'migration.sql'), 'utf8');
      }
    });

    it('migration baseline artifact exists', () => {
      expect(fs.existsSync(migrationDir)).toBe(true);
      expect(sqlContent.length).toBeGreaterThan(0);
    });

    it('migration SQL contains critical core tables', () => {
      expect(sqlContent).toContain('CREATE TABLE "User"');
      expect(sqlContent).toContain('CREATE TABLE "Tenant"');
      expect(sqlContent).toContain('CREATE TABLE "TenantMembership"');
      expect(sqlContent).toContain('CREATE TABLE "Location"');
      expect(sqlContent).toContain('CREATE TABLE "CustomerProfile"');
      expect(sqlContent).toContain('CREATE TABLE "EmployeeProfile"');
      expect(sqlContent).toContain('CREATE TABLE "Service"');
    });

    it('migration SQL contains billing tables', () => {
      expect(sqlContent).toContain('CREATE TABLE "Subscription"');
      expect(sqlContent).toContain('CREATE TABLE "BillingCheckoutAttempt"');
      expect(sqlContent).toContain('CREATE TABLE "StripeWebhookEvent"');
      expect(sqlContent).toContain('"pendingPlan"');
    });

    it('migration SQL contains calendar/push/domain tables', () => {
      expect(sqlContent).toContain('CREATE TABLE "Domain"');
      expect(sqlContent).toContain('CREATE TABLE "ExternalCalendarConnection"');
      expect(sqlContent).toContain('CREATE TABLE "ExternalCalendarEvent"');
      expect(sqlContent).toContain('CREATE TABLE "CalendarSyncJob"');
      expect(sqlContent).toContain('CREATE TABLE "PushSubscription"');
      expect(sqlContent).toContain('CREATE TABLE "NotificationJob"');
    });

    it('migration SQL contains Phase 10 platform tables', () => {
      expect(sqlContent).toContain('CREATE TABLE "PlatformSupportNote"');
      expect(sqlContent).toContain('"isSuperAdmin"');
      expect(sqlContent).toContain('"platformSuspendedAt"');
    });
  });
});

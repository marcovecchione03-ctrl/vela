"use server";

import { requireSuperAdmin, requireNotImpersonating, requireAuthenticatedUser } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { reconcileSubscription } from "@/lib/billing/reconcile";
import { stripe } from "@/lib/billing/stripe";
import { checkRateLimit, generateRateLimitKey } from "@/lib/rate-limiter";
import { changePlan } from "@/actions/billing";

export async function togglePlatformSuspension(tenantId: string, reason: string | null) {
  await requireSuperAdmin();
  await requireNotImpersonating();
  const actorId = await requireAuthenticatedUser();

  const rateKey = generateRateLimitKey(actorId, "admin-suspend");
  if (!(await checkRateLimit(rateKey, 10, 60000))) throw new Error("Rate limit exceeded");

  const isSuspending = reason !== null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      platformSuspendedAt: isSuspending ? new Date() : null,
      platformSuspendedBy: isSuspending ? actorId : null,
      platformSuspensionReason: reason,
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId,
      action: isSuspending ? "PLATFORM_SUSPENSION_ENABLED" : "PLATFORM_SUSPENSION_REMOVED",
      entityType: "Tenant",
      entityId: tenantId,
    }
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
  revalidatePath(`/admin/tenants`);
}

export async function addSupportNote(tenantId: string, content: string) {
  await requireSuperAdmin();
  const actorId = await requireAuthenticatedUser();

  const note = await prisma.platformSupportNote.create({
    data: { tenantId, authorId: actorId, content }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId,
      action: "PLATFORM_SUPPORT_NOTE_ADDED",
      entityType: "PlatformSupportNote",
      entityId: note.id,
      // explicitly excluding body from audit log
    }
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
}

export async function updateTenantFeatureFlag(tenantId: string, flagName: string, isEnabled: boolean) {
  await requireSuperAdmin();
  await requireNotImpersonating();
  const actorId = await requireAuthenticatedUser();

  const rateKey = generateRateLimitKey(actorId, "admin-feature");
  if (!(await checkRateLimit(rateKey, 20, 60000))) throw new Error("Rate limit exceeded");

  await prisma.tenantFeatureFlag.upsert({
    where: { tenantId_flagName: { tenantId, flagName } },
    update: { isEnabled },
    create: { tenantId, flagName, isEnabled }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId,
      action: "FEATURE_FLAG_UPDATED",
      entityType: "FeatureFlag",
      entityId: flagName,
      metadata: JSON.stringify({ isEnabled })
    }
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
}

export async function grantFreeMonths(tenantId: string, months: number, reason: string) {
  await requireSuperAdmin();
  await requireNotImpersonating();
  const actorId = await requireAuthenticatedUser();
  
  const rateKey = generateRateLimitKey(actorId, "admin-freemonths");
  if (!(await checkRateLimit(rateKey, 5, 60000))) throw new Error("Rate limit exceeded");

  if (months <= 0 || months > 12) throw new Error("Months must be between 1 and 12");
  
  const subscription = await prisma.subscription.findUnique({ where: { tenantId } });
  if (subscription?.pendingPlan) throw new Error("Cannot grant free months while a plan change is pending");
  
  if (subscription?.stripeSubscriptionId) {
    // Extend Stripe trial end to grant free months safely
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    let currentEnd = (stripeSub as any).current_period_end;
    if ((stripeSub as any).trial_end && (stripeSub as any).trial_end > currentEnd) {
      currentEnd = (stripeSub as any).trial_end;
    }
    
    // Add months in seconds
    const additionalSeconds = months * 30 * 24 * 60 * 60;
    const newTrialEnd = currentEnd + additionalSeconds;
    
    // Convert to Unix for Stripe
    try {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        trial_end: newTrialEnd,
        proration_behavior: 'none'
      });
      // the webhook will sync this down
    } catch (err: any) {
      throw new Error(`Stripe error: ${err.message}`);
    }
  } else {
    // Local grace period mutation only if not fully on Stripe
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error("Tenant not found");
    const baseDate = tenant.gracePeriodEndsAt && tenant.gracePeriodEndsAt > new Date() 
      ? tenant.gracePeriodEndsAt 
      : new Date();
    const newGraceEnd = new Date(baseDate);
    newGraceEnd.setMonth(newGraceEnd.getMonth() + months);
    
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { gracePeriodEndsAt: newGraceEnd }
    });
  }

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId,
      action: "FREE_MONTHS_GRANTED",
      entityType: "Tenant",
      entityId: tenantId,
      metadata: JSON.stringify({ months, reason })
    }
  });
  
  revalidatePath(`/admin/tenants/${tenantId}`);
}

export async function superAdminChangePlan(tenantId: string, planName: 'BASIC' | 'PRO', interval: 'month' | 'year') {
  await requireSuperAdmin();
  await requireNotImpersonating();
  const actorId = await requireAuthenticatedUser();

  const rateKey = generateRateLimitKey(actorId, "admin-changeplan");
  if (!(await checkRateLimit(rateKey, 5, 60000))) throw new Error("Rate limit exceeded");

  await changePlan(tenantId, planName, interval);

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId,
      action: "SUPER_ADMIN_PLAN_CHANGE",
      entityType: "Subscription",
      entityId: tenantId,
      metadata: JSON.stringify({ planName, interval })
    }
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
  return { success: true };
}

export async function triggerStripeReconciliation(tenantId: string) {
  await requireSuperAdmin();
  await requireNotImpersonating();
  const actorId = await requireAuthenticatedUser();

  const rateKey = generateRateLimitKey(actorId, "admin-reconcile");
  if (!(await checkRateLimit(rateKey, 10, 60000))) throw new Error("Rate limit exceeded");

  const subscription = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!subscription || !subscription.stripeSubscriptionId) {
    throw new Error("No active Stripe subscription to reconcile.");
  }

  const result = await reconcileSubscription(tenantId);
  if (!result.success) throw new Error(result.reason);

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId,
      action: "STRIPE_RECONCILED",
      entityType: "Subscription",
      entityId: subscription.id,
    }
  });

  revalidatePath(`/admin/tenants/${tenantId}`);
}

export async function retryCalendarSyncJob(jobId: string) {
  await requireSuperAdmin();
  const actorId = await requireAuthenticatedUser();
  const rateKey = generateRateLimitKey(actorId, "admin-retry-job");
  if (!(await checkRateLimit(rateKey, 20, 60000))) throw new Error("Rate limit exceeded");

  const job = await prisma.calendarSyncJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");

  await prisma.calendarSyncJob.update({
    where: { id: jobId },
    data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: job.tenantId,
      actorId,
      action: "CALENDAR_JOB_RETRIED",
      entityType: "CalendarSyncJob",
      entityId: jobId
    }
  });
}

export async function retryNotificationJob(jobId: string) {
  await requireSuperAdmin();
  const actorId = await requireAuthenticatedUser();
  const rateKey = generateRateLimitKey(actorId, "admin-retry-job");
  if (!(await checkRateLimit(rateKey, 20, 60000))) throw new Error("Rate limit exceeded");

  const job = await prisma.notificationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");

  await prisma.notificationJob.update({
    where: { id: jobId },
    data: { status: 'PENDING', attempts: 0, nextAttemptAt: new Date() }
  });

  await prisma.auditLog.create({
    data: {
      tenantId: job.tenantId,
      actorId,
      action: "NOTIFICATION_JOB_RETRIED",
      entityType: "NotificationJob",
      entityId: jobId
    }
  });
}

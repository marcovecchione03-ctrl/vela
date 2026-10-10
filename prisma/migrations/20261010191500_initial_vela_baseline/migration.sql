-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'PROVISIONING', 'ACTIVE', 'FAILED');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'EMPLOYEE', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "PriceMode" AS ENUM ('FIXED', 'STARTING_FROM');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "AvailabilityChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" TIMESTAMP(3),
    "provider" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'BASIC',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "pendingPlan" TEXT,
    "pendingInterval" TEXT,
    "pendingEffectiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "gracePeriodEndsAt" TIMESTAMP(3),
    "defaultLocale" TEXT NOT NULL DEFAULT 'it-IT',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Rome',
    "showPrices" BOOLEAN NOT NULL DEFAULT true,
    "bookingApprovalMode" TEXT NOT NULL DEFAULT 'AUTOMATIC',
    "onboardingState" TEXT NOT NULL DEFAULT 'PENDING',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "businessType" TEXT,
    "description" TEXT,
    "businessEmail" TEXT,
    "businessPhone" TEXT,
    "websiteUrl" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "facebookUrl" TEXT,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "bgColor" TEXT,
    "textColor" TEXT,
    "cancellationDeadlineHours" INTEGER NOT NULL DEFAULT 24,
    "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 30,
    "minBookingNoticeHours" INTEGER NOT NULL DEFAULT 1,
    "defaultBookingBufferMins" INTEGER NOT NULL DEFAULT 0,
    "maxCustomerAppointmentsPerDay" INTEGER,
    "allowCustomerOverlaps" BOOLEAN NOT NULL DEFAULT false,
    "platformSuspendedAt" TIMESTAMP(3),
    "platformSuspendedBy" TEXT,
    "platformSuspensionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "normalizedHostname" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verificationToken" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sslStatus" TEXT NOT NULL DEFAULT 'NONE',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMembership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantMembershipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT,
    "bio" TEXT,
    "jobTitle" TEXT,
    "specialization" TEXT,
    "photoUrl" TEXT,
    "calendarColor" TEXT,
    "publicVisibility" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "icsTokenHash" TEXT,
    "lastAutoAssignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tenantMembershipId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedAt" TIMESTAMP(3),
    "blockedById" TEXT,
    "blockReason" TEXT,
    "score" INTEGER NOT NULL DEFAULT 80,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "timezone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeLocation" (
    "employeeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "EmployeeLocation_pkey" PRIMARY KEY ("employeeId","locationId")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "priceMode" "PriceMode" NOT NULL DEFAULT 'FIXED',
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bufferOverrideMins" INTEGER,
    "availableDays" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[],
    "concurrentCapacity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceEmployee" (
    "serviceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "ServiceEmployee_pkey" PRIMARY KEY ("serviceId","employeeId")
);

-- CreateTable
CREATE TABLE "ServiceLocation" (
    "serviceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "ServiceLocation_pkey" PRIMARY KEY ("serviceId","locationId")
);

-- CreateTable
CREATE TABLE "AvailabilityRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "employeeId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityException" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingReference" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "customerId" TEXT,
    "oneTimeClientId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "customerNote" TEXT,
    "internalNote" TEXT,
    "lateCancellation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingChangeHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "previousStart" TIMESTAMP(3) NOT NULL,
    "previousEnd" TIMESTAMP(3) NOT NULL,
    "newStart" TIMESTAMP(3) NOT NULL,
    "newEnd" TIMESTAMP(3) NOT NULL,
    "previousEmployeeId" TEXT,
    "newEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneTimeClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneTimeClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingStatusHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerScoreEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "eventType" TEXT NOT NULL,
    "scoreChange" INTEGER NOT NULL,
    "previousScore" INTEGER NOT NULL DEFAULT 80,
    "newScore" INTEGER NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTagAssignment" (
    "tagId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "CustomerTagAssignment_pkey" PRIMARY KEY ("tagId","customerId")
);

-- CreateTable
CREATE TABLE "ExternalCalendarConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT,
    "externalCalendarId" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlagDefinition" (
    "id" TEXT NOT NULL,
    "flagName" TEXT NOT NULL,
    "description" TEXT,
    "defaultOn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureFlagDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantFeatureFlag" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "flagName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantFeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSupportNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSupportNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentKey" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "inviterUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilityChangeRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "requestedChanges" TEXT NOT NULL,
    "status" "AvailabilityChangeStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilityChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombinedServiceComponent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CombinedServiceComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingCheckoutAttempt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCheckoutAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCalendarEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalCalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSyncJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bookingId" TEXT,
    "payload" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_hostname_key" ON "Domain"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_normalizedHostname_key" ON "Domain"("normalizedHostname");

-- CreateIndex
CREATE INDEX "Domain_tenantId_idx" ON "Domain"("tenantId");

-- CreateIndex
CREATE INDEX "TenantMembership_userId_idx" ON "TenantMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_tenantMembershipId_key" ON "EmployeeProfile"("tenantMembershipId");

-- CreateIndex
CREATE INDEX "EmployeeProfile_tenantId_idx" ON "EmployeeProfile"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_id_tenantId_key" ON "EmployeeProfile"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_tenantMembershipId_key" ON "CustomerProfile"("tenantMembershipId");

-- CreateIndex
CREATE INDEX "CustomerProfile_tenantId_idx" ON "CustomerProfile"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerProfile_tenantId_isBlocked_idx" ON "CustomerProfile"("tenantId", "isBlocked");

-- CreateIndex
CREATE INDEX "CustomerProfile_tenantId_createdAt_idx" ON "CustomerProfile"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_id_tenantId_key" ON "CustomerProfile"("id", "tenantId");

-- CreateIndex
CREATE INDEX "Location_tenantId_idx" ON "Location"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_id_tenantId_key" ON "Location"("id", "tenantId");

-- CreateIndex
CREATE INDEX "EmployeeLocation_tenantId_idx" ON "EmployeeLocation"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceCategory_tenantId_idx" ON "ServiceCategory"("tenantId");

-- CreateIndex
CREATE INDEX "Service_tenantId_idx" ON "Service"("tenantId");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_id_tenantId_key" ON "Service"("id", "tenantId");

-- CreateIndex
CREATE INDEX "ServiceEmployee_tenantId_idx" ON "ServiceEmployee"("tenantId");

-- CreateIndex
CREATE INDEX "ServiceLocation_tenantId_idx" ON "ServiceLocation"("tenantId");

-- CreateIndex
CREATE INDEX "AvailabilityRule_tenantId_idx" ON "AvailabilityRule"("tenantId");

-- CreateIndex
CREATE INDEX "AvailabilityRule_locationId_idx" ON "AvailabilityRule"("locationId");

-- CreateIndex
CREATE INDEX "AvailabilityRule_employeeId_idx" ON "AvailabilityRule"("employeeId");

-- CreateIndex
CREATE INDEX "AvailabilityException_tenantId_idx" ON "AvailabilityException"("tenantId");

-- CreateIndex
CREATE INDEX "AvailabilityException_employeeId_idx" ON "AvailabilityException"("employeeId");

-- CreateIndex
CREATE INDEX "TimeBlock_tenantId_idx" ON "TimeBlock"("tenantId");

-- CreateIndex
CREATE INDEX "TimeBlock_employeeId_idx" ON "TimeBlock"("employeeId");

-- CreateIndex
CREATE INDEX "Booking_tenantId_idx" ON "Booking"("tenantId");

-- CreateIndex
CREATE INDEX "Booking_locationId_idx" ON "Booking"("locationId");

-- CreateIndex
CREATE INDEX "Booking_employeeId_idx" ON "Booking"("employeeId");

-- CreateIndex
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");

-- CreateIndex
CREATE INDEX "Booking_tenantId_employeeId_startTime_endTime_idx" ON "Booking"("tenantId", "employeeId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Booking_tenantId_startTime_endTime_idx" ON "Booking"("tenantId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "Booking_tenantId_status_startTime_idx" ON "Booking"("tenantId", "status", "startTime");

-- CreateIndex
CREATE INDEX "Booking_tenantId_customerId_startTime_idx" ON "Booking"("tenantId", "customerId", "startTime");

-- CreateIndex
CREATE INDEX "Booking_tenantId_locationId_startTime_idx" ON "Booking"("tenantId", "locationId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_id_tenantId_key" ON "Booking"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_tenantId_bookingReference_key" ON "Booking"("tenantId", "bookingReference");

-- CreateIndex
CREATE INDEX "BookingChangeHistory_tenantId_idx" ON "BookingChangeHistory"("tenantId");

-- CreateIndex
CREATE INDEX "BookingChangeHistory_bookingId_idx" ON "BookingChangeHistory"("bookingId");

-- CreateIndex
CREATE INDEX "OneTimeClient_tenantId_idx" ON "OneTimeClient"("tenantId");

-- CreateIndex
CREATE INDEX "BookingService_tenantId_idx" ON "BookingService"("tenantId");

-- CreateIndex
CREATE INDEX "BookingService_bookingId_idx" ON "BookingService"("bookingId");

-- CreateIndex
CREATE INDEX "BookingStatusHistory_tenantId_idx" ON "BookingStatusHistory"("tenantId");

-- CreateIndex
CREATE INDEX "BookingStatusHistory_bookingId_idx" ON "BookingStatusHistory"("bookingId");

-- CreateIndex
CREATE INDEX "BookingNote_tenantId_idx" ON "BookingNote"("tenantId");

-- CreateIndex
CREATE INDEX "BookingNote_bookingId_idx" ON "BookingNote"("bookingId");

-- CreateIndex
CREATE INDEX "CustomerScoreEvent_tenantId_idx" ON "CustomerScoreEvent"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerScoreEvent_customerId_idx" ON "CustomerScoreEvent"("customerId");

-- CreateIndex
CREATE INDEX "CustomerScoreEvent_tenantId_customerId_createdAt_idx" ON "CustomerScoreEvent"("tenantId", "customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerScoreEvent_bookingId_eventType_key" ON "CustomerScoreEvent"("bookingId", "eventType");

-- CreateIndex
CREATE INDEX "CustomerNote_tenantId_idx" ON "CustomerNote"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_idx" ON "CustomerNote"("customerId");

-- CreateIndex
CREATE INDEX "CustomerTag_tenantId_idx" ON "CustomerTag"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerTagAssignment_tenantId_idx" ON "CustomerTagAssignment"("tenantId");

-- CreateIndex
CREATE INDEX "CustomerTagAssignment_tenantId_customerId_tagId_idx" ON "CustomerTagAssignment"("tenantId", "customerId", "tagId");

-- CreateIndex
CREATE INDEX "ExternalCalendarConnection_tenantId_idx" ON "ExternalCalendarConnection"("tenantId");

-- CreateIndex
CREATE INDEX "ExternalCalendarConnection_employeeId_idx" ON "ExternalCalendarConnection"("employeeId");

-- CreateIndex
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "AuditLog"("tenantId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlagDefinition_flagName_key" ON "FeatureFlagDefinition"("flagName");

-- CreateIndex
CREATE INDEX "TenantFeatureFlag_tenantId_idx" ON "TenantFeatureFlag"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantFeatureFlag_tenantId_flagName_key" ON "TenantFeatureFlag"("tenantId", "flagName");

-- CreateIndex
CREATE INDEX "PlatformSupportNote_tenantId_idx" ON "PlatformSupportNote"("tenantId");

-- CreateIndex
CREATE INDEX "ConsentLog_tenantId_idx" ON "ConsentLog"("tenantId");

-- CreateIndex
CREATE INDEX "ConsentLog_userId_idx" ON "ConsentLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamInvitation_tokenHash_key" ON "TeamInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "TeamInvitation_tenantId_idx" ON "TeamInvitation"("tenantId");

-- CreateIndex
CREATE INDEX "TeamInvitation_email_idx" ON "TeamInvitation"("email");

-- CreateIndex
CREATE INDEX "AvailabilityChangeRequest_tenantId_idx" ON "AvailabilityChangeRequest"("tenantId");

-- CreateIndex
CREATE INDEX "AvailabilityChangeRequest_employeeId_idx" ON "AvailabilityChangeRequest"("employeeId");

-- CreateIndex
CREATE INDEX "CombinedServiceComponent_tenantId_idx" ON "CombinedServiceComponent"("tenantId");

-- CreateIndex
CREATE INDEX "CombinedServiceComponent_componentId_idx" ON "CombinedServiceComponent"("componentId");

-- CreateIndex
CREATE UNIQUE INDEX "CombinedServiceComponent_parentId_componentId_key" ON "CombinedServiceComponent"("parentId", "componentId");

-- CreateIndex
CREATE INDEX "BillingCheckoutAttempt_tenantId_idx" ON "BillingCheckoutAttempt"("tenantId");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_tenantId_idx" ON "ExternalCalendarEvent"("tenantId");

-- CreateIndex
CREATE INDEX "ExternalCalendarEvent_employeeId_idx" ON "ExternalCalendarEvent"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalCalendarEvent_bookingId_connectionId_key" ON "ExternalCalendarEvent"("bookingId", "connectionId");

-- CreateIndex
CREATE INDEX "CalendarSyncJob_tenantId_idx" ON "CalendarSyncJob"("tenantId");

-- CreateIndex
CREATE INDEX "CalendarSyncJob_status_nextAttemptAt_idx" ON "CalendarSyncJob"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_tenantId_idx" ON "PushSubscription"("tenantId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "NotificationJob_tenantId_idx" ON "NotificationJob"("tenantId");

-- CreateIndex
CREATE INDEX "NotificationJob_status_nextAttemptAt_idx" ON "NotificationJob"("status", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_tenantMembershipId_fkey" FOREIGN KEY ("tenantMembershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_tenantMembershipId_fkey" FOREIGN KEY ("tenantMembershipId") REFERENCES "TenantMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLocation" ADD CONSTRAINT "EmployeeLocation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeLocation" ADD CONSTRAINT "EmployeeLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEmployee" ADD CONSTRAINT "ServiceEmployee_serviceId_tenantId_fkey" FOREIGN KEY ("serviceId", "tenantId") REFERENCES "Service"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceEmployee" ADD CONSTRAINT "ServiceEmployee_employeeId_tenantId_fkey" FOREIGN KEY ("employeeId", "tenantId") REFERENCES "EmployeeProfile"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLocation" ADD CONSTRAINT "ServiceLocation_serviceId_tenantId_fkey" FOREIGN KEY ("serviceId", "tenantId") REFERENCES "Service"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceLocation" ADD CONSTRAINT "ServiceLocation_locationId_tenantId_fkey" FOREIGN KEY ("locationId", "tenantId") REFERENCES "Location"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_locationId_tenantId_fkey" FOREIGN KEY ("locationId", "tenantId") REFERENCES "Location"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityException" ADD CONSTRAINT "AvailabilityException_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_locationId_tenantId_fkey" FOREIGN KEY ("locationId", "tenantId") REFERENCES "Location"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_employeeId_tenantId_fkey" FOREIGN KEY ("employeeId", "tenantId") REFERENCES "EmployeeProfile"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_tenantId_fkey" FOREIGN KEY ("customerId", "tenantId") REFERENCES "CustomerProfile"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_oneTimeClientId_fkey" FOREIGN KEY ("oneTimeClientId") REFERENCES "OneTimeClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingChangeHistory" ADD CONSTRAINT "BookingChangeHistory_bookingId_tenantId_fkey" FOREIGN KEY ("bookingId", "tenantId") REFERENCES "Booking"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_bookingId_tenantId_fkey" FOREIGN KEY ("bookingId", "tenantId") REFERENCES "Booking"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_serviceId_tenantId_fkey" FOREIGN KEY ("serviceId", "tenantId") REFERENCES "Service"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingStatusHistory" ADD CONSTRAINT "BookingStatusHistory_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingNote" ADD CONSTRAINT "BookingNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerScoreEvent" ADD CONSTRAINT "CustomerScoreEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerScoreEvent" ADD CONSTRAINT "CustomerScoreEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTag" ADD CONSTRAINT "CustomerTag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTagAssignment" ADD CONSTRAINT "CustomerTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CustomerTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerTagAssignment" ADD CONSTRAINT "CustomerTagAssignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarConnection" ADD CONSTRAINT "ExternalCalendarConnection_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantFeatureFlag" ADD CONSTRAINT "TenantFeatureFlag_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSupportNote" ADD CONSTRAINT "PlatformSupportNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentLog" ADD CONSTRAINT "ConsentLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_inviterUserId_fkey" FOREIGN KEY ("inviterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityChangeRequest" ADD CONSTRAINT "AvailabilityChangeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityChangeRequest" ADD CONSTRAINT "AvailabilityChangeRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedServiceComponent" ADD CONSTRAINT "CombinedServiceComponent_parentId_tenantId_fkey" FOREIGN KEY ("parentId", "tenantId") REFERENCES "Service"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombinedServiceComponent" ADD CONSTRAINT "CombinedServiceComponent_componentId_tenantId_fkey" FOREIGN KEY ("componentId", "tenantId") REFERENCES "Service"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCalendarEvent" ADD CONSTRAINT "ExternalCalendarEvent_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ExternalCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSyncJob" ADD CONSTRAINT "CalendarSyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "ExternalCalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;


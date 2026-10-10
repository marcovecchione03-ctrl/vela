import { prisma } from "@/lib/db/prisma";

export async function resolveFeatureFlag(tenantId: string, flagName: string): Promise<boolean> {
  // Try to find the tenant override first
  const tenantOverride = await prisma.tenantFeatureFlag.findUnique({
    where: {
      tenantId_flagName: {
        tenantId,
        flagName,
      }
    }
  });

  if (tenantOverride) {
    return tenantOverride.isEnabled;
  }

  // Fallback to global definition
  const globalDef = await prisma.featureFlagDefinition.findUnique({
    where: { flagName }
  });

  if (globalDef) {
    return globalDef.defaultOn;
  }

  // Unknown flags default to false safely
  return false;
}

export async function resolveFeatureFlags(tenantId: string, flagNames: string[]): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const flag of flagNames) {
    result[flag] = await resolveFeatureFlag(tenantId, flag);
  }
  return result;
}

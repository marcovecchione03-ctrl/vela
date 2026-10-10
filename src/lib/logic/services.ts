export function validateServiceDuration(mins: number): void {
  if (mins < 5 || mins > 1440) {
    throw new Error("Invalid duration. Must be between 5 and 1440 minutes.");
  }
}

export function validateServiceConcurrency(cap: number): void {
  if (cap < 1 || cap > 50) {
    throw new Error("Invalid concurrency capacity. Must be between 1 and 50.");
  }
}

export function validateCombinedComponents(
  combinedServiceId: string | undefined,
  componentsInput: { serviceId: string }[],
  childServicesFromDB: { id: string, name: string, _count: { components: number }, durationMinutes: number }[]
): number {
  if (combinedServiceId && componentsInput.some(c => c.serviceId === combinedServiceId)) {
    throw new Error("A combined service cannot contain itself");
  }

  const uniqueIds = new Set(componentsInput.map(c => c.serviceId));
  if (uniqueIds.size !== componentsInput.length) {
    throw new Error("Duplicate components are not allowed");
  }

  if (childServicesFromDB.length !== uniqueIds.size) {
    throw new Error("One or more component services do not exist in this tenant");
  }

  let totalDuration = 0;
  for (const child of childServicesFromDB) {
    if (child._count.components > 0) {
      throw new Error(`Service ${child.name} is already a combined service. Nesting is not allowed.`);
    }
    totalDuration += child.durationMinutes;
  }

  return totalDuration;
}

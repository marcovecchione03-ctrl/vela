export function canRequestAvailability(actorRole: string, actorMembershipId: string, targetMembershipId: string): boolean {
  if (actorRole === "EMPLOYEE" && actorMembershipId !== targetMembershipId) {
    return false;
  }
  return true;
}

export function canCreateTimeBlock(actorRole: string, actorMembershipId: string, targetMembershipId: string): boolean {
  return canRequestAvailability(actorRole, actorMembershipId, targetMembershipId);
}

export function validateTimeBlockDates(startTime: Date | string, endTime: Date | string): void {
  if (new Date(startTime) >= new Date(endTime)) {
    throw new Error("End time must be after start time");
  }
}

export function canApproveAvailabilityRequest(actorRole: string): boolean {
  return actorRole === "OWNER" || actorRole === "ADMIN";
}

export function canManageVacations(actorRole: string): boolean {
  return actorRole === "OWNER" || actorRole === "ADMIN";
}

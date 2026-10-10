export function canInviteRole(actorRole: string, targetRole: string): boolean {
  if (actorRole !== "OWNER" && actorRole !== "ADMIN") return false;
  if (actorRole === "ADMIN" && targetRole === "ADMIN") return false;
  if (targetRole === "OWNER" || targetRole === "CUSTOMER") return false;
  return true;
}

export function validateInvitation(
  invitationStatus: string, 
  expiresAt: Date, 
  invitationEmail: string, 
  userEmail: string
): void {
  if (invitationStatus !== "PENDING") {
    throw new Error("Invalid or expired invitation");
  }
  if (expiresAt < new Date()) {
    throw new Error("Invitation has expired");
  }
  if (invitationEmail !== userEmail) {
    throw new Error("This invitation was sent to a different email address.");
  }
}

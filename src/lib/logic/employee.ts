export const ALLOWED_CALENDAR_COLORS = [
  '#4f46e5', '#16a34a', '#ea580c', 
  '#e11d48', '#0891b2', '#7c3aed'
];

export function validateCalendarColor(color: string | undefined): void {
  if (!color) return;
  if (!ALLOWED_CALENDAR_COLORS.includes(color)) {
    throw new Error("Invalid calendar color");
  }
}

export function canModifyEmployee(actorRole: string): boolean {
  return actorRole === "OWNER" || actorRole === "ADMIN";
}

export function canAdminModifyRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "ADMIN" && (targetRole === "OWNER" || targetRole === "ADMIN")) {
    return false;
  }
  return true;
}

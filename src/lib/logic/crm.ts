import { Role } from "@prisma/client"

export function canManageBlacklist(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN"
}

export function canManageTags(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN"
}

export function canAddNote(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "EMPLOYEE"
}

export function canDeleteNote(role: Role): boolean {
  return role === "OWNER" || role === "ADMIN"
}

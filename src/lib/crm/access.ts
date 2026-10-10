/**
 * CRM access policy and customer-facing serializers (pure).
 */

export const CRM_ROLES = ["OWNER", "ADMIN"] as const
export type CrmRole = (typeof CRM_ROLES)[number]

export function canAccessCRM(role: string | null | undefined): role is CrmRole {
  return role === "OWNER" || role === "ADMIN"
}

export function assertCRMRole(role: string | null | undefined): asserts role is CrmRole {
  if (!canAccessCRM(role)) {
    throw new Error("Forbidden: CRM is restricted to owners and admins")
  }
}

/** Neutral message shown to blocked customers. Never reveals the block or its reason. */
export const BOOKING_UNAVAILABLE_MESSAGE =
  "Online booking is currently unavailable for this account. Please contact the business."

export type CustomerSelfDTO = {
  id: string
  firstName: string
  lastName: string
  phone: string | null
}

/**
 * The ONLY shape of CustomerProfile that may be sent to a customer's browser.
 * Explicit allow-list: score, blocked state, blockReason, blockedById, tags,
 * CRM notes and internal notes are never included.
 */
export function toCustomerSelfDTO(profile: {
  id: string
  firstName: string
  lastName: string
  phone?: string | null
}): CustomerSelfDTO {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone ?? null,
  }
}

export const CRM_PAGE_SIZE_DEFAULT = 20
export const CRM_PAGE_SIZE_MAX = 100

/** Parses page/pageSize from query input. Rejects abusive page sizes instead of silently clamping. */
export function parsePagination(input: { page?: string | null; pageSize?: string | null }, defaultSize = CRM_PAGE_SIZE_DEFAULT) {
  const page = input.page ? Number.parseInt(input.page, 10) : 1
  const pageSize = input.pageSize ? Number.parseInt(input.pageSize, 10) : defaultSize

  if (!Number.isInteger(page) || page < 1 || page > 100_000) {
    throw new Error("Invalid page")
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > CRM_PAGE_SIZE_MAX) {
    throw new Error(`Invalid page size (1-${CRM_PAGE_SIZE_MAX})`)
  }
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

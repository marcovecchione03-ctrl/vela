import { CustomerProfile } from "@prisma/client"

export type PublicCustomerDTO = Pick<CustomerProfile, "id" | "firstName" | "lastName" | "phone" | "createdAt">

export function toPublicCustomerDTO(profile: any): PublicCustomerDTO {
  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    phone: profile.phone,
    createdAt: profile.createdAt
  }
}

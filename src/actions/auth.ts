"use server"

import { z } from "zod"
import { prisma } from "@/lib/db/prisma"
import { hashPassword } from "@/lib/auth/password"

const signupSchema = z.object({
  firstName: z.string().min(2, "First name is too short"),
  lastName: z.string().min(2, "Last name is too short"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export async function registerOwner(formData: FormData) {
  try {
    const rawData = Object.fromEntries(formData.entries())
    
    // Check password match manually
    if (rawData.password !== rawData.confirmPassword) {
      return { error: "Passwords do not match" }
    }
    
    if (!rawData.terms) {
      return { error: "You must accept the terms and conditions" }
    }

    const validated = signupSchema.safeParse(rawData)
    
    if (!validated.success) {
      return { error: validated.error.issues[0].message }
    }

    const { email, password } = validated.data

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return { error: "An account with this email already exists." }
    }

    const passwordHash = await hashPassword(password)

    // Store firstName/lastName somewhere. We'll put it in User table or just use it later.
    // Wait, User model doesn't have firstName/lastName. 
    // They go into EmployeeProfile/CustomerProfile linked to a Tenant.
    // But since they have no tenant yet, we'll just create the User, and they can provide their name again in onboarding?
    // Let's add firstName/lastName to User model or store in onboarding state.
    // For now, let's just create the user. Onboarding will collect the owner profile info.
    
    await prisma.user.create({
      data: {
        email,
        passwordHash,
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Signup error:", error)
    return { error: "An unexpected error occurred." }
  }
}

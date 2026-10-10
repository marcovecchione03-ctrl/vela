import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    if (process.env.ALLOW_DEMO_SEED !== 'true') {
      console.log('Seed refused: Production/Staging detected and ALLOW_DEMO_SEED is not true.');
      process.exit(0);
    }
  }

  console.log('Seeding database...')

  // Clean the database
  await prisma.tenant.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('password123', 10)

  // ---------------------------------------------------------
  // PLATFORM LEVEL (SUPER ADMIN)
  // ---------------------------------------------------------
  await prisma.user.create({
    data: {
      email: 'admin@vela.local',
      passwordHash,
      isSuperAdmin: true,
    }
  })

  // ---------------------------------------------------------
  // TENANT A: Demo Barber
  // ---------------------------------------------------------
  const tenantA = await prisma.tenant.create({
    data: {
      name: 'Demo Barber',
      slug: 'demo-barber',
      defaultLocale: 'en-US',
      currency: 'USD',
      domains: {
        create: {
          hostname: 'barber.localhost',
          normalizedHostname: 'barber.localhost',
          status: 'ACTIVE'
        }
      }
    }
  })

  const ownerA = await prisma.user.create({ data: { email: 'owner@barber.localhost', passwordHash } })
  const memOwnerA = await prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: ownerA.id, role: 'OWNER' } })
  const empProfileOwnerA = await prisma.employeeProfile.create({ data: { tenantId: tenantA.id, tenantMembershipId: memOwnerA.id, name: 'Mario (Owner)' } })

  const empA = await prisma.user.create({ data: { email: 'employee@barber.localhost', passwordHash } })
  const memEmpA = await prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: empA.id, role: 'EMPLOYEE' } })
  const empProfileA = await prisma.employeeProfile.create({ data: { tenantId: tenantA.id, tenantMembershipId: memEmpA.id, name: 'Luigi' } })

  const custA = await prisma.user.create({ data: { email: 'customer@barber.localhost', passwordHash } })
  const memCustA = await prisma.tenantMembership.create({ data: { tenantId: tenantA.id, userId: custA.id, role: 'CUSTOMER' } })
  await prisma.customerProfile.create({ data: { tenantId: tenantA.id, tenantMembershipId: memCustA.id, firstName: 'John', lastName: 'Doe' } })

  const locationA = await prisma.location.create({ data: { tenantId: tenantA.id, name: 'Main Shop' } })
  const catA = await prisma.serviceCategory.create({ data: { tenantId: tenantA.id, name: 'Haircuts' } })
  
  const serviceA = await prisma.service.create({
    data: {
      tenantId: tenantA.id,
      categoryId: catA.id,
      name: 'Classic Cut',
      durationMinutes: 30,
      price: 2500, // $25.00
    }
  })

  await prisma.serviceLocation.create({ data: { tenantId: tenantA.id, serviceId: serviceA.id, locationId: locationA.id } })
  await prisma.serviceEmployee.create({ data: { tenantId: tenantA.id, serviceId: serviceA.id, employeeId: empProfileOwnerA.id } })
  await prisma.serviceEmployee.create({ data: { tenantId: tenantA.id, serviceId: serviceA.id, employeeId: empProfileA.id } })

  // ---------------------------------------------------------
  // TENANT B: Demo Wellness
  // ---------------------------------------------------------
  const tenantB = await prisma.tenant.create({
    data: {
      name: 'Demo Wellness',
      slug: 'demo-wellness',
      defaultLocale: 'en-US',
      currency: 'USD',
      domains: {
        create: {
          hostname: 'wellness.localhost',
          normalizedHostname: 'wellness.localhost',
          status: 'ACTIVE'
        }
      }
    }
  })

  const ownerB = await prisma.user.create({ data: { email: 'owner@wellness.localhost', passwordHash } })
  const memOwnerB = await prisma.tenantMembership.create({ data: { tenantId: tenantB.id, userId: ownerB.id, role: 'OWNER' } })
  const empProfileOwnerB = await prisma.employeeProfile.create({ data: { tenantId: tenantB.id, tenantMembershipId: memOwnerB.id, name: 'Sarah (Owner)' } })

  const custB = await prisma.user.create({ data: { email: 'customer@wellness.localhost', passwordHash } })
  const memCustB = await prisma.tenantMembership.create({ data: { tenantId: tenantB.id, userId: custB.id, role: 'CUSTOMER' } })
  await prisma.customerProfile.create({ data: { tenantId: tenantB.id, tenantMembershipId: memCustB.id, firstName: 'Jane', lastName: 'Smith' } })

  const locationB = await prisma.location.create({ data: { tenantId: tenantB.id, name: 'Downtown Spa' } })
  const catB = await prisma.serviceCategory.create({ data: { tenantId: tenantB.id, name: 'Massages' } })
  
  const serviceB = await prisma.service.create({
    data: {
      tenantId: tenantB.id,
      categoryId: catB.id,
      name: 'Deep Tissue',
      durationMinutes: 60,
      price: 8000, // $80.00
    }
  })

  await prisma.serviceLocation.create({ data: { tenantId: tenantB.id, serviceId: serviceB.id, locationId: locationB.id } })
  await prisma.serviceEmployee.create({ data: { tenantId: tenantB.id, serviceId: serviceB.id, employeeId: empProfileOwnerB.id } })

  console.log('Database seeded successfully.')
  console.log('Login mapping (password: password123):')
  console.log('- admin@vela.local (Super Admin)')
  console.log('- owner@barber.localhost (Owner A)')
  console.log('- employee@barber.localhost (Employee A)')
  console.log('- customer@barber.localhost (Customer A)')
  console.log('- owner@wellness.localhost (Owner B)')
  console.log('- customer@wellness.localhost (Customer B)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

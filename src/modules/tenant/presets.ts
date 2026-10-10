import { prisma } from "@/lib/db/prisma"

export type BrandingPreset = {
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  textColor: string;
}

export const BRANDING_PRESETS: Record<string, BrandingPreset> = {
  Essential: {
    name: "Essential",
    description: "Neutral, universal, clean.",
    primaryColor: "#171717",
    secondaryColor: "#737373",
    bgColor: "#FFFFFF",
    textColor: "#171717"
  },
  Bold: {
    name: "Bold",
    description: "Dark, strong, high contrast.",
    primaryColor: "#111111",
    secondaryColor: "#404040",
    bgColor: "#F5F5F5",
    textColor: "#111111"
  },
  Soft: {
    name: "Soft",
    description: "Warm and gentle.",
    primaryColor: "#A85D72",
    secondaryColor: "#D8A7B5",
    bgColor: "#FFF8F8",
    textColor: "#3A2A2F"
  },
  Elegant: {
    name: "Elegant",
    description: "Premium, warm, understated.",
    primaryColor: "#3B3028",
    secondaryColor: "#A88E76",
    bgColor: "#F7F3EC",
    textColor: "#2B2521"
  },
  Fresh: {
    name: "Fresh",
    description: "Clean wellness / health feeling.",
    primaryColor: "#507A6A",
    secondaryColor: "#9BB8AA",
    bgColor: "#F5FAF7",
    textColor: "#23352E"
  },
  Urban: {
    name: "Urban",
    description: "Creative, modern, darker personality.",
    primaryColor: "#242424",
    secondaryColor: "#7A7A7A",
    bgColor: "#EDEDED",
    textColor: "#181818"
  }
}

const PRESETS: Record<string, any[]> = {
  "Barber Shop": [
    {
      category: "Capelli",
      services: [
        { name: "Taglio", durationMinutes: 30, price: 2500 },
        { name: "Shampoo e taglio", durationMinutes: 45, price: 3000 }
      ]
    },
    {
      category: "Barba",
      services: [
        { name: "Regolazione barba", durationMinutes: 15, price: 1500 },
        { name: "Rasatura", durationMinutes: 30, price: 2000 }
      ]
    },
    {
      category: "Combo",
      services: [
        { name: "Taglio + barba", durationMinutes: 60, price: 4000 }
      ]
    }
  ],
  "Hair Salon": [
    {
      category: "Capelli",
      services: [
        { name: "Taglio", durationMinutes: 45, price: 3500 },
        { name: "Piega", durationMinutes: 30, price: 2000 },
        { name: "Colore", durationMinutes: 90, price: 5000 },
        { name: "Trattamenti", durationMinutes: 30, price: 2500 }
      ]
    }
  ],
  "Beauty Center": [
    {
      category: "Viso",
      services: [
        { name: "Pulizia viso", durationMinutes: 60, price: 5000 }
      ]
    },
    {
      category: "Corpo",
      services: [
        { name: "Trattamento corpo", durationMinutes: 60, price: 6000 }
      ]
    },
    {
      category: "Epilazione",
      services: [
        { name: "Ceretta", durationMinutes: 30, price: 2500 }
      ]
    }
  ],
  "Nail Salon": [
    {
      category: "Mani e Piedi",
      services: [
        { name: "Manicure", durationMinutes: 30, price: 2000 },
        { name: "Pedicure", durationMinutes: 45, price: 3500 },
        { name: "Gel", durationMinutes: 60, price: 5000 }
      ]
    }
  ],
  "SPA": [
    {
      category: "Benessere",
      services: [
        { name: "Massaggi", durationMinutes: 60, price: 6000 },
        { name: "Percorsi SPA", durationMinutes: 120, price: 10000 }
      ]
    }
  ],
  "Massage / Wellness": [
    {
      category: "Massaggi",
      services: [
        { name: "Massaggio Relax", durationMinutes: 60, price: 6000 },
        { name: "Massaggio Decontratturante", durationMinutes: 60, price: 7000 }
      ]
    }
  ]
}

export async function applyBusinessPreset(tenantId: string, presetType: string) {
  const preset = PRESETS[presetType]
  if (!preset) return { success: false, message: "Preset not found" }

  return await prisma.$transaction(async (tx) => {
    let orderIndex = 0
    for (const cat of preset) {
      // Idempotency: check if category exists
      let dbCat = await tx.serviceCategory.findFirst({
        where: { tenantId, name: cat.category }
      })

      if (!dbCat) {
        dbCat = await tx.serviceCategory.create({
          data: {
            tenantId,
            name: cat.category,
            orderIndex
          }
        })
      }

      for (const svc of cat.services) {
        // Idempotency: check if service exists
        const dbSvc = await tx.service.findFirst({
          where: { tenantId, name: svc.name }
        })

        if (!dbSvc) {
          await tx.service.create({
            data: {
              tenantId,
              categoryId: dbCat.id,
              name: svc.name,
              durationMinutes: svc.durationMinutes,
              price: svc.price,
              priceMode: "FIXED",
              isActive: true,
              availableDays: [0, 1, 2, 3, 4, 5, 6]
            }
          })
        }
      }
      orderIndex++
    }

    return { success: true }
  })
}

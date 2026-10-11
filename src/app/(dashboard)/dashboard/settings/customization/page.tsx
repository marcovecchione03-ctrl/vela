import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

import { getDashboardTenant } from "@/lib/tenant/context"
import { requireOwnerOrAdmin } from "@/lib/auth/rbac"

export default async function CustomizationPage() {
  const tenant = await getDashboardTenant()
  if (!tenant) redirect("/auth/login")

  try {
    await requireOwnerOrAdmin(tenant.id)
  } catch (e) {
    redirect("/onboarding")
  }

  async function updateCustomization(formData: FormData) {
    "use server"
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return
    
    try {
      if (!tenant) return
      await requireOwnerOrAdmin(tenant.id)
    } catch (e) {
      return
    }

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        primaryColor: formData.get("primaryColor") as string,
        secondaryColor: formData.get("secondaryColor") as string,
        bgColor: formData.get("bgColor") as string,
        textColor: formData.get("textColor") as string,
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Customization</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage the visual appearance of your booking page.</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>
            These colors will be used on your customer-facing booking page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateCustomization} id="customization-form" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex space-x-2">
                  <Input type="color" name="primaryColor" defaultValue={tenant.primaryColor || "#000000"} className="w-16 p-1 h-10" />
                  <Input type="text" defaultValue={tenant.primaryColor || "#000000"} className="flex-1" readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex space-x-2">
                  <Input type="color" name="secondaryColor" defaultValue={tenant.secondaryColor || "#666666"} className="w-16 p-1 h-10" />
                  <Input type="text" defaultValue={tenant.secondaryColor || "#666666"} className="flex-1" readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex space-x-2">
                  <Input type="color" name="bgColor" defaultValue={tenant.bgColor || "#ffffff"} className="w-16 p-1 h-10" />
                  <Input type="text" defaultValue={tenant.bgColor || "#ffffff"} className="flex-1" readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex space-x-2">
                  <Input type="color" name="textColor" defaultValue={tenant.textColor || "#171717"} className="w-16 p-1 h-10" />
                  <Input type="text" defaultValue={tenant.textColor || "#171717"} className="flex-1" readOnly />
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-6 border rounded-lg" style={{ backgroundColor: tenant.bgColor || '#ffffff' }}>
              <p className="text-sm font-medium mb-4" style={{ color: tenant.textColor || '#171717' }}>
                Preview
              </p>
              <button 
                type="button"
                className="px-4 py-2 rounded-md text-white font-medium" 
                style={{ backgroundColor: tenant.primaryColor || '#000000' }}
              >
                Primary Button
              </button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end border-t pt-6">
          <Button type="submit" form="customization-form">Save Changes</Button>
        </CardFooter>
      </Card>
    </div>
  )
}

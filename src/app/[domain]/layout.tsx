import { prisma } from "@/lib/db/prisma"
import { notFound } from "next/navigation"
import { resolveTenantFromHost } from "@/lib/tenant/server"

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ domain: string }>
}) {
  const { domain } = await params;
  
  // Resolves from headers. If dev bypass is true, it falls back to parsing the domain slug.
  const tenant = await resolveTenantFromHost(domain)

  if (!tenant) {
    notFound()
  }
  if (tenant.status === "CANCELLED") {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">{tenant.name}</h1>
          <nav>
            {/* Minimal nav for public tenant site */}
            <a href={`/${domain}`} className="text-sm font-medium hover:underline mr-4">Home</a>
            <a href={`/${domain}/book`} className="text-sm font-medium hover:underline mr-4">Book Now</a>
            <a href={`/${domain}/appointments`} className="text-sm font-medium hover:underline">My Appointments</a>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white border-t mt-12 py-8 text-center text-sm text-gray-500">
        <p>Powered by Vela</p>
      </footer>
    </div>
  )
}

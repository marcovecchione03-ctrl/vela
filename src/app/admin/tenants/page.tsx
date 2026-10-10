import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { resolveEffectiveTenantStatus } from "@/lib/tenant/resolver";
import { Search } from "lucide-react";

export default async function AdminTenantsPage({ searchParams }: { searchParams: Promise<{ page?: string, q?: string }> }) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1");
  const q = resolvedParams.q || "";
  const take = 20;
  const skip = (page - 1) * take;

  const where = q ? {
    OR: [
      { name: { contains: q, mode: 'insensitive' as any } },
      { id: { equals: q } },
      { slug: { contains: q, mode: 'insensitive' as any } }
    ]
  } : {};

  const tenants = await prisma.tenant.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: true,
      domains: { where: { isPrimary: true } },
      _count: {
        select: { locations: true, customers: true, bookings: true }
      }
    }
  });

  const total = await prisma.tenant.count({ where });
  const totalPages = Math.ceil(total / take);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tenant Directory</h1>
        
        <form className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input 
            type="text" 
            name="q"
            defaultValue={q}
            placeholder="Search name, id, slug..." 
            className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-sm focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-400">Name</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Status</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Plan</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Primary Domain</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Stats (Loc/Cus/Bkg)</th>
                <th className="px-4 py-3 font-medium text-neutral-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No tenants found.</td>
                </tr>
              )}
              {tenants.map(async (tenant) => {
                const effectiveStatus = await resolveEffectiveTenantStatus(tenant.id);
                const domain = tenant.domains[0]?.hostname || 'None';
                
                return (
                  <tr key={tenant.id} className="hover:bg-neutral-900/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-200">{tenant.name}</div>
                      <div className="text-xs text-neutral-500 font-mono mt-1 truncate max-w-[200px]">{tenant.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        effectiveStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                        effectiveStatus === 'PLATFORM_SUSPENDED' ? 'bg-red-500/10 text-red-400' :
                        effectiveStatus === 'GRACE_PERIOD' ? 'bg-orange-500/10 text-orange-400' :
                        'bg-neutral-800 text-neutral-400'
                      }`}>
                        {effectiveStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tenant.subscription?.plan || 'NONE'}
                      <div className="text-xs text-neutral-500 mt-1">{tenant.subscription?.interval || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-300">{domain}</td>
                    <td className="px-4 py-3 text-neutral-400">
                      {tenant._count.locations} / {tenant._count.customers} / {tenant._count.bookings}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/tenants/${tenant.id}`} className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                        Manage &rarr;
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
            <div className="text-sm text-neutral-500">Page {page} of {totalPages}</div>
            <div className="space-x-2">
              {page > 1 && (
                <Link href={`/admin/tenants?page=${page - 1}${q ? `&q=${q}` : ''}`} className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm hover:bg-neutral-800">
                  Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/tenants?page=${page + 1}${q ? `&q=${q}` : ''}`} className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm hover:bg-neutral-800">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

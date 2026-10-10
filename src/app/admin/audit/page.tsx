import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { Search } from "lucide-react";

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ page?: string, q?: string, action?: string }> }) {
  const resolvedParams = await searchParams;
  const page = parseInt(resolvedParams.page || "1");
  const q = resolvedParams.q || "";
  const actionFilter = resolvedParams.action || "";
  const take = 50;
  const skip = (page - 1) * take;

  const where: any = {};
  if (q) {
    where.OR = [
      { tenantId: { equals: q } },
      { actorId: { equals: q } },
      { entityId: { equals: q } }
    ];
  }
  if (actionFilter) {
    where.action = actionFilter;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });

  const total = await prisma.auditLog.count({ where });
  const totalPages = Math.ceil(total / take);
  
  // Basic list of common actions
  const commonActions = [
    "IMPERSONATION_STARTED",
    "PLATFORM_SUSPENSION_ENABLED",
    "PLATFORM_SUSPENSION_REMOVED",
    "FREE_MONTHS_GRANTED",
    "FEATURE_FLAG_UPDATED",
    "STRIPE_RECONCILED",
    "TENANT_CREATED",
    "BOOKING_CREATED"
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Platform Audit Logs</h1>
        
        <form className="flex gap-2 w-full md:w-auto">
          <select 
            name="action"
            defaultValue={actionFilter}
            className="px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-sm text-neutral-300 focus:outline-none"
          >
            <option value="">All Actions</option>
            {commonActions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            <input 
              type="text" 
              name="q"
              defaultValue={q}
              placeholder="Search ID (Tenant, Actor, Entity)..." 
              className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-md text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Filter</button>
        </form>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-400">Timestamp</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Action</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Tenant / Actor</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Target Entity</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No logs found.</td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3 text-neutral-300 whitespace-nowrap">
                    {log.createdAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-neutral-200">{log.action}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                    <div title="Tenant ID">T: {log.tenantId}</div>
                    <div title="Actor ID">A: {log.actorId || 'system'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                    <div>{log.entityType}</div>
                    <div>{log.entityId}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500 max-w-xs truncate">
                    {log.metadata || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
            <div className="text-sm text-neutral-500">Page {page} of {totalPages}</div>
            <div className="space-x-2">
              {page > 1 && (
                <Link href={`/admin/audit?page=${page - 1}${q ? `&q=${q}` : ''}${actionFilter ? `&action=${actionFilter}` : ''}`} className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm hover:bg-neutral-800">
                  Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/audit?page=${page + 1}${q ? `&q=${q}` : ''}${actionFilter ? `&action=${actionFilter}` : ''}`} className="px-3 py-1 bg-neutral-900 border border-neutral-700 rounded text-sm hover:bg-neutral-800">
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

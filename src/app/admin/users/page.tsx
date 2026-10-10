import { prisma } from "@/lib/db/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { memberships: true }
      }
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Platform Users (Recent 50)</h1>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 border-b border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-400">User ID</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Name / Email</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Created</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Memberships</th>
                <th className="px-4 py-3 font-medium text-neutral-400">Platform Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-900/50">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{user.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-200">{user.email}</div>
                    <div className="text-neutral-400">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{user.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-neutral-400">{user._count.memberships} Tenants</td>
                  <td className="px-4 py-3">
                    {user.isSuperAdmin ? (
                      <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded text-xs font-medium">SUPER_ADMIN</span>
                    ) : (
                      <span className="text-neutral-500 text-xs">Standard</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

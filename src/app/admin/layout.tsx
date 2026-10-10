import { requireSuperAdmin } from "@/lib/auth/rbac";
import { ShieldAlert, Users, HardDrive, LayoutDashboard, Database, Activity } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireSuperAdmin();

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex flex-col md:flex-row font-sans">
      <aside className="w-full md:w-64 bg-neutral-950 border-r border-neutral-800 flex-shrink-0 flex flex-col">
        <div className="p-4 border-b border-neutral-800 flex items-center gap-2 text-indigo-400 font-bold">
          <ShieldAlert className="w-5 h-5" />
          Vela Platform Ops
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors text-sm">
            <LayoutDashboard className="w-4 h-4 text-neutral-400" />
            Dashboard
          </Link>
          <Link href="/admin/tenants" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors text-sm">
            <Database className="w-4 h-4 text-neutral-400" />
            Tenants
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors text-sm">
            <Users className="w-4 h-4 text-neutral-400" />
            Platform Users
          </Link>
          <Link href="/admin/audit" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors text-sm">
            <HardDrive className="w-4 h-4 text-neutral-400" />
            Audit Logs
          </Link>
          <Link href="/admin/system" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors text-sm">
            <Activity className="w-4 h-4 text-neutral-400" />
            System Health
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors text-sm mt-8 text-neutral-400">
            Exit Admin
          </Link>
        </nav>
        <div className="p-4 border-t border-neutral-800 text-xs text-neutral-500">
          Super Admin Privileges Active
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-neutral-900 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}

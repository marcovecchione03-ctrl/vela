import { prisma } from "@/lib/db/prisma";
import { calculatePlatformMetrics } from "@/lib/metrics";

export default async function AdminDashboardPage() {
  const metrics = await calculatePlatformMetrics();
  
  const totalCustomers = await prisma.customerProfile.count();
  const totalBookings = await prisma.booking.count();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBookings = await prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
  const totalLocations = await prisma.location.count({ where: { isActive: true } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Financial */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">MRR (Active)</div>
          <div className="text-3xl font-bold">€{(metrics.mrrCents / 100).toFixed(2)}</div>
        </div>
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">ARR (Active)</div>
          <div className="text-3xl font-bold">€{(metrics.arrCents / 100).toFixed(2)}</div>
        </div>
        
        {/* Tenants */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">Active Tenants</div>
          <div className="text-3xl font-bold text-emerald-400">{metrics.activeTenants}</div>
          <div className="text-xs text-neutral-500 mt-2">of {metrics.totalTenants} total</div>
        </div>
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">New Tenants (30d)</div>
          <div className="text-3xl font-bold">{metrics.newTenants}</div>
        </div>

        {/* Subscriptions */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">Plans Breakdown</div>
          <div className="flex justify-between mt-2">
            <div><span className="font-bold">{metrics.basicCount}</span> Basic</div>
            <div><span className="font-bold">{metrics.proCount}</span> Pro</div>
          </div>
        </div>
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">Interval Breakdown</div>
          <div className="flex justify-between mt-2">
            <div><span className="font-bold">{metrics.monthlyCount}</span> Monthly</div>
            <div><span className="font-bold">{metrics.annualCount}</span> Annual</div>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">Recent Bookings (30d)</div>
          <div className="text-3xl font-bold">{recentBookings}</div>
          <div className="text-xs text-neutral-500 mt-2">{totalBookings} total all time</div>
        </div>
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800">
          <div className="text-sm text-neutral-400 mb-1">End Customers</div>
          <div className="text-3xl font-bold">{totalCustomers}</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex justify-between items-center">
          <span className="text-neutral-400">Suspended Tenants</span>
          <span className="font-bold text-red-400">{metrics.suspendedTenants}</span>
        </div>
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex justify-between items-center">
          <span className="text-neutral-400">In Grace Period</span>
          <span className="font-bold text-orange-400">{metrics.graceTenants}</span>
        </div>
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex justify-between items-center">
          <span className="text-neutral-400">Churn Rate (30d)</span>
          <span className="font-bold text-neutral-200">{(metrics.churnRate * 100).toFixed(1)}%</span>
        </div>
        <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex justify-between items-center">
          <span className="text-neutral-400">Active Locations</span>
          <span className="font-bold">{totalLocations}</span>
        </div>
      </div>
    </div>
  );
}

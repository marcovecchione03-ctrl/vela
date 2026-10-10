import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { resolveEffectiveTenantStatus } from "@/lib/tenant/resolver";
import { ImpersonateButton, SuspendTenantButton, FreeMonthsForm, FeatureFlagToggle, SupportNoteForm, ReconcileButton } from "@/components/admin/TenantOperations";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminTenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id: resolvedParams.id },
    include: {
      subscription: true,
      domains: true,
      featureFlags: true,
      supportNotes: {
        orderBy: { createdAt: 'desc' }
      },
      memberships: {
        include: { user: true }
      },
      _count: {
        select: { locations: true, customers: true, bookings: true, employees: true }
      }
    }
  });

  if (!tenant) return notFound();

  const effectiveStatus = await resolveEffectiveTenantStatus(tenant.id);
  const primaryDomain = tenant.domains.find(d => d.isPrimary)?.hostname || 'None';
  
  const ownerMembership = tenant.memberships.find(m => m.role === 'OWNER');
  const owner = ownerMembership?.user;

  // Global feature flags
  const globalFlags = await prisma.featureFlagDefinition.findMany();

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/tenants" className="text-neutral-500 hover:text-neutral-300">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          effectiveStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
          effectiveStatus === 'PLATFORM_SUSPENDED' ? 'bg-red-500/10 text-red-400' :
          effectiveStatus === 'GRACE_PERIOD' ? 'bg-orange-500/10 text-orange-400' :
          'bg-neutral-800 text-neutral-400'
        }`}>
          {effectiveStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OVERVIEW */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-lg font-semibold border-b border-neutral-800 pb-2">Overview</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-neutral-500">Tenant ID</div>
            <div className="font-mono">{tenant.id}</div>
            
            <div className="text-neutral-500">Created</div>
            <div>{tenant.createdAt.toLocaleDateString()}</div>
            
            <div className="text-neutral-500">Owner</div>
            <div>{owner?.email || 'None'}</div>

            <div className="text-neutral-500">Primary Domain</div>
            <div>{primaryDomain}</div>
          </div>
        </div>

        {/* SUBSCRIPTION */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
            <h2 className="text-lg font-semibold">Subscription</h2>
            {tenant.subscription?.stripeSubscriptionId && <ReconcileButton tenantId={tenant.id} />}
          </div>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-neutral-500">Plan</div>
            <div>{tenant.subscription?.plan || 'NONE'}</div>
            
            <div className="text-neutral-500">Interval</div>
            <div>{tenant.subscription?.interval || '-'}</div>
            
            <div className="text-neutral-500">Status</div>
            <div>{tenant.subscription?.status || '-'}</div>

            <div className="text-neutral-500">Grace Ends</div>
            <div>{tenant.gracePeriodEndsAt ? tenant.gracePeriodEndsAt.toLocaleDateString() : '-'}</div>

            {tenant.subscription?.pendingPlan && (
              <>
                <div className="text-neutral-500">Pending Plan</div>
                <div>{tenant.subscription.pendingPlan} (on {tenant.subscription.pendingEffectiveAt?.toLocaleDateString()})</div>
              </>
            )}
          </div>
        </div>

        {/* USAGE */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-lg font-semibold border-b border-neutral-800 pb-2">Usage stats</h2>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-neutral-500">Locations</div>
            <div>{tenant._count.locations}</div>
            
            <div className="text-neutral-500">Employees</div>
            <div>{tenant._count.employees}</div>
            
            <div className="text-neutral-500">Customers</div>
            <div>{tenant._count.customers}</div>

            <div className="text-neutral-500">Bookings</div>
            <div>{tenant._count.bookings}</div>
          </div>
        </div>

        {/* IMPERSONATION & SUPPORT ACTIONS */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-lg font-semibold border-b border-neutral-800 pb-2">Support Actions</h2>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium mb-2">Impersonation</div>
              <div className="flex gap-2 flex-wrap">
                {tenant.memberships.filter(m => m.role === 'OWNER' || m.role === 'ADMIN').map(m => (
                  <ImpersonateButton key={m.id} userId={m.userId} tenantId={tenant.id} label={m.role} />
                ))}
              </div>
            </div>
            
            <div className="border-t border-neutral-800 pt-4">
              <div className="text-sm font-medium mb-2">Operational Suspension</div>
              <SuspendTenantButton tenantId={tenant.id} isSuspended={!!tenant.platformSuspendedAt} />
              {tenant.platformSuspensionReason && (
                <div className="text-xs text-red-400 mt-2">Reason: {tenant.platformSuspensionReason}</div>
              )}
            </div>

            <div className="border-t border-neutral-800 pt-4">
              <div className="text-sm font-medium mb-2">Service Entitlement Extension</div>
              <FreeMonthsForm tenantId={tenant.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FEATURE FLAGS */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-lg font-semibold border-b border-neutral-800 pb-2">Feature Flags</h2>
          <div className="space-y-2">
            {globalFlags.length === 0 ? (
              <div className="text-sm text-neutral-500">No global features defined.</div>
            ) : (
              globalFlags.map(flag => {
                const override = tenant.featureFlags.find(f => f.flagName === flag.flagName);
                return (
                  <FeatureFlagToggle 
                    key={flag.id}
                    tenantId={tenant.id}
                    flagName={flag.flagName}
                    globalDefault={flag.defaultOn}
                    isEnabled={override ? override.isEnabled : null}
                  />
                )
              })
            )}
          </div>
        </div>

        {/* SUPPORT NOTES */}
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-lg font-semibold border-b border-neutral-800 pb-2">Internal Support Notes</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {tenant.supportNotes.length === 0 && (
              <div className="text-sm text-neutral-500">No internal notes.</div>
            )}
            {tenant.supportNotes.map(note => (
              <div key={note.id} className="p-3 bg-neutral-900 rounded text-sm">
                <div className="text-xs text-neutral-500 mb-1">{note.createdAt.toLocaleDateString()}</div>
                <div className="text-neutral-300 whitespace-pre-wrap">{note.content}</div>
              </div>
            ))}
          </div>
          <SupportNoteForm tenantId={tenant.id} />
        </div>
      </div>
    </div>
  );
}

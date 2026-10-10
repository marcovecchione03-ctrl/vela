import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";

export default async function AdminSystemPage() {
  const checkEnv = (val: string | undefined) => val ? "Configured" : "Not Configured";

  const dbConfigured = checkEnv(process.env.DATABASE_URL);
  const stripeSecret = checkEnv(process.env.STRIPE_SECRET_KEY);
  const stripeWebhook = checkEnv(process.env.STRIPE_WEBHOOK_SECRET);
  const stripePrices = process.env.STRIPE_BASIC_MONTHLY_PRICE_ID && process.env.STRIPE_PRO_ANNUAL_PRICE_ID ? "Configured" : "Not Configured";
  const cronSecret = checkEnv(process.env.CRON_SECRET);
  const calKey = checkEnv(process.env.CALENDAR_ENCRYPTION_KEY);
  const google = checkEnv(process.env.GOOGLE_CLIENT_ID);
  const ms = checkEnv(process.env.MICROSOFT_CLIENT_ID);
  const vapid = checkEnv(process.env.VAPID_PUBLIC_KEY);
  const domain = checkEnv(process.env.NEXT_PUBLIC_APP_URL);

  const [
    syncPending, syncFailed,
    notifPending, notifFailed,
    webhookRecent, webhookFailed
  ] = await Promise.all([
    prisma.calendarSyncJob.count({ where: { status: 'PENDING' } }),
    prisma.calendarSyncJob.count({ where: { status: 'FAILED' } }),
    prisma.notificationJob.count({ where: { status: 'PENDING' } }),
    prisma.notificationJob.count({ where: { status: 'FAILED' } }),
    prisma.stripeWebhookEvent.count(),
    prisma.stripeWebhookEvent.count({ where: { status: 'FAILED' } })
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Health & Configuration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-lg font-semibold border-b border-neutral-800 pb-2">Environment Configuration</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Database</span>
              <span className="font-mono text-emerald-400">{dbConfigured}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Platform Domain</span>
              <span className="font-mono text-emerald-400">{domain}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Stripe Secret</span>
              <span className="font-mono text-emerald-400">{stripeSecret}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Stripe Webhook Secret</span>
              <span className="font-mono text-emerald-400">{stripeWebhook}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Stripe Price IDs</span>
              <span className="font-mono text-emerald-400">{stripePrices}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">CRON Secret</span>
              <span className="font-mono text-emerald-400">{cronSecret}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Calendar Encryption Key</span>
              <span className="font-mono text-emerald-400">{calKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Google Credentials</span>
              <span className="font-mono text-emerald-400">{google}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Microsoft Credentials</span>
              <span className="font-mono text-emerald-400">{ms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">VAPID Push Keys</span>
              <span className="font-mono text-emerald-400">{vapid}</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-950 p-6 rounded-xl border border-neutral-800 space-y-4">
          <h2 className="text-lg font-semibold border-b border-neutral-800 pb-2">Job Health</h2>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-neutral-900 rounded border border-neutral-800 flex justify-between">
              <div>
                <div className="font-medium">CalendarSyncJobs</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400">{syncPending} pending</div>
                <div className="text-red-400">{syncFailed} failed</div>
              </div>
            </div>
            
            <div className="p-3 bg-neutral-900 rounded border border-neutral-800 flex justify-between">
              <div>
                <div className="font-medium">NotificationJobs</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400">{notifPending} pending</div>
                <div className="text-red-400">{notifFailed} failed</div>
              </div>
            </div>
            
            <div className="p-3 bg-neutral-900 rounded border border-neutral-800 flex justify-between">
              <div>
                <div className="font-medium">StripeWebhookEvents</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-400">{webhookRecent} total</div>
                <div className="text-red-400">{webhookFailed} failed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

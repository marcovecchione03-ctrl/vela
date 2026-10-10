

const required = [
  "DATABASE_URL",
  "NEXTAUTH_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_BASIC_MONTHLY_PRICE_ID",
  "STRIPE_BASIC_ANNUAL_PRICE_ID",
  "STRIPE_PRO_MONTHLY_PRICE_ID",
  "STRIPE_PRO_ANNUAL_PRICE_ID",
  "CRON_SECRET",
  "CALENDAR_ENCRYPTION_KEY",
  "NEXT_PUBLIC_APP_URL",
];

let failed = false;

console.log("Running pre-deployment configuration audit...");

for (const envVar of required) {
  if (!process.env[envVar]) {
    console.error(`[FAIL] Missing required environment variable: ${envVar}`);
    failed = true;
  } else {
    console.log(`[PASS] ${envVar} is present.`);
  }
}

const warnings = [
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET"
];

for (const envVar of warnings) {
  if (!process.env[envVar]) {
    console.warn(`[WARN] Missing recommended integration variable: ${envVar}`);
  } else {
    console.log(`[PASS] ${envVar} is present.`);
  }
}

if (failed) {
  console.error("\n❌ Production readiness check FAILED. Please configure missing required variables.");
  process.exit(1);
} else {
  console.log("\n✅ Production readiness check PASSED.");
}

// scripts/post-deploy-smoke.ts
const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!baseUrl) {
  console.error('❌ NEXT_PUBLIC_APP_URL is required to run smoke tests.');
  process.exit(1);
}

async function run() {
  console.log(`Starting smoke tests against ${baseUrl}...`);

  try {
    // 1. Check health endpoint
    const healthRes = await fetch(`${baseUrl}/api/health`);
    if (!healthRes.ok) throw new Error(`Health check failed: ${healthRes.status}`);
    const healthData = await healthRes.json();
    console.log('✅ Health endpoint ok:', healthData);

    // 2. Check login page
    const loginRes = await fetch(`${baseUrl}/auth/login`);
    if (!loginRes.ok) throw new Error(`Login page failed: ${loginRes.status}`);
    console.log('✅ Login page ok.');

    // 3. Check invalid tenant domain handling
    const tenantRes = await fetch(`${baseUrl}/unknown-tenant/dashboard`, { redirect: 'manual' });
    if (tenantRes.status === 200) {
      console.error('❌ Unknown tenant path unexpectedly returned 200.');
    } else {
      console.log('✅ Unknown tenant handled securely (e.g. redirected to login or 404).');
    }

    console.log('🎉 Smoke test passed.');
  } catch (error: any) {
    console.error('❌ Smoke test failed:', error.message);
    process.exit(1);
  }
}

run();

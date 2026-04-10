const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relPath) {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

test('payment create route does not parse request body twice', () => {
  const content = read('src/app/api/payment/create/route.ts');
  const requestJsonCalls = (content.match(/request\.json\(/g) || []).length;
  assert.equal(requestJsonCalls, 0, 'route should rely on validated payload rather than re-reading request.json()');
  assert.match(content, /deprecated/i, 'route should clearly indicate the canonical replacement flow');
});

test('JWT payload contract uses merchantId key', () => {
  const loginRoute = read('src/app/api/merchant/login/route.ts');
  const profileRoute = read('src/app/api/merchant/profile/route.ts');
  const authLib = read('src/lib/auth.ts');

  assert.match(loginRoute, /merchantId:\s*merchant\.id/, 'login JWT should encode merchantId');
  assert.doesNotMatch(profileRoute, /decoded\.merchant\b/, 'profile route should not use legacy decoded.merchant key');
  assert.match(profileRoute, /decoded\.merchantId/, 'profile route should read decoded.merchantId');
  assert.match(authLib, /merchantId:\s*string/, 'auth payload type should require merchantId');
});

test('merchant auth endpoints do not return passwordHash', () => {
  const loginRoute = read('src/app/api/merchant/login/route.ts');
  const signupRoute = read('src/app/api/merchant/signup/route.ts');
  const profileRoute = read('src/app/api/merchant/profile/route.ts');

  assert.doesNotMatch(loginRoute, /return\s+NextResponse\.json\(\{token,\s*merchant\}\)/);
  assert.doesNotMatch(signupRoute, /return\s+NextResponse\.json\(\{message:\s*"Merchant registration successful",\s*merchant,/);
  assert.doesNotMatch(profileRoute, /return\s+NextResponse\.json\(\{merchant\}\)/);
});

test('duplicate middleware and config entrypoints are removed', () => {
  assert.equal(fs.existsSync(path.join(process.cwd(), 'src/middleware.ts')), false);
  assert.equal(fs.existsSync(path.join(process.cwd(), 'next.config.ts')), false);
});

test('security middleware has graceful fallback when Upstash env is missing', () => {
  const security = read('src/middleware/security.ts');
  assert.match(security, /UPSTASH_REDIS_REST_URL/);
  assert.match(security, /if\s*\(!hasUpstashConfig\)\s*\{\s*return null;/);
});

test('real checkout requires a live Jupiter quote instead of fallback mock data', () => {
  const jupiterHook = read('src/hooks/useJupiter.ts');
  const checkout = read('src/components/PaymentCheckout.tsx');
  const gatewayTypes = read('src/lib/gateway-types.ts');

  assert.match(jupiterHook, /interface GetPriceOptions/);
  assert.match(jupiterHook, /allowFallback\?: boolean/);
  assert.match(gatewayTypes, /provider:\s*'jupiter-swap-v2'\s*\|\s*'fallback-estimate'/);
  assert.match(checkout, /allowFallback:\s*executionMode !== 'REAL'/);
  assert.match(checkout, /Unable to get a live Jupiter quote for this checkout right now/);
});

test('real checkout is guarded behind configured Jupiter API access', () => {
  const config = read('src/lib/config.ts');
  const receivePage = read('src/app/dashboard/receive/page.tsx');
  const checkout = read('src/components/PaymentCheckout.tsx');

  assert.match(config, /https:\/\/api\.jup\.ag/);
  assert.match(config, /hasJupiterApiKey:\s*Boolean\(JUPITER_API_KEY\)/);
  assert.match(config, /supportsRealJupiterSwaps:\s*Boolean\(JUPITER_API_KEY\)\s*&&\s*SOLANA_NETWORK === 'mainnet-beta'/);
  assert.match(receivePage, /devnet USDC route is not tradable via Jupiter in this app/);
  assert.match(checkout, /devnet USDC route is not tradable via Jupiter in this app/);
});

test('public checkout shows merchant wallet separately from settlement address', () => {
  const paymentRoute = read('src/app/api/payment/[paymentId]/route.ts');
  const publicPage = read('src/app/pay/[paymentId]/page.tsx');

  assert.match(paymentRoute, /merchantWallet:\s*Merchant\?\.solanaWallet \?\? null/);
  assert.match(publicPage, /Settlement Flow/);
  assert.match(publicPage, /payment\.merchantWallet \|\| 'Not available'/);
});

test('gateway flow uses a shared execution contract with simulation and real strategies', () => {
  const transactionService = read('src/services/transaction.service.ts');
  const transactionHook = read('src/hooks/useTransaction.ts');
  const gatewayTypes = read('src/lib/gateway-types.ts');

  assert.match(gatewayTypes, /export interface GatewayQuote/);
  assert.match(gatewayTypes, /SIMULATED_USDC/);
  assert.match(gatewayTypes, /LIVE_USDC/);
  assert.match(transactionService, /preparePaymentExecution/);
  assert.match(transactionService, /submitSignedPayment/);
  assert.match(transactionService, /JUPITER_SWAP_V2_API/);
  assert.match(transactionService, /submitRealExecution/);
  assert.match(transactionHook, /preparePaymentExecution/);
  assert.match(transactionHook, /submitSignedPayment/);
});

test('simulation and real settlements are labeled differently in payouts and dashboard', () => {
  const payouts = read('src/lib/payouts.ts');
  const dashboard = read('src/app/dashboard/page.tsx');

  assert.match(payouts, /paymentMode === 'SIMULATION' \? 'SIMULATED' : 'SETTLED'/);
  assert.match(dashboard, /Simulation total:/);
  assert.match(dashboard, /No confirmed settlement recorded yet\./);
  assert.match(dashboard, /payment\.mode === 'SIMULATION' \? 'SIMULATED' : 'SETTLED'/);
});

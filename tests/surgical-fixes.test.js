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

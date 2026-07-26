import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, createPublicKey } from 'node:crypto';

test('RS256: tokens signed with the private key verify against the public key, and JWKS matches', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  process.env.JWT_ALG = 'RS256';
  process.env.JWT_PRIVATE_KEY = privateKey;
  process.env.JWT_PUBLIC_KEY = publicKey;
  process.env.JWT_KEY_ID = 'test-key-1';

  try {
    const { signAccessToken, verifyToken } = await import('../dist/utils/jwt.js');
    const { getJwks } = await import('../dist/utils/jwks.js');

    const token = signAccessToken({ sub: 42, role: 'USER' });
    const payload = verifyToken(token);
    assert.equal(payload.sub, 42);
    assert.equal(payload.role, 'USER');

    const jwks = getJwks();
    assert.equal(jwks.keys.length, 1);
    assert.equal(jwks.keys[0].kid, 'test-key-1');
    assert.equal(jwks.keys[0].kty, 'RSA');

    // Confirm the published JWK actually matches the signing key's modulus/exponent.
    const expectedJwk = createPublicKey(publicKey).export({ format: 'jwk' });
    assert.equal(jwks.keys[0].n, expectedJwk.n);
    assert.equal(jwks.keys[0].e, expectedJwk.e);
  } finally {
    delete process.env.JWT_ALG;
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;
    delete process.env.JWT_KEY_ID;
  }
});

test('JWKS is empty when JWT_ALG is not RS256', async () => {
  delete process.env.JWT_ALG;
  const { getJwks } = await import('../dist/utils/jwks.js');
  assert.deepEqual(getJwks(), { keys: [] });
});

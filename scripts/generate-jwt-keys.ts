import { exportJWK, generateKeyPair } from 'jose';

const { privateKey, publicKey } = await generateKeyPair('EdDSA', {
  crv: 'Ed25519',
  extractable: true,
});

const privateJwk = await exportJWK(privateKey);
const publicJwk = await exportJWK(publicKey);

console.log(`JWT_PRIVATE_KEY=${JSON.stringify(privateJwk)}`);
console.log(`JWT_PUBLIC_KEY=${JSON.stringify(publicJwk)}`);

import { type JWK, SignJWT, importJWK, jwtVerify } from 'jose';
import { env } from '../config/env';

const ISSUER = 'currency-exchange-api';

const privateKey = await importJWK(JSON.parse(env.JWT_PRIVATE_KEY) as JWK, 'EdDSA');
const publicKey = await importJWK(JSON.parse(env.JWT_PUBLIC_KEY) as JWK, 'EdDSA');

export type UserRole = 'client' | 'admin';

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(privateKey);
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ['EdDSA'],
    issuer: ISSUER,
  });

  return { sub: payload.sub as string, role: payload.role as UserRole };
}

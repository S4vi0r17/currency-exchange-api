import { importJWK, type JWK, jwtVerify, SignJWT } from 'jose';
import { env } from '../../config/env';
import type { UserRole } from '../../domain/entities/user.entity';
import type { AuthTokenPayload, TokenService } from '../../domain/ports/token-service.port';

const ISSUER = 'currency-exchange-api';

export class JoseTokenService implements TokenService {
  private readonly privateKeyPromise = importJWK(JSON.parse(env.JWT_PRIVATE_KEY) as JWK, 'EdDSA');
  private readonly publicKeyPromise = importJWK(JSON.parse(env.JWT_PUBLIC_KEY) as JWK, 'EdDSA');

  async sign(payload: AuthTokenPayload): Promise<string> {
    const privateKey = await this.privateKeyPromise;
    return new SignJWT({ role: payload.role })
      .setProtectedHeader({ alg: 'EdDSA' })
      .setSubject(payload.sub)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(env.JWT_EXPIRES_IN)
      .sign(privateKey);
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    const publicKey = await this.publicKeyPromise;
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ['EdDSA'],
      issuer: ISSUER,
    });
    return { sub: payload.sub as string, role: payload.role as UserRole };
  }
}

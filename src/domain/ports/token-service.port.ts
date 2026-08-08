import type { UserRole } from '../entities/user.entity';

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
}

export interface TokenService {
  sign(payload: AuthTokenPayload): Promise<string>;
  verify(token: string): Promise<AuthTokenPayload>;
}

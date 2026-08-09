// SECURITY: Argon2id (recomendación OWASP)
import type { PasswordHasher } from '@/domain/ports/password-hasher.port';

export class BunPasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return Bun.password.hash(plainPassword, { algorithm: 'argon2id' });
  }

  async verify(plainPassword: string, storedHash: string): Promise<boolean> {
    return Bun.password.verify(plainPassword, storedHash);
  }
}

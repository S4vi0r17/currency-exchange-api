// SECURITY: Argon2id por defecto (recomendación OWASP), resiste mejor GPU/ASIC que bcrypt
import { hash, verify } from '@node-rs/argon2';
import type { PasswordHasher } from '@/domain/ports/password-hasher.port';

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return hash(plainPassword);
  }

  async verify(plainPassword: string, storedHash: string): Promise<boolean> {
    return verify(storedHash, plainPassword);
  }
}

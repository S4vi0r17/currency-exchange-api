// SECURITY: @node-rs/argon2 usa Argon2id por defecto (recomendación actual de OWASP)
import { hash, verify } from '@node-rs/argon2';

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword);
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  return verify(storedHash, plainPassword);
}

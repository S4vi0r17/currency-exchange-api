export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, storedHash: string): Promise<boolean>;
}

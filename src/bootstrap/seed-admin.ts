import { env } from '../config/env';
import { UserModel } from '../models/user.model';
import { hashPassword } from '../security/password';

// WHY: nos ahorra el endpoint público de "hazte admin" 
export async function seedAdminUser(): Promise<void> {
  const existing = await UserModel.findOne({ email: env.ADMIN_SEED_EMAIL });
  if (existing) return;

  const passwordHash = await hashPassword(env.ADMIN_SEED_PASSWORD);
  await UserModel.create({ email: env.ADMIN_SEED_EMAIL, passwordHash, role: 'admin' });
  console.log(`› Seeded admin user: ${env.ADMIN_SEED_EMAIL}`);
}

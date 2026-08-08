import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export class SeedAdminUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(email: string, password: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email);
    if (existing) return;

    const passwordHash = await this.passwordHasher.hash(password);
    await this.userRepository.save({ email, passwordHash, role: 'admin' });
    console.log(`› Seeded admin user: ${email}`);
  }
}

import type { User } from '../../domain/entities/user.entity';
import { UserAlreadyExistsError } from '../../domain/errors/domain-errors';
import type { EmailSender } from '../../domain/ports/email-sender.port';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import type { TokenService } from '../../domain/ports/token-service.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export interface RegisterUserInput {
  email: string;
  password: string;
}

export interface RegisterUserOutput {
  user: User;
  token: string;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly emailSender: EmailSender,
  ) {}

  async execute(input: RegisterUserInput): Promise<RegisterUserOutput> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new UserAlreadyExistsError(input.email);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.userRepository.save({
      email: input.email,
      passwordHash,
      role: 'client',
    });

    // WHY: no bloqueamos el registro si el envío de correo falla (ej. proveedor caído)
    this.emailSender.sendWelcomeEmail(user.email).catch((error: unknown) => {
      console.error('✗ Failed to send welcome email:', error);
    });

    const token = await this.tokenService.sign({ sub: user.id, role: user.role });

    return { user, token };
  }
}

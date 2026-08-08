import { InvalidCredentialsError } from '../../domain/errors/domain-errors';
import type { PasswordHasher } from '../../domain/ports/password-hasher.port';
import type { TokenService } from '../../domain/ports/token-service.port';
import type { UserRepository } from '../../domain/ports/user-repository.port';

export interface LoginUserInput {
  email: string;
  password: string;
}

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(input: LoginUserInput): Promise<{ token: string }> {
    const user = await this.userRepository.findByEmail(input.email);

    // SECURITY: mismo error exista o no el usuario, para no filtrar qué emails están registrados.
    if (!user || !(await this.passwordHasher.verify(input.password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }

    const token = await this.tokenService.sign({ sub: user.id, role: user.role });
    return { token };
  }
}

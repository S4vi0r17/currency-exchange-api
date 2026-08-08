import { describe, expect, it } from 'bun:test';
import { LoginUserUseCase } from '@/application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '@/application/use-cases/register-user.use-case';
import { SeedAdminUserUseCase } from '@/application/use-cases/seed-admin-user.use-case';
import type { User } from '@/domain/entities/user.entity';
import { InvalidCredentialsError, UserAlreadyExistsError } from '@/domain/errors/domain-errors';
import type { EmailSender } from '@/domain/ports/email-sender.port';
import type { PasswordHasher } from '@/domain/ports/password-hasher.port';
import type { AuthTokenPayload, TokenService } from '@/domain/ports/token-service.port';
import type { UserRepository } from '@/domain/ports/user-repository.port';

// --- fakes: cada uno es una implementación real y simple del puerto, no un mock pesado ---

class FakeUserRepository implements UserRepository {
  public saved: Omit<User, 'id' | 'createdAt'>[] = [];
  private users: User[];

  constructor(seed: User[] = []) {
    this.users = [...seed];
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }

  async save(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    this.saved.push(user);
    const created: User = { id: `user-${this.users.length + 1}`, createdAt: new Date(), ...user };
    this.users.push(created);
    return created;
  }
}

// NOTE: hash "falso" pero coherente (verify solo pasa si es el mismo plain) -- no probamos
class FakePasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return `hashed:${plainPassword}`;
  }

  async verify(plainPassword: string, storedHash: string): Promise<boolean> {
    return storedHash === `hashed:${plainPassword}`;
  }
}

class FakeTokenService implements TokenService {
  async sign(payload: AuthTokenPayload): Promise<string> {
    return `token:${payload.sub}:${payload.role}`;
  }

  async verify(token: string): Promise<AuthTokenPayload> {
    const [, sub, role] = token.split(':');
    return { sub: sub ?? '', role: (role as AuthTokenPayload['role']) ?? 'client' };
  }
}

class FakeEmailSender implements EmailSender {
  public sentTo: string[] = [];
  constructor(private readonly shouldFail = false) {}

  async sendWelcomeEmail(to: string): Promise<void> {
    this.sentTo.push(to);
    if (this.shouldFail) throw new Error('smtp down');
  }
}

describe('RegisterUserUseCase', () => {
  it('creates the user, sends a welcome email, and returns a token', async () => {
    const userRepository = new FakeUserRepository();
    const emailSender = new FakeEmailSender();
    const useCase = new RegisterUserUseCase(
      userRepository,
      new FakePasswordHasher(),
      new FakeTokenService(),
      emailSender,
    );

    const result = await useCase.execute({ email: 'test@example.com', password: 'supersecret' });

    expect(result.user.email).toBe('test@example.com');
    expect(result.user.role).toBe('client');
    expect(result.token).toBe(`token:${result.user.id}:client`);
    expect(userRepository.saved).toHaveLength(1);
    expect(emailSender.sentTo).toEqual(['test@example.com']);
  });

  it('throws UserAlreadyExistsError if the email is already registered', async () => {
    const existing: User = {
      id: 'u1',
      email: 'test@example.com',
      passwordHash: 'x',
      role: 'client',
      createdAt: new Date(),
    };
    const useCase = new RegisterUserUseCase(
      new FakeUserRepository([existing]),
      new FakePasswordHasher(),
      new FakeTokenService(),
      new FakeEmailSender(),
    );

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'supersecret' }),
    ).rejects.toBeInstanceOf(UserAlreadyExistsError);
  });

  it('does not block registration if sending the welcome email fails', async () => {
    const useCase = new RegisterUserUseCase(
      new FakeUserRepository(),
      new FakePasswordHasher(),
      new FakeTokenService(),
      new FakeEmailSender(true),
    );

    const result = await useCase.execute({ email: 'test@example.com', password: 'supersecret' });

    expect(result.token).toContain('token:');
  });
});

describe('LoginUserUseCase', () => {
  it('returns a token when the credentials are valid', async () => {
    const passwordHasher = new FakePasswordHasher();
    const existing: User = {
      id: 'u1',
      email: 'test@example.com',
      passwordHash: await passwordHasher.hash('supersecret'),
      role: 'client',
      createdAt: new Date(),
    };
    const useCase = new LoginUserUseCase(
      new FakeUserRepository([existing]),
      passwordHasher,
      new FakeTokenService(),
    );

    const result = await useCase.execute({ email: 'test@example.com', password: 'supersecret' });

    expect(result.token).toBe('token:u1:client');
  });

  it('throws InvalidCredentialsError with the wrong password', async () => {
    const passwordHasher = new FakePasswordHasher();
    const existing: User = {
      id: 'u1',
      email: 'test@example.com',
      passwordHash: await passwordHasher.hash('supersecret'),
      role: 'client',
      createdAt: new Date(),
    };
    const useCase = new LoginUserUseCase(
      new FakeUserRepository([existing]),
      passwordHasher,
      new FakeTokenService(),
    );

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('throws the SAME error for a nonexistent email (no filtra qué emails existen)', async () => {
    const useCase = new LoginUserUseCase(
      new FakeUserRepository(),
      new FakePasswordHasher(),
      new FakeTokenService(),
    );

    await expect(
      useCase.execute({ email: 'ghost@example.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});

describe('SeedAdminUserUseCase', () => {
  it('creates the admin user when it does not exist yet', async () => {
    const userRepository = new FakeUserRepository();
    const useCase = new SeedAdminUserUseCase(userRepository, new FakePasswordHasher());

    await useCase.execute('admin@example.com', 'change-me-please');

    expect(userRepository.saved).toHaveLength(1);
    expect(userRepository.saved[0]?.role).toBe('admin');
  });

  it('is idempotent: does nothing if the admin already exists', async () => {
    const existing: User = {
      id: 'admin-1',
      email: 'admin@example.com',
      passwordHash: 'x',
      role: 'admin',
      createdAt: new Date(),
    };
    const userRepository = new FakeUserRepository([existing]);
    const useCase = new SeedAdminUserUseCase(userRepository, new FakePasswordHasher());

    await useCase.execute('admin@example.com', 'change-me-please');

    expect(userRepository.saved).toHaveLength(0);
  });
});

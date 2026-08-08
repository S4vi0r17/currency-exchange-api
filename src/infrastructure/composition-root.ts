// WHY: wiring manual, sin librería de DI
import { CreateExchangeRateUseCase } from '../application/use-cases/create-exchange-rate.use-case';
import { CreateExchangeRequestUseCase } from '../application/use-cases/create-exchange-request.use-case';
import { DeleteExchangeRequestUseCase } from '../application/use-cases/delete-exchange-request.use-case';
import { GetExchangeRequestUseCase } from '../application/use-cases/get-exchange-request.use-case';
import { ListExchangeRatesUseCase } from '../application/use-cases/list-exchange-rates.use-case';
import { ListExchangeRequestsUseCase } from '../application/use-cases/list-exchange-requests.use-case';
import { LoginUserUseCase } from '../application/use-cases/login-user.use-case';
import { RegisterUserUseCase } from '../application/use-cases/register-user.use-case';
import { SeedAdminUserUseCase } from '../application/use-cases/seed-admin-user.use-case';
import { env } from '../config/env';
import { MongoExchangeRateRepository } from './db/repositories/mongo-exchange-rate.repository';
import { MongoExchangeRequestRepository } from './db/repositories/mongo-exchange-request.repository';
import { MongoUserRepository } from './db/repositories/mongo-user.repository';
import { ResendEmailSender } from './email/resend-email-sender';
import { SmtpEmailSender } from './email/smtp-email-sender';
import { HttpRateProvider } from './external/http-rate-provider';
import { Argon2PasswordHasher } from './security/argon2-password-hasher';
import { JoseTokenService } from './security/jose-token.service';
import { createAuthMiddleware } from './web/middlewares/auth.middleware';
import { createAuthRoutes } from './web/routes/auth.routes';
import { createExchangeRequestRoutes } from './web/routes/exchange-requests.routes';
import { createRateRoutes } from './web/routes/rates.routes';

// --- adapters secundarios (implementan puertos del dominio) ---
const userRepository = new MongoUserRepository();
const exchangeRateRepository = new MongoExchangeRateRepository();
const exchangeRequestRepository = new MongoExchangeRequestRepository();
const passwordHasher = new Argon2PasswordHasher();
const tokenService = new JoseTokenService();
const rateProvider = new HttpRateProvider();

// NOTE: Resend si hay API key configurada, Mailhog/SMTP por defecto (decisión del Paso 3)
const emailSender = env.RESEND_API_KEY
  ? new ResendEmailSender(env.RESEND_API_KEY)
  : new SmtpEmailSender();

// --- casos de uso (application) ---
const useCases = {
  registerUser: new RegisterUserUseCase(userRepository, passwordHasher, tokenService, emailSender),
  loginUser: new LoginUserUseCase(userRepository, passwordHasher, tokenService),
  seedAdminUser: new SeedAdminUserUseCase(userRepository, passwordHasher),
  createExchangeRate: new CreateExchangeRateUseCase(exchangeRateRepository),
  listExchangeRates: new ListExchangeRatesUseCase(exchangeRateRepository),
  createExchangeRequest: new CreateExchangeRequestUseCase(exchangeRequestRepository, rateProvider),
  listExchangeRequests: new ListExchangeRequestsUseCase(exchangeRequestRepository),
  getExchangeRequest: new GetExchangeRequestUseCase(exchangeRequestRepository),
  deleteExchangeRequest: new DeleteExchangeRequestUseCase(exchangeRequestRepository),
};

// --- adapter primario (Web/Hono) ---
const authMiddleware = createAuthMiddleware(tokenService);

export const container = {
  useCases,
  routes: {
    auth: createAuthRoutes(useCases),
    rates: createRateRoutes({ authMiddleware, useCases }),
    exchangeRequests: createExchangeRequestRoutes({ authMiddleware, useCases }),
  },
};

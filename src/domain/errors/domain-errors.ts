export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists`);
    this.name = 'UserAlreadyExistsError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super('Invalid email or password');
    this.name = 'InvalidCredentialsError';
  }
}

export class ExchangeRateProviderUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Exchange rate provider is unavailable, try again later');
    this.name = 'ExchangeRateProviderUnavailableError';
    this.cause = cause;
  }
}

export class ExchangeRequestNotFoundError extends Error {
  constructor() {
    super('Exchange request not found');
    this.name = 'ExchangeRequestNotFoundError';
  }
}

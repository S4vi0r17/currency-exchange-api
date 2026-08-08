import type { UserRole } from '../security/token';

// NOTE: variables que el auth middleware deja en el contexto de Hono
export type AppEnv = {
  Variables: {
    userId: string;
    userRole: UserRole;
  };
};

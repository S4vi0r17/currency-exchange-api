export type UserRole = 'client' | 'admin';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
}

import type { User } from '../entities/user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(user: Omit<User, 'id' | 'createdAt'>): Promise<User>;
}

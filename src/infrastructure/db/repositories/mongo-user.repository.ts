import type { User } from '../../../domain/entities/user.entity';
import type { UserRepository } from '../../../domain/ports/user-repository.port';
import { type UserDocument, UserModel } from '../models/user.model';

function toDomain(doc: UserDocument & { _id: { toString(): string } }): User {
  return {
    id: doc._id.toString(),
    email: doc.email,
    passwordHash: doc.passwordHash,
    role: doc.role,
    createdAt: doc.createdAt,
  };
}

export class MongoUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email });
    return doc ? toDomain(doc) : null;
  }

  async save(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const doc = await UserModel.create(user);
    return toDomain(doc);
  }
}

import { model, Schema } from 'mongoose';

export interface UserDocument {
  email: string;
  passwordHash: string;
  role: 'client' | 'admin';
  createdAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['client', 'admin'], default: 'client' },
  },
  { timestamps: true },
);

export const UserModel = model<UserDocument>('User', userSchema);

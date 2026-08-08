import mongoose from 'mongoose';
import { env } from './config/env';

export async function connectToDatabase(): Promise<void> {
  await mongoose.connect(env.MONGO_URI);
}

export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
}

// NOTE: readyState 1 = connected. Se usa para el healthcheck
export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

import nodemailer from 'nodemailer';
import { env } from '../config/env';

// NOTE: actual Mailhog en docker-compose (sin TLS, sin auth)
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

export async function sendWelcomeEmail(to: string): Promise<void> {
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Welcome to Currency Exchange',
    text: `Welcome! Your account (${to}) was created successfully.`,
  });
}

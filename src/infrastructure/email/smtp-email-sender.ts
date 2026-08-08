import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import type { EmailSender } from '../../domain/ports/email-sender.port';

// NOTE: apunta a Mailhog en dev/docker-compose (sin TLS, sin auth) -- adapter por defecto
export class SmtpEmailSender implements EmailSender {
  private readonly transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
  });

  async sendWelcomeEmail(to: string): Promise<void> {
    await this.transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject: 'Welcome to Currency Exchange',
      text: `Welcome! Your account (${to}) was created successfully.`,
    });
  }
}

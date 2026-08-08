import { env } from '@/config/env';
import type { EmailSender } from '@/domain/ports/email-sender.port';

// NOTE: adapter alternativo -- se activa solo si RESEND_API_KEY está seteado
export class ResendEmailSender implements EmailSender {
  constructor(private readonly apiKey: string) {}

  async sendWelcomeEmail(to: string): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.SMTP_FROM,
        to,
        subject: 'Welcome to Currency Exchange',
        text: `Welcome! Your account (${to}) was created successfully.`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API responded with status ${response.status}`);
    }
  }
}

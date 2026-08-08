export interface EmailSender {
  sendWelcomeEmail(to: string): Promise<void>;
}

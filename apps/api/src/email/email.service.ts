import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { magicLinkEmailHtml } from './templates/magic-link';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly appUrl: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
    this.from = config.getOrThrow<string>('RESEND_FROM_EMAIL');
    this.appUrl = config.getOrThrow<string>('APP_URL');
  }

  async sendMagicLinkEmail(to: string, name: string | null, token: string): Promise<void> {
    const url = `${this.appUrl}/auth/magic?token=${token}`;
    const html = magicLinkEmailHtml(name, url);

    const maxAttempts = 3;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { error } = await this.resend.emails.send({
          from: this.from,
          to,
          subject: 'Your sign-in link — ZenFocus',
          html,
        });

        if (!error) return;
        lastError = error.message;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      if (attempt < maxAttempts) {
        const delayMs = 250 * 2 ** (attempt - 1);
        this.logger.warn(
          `Magic link send attempt ${attempt}/${maxAttempts} for ${to} failed: ${lastError}. Retrying in ${delayMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.logger.error(`Failed to send magic link email to ${to}: ${lastError}`);
    throw new Error(`Failed to send magic link email: ${lastError}`);
  }
}

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

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Your sign-in link — ZenFocus',
      html,
    });

    if (error) {
      this.logger.error(`Failed to send magic link email to ${to}: ${error.message}`);
      throw new Error(`Failed to send magic link email: ${error.message}`);
    }
  }
}

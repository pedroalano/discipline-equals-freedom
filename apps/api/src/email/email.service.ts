import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { verificationEmailHtml } from './templates/verification';
import { passwordResetEmailHtml } from './templates/password-reset';

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

  async sendVerificationEmail(to: string, name: string | null, token: string): Promise<void> {
    const url = `${this.appUrl}/verify-email?token=${token}`;
    const html = verificationEmailHtml(name, url);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Verify your email — ZenFocus',
      html,
    });

    if (error) {
      this.logger.error(`Failed to send verification email to ${to}: ${error.message}`);
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  async sendPasswordResetEmail(to: string, name: string | null, token: string): Promise<void> {
    const url = `${this.appUrl}/reset-password?token=${token}`;
    const html = passwordResetEmailHtml(name, url);

    const { error } = await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Reset your password — ZenFocus',
      html,
    });

    if (error) {
      this.logger.error(`Failed to send password reset email to ${to}: ${error.message}`);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }
}

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';

const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockSend },
  })),
}));

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config: Record<string, string> = {
                RESEND_API_KEY: 're_test_key',
                RESEND_FROM_EMAIL: 'ZenFocus <noreply@test.com>',
                APP_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(EmailService);
    jest.clearAllMocks();
  });

  describe('sendVerificationEmail', () => {
    it('sends email with correct subject and verification URL', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

      await service.sendVerificationEmail('user@example.com', 'Test', 'abc123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'ZenFocus <noreply@test.com>',
          to: 'user@example.com',
          subject: 'Verify your email — ZenFocus',
        }),
      );

      const call = mockSend.mock.calls[0] as [{ html: string }];
      expect(call[0].html).toContain('http://localhost:3000/verify-email?token=abc123');
    });

    it('throws when Resend returns an error', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

      await expect(
        service.sendVerificationEmail('user@example.com', null, 'token'),
      ).rejects.toThrow('Failed to send verification email');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends email with correct subject and reset URL', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-2' }, error: null });

      await service.sendPasswordResetEmail('user@example.com', 'Test', 'def456');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Reset your password — ZenFocus',
        }),
      );

      const call = mockSend.mock.calls[0] as [{ html: string }];
      expect(call[0].html).toContain('http://localhost:3000/reset-password?token=def456');
    });
  });
});

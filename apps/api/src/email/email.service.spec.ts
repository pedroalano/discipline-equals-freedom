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

  describe('sendMagicLinkEmail', () => {
    it('sends email with correct subject and magic-link URL', async () => {
      mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });

      await service.sendMagicLinkEmail('user@example.com', 'Test', 'abc123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'ZenFocus <noreply@test.com>',
          to: 'user@example.com',
          subject: 'Your sign-in link — ZenFocus',
        }),
      );

      const call = mockSend.mock.calls[0] as [{ html: string }];
      expect(call[0].html).toContain('http://localhost:3000/auth/magic?token=abc123');
    });

    it('throws when Resend returns an error', async () => {
      mockSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

      await expect(service.sendMagicLinkEmail('user@example.com', null, 'token')).rejects.toThrow(
        'Failed to send magic link email',
      );
    });
  });
});

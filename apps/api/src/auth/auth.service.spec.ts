import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

const mockUsers = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  markEmailVerified: jest.fn(),
};

const mockJwt = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockConfig = {
  getOrThrow: jest.fn(),
};

const mockRedis = {
  scan: jest.fn(),
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockEmail = {
  sendMagicLinkEmail: jest.fn(),
};

const now = new Date('2026-01-01T00:00:00Z');

function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    emailVerified: false,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
    lastCarryOverDate: null,
    ...overrides,
  };
}

function sha256(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsers },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService, useValue: mockEmail },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    mockConfig.getOrThrow.mockReturnValue('test-secret');
    mockJwt.sign.mockReturnValue('mock-token');
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
    mockRedis.get.mockResolvedValue(null);
    mockEmail.sendMagicLinkEmail.mockResolvedValue(undefined);
  });

  // ── requestMagicLink ────────────────────────────────────────────────────────

  describe('requestMagicLink', () => {
    it('creates user when email not found and sends magic link', async () => {
      mockUsers.findByEmail.mockResolvedValue(null);
      mockUsers.create.mockResolvedValue(makeUser());

      const res = await service.requestMagicLink('new@example.com');

      expect(res.message).toMatch(/sign-in link/i);
      expect(mockUsers.create).toHaveBeenCalledWith('new@example.com');
      expect(mockEmail.sendMagicLinkEmail).toHaveBeenCalledTimes(1);
      // magicLink:<hash> + magicLink:cooldown:<email>
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
    });

    it('uses existing user when email exists', async () => {
      mockUsers.findByEmail.mockResolvedValue(makeUser());

      await service.requestMagicLink('user@example.com');

      expect(mockUsers.create).not.toHaveBeenCalled();
      expect(mockEmail.sendMagicLinkEmail).toHaveBeenCalledTimes(1);
    });

    it('skips send when cooldown active', async () => {
      mockRedis.get.mockResolvedValueOnce('1');

      await service.requestMagicLink('user@example.com');

      expect(mockUsers.findByEmail).not.toHaveBeenCalled();
      expect(mockEmail.sendMagicLinkEmail).not.toHaveBeenCalled();
    });
  });

  // ── verifyMagicLink ─────────────────────────────────────────────────────────

  describe('verifyMagicLink', () => {
    it('returns AuthResponse and marks email verified on first use', async () => {
      const token = 'rawtoken';
      mockRedis.get.mockImplementation((key: string) =>
        key === `magicLink:${sha256(token)}` ? Promise.resolve('user-1') : Promise.resolve(null),
      );
      mockUsers.findById.mockResolvedValue(makeUser({ emailVerified: false }));
      mockJwt.sign.mockReturnValueOnce('access').mockReturnValueOnce('refresh');

      const res = await service.verifyMagicLink(token);

      expect(res.accessToken).toBe('access');
      expect(res.refreshToken).toBe('refresh');
      expect(res.user.emailVerified).toBe(true);
      expect(mockUsers.markEmailVerified).toHaveBeenCalledWith('user-1');
      expect(mockRedis.del).toHaveBeenCalledWith(`magicLink:${sha256(token)}`);
    });

    it('does not re-mark verified user', async () => {
      const token = 'rawtoken';
      mockRedis.get.mockResolvedValue('user-1');
      mockUsers.findById.mockResolvedValue(makeUser({ emailVerified: true }));
      mockJwt.sign.mockReturnValue('tok');

      await service.verifyMagicLink(token);

      expect(mockUsers.markEmailVerified).not.toHaveBeenCalled();
    });

    it('throws Unauthorized for invalid token', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.verifyMagicLink('bad')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when token consumed twice (single-use)', async () => {
      const token = 'once';
      mockRedis.get
        .mockResolvedValueOnce('user-1') // first verify
        .mockResolvedValueOnce(null); // second verify
      mockUsers.findById.mockResolvedValue(makeUser({ emailVerified: true }));
      mockJwt.sign.mockReturnValue('tok');

      await service.verifyMagicLink(token);
      await expect(service.verifyMagicLink(token)).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequest when user no longer exists', async () => {
      mockRedis.get.mockResolvedValue('user-1');
      mockUsers.findById.mockResolvedValue(null);

      await expect(service.verifyMagicLink('tok')).rejects.toThrow(BadRequestException);
    });
  });

  // ── refreshTokens ────────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('throws when refresh token verify fails', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('bad');
      });

      await expect(service.refreshTokens('bad')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when stored hash missing', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-1', tokenId: 'tid' });
      mockRedis.get.mockResolvedValue(null);

      await expect(service.refreshTokens('rt')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('purges all refresh tokens for user', async () => {
      mockRedis.scan.mockResolvedValue(['0', ['refreshToken:user-1:a', 'refreshToken:user-1:b']]);

      await service.logout('user-1');

      expect(mockRedis.del).toHaveBeenCalledWith('refreshToken:user-1:a', 'refreshToken:user-1:b');
    });

    it('no-ops when no tokens stored', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      await service.logout('user-1');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });
});

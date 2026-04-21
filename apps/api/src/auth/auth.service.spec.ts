import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

const mockUsers = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  markEmailVerified: jest.fn(),
  updatePasswordHash: jest.fn(),
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
  incr: jest.fn(),
  expire: jest.fn(),
};

const mockEmail = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

const now = new Date('2026-01-01T00:00:00Z');

function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: '',
    name: 'Test User',
    emailVerified: false,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
    lastCarryOverDate: null,
    ...overrides,
  };
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
    mockRedis.incr.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
    mockEmail.sendVerificationEmail.mockResolvedValue(undefined);
    mockEmail.sendPasswordResetEmail.mockResolvedValue(undefined);
  });

  // ── Register ─────────────────────────────────────────────────────────────────

  describe('register', () => {
    it('returns AuthResponse and sends verification email', async () => {
      mockUsers.findByEmail.mockResolvedValue(null);
      mockUsers.create.mockResolvedValue(makeUser());
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.register({ email: 'user@example.com', password: 'Password1' });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.emailVerified).toBe(false);
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when email is already in use', async () => {
      mockUsers.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: 'user@example.com', password: 'Password1' }),
      ).rejects.toThrow(ConflictException);
    });

    it('stores a bcrypt hash, never the plaintext password', async () => {
      mockUsers.findByEmail.mockResolvedValue(null);
      mockUsers.create.mockResolvedValue(makeUser());

      await service.register({ email: 'user@example.com', password: 'Plaintext1' });

      const [, passwordHash] = mockUsers.create.mock.calls[0] as [string, string];
      expect(passwordHash).not.toBe('Plaintext1');
      const matches = await bcrypt.compare('Plaintext1', passwordHash);
      expect(matches).toBe(true);
    });
  });

  // ── Login ────────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns AuthResponse with token pair on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('Password123', 1);
      mockUsers.findByEmail.mockResolvedValue(makeUser({ passwordHash, emailVerified: true }));
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login({ email: 'user@example.com', password: 'Password123' });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe('user-1');
    });

    it('throws UnauthorizedException when user is not found', async () => {
      mockUsers.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@example.com', password: 'Password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password does not match', async () => {
      const passwordHash = await bcrypt.hash('correctpassword', 1);
      mockUsers.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      await expect(
        service.login({ email: 'user@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('stores refresh token hash in Redis with a 7-day TTL', async () => {
      const passwordHash = await bcrypt.hash('Password123', 1);
      mockUsers.findByEmail.mockResolvedValue(makeUser({ passwordHash }));
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      await service.login({ email: 'user@example.com', password: 'Password123' });

      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      const [key, , ex, ttl] = mockRedis.set.mock.calls[0] as [string, string, string, number];
      expect(key).toMatch(/^refreshToken:user-1:/);
      expect(ex).toBe('EX');
      expect(ttl).toBe(7 * 24 * 60 * 60);
    });

    it('records failed login attempt on wrong credentials', async () => {
      mockUsers.findByEmail.mockResolvedValue(null);

      await expect(service.login({ email: 'user@example.com', password: 'wrong' })).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockRedis.incr).toHaveBeenCalledWith('loginAttempts:user@example.com');
    });

    it('clears login attempts on successful login', async () => {
      const passwordHash = await bcrypt.hash('Password123', 1);
      mockUsers.findByEmail.mockResolvedValue(makeUser({ passwordHash }));

      await service.login({ email: 'user@example.com', password: 'Password123' });

      expect(mockRedis.del).toHaveBeenCalledWith('loginAttempts:user@example.com');
    });

    it('throws 429 when login attempts exceed max', async () => {
      mockRedis.get.mockResolvedValue('5');

      await expect(service.login({ email: 'user@example.com', password: 'any' })).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.TOO_MANY_REQUESTS,
        }),
      );
    });
  });

  // ── Logout ───────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('scans Redis with the correct user-scoped pattern', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      await service.logout('user-1');

      expect(mockRedis.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        'refreshToken:user-1:*',
        'COUNT',
        100,
      );
    });

    it('deletes all found keys from Redis', async () => {
      mockRedis.scan.mockResolvedValue([
        '0',
        ['refreshToken:user-1:abc', 'refreshToken:user-1:def'],
      ]);

      await service.logout('user-1');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'refreshToken:user-1:abc',
        'refreshToken:user-1:def',
      );
    });

    it('does not call del when no keys are found', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);

      await service.logout('user-1');

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('continues scanning until cursor returns to 0', async () => {
      mockRedis.scan
        .mockResolvedValueOnce(['next-cursor', ['key1']])
        .mockResolvedValueOnce(['0', ['key2']]);

      await service.logout('user-1');

      expect(mockRedis.scan).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2');
    });
  });

  // ── Refresh ──────────────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    it('returns a new AuthResponse and rotates the stored token', async () => {
      const testToken = 'valid-refresh-token';
      const storedHash = await bcrypt.hash(testToken, 1);
      mockJwt.verify.mockReturnValue({ sub: 'user-1', tokenId: 'token-id-1' });
      mockRedis.get.mockResolvedValue(storedHash);
      mockUsers.findById.mockResolvedValue(makeUser({ emailVerified: true }));
      mockJwt.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');

      const result = await service.refreshTokens(testToken);

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
      expect(mockRedis.del).toHaveBeenCalledWith('refreshToken:user-1:token-id-1');
    });

    it('throws UnauthorizedException when the JWT signature is invalid', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.refreshTokens('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token has been revoked (not in Redis)', async () => {
      mockJwt.verify.mockReturnValue({ sub: 'user-1', tokenId: 'token-id-1' });
      mockRedis.get.mockResolvedValue(null);

      await expect(service.refreshTokens('some-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the stored hash does not match', async () => {
      const storedHash = await bcrypt.hash('different-token', 1);
      mockJwt.verify.mockReturnValue({ sub: 'user-1', tokenId: 'token-id-1' });
      mockRedis.get.mockResolvedValue(storedHash);

      await expect(service.refreshTokens('wrong-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the user no longer exists', async () => {
      const testToken = 'valid-refresh-token';
      const storedHash = await bcrypt.hash(testToken, 1);
      mockJwt.verify.mockReturnValue({ sub: 'user-1', tokenId: 'token-id-1' });
      mockRedis.get.mockResolvedValue(storedHash);
      mockUsers.findById.mockResolvedValue(null);

      await expect(service.refreshTokens(testToken)).rejects.toThrow(UnauthorizedException);
    });

    it('deletes the old Redis key before generating the new pair', async () => {
      const testToken = 'valid-refresh-token';
      const storedHash = await bcrypt.hash(testToken, 1);
      mockJwt.verify.mockReturnValue({ sub: 'user-1', tokenId: 'token-id-1' });
      mockRedis.get.mockResolvedValue(storedHash);
      mockUsers.findById.mockResolvedValue(makeUser());
      mockJwt.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');

      const callOrder: string[] = [];
      mockRedis.del.mockImplementation(async () => {
        callOrder.push('del');
        return 1;
      });
      mockRedis.set.mockImplementation(async () => {
        callOrder.push('set');
        return 'OK';
      });

      await service.refreshTokens(testToken);

      expect(callOrder).toEqual(['del', 'set']);
    });
  });

  // ── Email Verification ───────────────────────────────────────────────────────

  describe('verifyEmail', () => {
    it('marks user as verified on valid token', async () => {
      mockRedis.get.mockResolvedValue('user-1');
      mockUsers.findById.mockResolvedValue(makeUser());
      mockUsers.markEmailVerified.mockResolvedValue(undefined);

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toBe('Email verified successfully');
      expect(mockUsers.markEmailVerified).toHaveBeenCalledWith('user-1');
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('returns already verified for verified user', async () => {
      mockRedis.get.mockResolvedValue('user-1');
      mockUsers.findById.mockResolvedValue(makeUser({ emailVerified: true }));

      const result = await service.verifyEmail('valid-token');

      expect(result.message).toBe('Email already verified');
      expect(mockUsers.markEmailVerified).not.toHaveBeenCalled();
    });

    it('throws BadRequestException for invalid token', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    it('sends new verification email', async () => {
      mockRedis.get.mockResolvedValue(null); // no cooldown
      mockUsers.findById.mockResolvedValue(makeUser());

      const result = await service.resendVerification('user-1');

      expect(result.message).toBe('Verification email sent');
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalled();
    });

    it('throws 429 when cooldown active', async () => {
      mockRedis.get.mockResolvedValue('1'); // cooldown active

      await expect(service.resendVerification('user-1')).rejects.toThrow(HttpException);
    });

    it('returns already verified for verified user', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockUsers.findById.mockResolvedValue(makeUser({ emailVerified: true }));

      const result = await service.resendVerification('user-1');

      expect(result.message).toBe('Email already verified');
      expect(mockEmail.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  // ── Password Reset ───────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('sends reset email for existing user', async () => {
      mockUsers.findByEmail.mockResolvedValue(makeUser());

      const result = await service.forgotPassword('user@example.com');

      expect(result.message).toContain('If an account');
      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('returns same message for non-existent email (no enumeration)', async () => {
      mockUsers.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result.message).toContain('If an account');
      expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('respects cooldown', async () => {
      mockRedis.get.mockResolvedValue('1'); // cooldown active

      const result = await service.forgotPassword('user@example.com');

      expect(result.message).toContain('If an account');
      expect(mockUsers.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('resets password and purges refresh tokens', async () => {
      mockRedis.get.mockResolvedValue('user-1');
      mockUsers.updatePasswordHash.mockResolvedValue(undefined);
      mockRedis.scan.mockResolvedValue(['0', []]);

      const result = await service.resetPassword('valid-token', 'NewPass123');

      expect(result.message).toBe('Password reset successfully');
      expect(mockUsers.updatePasswordHash).toHaveBeenCalled();
      const [, hash] = mockUsers.updatePasswordHash.mock.calls[0] as [string, string];
      const matches = await bcrypt.compare('NewPass123', hash);
      expect(matches).toBe(true);
    });

    it('throws BadRequestException for invalid token', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'NewPass123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

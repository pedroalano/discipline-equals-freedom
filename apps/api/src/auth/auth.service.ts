import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import type { Redis } from 'ioredis';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { AuthResponse } from '@zenfocus/types';

const VERIFY_TTL = 24 * 60 * 60; // 24h
const VERIFY_COOLDOWN = 60; // 60s
const RESET_TTL = 60 * 60; // 1h
const RESET_COOLDOWN = 60; // 60s
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_TTL = 15 * 60; // 15min

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ── Register ─────────────────��───────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create(dto.email, passwordHash, dto.name);

    await this.sendVerificationToken(user.id, user.email, user.name);

    return this.generateTokenPair(
      user.id,
      user.email,
      user.emailVerified,
      user.createdAt,
      user.name ?? undefined,
    );
  }

  // ── Login ──────────────��─────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponse> {
    await this.checkLoginLockout(dto.email);

    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      await this.recordFailedLogin(dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.recordFailedLogin(dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.clearLoginAttempts(dto.email);

    return this.generateTokenPair(
      user.id,
      user.email,
      user.emailVerified,
      user.createdAt,
      user.name ?? undefined,
    );
  }

  // ── Logout ─────────────��─────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    const pattern = `refreshToken:${userId}:*`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [next, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // ── Refresh ────────────────��─────────────────────────────────────────────────

  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    let payload: { sub: string; tokenId: string };

    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      }) as { sub: string; tokenId: string };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const redisKey = `refreshToken:${payload.sub}:${payload.tokenId}`;
    const storedHash = await this.redis.get(redisKey);
    if (!storedHash) throw new UnauthorizedException('Refresh token revoked');

    const valid = await bcrypt.compare(refreshToken, storedHash);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    await this.redis.del(redisKey);

    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    return this.generateTokenPair(
      user.id,
      user.email,
      user.emailVerified,
      user.createdAt,
      user.name ?? undefined,
    );
  }

  // ── Email Verification ──────────────────────────���────────────────────────────

  async verifyEmail(token: string): Promise<{ message: string }> {
    const hash = this.sha256(token);
    const redisKey = `emailVerify:${hash}`;
    const userId = await this.redis.get(redisKey);

    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    if (user.emailVerified) {
      await this.redis.del(redisKey);
      return { message: 'Email already verified' };
    }

    await this.users.markEmailVerified(userId);
    await this.redis.del(redisKey);

    return { message: 'Email verified successfully' };
  }

  async resendVerification(userId: string): Promise<{ message: string }> {
    const cooldownKey = `emailVerify:cooldown:${userId}`;
    const cooldown = await this.redis.get(cooldownKey);
    if (cooldown) {
      throw new HttpException(
        'Please wait before requesting another email',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    if (user.emailVerified) {
      return { message: 'Email already verified' };
    }

    await this.sendVerificationToken(user.id, user.email, user.name);

    return { message: 'Verification email sent' };
  }

  // ── Password Reset ──────────────��────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const message = 'If an account with that email exists, a reset link has been sent';

    const cooldownKey = `passwordReset:cooldown:${email}`;
    const cooldown = await this.redis.get(cooldownKey);
    if (cooldown) return { message };

    const user = await this.users.findByEmail(email);
    if (!user) return { message };

    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.sha256(token);
    await this.redis.set(`passwordReset:${hash}`, user.id, 'EX', RESET_TTL);
    await this.redis.set(cooldownKey, '1', 'EX', RESET_COOLDOWN);

    await this.email.sendPasswordResetEmail(user.email, user.name, token);

    return { message };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const hash = this.sha256(token);
    const redisKey = `passwordReset:${hash}`;
    const userId = await this.redis.get(redisKey);

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.updatePasswordHash(userId, passwordHash);
    await this.redis.del(redisKey);

    // Purge all refresh tokens — force re-auth on all devices
    await this.logout(userId);

    return { message: 'Password reset successfully' };
  }

  // ���─ Account Lockout ──────────────────────────────────────────────────────────

  private async checkLoginLockout(email: string): Promise<void> {
    const key = `loginAttempts:${email}`;
    const attempts = await this.redis.get(key);
    if (attempts && parseInt(attempts, 10) >= MAX_LOGIN_ATTEMPTS) {
      throw new HttpException(
        'Too many login attempts. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordFailedLogin(email: string): Promise<void> {
    const key = `loginAttempts:${email}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, LOGIN_LOCKOUT_TTL);
    }
  }

  private async clearLoginAttempts(email: string): Promise<void> {
    await this.redis.del(`loginAttempts:${email}`);
  }

  // ── Helpers ────────��───────────────────────────────────���─────────────────────

  private async sendVerificationToken(
    userId: string,
    email: string,
    name: string | null,
  ): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.sha256(token);
    await this.redis.set(`emailVerify:${hash}`, userId, 'EX', VERIFY_TTL);
    await this.redis.set(`emailVerify:cooldown:${userId}`, '1', 'EX', VERIFY_COOLDOWN);

    await this.email.sendVerificationEmail(email, name, token);
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    emailVerified: boolean,
    createdAt: Date,
    name?: string,
  ): Promise<AuthResponse> {
    const tokenId = crypto.randomUUID();

    const accessToken = this.jwt.sign(
      { sub: userId, email, name, emailVerified },
      { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '15m' },
    );

    const refreshToken = this.jwt.sign(
      { sub: userId, tokenId },
      { secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'), expiresIn: '7d' },
    );

    const hash = await bcrypt.hash(refreshToken, 10);
    await this.redis.set(`refreshToken:${userId}:${tokenId}`, hash, 'EX', 7 * 24 * 60 * 60);

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, name, emailVerified, createdAt: createdAt.toISOString() },
    };
  }

  private sha256(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

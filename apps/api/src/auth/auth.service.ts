import { Inject, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import type { Redis } from 'ioredis';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import type { AuthResponse } from '@zenfocus/types';

const MAGIC_LINK_TTL = 15 * 60; // 15min
const MAGIC_LINK_COOLDOWN = 60; // 60s

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ── Magic Link ───────────────────────────────────────────────────────────────

  async requestMagicLink(email: string): Promise<{ message: string }> {
    const message = 'If that email is valid, a sign-in link has been sent';

    const cooldownKey = `magicLink:cooldown:${email}`;
    const cooldown = await this.redis.get(cooldownKey);
    if (cooldown) return { message };

    let user = await this.users.findByEmail(email);
    if (!user) {
      user = await this.users.create(email);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hash = this.sha256(token);
    await this.redis.set(`magicLink:${hash}`, user.id, 'EX', MAGIC_LINK_TTL);
    await this.redis.set(cooldownKey, '1', 'EX', MAGIC_LINK_COOLDOWN);

    await this.email.sendMagicLinkEmail(user.email, user.name, token);

    return { message };
  }

  async verifyMagicLink(token: string): Promise<AuthResponse> {
    const hash = this.sha256(token);
    const redisKey = `magicLink:${hash}`;
    const userId = await this.redis.get(redisKey);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired sign-in link');
    }

    await this.redis.del(redisKey);

    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException('User not found');

    if (!user.emailVerified) {
      await this.users.markEmailVerified(user.id);
      user.emailVerified = true;
    }

    return this.generateTokenPair(
      user.id,
      user.email,
      true,
      user.createdAt,
      user.name ?? undefined,
    );
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

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

  // ── Refresh ──────────────────────────────────────────────────────────────────

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

  // ── Helpers ──────────────────────────────────────────────────────────────────

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

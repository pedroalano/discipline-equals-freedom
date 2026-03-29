import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import type { Redis } from 'ioredis';
import { UsersService } from '../users/users.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { AuthResponse, UserResponse } from '@zenfocus/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async register(dto: RegisterDto): Promise<UserResponse> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.users.create(dto.email, passwordHash, dto.name);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.generateTokenPair(user.id, user.email, user.createdAt, user.name ?? undefined);
  }

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

    return this.generateTokenPair(user.id, user.email, user.createdAt, user.name ?? undefined);
  }

  private async generateTokenPair(
    userId: string,
    email: string,
    createdAt: Date,
    name?: string,
  ): Promise<AuthResponse> {
    const tokenId = crypto.randomUUID();

    const accessToken = this.jwt.sign(
      { sub: userId, email, name },
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
      user: { id: userId, email, name, createdAt: createdAt.toISOString() },
    };
  }
}

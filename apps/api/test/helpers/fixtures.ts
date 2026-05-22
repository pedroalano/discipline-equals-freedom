import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PrismaService } from '../../src/prisma/prisma.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  userId: string;
}

/** Creates (or updates) a verified user and generates a valid JWT access token
 *  directly via JwtService — no HTTP call, no throttle side-effects. */
export async function loginAs(
  app: INestApplication,
  prisma: PrismaService,
  _redis: Redis,
  email = 'test@example.com',
): Promise<AuthTokens> {
  const user = await prisma.user.upsert({
    where: { email },
    update: { emailVerified: true, emailVerifiedAt: new Date() },
    create: { email, emailVerified: true, emailVerifiedAt: new Date() },
  });

  const jwtService = app.get(JwtService);
  const config = app.get(ConfigService);

  const accessToken = jwtService.sign(
    { sub: user.id, email: user.email, name: user.name ?? undefined, emailVerified: true },
    { secret: config.getOrThrow<string>('JWT_SECRET'), expiresIn: '15m' },
  );

  return { accessToken, userId: user.id };
}

/** Plant a magic link token in Redis and return the raw token.
 *  Used in auth tests that exercise the real verify endpoint. */
export async function plantMagicToken(redis: Redis, userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  await redis.set(`magicLink:${hash}`, userId, 'EX', 900);
  return token;
}

export function bearer(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

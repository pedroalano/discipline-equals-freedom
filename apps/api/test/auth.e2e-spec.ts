import request from 'supertest';
import { ThrottlerStorage, ThrottlerStorageService } from '@nestjs/throttler';
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './helpers/create-app';
import { bearer, plantMagicToken } from './helpers/fixtures';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await redis.flushdb();
    // The real ThrottlerGuard runs even in tests (APP_GUARD useClass bypasses overrideGuard).
    // Clear its in-memory Map so rate limits reset between tests.
    app.get<ThrottlerStorageService>(ThrottlerStorage).storage.clear();
  });

  // ── magic-link/request ────────────────────────────────────────────────────

  describe('POST /auth/magic-link/request', () => {
    it('returns 200 with generic message for a new email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: 'new@example.com' })
        .expect(200);

      expect(res.body.message).toBeDefined();
    });

    it('returns the same message when email does not exist (no enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: 'nobody@example.com' })
        .expect(200);

      expect(typeof res.body.message).toBe('string');
    });

    it('returns 400 for invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('creates a user row for a new email', async () => {
      await request(app.getHttpServer())
        .post('/auth/magic-link/request')
        .send({ email: 'brand-new@example.com' })
        .expect(200);

      const user = await prisma.user.findUnique({ where: { email: 'brand-new@example.com' } });
      expect(user).not.toBeNull();
    });
  });

  // ── magic-link/verify ─────────────────────────────────────────────────────

  describe('POST /auth/magic-link/verify', () => {
    it('returns 200 with access + refresh tokens for a valid token', async () => {
      const user = await prisma.user.create({ data: { email: 'verify@example.com' } });
      const token = await plantMagicToken(redis, user.id);

      const res = await request(app.getHttpServer())
        .post('/auth/magic-link/verify')
        .send({ token })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('verify@example.com');
    });

    it('marks the user as email-verified on first login', async () => {
      const user = await prisma.user.create({
        data: { email: 'unverified@example.com', emailVerified: false },
      });
      const token = await plantMagicToken(redis, user.id);

      await request(app.getHttpServer())
        .post('/auth/magic-link/verify')
        .send({ token })
        .expect(200);

      const updated = await prisma.user.findUnique({ where: { id: user.id } });
      expect(updated?.emailVerified).toBe(true);
    });

    it('returns 401 for an invalid token', async () => {
      await request(app.getHttpServer())
        .post('/auth/magic-link/verify')
        .send({ token: 'totally-wrong-token' })
        .expect(401);
    });

    it('returns 401 when the token is used a second time (single-use)', async () => {
      const user = await prisma.user.create({ data: { email: 'singleuse@example.com' } });
      const token = await plantMagicToken(redis, user.id);

      await request(app.getHttpServer())
        .post('/auth/magic-link/verify')
        .send({ token })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/magic-link/verify')
        .send({ token })
        .expect(401);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('returns 200 with new tokens for a valid refresh token', async () => {
      const user = await prisma.user.create({
        data: { email: 'refresh@example.com', emailVerified: true },
      });
      const magicToken = await plantMagicToken(redis, user.id);

      const verifyRes = await request(app.getHttpServer())
        .post('/auth/magic-link/verify')
        .send({ token: magicToken })
        .expect(200);

      const refreshToken = verifyRes.body.refreshToken as string;

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('returns 401 for an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'bad.refresh.token' })
        .expect(401);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('returns 204 and revokes the refresh token', async () => {
      const user = await prisma.user.create({
        data: { email: 'logout@example.com', emailVerified: true },
      });
      const magicToken = await plantMagicToken(redis, user.id);

      const verifyRes = await request(app.getHttpServer())
        .post('/auth/magic-link/verify')
        .send({ token: magicToken })
        .expect(200);

      const { accessToken, refreshToken } = verifyRes.body as {
        accessToken: string;
        refreshToken: string;
      };

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set(bearer(accessToken))
        .expect(204);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('returns 401 without authentication', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });
  });
});

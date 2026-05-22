import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './helpers/create-app';
import { loginAs, bearer } from './helpers/fixtures';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    ({ accessToken, userId } = await loginAs(app, prisma, redis));
  });

  it('GET /users/me returns the authenticated user profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/users/me')
      .set(bearer(accessToken))
      .expect(200);

    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe('test@example.com');
  });

  it('PATCH /users/me/name updates the display name', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/me/name')
      .set(bearer(accessToken))
      .send({ name: 'Pedro' })
      .expect(200);

    expect(res.body.name).toBe('Pedro');
  });

  it('PATCH /users/me/name returns 400 for empty name', async () => {
    await request(app.getHttpServer())
      .patch('/users/me/name')
      .set(bearer(accessToken))
      .send({ name: '' })
      .expect(400);
  });

  it('DELETE /users/me removes the account', async () => {
    await request(app.getHttpServer())
      .delete('/users/me')
      .set(bearer(accessToken))
      .expect(204);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user).toBeNull();
  });

  it('returns 401 without authentication', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
    await request(app.getHttpServer()).patch('/users/me/name').send({ name: 'x' }).expect(401);
    await request(app.getHttpServer()).delete('/users/me').expect(401);
  });
});

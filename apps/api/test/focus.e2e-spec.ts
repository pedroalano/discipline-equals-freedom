import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './helpers/create-app';
import { loginAs, bearer } from './helpers/fixtures';

const TODAY = new Date().toISOString().substring(0, 10);

describe('FocusController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: Redis;
  let accessToken: string;

  beforeAll(async () => {
    ({ app, prisma, redis } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    ({ accessToken } = await loginAs(app, prisma, redis));
  });

  it('GET /focus returns empty list for a new user', async () => {
    const res = await request(app.getHttpServer())
      .get(`/focus?date=${TODAY}`)
      .set(bearer(accessToken))
      .expect(200);

    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('POST /focus creates a focus item', async () => {
    const res = await request(app.getHttpServer())
      .post('/focus')
      .set(bearer(accessToken))
      .send({ text: 'Write tests', date: TODAY })
      .expect(201);

    expect(res.body.text).toBe('Write tests');
    expect(res.body.date).toBe(TODAY);
    expect(res.body.completed).toBe(false);
    expect(res.body.id).toBeDefined();
  });

  it('GET /focus returns the created item', async () => {
    await request(app.getHttpServer())
      .post('/focus')
      .set(bearer(accessToken))
      .send({ text: 'Ship feature', date: TODAY })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/focus?date=${TODAY}`)
      .set(bearer(accessToken))
      .expect(200);

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].text).toBe('Ship feature');
  });

  it('PATCH /focus/:id updates text', async () => {
    const created = await request(app.getHttpServer())
      .post('/focus')
      .set(bearer(accessToken))
      .send({ text: 'Old text', date: TODAY })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/focus/${created.body.id as string}`)
      .set(bearer(accessToken))
      .send({ text: 'New text' })
      .expect(200);

    expect(res.body.text).toBe('New text');
  });

  it('PATCH /focus/:id marks item as completed', async () => {
    const created = await request(app.getHttpServer())
      .post('/focus')
      .set(bearer(accessToken))
      .send({ text: 'Complete me', date: TODAY })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/focus/${created.body.id as string}`)
      .set(bearer(accessToken))
      .send({ completed: true })
      .expect(200);

    expect(res.body.completed).toBe(true);
  });

  it('DELETE /focus/:id removes the item', async () => {
    const created = await request(app.getHttpServer())
      .post('/focus')
      .set(bearer(accessToken))
      .send({ text: 'Delete me', date: TODAY })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/focus/${created.body.id as string}`)
      .set(bearer(accessToken))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get(`/focus?date=${TODAY}`)
      .set(bearer(accessToken))
      .expect(200);

    expect(res.body.total).toBe(0);
  });

  it('returns 401 on all focus endpoints without auth', async () => {
    await request(app.getHttpServer()).get(`/focus?date=${TODAY}`).expect(401);
    await request(app.getHttpServer()).post('/focus').send({ text: 'x', date: TODAY }).expect(401);
    await request(app.getHttpServer()).patch('/focus/some-id').send({ text: 'x' }).expect(401);
    await request(app.getHttpServer()).delete('/focus/some-id').expect(401);
  });

  it('returns 400 for invalid date format', async () => {
    await request(app.getHttpServer())
      .post('/focus')
      .set(bearer(accessToken))
      .send({ text: 'x', date: 'not-a-date' })
      .expect(400);
  });

  it('returns 403 when updating another user\'s focus item', async () => {
    // Create item as user A
    const created = await request(app.getHttpServer())
      .post('/focus')
      .set(bearer(accessToken))
      .send({ text: 'Mine', date: TODAY })
      .expect(201);

    // Log in as user B
    const { accessToken: tokenB } = await loginAs(app, prisma, redis, 'other@example.com');

    await request(app.getHttpServer())
      .patch(`/focus/${created.body.id as string}`)
      .set(bearer(tokenB))
      .send({ text: 'Hijacked' })
      .expect(403);
  });
});

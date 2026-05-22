import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './helpers/create-app';
import { loginAs, bearer } from './helpers/fixtures';

const TODAY = new Date().toISOString().substring(0, 10);

describe('HabitController (e2e)', () => {
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

  it('GET /habits returns empty list for a new user', async () => {
    const res = await request(app.getHttpServer())
      .get('/habits')
      .set(bearer(accessToken))
      .expect(200);

    expect(res.body.habits).toEqual([]);
  });

  it('POST /habits creates a daily habit', async () => {
    const res = await request(app.getHttpServer())
      .post('/habits')
      .set(bearer(accessToken))
      .send({ name: 'Meditate', frequency: 'DAILY' })
      .expect(201);

    expect(res.body.name).toBe('Meditate');
    expect(res.body.frequency).toBe('DAILY');
    expect(res.body.isActive).toBe(true);
    expect(res.body.id).toBeDefined();
  });

  it('POST /habits creates a custom-day habit', async () => {
    const res = await request(app.getHttpServer())
      .post('/habits')
      .set(bearer(accessToken))
      .send({ name: 'Gym', frequency: 'CUSTOM', customDays: [1, 3, 5] })
      .expect(201);

    expect(res.body.frequency).toBe('CUSTOM');
    expect(res.body.customDays).toContain(1);
  });

  it('PATCH /habits/:id updates a habit', async () => {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set(bearer(accessToken))
      .send({ name: 'Run', frequency: 'DAILY' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/habits/${created.body.id as string}`)
      .set(bearer(accessToken))
      .send({ name: 'Sprint' })
      .expect(200);

    expect(res.body.name).toBe('Sprint');
  });

  it('DELETE /habits/:id removes the habit', async () => {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set(bearer(accessToken))
      .send({ name: 'Read', frequency: 'DAILY' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/habits/${created.body.id as string}`)
      .set(bearer(accessToken))
      .expect(204);

    const res = await request(app.getHttpServer())
      .get('/habits')
      .set(bearer(accessToken))
      .expect(200);

    expect(res.body.habits).toHaveLength(0);
  });

  it('daily habit auto-generates a focus item on GET /focus?date=today', async () => {
    await request(app.getHttpServer())
      .post('/habits')
      .set(bearer(accessToken))
      .send({ name: 'Morning pages', frequency: 'DAILY' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/focus?date=${TODAY}`)
      .set(bearer(accessToken))
      .expect(200);

    const habitItem = (res.body.items as Array<{ text: string; habitId: string | null }>).find(
      (i) => i.text === 'Morning pages' && i.habitId !== null,
    );
    expect(habitItem).toBeDefined();
  });

  it('GET /habits/:id/streak returns streak data', async () => {
    const created = await request(app.getHttpServer())
      .post('/habits')
      .set(bearer(accessToken))
      .send({ name: 'Stretch', frequency: 'DAILY' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/habits/${created.body.id as string}/streak`)
      .set(bearer(accessToken))
      .expect(200);

    expect(res.body.currentStreak).toBeDefined();
    expect(res.body.longestStreak).toBeDefined();
  });

  it('returns 401 without authentication', async () => {
    await request(app.getHttpServer()).get('/habits').expect(401);
    await request(app.getHttpServer())
      .post('/habits')
      .send({ name: 'x', frequency: 'DAILY' })
      .expect(401);
  });

  it('returns 400 for CUSTOM habit without customDays', async () => {
    await request(app.getHttpServer())
      .post('/habits')
      .set(bearer(accessToken))
      .send({ name: 'Bad habit', frequency: 'CUSTOM' })
      .expect(400);
  });
});

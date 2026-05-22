import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './helpers/create-app';
import { loginAs, bearer } from './helpers/fixtures';

describe('Board / List / Card controllers (e2e)', () => {
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

  // ── Boards ────────────────────────────────────────────────────────────────

  describe('Boards', () => {
    it('GET /boards returns empty list for a new user', async () => {
      const res = await request(app.getHttpServer())
        .get('/boards')
        .set(bearer(accessToken))
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('POST /boards creates a board', async () => {
      const res = await request(app.getHttpServer())
        .post('/boards')
        .set(bearer(accessToken))
        .send({ title: 'My Project' })
        .expect(201);

      expect(res.body.title).toBe('My Project');
      expect(res.body.id).toBeDefined();
    });

    it('GET /boards/:id returns the board with lists', async () => {
      const created = await request(app.getHttpServer())
        .post('/boards')
        .set(bearer(accessToken))
        .send({ title: 'Dev Board' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/boards/${created.body.id as string}`)
        .set(bearer(accessToken))
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(Array.isArray(res.body.lists)).toBe(true);
    });

    it('PATCH /boards/:id updates a board title', async () => {
      const created = await request(app.getHttpServer())
        .post('/boards')
        .set(bearer(accessToken))
        .send({ title: 'Old Title' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/boards/${created.body.id as string}`)
        .set(bearer(accessToken))
        .send({ title: 'New Title' })
        .expect(200);

      expect(res.body.title).toBe('New Title');
    });

    it('DELETE /boards/:id removes the board', async () => {
      const created = await request(app.getHttpServer())
        .post('/boards')
        .set(bearer(accessToken))
        .send({ title: 'Deletable' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/boards/${created.body.id as string}`)
        .set(bearer(accessToken))
        .expect(204);

      const res = await request(app.getHttpServer())
        .get('/boards')
        .set(bearer(accessToken))
        .expect(200);

      expect(res.body).toHaveLength(0);
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer()).get('/boards').expect(401);
    });
  });

  // ── Lists ─────────────────────────────────────────────────────────────────

  describe('Lists', () => {
    let boardId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/boards')
        .set(bearer(accessToken))
        .send({ title: 'Test Board' })
        .expect(201);
      boardId = res.body.id as string;
    });

    it('POST /lists creates a list on the board', async () => {
      const res = await request(app.getHttpServer())
        .post('/lists')
        .set(bearer(accessToken))
        .send({ title: 'To Do', boardId })
        .expect(201);

      expect(res.body.title).toBe('To Do');
      expect(res.body.boardId).toBe(boardId);
    });

    it('PATCH /lists/:id renames a list', async () => {
      const created = await request(app.getHttpServer())
        .post('/lists')
        .set(bearer(accessToken))
        .send({ title: 'In Progress', boardId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/lists/${created.body.id as string}`)
        .set(bearer(accessToken))
        .send({ title: 'Doing' })
        .expect(200);

      expect(res.body.title).toBe('Doing');
    });

    it('DELETE /lists/:id removes the list', async () => {
      const created = await request(app.getHttpServer())
        .post('/lists')
        .set(bearer(accessToken))
        .send({ title: 'Done', boardId })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/lists/${created.body.id as string}`)
        .set(bearer(accessToken))
        .expect(204);
    });
  });

  // ── Cards ─────────────────────────────────────────────────────────────────

  describe('Cards', () => {
    let listId: string;
    let listId2: string;

    beforeEach(async () => {
      const board = await request(app.getHttpServer())
        .post('/boards')
        .set(bearer(accessToken))
        .send({ title: 'Kanban' })
        .expect(201);

      const boardId = board.body.id as string;

      const l1 = await request(app.getHttpServer())
        .post('/lists')
        .set(bearer(accessToken))
        .send({ title: 'Backlog', boardId })
        .expect(201);

      const l2 = await request(app.getHttpServer())
        .post('/lists')
        .set(bearer(accessToken))
        .send({ title: 'Done', boardId })
        .expect(201);

      listId = l1.body.id as string;
      listId2 = l2.body.id as string;
    });

    it('POST /cards creates a card in the list', async () => {
      const res = await request(app.getHttpServer())
        .post('/cards')
        .set(bearer(accessToken))
        .send({ title: 'Fix bug', listId })
        .expect(201);

      expect(res.body.title).toBe('Fix bug');
      expect(res.body.listId).toBe(listId);
    });

    it('PATCH /cards/:id updates card title', async () => {
      const created = await request(app.getHttpServer())
        .post('/cards')
        .set(bearer(accessToken))
        .send({ title: 'Draft', listId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/cards/${created.body.id as string}`)
        .set(bearer(accessToken))
        .send({ title: 'Finalized' })
        .expect(200);

      expect(res.body.title).toBe('Finalized');
    });

    it('PATCH /cards/:id/move moves card to another list', async () => {
      const created = await request(app.getHttpServer())
        .post('/cards')
        .set(bearer(accessToken))
        .send({ title: 'Move me', listId })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/cards/${created.body.id as string}/move`)
        .set(bearer(accessToken))
        .send({ listId: listId2, position: 1 })
        .expect(200);

      expect(res.body.listId).toBe(listId2);
    });

    it('DELETE /cards/:id removes the card', async () => {
      const created = await request(app.getHttpServer())
        .post('/cards')
        .set(bearer(accessToken))
        .send({ title: 'Ephemeral', listId })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/cards/${created.body.id as string}`)
        .set(bearer(accessToken))
        .expect(204);
    });
  });
});

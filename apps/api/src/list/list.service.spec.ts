import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ListService } from './list.service';
import { PrismaService } from '../prisma/prisma.service';

const now = new Date('2026-01-01T00:00:00Z');

const mockPrisma = {
  board: { findUnique: jest.fn() },
  list: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

function makeBoard(overrides = {}) {
  return {
    id: 'board-1',
    userId: 'user-1',
    title: 'Board',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeList(overrides = {}) {
  return {
    id: 'list-1',
    boardId: 'board-1',
    title: 'List',
    position: 1.0,
    createdAt: now,
    cards: [],
    board: makeBoard(),
    ...overrides,
  };
}

describe('ListService', () => {
  let service: ListService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ListService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(ListService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('assigns position 1.0 to the first list', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(makeBoard());
      mockPrisma.list.findFirst.mockResolvedValue(null);
      mockPrisma.list.create.mockResolvedValue(makeList({ position: 1.0 }));

      const result = await service.create('user-1', { title: 'List', boardId: 'board-1' });
      expect(result.position).toBe(1.0);
      expect(mockPrisma.list.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 1.0 }) }),
      );
    });

    it('appends after last list with +1.0', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(makeBoard());
      mockPrisma.list.findFirst.mockResolvedValue(makeList({ position: 3.0 }));
      mockPrisma.list.create.mockResolvedValue(makeList({ position: 4.0 }));

      await service.create('user-1', { title: 'List', boardId: 'board-1' });
      expect(mockPrisma.list.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 4.0 }) }),
      );
    });

    it('throws NotFoundException when board not found', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(null);
      await expect(service.create('user-1', { title: 'L', boardId: 'missing' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(makeBoard({ userId: 'other' }));
      await expect(service.create('user-1', { title: 'L', boardId: 'board-1' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('updates list title', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(makeList());
      mockPrisma.list.update.mockResolvedValue(makeList({ title: 'Updated' }));

      const result = await service.update('user-1', 'list-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('throws NotFoundException when list not found', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(null);
      await expect(service.update('user-1', 'missing', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(
        makeList({ board: makeBoard({ userId: 'other' }) }),
      );
      await expect(service.update('user-1', 'list-1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('deletes the list', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(makeList());
      mockPrisma.list.delete.mockResolvedValue(makeList());
      await expect(service.delete('user-1', 'list-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when list not found', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(null);
      await expect(service.delete('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(
        makeList({ board: makeBoard({ userId: 'other' }) }),
      );
      await expect(service.delete('user-1', 'list-1')).rejects.toThrow(ForbiddenException);
    });
  });
});

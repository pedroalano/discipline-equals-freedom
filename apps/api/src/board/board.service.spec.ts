import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BoardService } from './board.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  board: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const now = new Date('2026-01-01T00:00:00Z');

function makeBoard(overrides = {}) {
  return {
    id: 'board-1',
    userId: 'user-1',
    title: 'Test Board',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('BoardService', () => {
  let service: BoardService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [BoardService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(BoardService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns boards for the user', async () => {
      mockPrisma.board.findMany.mockResolvedValue([makeBoard()]);
      const result = await service.findAll('user-1');
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe('board-1');
      expect(mockPrisma.board.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns board detail with lists and cards', async () => {
      const board = { ...makeBoard(), lists: [] };
      mockPrisma.board.findUnique.mockResolvedValue(board);
      const result = await service.findOne('user-1', 'board-1');
      expect(result.id).toBe('board-1');
      expect(result.lists).toEqual([]);
    });

    it('throws NotFoundException when board not found', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ...makeBoard(),
        lists: [],
        userId: 'other-user',
      });
      await expect(service.findOne('user-1', 'board-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates a board and returns summary', async () => {
      mockPrisma.board.create.mockResolvedValue(makeBoard());
      const result = await service.create('user-1', { title: 'Test Board' });
      expect(result.title).toBe('Test Board');
      expect(mockPrisma.board.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', title: 'Test Board' },
      });
    });
  });

  describe('update', () => {
    it('updates title and returns summary', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(makeBoard());
      mockPrisma.board.update.mockResolvedValue(makeBoard({ title: 'Updated' }));
      const result = await service.update('user-1', 'board-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('throws NotFoundException when board not found', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(null);
      await expect(service.update('user-1', 'missing', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(makeBoard({ userId: 'other' }));
      await expect(service.update('user-1', 'board-1', { title: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('deletes the board', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(makeBoard());
      mockPrisma.board.delete.mockResolvedValue(makeBoard());
      await expect(service.delete('user-1', 'board-1')).resolves.toBeUndefined();
    });

    it('throws NotFoundException when board not found', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(null);
      await expect(service.delete('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(makeBoard({ userId: 'other' }));
      await expect(service.delete('user-1', 'board-1')).rejects.toThrow(ForbiddenException);
    });
  });
});

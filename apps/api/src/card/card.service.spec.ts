import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CardService } from './card.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../board/board.gateway';

const now = new Date('2026-01-01T00:00:00Z');

const mockPrisma = {
  list: { findUnique: jest.fn() },
  card: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockGateway = {
  emitCardCreated: jest.fn(),
  emitCardUpdated: jest.fn(),
  emitCardMoved: jest.fn(),
  emitCardDeleted: jest.fn(),
};

function makeBoard(overrides = {}) {
  return { id: 'board-1', userId: 'user-1', ...overrides };
}

function makeList(overrides = {}) {
  return { id: 'list-1', boardId: 'board-1', board: makeBoard(), ...overrides };
}

function makeCard(overrides = {}) {
  return {
    id: 'card-1',
    listId: 'list-1',
    title: 'Card',
    description: null,
    position: 1.0,
    createdAt: now,
    updatedAt: now,
    list: makeList(),
    ...overrides,
  };
}

describe('CardService', () => {
  let service: CardService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BoardGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get(CardService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('assigns position 1.0 to first card in list', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(makeList());
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue(makeCard({ position: 1.0 }));

      const result = await service.create('user-1', { title: 'Card', listId: 'list-1' });
      expect(result.position).toBe(1.0);
      expect(mockPrisma.card.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 1.0 }) }),
      );
    });

    it('appends after last card', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(makeList());
      mockPrisma.card.findFirst.mockResolvedValue(makeCard({ position: 5.0 }));
      mockPrisma.card.create.mockResolvedValue(makeCard({ position: 6.0 }));

      await service.create('user-1', { title: 'Card', listId: 'list-1' });
      expect(mockPrisma.card.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 6.0 }) }),
      );
    });

    it('emits card:created event', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(makeList());
      mockPrisma.card.findFirst.mockResolvedValue(null);
      mockPrisma.card.create.mockResolvedValue(makeCard());

      await service.create('user-1', { title: 'Card', listId: 'list-1' });
      expect(mockGateway.emitCardCreated).toHaveBeenCalledWith(
        'board-1',
        expect.objectContaining({ id: 'card-1' }),
      );
    });

    it('throws NotFoundException when list not found', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(null);
      await expect(service.create('user-1', { title: 'C', listId: 'missing' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.list.findUnique.mockResolvedValue(
        makeList({ board: makeBoard({ userId: 'other' }) }),
      );
      await expect(service.create('user-1', { title: 'C', listId: 'list-1' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('updates card and emits card:updated', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(makeCard());
      mockPrisma.card.update.mockResolvedValue(makeCard({ title: 'Updated' }));

      const result = await service.update('user-1', 'card-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
      expect(mockGateway.emitCardUpdated).toHaveBeenCalled();
    });

    it('throws NotFoundException when card not found', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(null);
      await expect(service.update('user-1', 'missing', {})).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(
        makeCard({ list: makeList({ board: makeBoard({ userId: 'other' }) }) }),
      );
      await expect(service.update('user-1', 'card-1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('move', () => {
    it('updates listId and position, emits card:moved', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(makeCard());
      mockPrisma.list.findUnique.mockResolvedValue(makeList({ id: 'list-2', board: makeBoard() }));
      mockPrisma.card.update.mockResolvedValue(makeCard({ listId: 'list-2', position: 2.5 }));

      const result = await service.move('user-1', 'card-1', { listId: 'list-2', position: 2.5 });
      expect(result.position).toBe(2.5);
      expect(result.listId).toBe('list-2');
      expect(mockGateway.emitCardMoved).toHaveBeenCalled();
    });

    it('throws NotFoundException when card not found', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(null);
      await expect(service.move('user-1', 'missing', { listId: 'l', position: 1 })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when target list not found', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(makeCard());
      mockPrisma.list.findUnique.mockResolvedValue(null);
      await expect(
        service.move('user-1', 'card-1', { listId: 'missing', position: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('deletes card and emits card:deleted', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(makeCard());
      mockPrisma.card.delete.mockResolvedValue(makeCard());

      await expect(service.delete('user-1', 'card-1')).resolves.toBeUndefined();
      expect(mockGateway.emitCardDeleted).toHaveBeenCalledWith('board-1', 'card-1');
    });

    it('throws NotFoundException when card not found', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(null);
      await expect(service.delete('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for wrong owner', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(
        makeCard({ list: makeList({ board: makeBoard({ userId: 'other' }) }) }),
      );
      await expect(service.delete('user-1', 'card-1')).rejects.toThrow(ForbiddenException);
    });
  });
});

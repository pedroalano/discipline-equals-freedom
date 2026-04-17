import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FocusService } from './focus.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../board/board.gateway';

const mockPrisma = {
  focusItem: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  habit: {
    findMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  card: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  list: {
    findFirst: jest.fn(),
  },
};

const mockGateway = {
  emitCardMoved: jest.fn(),
};

// April 16, 2026 is a Wednesday (UTC day = 3)
const TODAY = '2026-04-16';
const YESTERDAY = '2026-04-15';

const now = new Date('2026-01-01T00:00:00Z');

function makeFocusItem(overrides = {}) {
  return {
    id: 'focus-1',
    userId: 'user-1',
    text: 'Do something',
    date: new Date(`${TODAY}T00:00:00.000Z`),
    completed: false,
    position: 0,
    habitId: null,
    createdAt: now,
    ...overrides,
  };
}

function makeCard(overrides = {}) {
  return {
    id: 'card-1',
    listId: 'list-1',
    title: 'Test Card',
    description: null,
    position: 0,
    isToday: false,
    focusItemId: 'focus-1',
    createdAt: now,
    updatedAt: now,
    list: {
      boardId: 'board-1',
      board: { id: 'board-1' },
    },
    ...overrides,
  };
}

function makeHabit(overrides = {}) {
  return {
    id: 'habit-1',
    userId: 'user-1',
    name: 'Morning Run',
    frequency: 'DAILY',
    customDays: null,
    isActive: true,
    position: 0,
    ...overrides,
  };
}

describe('FocusService', () => {
  let service: FocusService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const module = await Test.createTestingModule({
      providers: [
        FocusService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BoardGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get(FocusService);
    jest.clearAllMocks();
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.focusItem.createMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getByDate', () => {
    it('returns items for a past date without habit generation or carry-over', async () => {
      const item = makeFocusItem({ date: new Date(`${YESTERDAY}T00:00:00.000Z`) });
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([item]);

      const result = await service.getByDate('user-1', YESTERDAY);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.habit.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns empty list for a past date with no items, no carry-over triggered', async () => {
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([]);

      const result = await service.getByDate('user-1', YESTERDAY);

      expect(result.items).toHaveLength(0);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('is idempotent — does not recreate habit items that already exist for today', async () => {
      const habit = makeHabit();
      const habitItem = makeFocusItem({ habitId: 'habit-1' });

      // ensureHabitsGenerated: habit.findMany → [habit]
      mockPrisma.habit.findMany.mockResolvedValueOnce([habit]);
      // existing habit items check: focusItem.findMany → already exists
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([{ habitId: 'habit-1' }]);
      // main items list
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([habitItem]);

      const result = await service.getByDate('user-1', TODAY);

      expect(mockPrisma.focusItem.createMany).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('generates DAILY habit items that are missing for today', async () => {
      const habit = makeHabit();

      // ensureHabitsGenerated: habit.findMany → [habit]
      mockPrisma.habit.findMany.mockResolvedValueOnce([habit]);
      // existing habit items: none yet
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([]);
      // last item for position
      mockPrisma.focusItem.findFirst.mockResolvedValueOnce(null);
      // main items list (after generation)
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([makeFocusItem({ habitId: 'habit-1' })]);

      await service.getByDate('user-1', TODAY);

      expect(mockPrisma.focusItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ habitId: 'habit-1', userId: 'user-1' }),
          ]),
        }),
      );
    });

    it('only generates CUSTOM habit items when today is a scheduled day', async () => {
      // Thursday-only habit (day 4). Today is Thursday (Apr 16).
      const wedOnlyHabit = makeHabit({ frequency: 'CUSTOM', customDays: '4' });

      mockPrisma.habit.findMany.mockResolvedValueOnce([wedOnlyHabit]);
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([]); // no existing habit items
      mockPrisma.focusItem.findFirst.mockResolvedValueOnce(null);
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([makeFocusItem({ habitId: 'habit-1' })]);

      await service.getByDate('user-1', TODAY);

      expect(mockPrisma.focusItem.createMany).toHaveBeenCalled();
    });

    it('skips CUSTOM habits not scheduled for today', async () => {
      // Monday-only habit (day 1). Today is Wednesday (day 3) → not scheduled.
      const monOnlyHabit = makeHabit({ frequency: 'CUSTOM', customDays: '1' });

      mockPrisma.habit.findMany.mockResolvedValueOnce([monOnlyHabit]);
      // ensureHabitsGenerated returns early — no focusItem calls inside it
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([]);
      // No habits → items still empty → carry-over runs
      mockPrisma.user.findUnique.mockResolvedValueOnce({ lastCarryOverDate: new Date(TODAY) });

      await service.getByDate('user-1', TODAY);

      expect(mockPrisma.focusItem.createMany).not.toHaveBeenCalled();
    });

    it('carries over incomplete non-habit items from yesterday', async () => {
      const yesterdayItem = makeFocusItem({
        date: new Date(`${YESTERDAY}T00:00:00.000Z`),
        completed: false,
        habitId: null,
      });
      const carriedItem = makeFocusItem();

      mockPrisma.habit.findMany.mockResolvedValueOnce([]); // no habits
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([]); // today: empty
      mockPrisma.user.findUnique.mockResolvedValueOnce({ lastCarryOverDate: null });
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([yesterdayItem]); // yesterday incomplete
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([carriedItem]); // after carry-over

      const result = await service.getByDate('user-1', TODAY);

      expect(mockPrisma.focusItem.createMany).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('does not carry over when lastCarryOverDate is already today', async () => {
      mockPrisma.habit.findMany.mockResolvedValueOnce([]);
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([]); // today: empty
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        lastCarryOverDate: new Date(`${TODAY}T00:00:00.000Z`),
      });

      const result = await service.getByDate('user-1', TODAY);

      expect(mockPrisma.focusItem.createMany).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(0);
    });

    it('updates lastCarryOverDate even when there are no incomplete items to carry', async () => {
      mockPrisma.habit.findMany.mockResolvedValueOnce([]);
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([]); // today: empty
      mockPrisma.user.findUnique.mockResolvedValueOnce({ lastCarryOverDate: null });
      mockPrisma.focusItem.findMany.mockResolvedValueOnce([]); // yesterday: nothing incomplete

      await service.getByDate('user-1', TODAY);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });
  });

  describe('create', () => {
    it('assigns position 0 when no items exist for that date', async () => {
      mockPrisma.focusItem.findFirst.mockResolvedValueOnce(null);
      mockPrisma.focusItem.create.mockResolvedValueOnce(makeFocusItem({ position: 0 }));

      const result = await service.create('user-1', { text: 'Task', date: TODAY });

      expect(result.position).toBe(0);
      expect(mockPrisma.focusItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 0 }) }),
      );
    });

    it('assigns position last+1 when items already exist', async () => {
      mockPrisma.focusItem.findFirst.mockResolvedValueOnce(makeFocusItem({ position: 2 }));
      mockPrisma.focusItem.create.mockResolvedValueOnce(makeFocusItem({ position: 3 }));

      const result = await service.create('user-1', { text: 'Task', date: TODAY });

      expect(result.position).toBe(3);
    });
  });

  describe('update', () => {
    it('updates text without triggering moveLinkedCardToDone', async () => {
      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(makeFocusItem());
      mockPrisma.focusItem.update.mockResolvedValueOnce(makeFocusItem({ text: 'Updated' }));

      await service.update('user-1', 'focus-1', { text: 'Updated' });

      expect(mockPrisma.card.findFirst).not.toHaveBeenCalled();
    });

    it('triggers moveLinkedCardToDone when completed is set to true', async () => {
      const card = makeCard();
      const doneList = { id: 'done-list-1', boardId: 'board-1', title: 'Done' };
      const movedCard = { ...makeCard(), listId: 'done-list-1', position: 1.0 };

      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(makeFocusItem());
      mockPrisma.focusItem.update.mockResolvedValueOnce(makeFocusItem({ completed: true }));
      mockPrisma.card.findFirst.mockResolvedValueOnce(card); // linked card
      mockPrisma.list.findFirst.mockResolvedValueOnce(doneList); // done list found
      mockPrisma.card.findFirst.mockResolvedValueOnce(null); // last in done list (empty)
      mockPrisma.card.update.mockResolvedValueOnce(movedCard);

      await service.update('user-1', 'focus-1', { completed: true });

      expect(mockPrisma.card.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ listId: doneList.id, position: 1.0 }),
        }),
      );
      expect(mockGateway.emitCardMoved).toHaveBeenCalledWith('board-1', expect.any(Object));
    });

    it('does not move card when no card is linked to the focus item', async () => {
      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(makeFocusItem());
      mockPrisma.focusItem.update.mockResolvedValueOnce(makeFocusItem({ completed: true }));
      mockPrisma.card.findFirst.mockResolvedValueOnce(null); // no linked card

      await service.update('user-1', 'focus-1', { completed: true });

      expect(mockPrisma.list.findFirst).not.toHaveBeenCalled();
      expect(mockGateway.emitCardMoved).not.toHaveBeenCalled();
    });

    it('does not move card when no done list exists on the board', async () => {
      const card = makeCard();

      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(makeFocusItem());
      mockPrisma.focusItem.update.mockResolvedValueOnce(makeFocusItem({ completed: true }));
      mockPrisma.card.findFirst.mockResolvedValueOnce(card);
      mockPrisma.list.findFirst.mockResolvedValueOnce(null); // no done list

      await service.update('user-1', 'focus-1', { completed: true });

      expect(mockPrisma.card.update).not.toHaveBeenCalled();
      expect(mockGateway.emitCardMoved).not.toHaveBeenCalled();
    });

    it('does not move card when it is already in the done list', async () => {
      const doneListId = 'done-list-1';
      const card = makeCard({ listId: doneListId });
      const doneList = { id: doneListId, boardId: 'board-1', title: 'Done' };

      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(makeFocusItem());
      mockPrisma.focusItem.update.mockResolvedValueOnce(makeFocusItem({ completed: true }));
      mockPrisma.card.findFirst.mockResolvedValueOnce(card);
      mockPrisma.list.findFirst.mockResolvedValueOnce(doneList);

      await service.update('user-1', 'focus-1', { completed: true });

      expect(mockPrisma.card.update).not.toHaveBeenCalled();
      expect(mockGateway.emitCardMoved).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when focus item does not exist', async () => {
      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(null);

      await expect(service.update('user-1', 'missing', { text: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when focus item belongs to another user', async () => {
      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(
        makeFocusItem({ userId: 'other-user' }),
      );

      await expect(service.update('user-1', 'focus-1', { text: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('deletes the focus item successfully', async () => {
      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(makeFocusItem());
      mockPrisma.focusItem.delete.mockResolvedValueOnce(makeFocusItem());

      await service.delete('user-1', 'focus-1');

      expect(mockPrisma.focusItem.delete).toHaveBeenCalledWith({ where: { id: 'focus-1' } });
    });

    it('throws NotFoundException when focus item does not exist', async () => {
      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(null);

      await expect(service.delete('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when focus item belongs to another user', async () => {
      mockPrisma.focusItem.findUnique.mockResolvedValueOnce(
        makeFocusItem({ userId: 'other-user' }),
      );

      await expect(service.delete('user-1', 'focus-1')).rejects.toThrow(ForbiddenException);
    });
  });
});

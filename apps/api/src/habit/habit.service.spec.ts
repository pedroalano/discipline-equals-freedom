import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HabitService } from './habit.service';
import { PrismaService } from '../prisma/prisma.service';
import { HabitFrequencyDto } from './dto/create-habit.dto';

const mockPrisma = {
  habit: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  focusItem: {
    findMany: jest.fn(),
  },
};

// April 16, 2026 is a Thursday (UTC day = 4)
const TODAY = '2026-04-16';

const now = new Date('2026-01-01T00:00:00Z');

function makeHabit(overrides = {}) {
  return {
    id: 'habit-1',
    userId: 'user-1',
    name: 'Morning Run',
    description: null,
    frequency: 'DAILY',
    customDays: null,
    isActive: true,
    position: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRecord(dateStr: string, completed = true) {
  return { date: new Date(dateStr + 'T00:00:00.000Z'), completed };
}

describe('HabitService', () => {
  let service: HabitService;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(`${TODAY}T12:00:00Z`));

    const module = await Test.createTestingModule({
      providers: [HabitService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(HabitService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('list', () => {
    it('returns all habits for the user ordered by position', async () => {
      mockPrisma.habit.findMany.mockResolvedValue([makeHabit()]);

      const result = await service.list('user-1');

      expect(result.habits).toHaveLength(1);
      expect(result.habits[0]?.id).toBe('habit-1');
      expect(mockPrisma.habit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('create', () => {
    it('assigns position 0 when no habits exist', async () => {
      mockPrisma.habit.findFirst.mockResolvedValue(null);
      mockPrisma.habit.create.mockResolvedValue(makeHabit({ position: 0 }));

      const result = await service.create('user-1', {
        name: 'Morning Run',
        frequency: HabitFrequencyDto.DAILY,
      });

      expect(result.position).toBe(0);
      expect(mockPrisma.habit.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ position: 0 }) }),
      );
    });

    it('assigns position last+1 and serialises customDays as a comma-separated string', async () => {
      mockPrisma.habit.findFirst.mockResolvedValue(makeHabit({ position: 2 }));
      mockPrisma.habit.create.mockResolvedValue(makeHabit({ position: 3, customDays: '1,3,5' }));

      const result = await service.create('user-1', {
        name: 'Custom Habit',
        frequency: HabitFrequencyDto.CUSTOM,
        customDays: [1, 3, 5],
      });

      expect(result.position).toBe(3);
      expect(mockPrisma.habit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 3, customDays: '1,3,5' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates and returns the habit', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
      mockPrisma.habit.update.mockResolvedValue(makeHabit({ name: 'Evening Walk' }));

      const result = await service.update('user-1', 'habit-1', { name: 'Evening Walk' });

      expect(result.name).toBe('Evening Walk');
    });

    it('throws NotFoundException when habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', 'missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when habit belongs to another user', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(makeHabit({ userId: 'other-user' }));

      await expect(service.update('user-1', 'habit-1', { name: 'X' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('deletes the habit successfully', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
      mockPrisma.habit.delete.mockResolvedValue(makeHabit());

      await service.delete('user-1', 'habit-1');

      expect(mockPrisma.habit.delete).toHaveBeenCalledWith({ where: { id: 'habit-1' } });
    });

    it('throws NotFoundException when habit does not exist', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(null);

      await expect(service.delete('user-1', 'missing')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when habit belongs to another user', async () => {
      mockPrisma.habit.findUnique.mockResolvedValue(makeHabit({ userId: 'other-user' }));

      await expect(service.delete('user-1', 'habit-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getStreak', () => {
    describe('access control', () => {
      it('throws NotFoundException when habit does not exist', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(null);

        await expect(service.getStreak('user-1', 'missing')).rejects.toThrow(NotFoundException);
      });

      it('throws ForbiddenException when habit belongs to another user', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit({ userId: 'other-user' }));

        await expect(service.getStreak('user-1', 'habit-1')).rejects.toThrow(ForbiddenException);
      });
    });

    describe('new habit with no focus records', () => {
      it('returns zero streaks and completedToday false', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result).toEqual({
          habitId: 'habit-1',
          currentStreak: 0,
          longestStreak: 0,
          completedToday: false,
        });
      });

      it('returns completedToday false when today has an incomplete record', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([makeRecord(TODAY, false)]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.completedToday).toBe(false);
        expect(result.currentStreak).toBe(0);
      });
    });

    describe('DAILY habit — current streak', () => {
      it('returns streak of 1 when only today is completed', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([makeRecord(TODAY)]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.currentStreak).toBe(1);
        expect(result.completedToday).toBe(true);
      });

      it('counts consecutive completed days up to and including today', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord('2026-04-16'),
          makeRecord('2026-04-15'),
          makeRecord('2026-04-14'),
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.currentStreak).toBe(3);
      });

      it('counts streak ending yesterday when today has no record yet', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord('2026-04-15'),
          makeRecord('2026-04-14'),
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.currentStreak).toBe(2);
        expect(result.completedToday).toBe(false);
      });

      it('breaks the streak at a gap between days', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord('2026-04-16'),
          // Apr 15 missing
          makeRecord('2026-04-14'),
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.currentStreak).toBe(1);
      });

      it('breaks the streak at a completed:false record on a past day', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord('2026-04-16'),
          makeRecord('2026-04-15'),
          makeRecord('2026-04-14', false),
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.currentStreak).toBe(2);
      });
    });

    describe('DAILY habit — longest streak', () => {
      it('longest streak matches current when there is no prior break', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord('2026-04-16'),
          makeRecord('2026-04-15'),
          makeRecord('2026-04-14'),
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.longestStreak).toBe(3);
      });

      it('longest streak captures a prior streak that has since broken', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          // Earlier streak of 5
          makeRecord('2026-04-01'),
          makeRecord('2026-04-02'),
          makeRecord('2026-04-03'),
          makeRecord('2026-04-04'),
          makeRecord('2026-04-05'),
          // Gap on Apr 6-13
          makeRecord('2026-04-14'),
          makeRecord('2026-04-15'),
          makeRecord('2026-04-16'),
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.longestStreak).toBe(5);
        expect(result.currentStreak).toBe(3);
      });

      it('returns the maximum across multiple disjoint streaks', async () => {
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord('2026-04-01'),
          makeRecord('2026-04-02'),
          makeRecord('2026-04-03'),
          // gap
          makeRecord('2026-04-10'),
          makeRecord('2026-04-11'),
          makeRecord('2026-04-12'),
          makeRecord('2026-04-13'),
          makeRecord('2026-04-14'),
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.longestStreak).toBe(5);
      });
    });

    describe('CUSTOM habit', () => {
      // Mon/Wed/Fri = days 1, 3, 5. Today is Thursday (day 4) — not scheduled.
      const mwfHabit = () => makeHabit({ frequency: 'CUSTOM', customDays: '1,3,5' });
      // Thursday-only = day 4. Today is Thursday — scheduled.
      const thuHabit = () => makeHabit({ frequency: 'CUSTOM', customDays: '4' });

      it('skips non-scheduled days when calculating current streak', async () => {
        // Apr 15 (Wed, day 3), Apr 13 (Mon, day 1), Apr 10 (Fri, day 5) — all scheduled and completed
        mockPrisma.habit.findUnique.mockResolvedValue(mwfHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord('2026-04-15'), // Wed
          makeRecord('2026-04-13'), // Mon
          makeRecord('2026-04-10'), // Fri
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.currentStreak).toBe(3);
      });

      it('breaks the streak when a scheduled day is missed', async () => {
        // Apr 15 (Wed) completed, Apr 13 (Mon) missing — streak breaks
        mockPrisma.habit.findUnique.mockResolvedValue(mwfHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord('2026-04-15'), // Wed — OK
          // Apr 13 (Mon) — missing record → gap
          makeRecord('2026-04-10'), // Fri
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.currentStreak).toBe(1);
      });

      it('returns completedToday true when today is a scheduled day and completed', async () => {
        // Thursday-only habit. Today (Apr 16, Thu) is scheduled.
        mockPrisma.habit.findUnique.mockResolvedValue(thuHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([makeRecord(TODAY)]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.completedToday).toBe(true);
      });

      it('uses only the first record when multiple exist for the same date', async () => {
        // Two records for the same date — first (most recent by query order) wins
        mockPrisma.habit.findUnique.mockResolvedValue(makeHabit());
        mockPrisma.focusItem.findMany.mockResolvedValue([
          makeRecord(TODAY, true),
          makeRecord(TODAY, false),
        ]);

        const result = await service.getStreak('user-1', 'habit-1');

        expect(result.completedToday).toBe(true);
        expect(result.currentStreak).toBe(1);
      });
    });
  });
});

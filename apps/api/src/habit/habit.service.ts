import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateHabitDto } from './dto/create-habit.dto';
import type { UpdateHabitDto } from './dto/update-habit.dto';
import type {
  HabitFrequency,
  HabitListResponse,
  HabitResponse,
  HabitStreakResponse,
} from '@zenfocus/types';
import type { Habit } from '@prisma/client';

@Injectable()
export class HabitService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<HabitListResponse> {
    const habits = await this.prisma.habit.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    });
    return { habits: habits.map((h) => this.format(h)) };
  }

  async create(userId: string, dto: CreateHabitDto): Promise<HabitResponse> {
    const last = await this.prisma.habit.findFirst({
      where: { userId },
      orderBy: { position: 'desc' },
    });
    const position = last ? last.position + 1 : 0;

    const habit = await this.prisma.habit.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        frequency: dto.frequency,
        customDays: dto.customDays ? dto.customDays.join(',') : null,
        position,
      },
    });
    return this.format(habit);
  }

  async update(userId: string, id: string, dto: UpdateHabitDto): Promise<HabitResponse> {
    const habit = await this.prisma.habit.findUnique({ where: { id } });
    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.habit.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.customDays !== undefined && { customDays: dto.customDays.join(',') }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });
    return this.format(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const habit = await this.prisma.habit.findUnique({ where: { id } });
    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException();

    await this.prisma.habit.delete({ where: { id } });
  }

  async getStreak(userId: string, habitId: string): Promise<HabitStreakResponse> {
    const habit = await this.prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) throw new NotFoundException('Habit not found');
    if (habit.userId !== userId) throw new ForbiddenException();

    const records = await this.prisma.focusItem.findMany({
      where: { userId, habitId },
      select: { date: true, completed: true },
      orderBy: { date: 'desc' },
    });

    const todayStr = new Date().toISOString().substring(0, 10);

    // Build a map from dateStr → completed
    const completionMap = new Map<string, boolean>();
    for (const r of records) {
      const ds = r.date.toISOString().substring(0, 10);
      // If multiple records exist for the same date (shouldn't happen), use the most recent
      if (!completionMap.has(ds)) {
        completionMap.set(ds, r.completed);
      }
    }

    const scheduledDays = this.parseCustomDays(habit);

    const currentStreak = this.computeCurrentStreak(completionMap, scheduledDays, todayStr);
    const longestStreak = this.computeLongestStreak(completionMap, scheduledDays);
    const completedToday = completionMap.get(todayStr) ?? false;

    return { habitId, currentStreak, longestStreak, completedToday };
  }

  private parseCustomDays(habit: Habit): Set<number> | null {
    if (habit.frequency === 'DAILY') return null;
    if (!habit.customDays) return null;
    return new Set(habit.customDays.split(',').map(Number));
  }

  private isScheduled(scheduledDays: Set<number> | null, dateStr: string): boolean {
    if (scheduledDays === null) return true; // DAILY
    const dayOfWeek = new Date(dateStr + 'T00:00:00.000Z').getUTCDay();
    return scheduledDays.has(dayOfWeek);
  }

  private prevDay(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().substring(0, 10);
  }

  private computeCurrentStreak(
    completionMap: Map<string, boolean>,
    scheduledDays: Set<number> | null,
    todayStr: string,
  ): number {
    let streak = 0;
    let cursor = todayStr;

    // Walk backwards up to 2 years max
    for (let i = 0; i < 730; i++) {
      const isScheduledDay = this.isScheduled(scheduledDays, cursor);

      if (!isScheduledDay) {
        cursor = this.prevDay(cursor);
        continue;
      }

      const completed = completionMap.get(cursor);

      if (completed === true) {
        streak++;
        cursor = this.prevDay(cursor);
      } else if (completed === false) {
        // Explicitly failed — streak ends. But skip today if not yet completed.
        if (cursor === todayStr) {
          cursor = this.prevDay(cursor);
          continue;
        }
        break;
      } else {
        // No record: either in the future or a past gap
        if (cursor === todayStr) {
          cursor = this.prevDay(cursor);
          continue;
        }
        break;
      }
    }

    return streak;
  }

  private computeLongestStreak(
    completionMap: Map<string, boolean>,
    scheduledDays: Set<number> | null,
  ): number {
    if (completionMap.size === 0) return 0;

    // Collect all completed dates sorted ascending
    const completedDates = Array.from(completionMap.entries())
      .filter(([, c]) => c)
      .map(([d]) => d)
      .sort();

    if (completedDates.length === 0) return 0;

    let longest = 0;
    let current = 0;
    let prevDateStr: string | null = null;

    for (const dateStr of completedDates) {
      if (prevDateStr === null) {
        current = 1;
      } else {
        // Check if prev and current are consecutive scheduled days
        let cursor = this.prevDay(dateStr);
        // Skip non-scheduled days going backwards
        while (cursor !== prevDateStr && !this.isScheduled(scheduledDays, cursor)) {
          cursor = this.prevDay(cursor);
        }

        if (cursor === prevDateStr) {
          current++;
        } else {
          current = 1;
        }
      }

      if (current > longest) longest = current;
      prevDateStr = dateStr;
    }

    return longest;
  }

  private format(habit: Habit): HabitResponse {
    return {
      id: habit.id,
      userId: habit.userId,
      name: habit.name,
      description: habit.description ?? null,
      frequency: habit.frequency as HabitFrequency,
      customDays: habit.customDays ? habit.customDays.split(',').map(Number) : null,
      isActive: habit.isActive,
      position: habit.position,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
    };
  }
}

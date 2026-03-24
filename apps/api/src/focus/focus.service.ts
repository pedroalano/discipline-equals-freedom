import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateFocusItemDto } from './dto/create-focus-item.dto';
import type { UpdateFocusItemDto } from './dto/update-focus-item.dto';
import type { FocusItemResponse } from '@zenfocus/types';
import type { FocusItem } from '@prisma/client';

@Injectable()
export class FocusService {
  constructor(private readonly prisma: PrismaService) {}

  async getByDate(userId: string, date: string): Promise<FocusItemResponse[]> {
    const items = await this.prisma.focusItem.findMany({
      where: { userId, date: new Date(date) },
      orderBy: { createdAt: 'asc' },
    });
    return items.map(this.format);
  }

  async create(userId: string, dto: CreateFocusItemDto): Promise<FocusItemResponse> {
    const item = await this.prisma.focusItem.create({
      data: { userId, text: dto.text, date: new Date(dto.date) },
    });
    return this.format(item);
  }

  async update(userId: string, id: string, dto: UpdateFocusItemDto): Promise<FocusItemResponse> {
    const item = await this.prisma.focusItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Focus item not found');
    if (item.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.focusItem.update({
      where: { id },
      data: {
        ...(dto.text !== undefined && { text: dto.text }),
        ...(dto.completed !== undefined && { completed: dto.completed }),
      },
    });
    return this.format(updated);
  }

  async delete(userId: string, id: string): Promise<void> {
    const item = await this.prisma.focusItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Focus item not found');
    if (item.userId !== userId) throw new ForbiddenException();

    await this.prisma.focusItem.delete({ where: { id } });
  }

  private format(item: FocusItem): FocusItemResponse {
    return {
      id: item.id,
      userId: item.userId,
      text: item.text,
      date: item.date.toISOString().substring(0, 10),
      completed: item.completed,
      createdAt: item.createdAt.toISOString(),
    };
  }
}

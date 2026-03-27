import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../board/board.gateway';
import type { CreateFocusItemDto } from './dto/create-focus-item.dto';
import type { UpdateFocusItemDto } from './dto/update-focus-item.dto';
import type { CardResponse, FocusItemListResponse, FocusItemResponse } from '@zenfocus/types';
import type { Card, FocusItem } from '@prisma/client';

@Injectable()
export class FocusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: BoardGateway,
  ) {}

  async getByDate(userId: string, dateStr: string): Promise<FocusItemListResponse> {
    const dayDate = new Date(dateStr + 'T00:00:00.000Z');

    let items = await this.prisma.focusItem.findMany({
      where: { userId, date: dayDate },
      orderBy: { position: 'asc' },
    });

    // Carry-over: when today has no items, bring forward yesterday's incomplete items
    const todayStr = new Date().toISOString().substring(0, 10);
    if (items.length === 0 && dateStr === todayStr) {
      const yesterday = new Date(dayDate);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);

      const incomplete = await this.prisma.focusItem.findMany({
        where: { userId, date: yesterday, completed: false },
        orderBy: { position: 'asc' },
      });

      if (incomplete.length > 0) {
        await this.prisma.focusItem.createMany({
          data: incomplete.map((item, idx) => ({
            userId,
            text: item.text,
            date: dayDate,
            completed: false,
            position: idx,
          })),
        });

        items = await this.prisma.focusItem.findMany({
          where: { userId, date: dayDate },
          orderBy: { position: 'asc' },
        });
      }
    }

    const formatted = items.map((item) => this.format(item));
    return {
      items: formatted,
      total: formatted.length,
      completed: formatted.filter((i) => i.completed).length,
    };
  }

  async create(userId: string, dto: CreateFocusItemDto): Promise<FocusItemResponse> {
    const dayDate = new Date(dto.date + 'T00:00:00.000Z');
    const last = await this.prisma.focusItem.findFirst({
      where: { userId, date: dayDate },
      orderBy: { position: 'desc' },
    });
    const position = last ? last.position + 1 : 0;

    const item = await this.prisma.focusItem.create({
      data: { userId, text: dto.text, date: dayDate, position },
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
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });

    if (dto.completed === true) {
      await this.moveLinkedCardToDone(id);
    }

    return this.format(updated);
  }

  private async moveLinkedCardToDone(focusItemId: string): Promise<void> {
    const card = await this.prisma.card.findFirst({
      where: { focusItemId },
      include: { list: { include: { board: true } } },
    });
    if (!card) return;

    const doneList = await this.prisma.list.findFirst({
      where: { boardId: card.list.boardId, title: { equals: 'done', mode: 'insensitive' } },
    });
    if (!doneList || card.listId === doneList.id) return;

    const last = await this.prisma.card.findFirst({
      where: { listId: doneList.id },
      orderBy: { position: 'desc' },
    });
    const position = last ? last.position + 1.0 : 1.0;

    const moved = await this.prisma.card.update({
      where: { id: card.id },
      data: { listId: doneList.id, position, updatedAt: new Date() },
    });

    this.gateway.emitCardMoved(card.list.boardId, this.formatCard(moved));
  }

  private formatCard(card: Card): CardResponse {
    return {
      id: card.id,
      listId: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      isToday: card.isToday,
      focusItemId: card.focusItemId,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
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
      position: item.position,
      createdAt: item.createdAt.toISOString(),
    };
  }
}

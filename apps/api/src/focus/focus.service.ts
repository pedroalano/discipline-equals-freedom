import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../board/board.gateway';
import type { CreateFocusItemDto } from './dto/create-focus-item.dto';
import type { UpdateFocusItemDto } from './dto/update-focus-item.dto';
import type { CardResponse, FocusItemResponse } from '@zenfocus/types';
import type { Card, FocusItem } from '@prisma/client';

@Injectable()
export class FocusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: BoardGateway,
  ) {}

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
      createdAt: item.createdAt.toISOString(),
    };
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateListDto } from './dto/create-list.dto';
import type { UpdateListDto } from './dto/update-list.dto';
import type { ListResponse, CardResponse } from '@zenfocus/types';
import type { Card, List } from '@prisma/client';

function positionAfter(last: number): number {
  return last + 1.0;
}
function positionFirst(): number {
  return 1.0;
}

@Injectable()
export class ListService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateListDto): Promise<ListResponse> {
    const board = await this.prisma.board.findUnique({ where: { id: dto.boardId } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.userId !== userId) throw new ForbiddenException();

    const last = await this.prisma.list.findFirst({
      where: { boardId: dto.boardId },
      orderBy: { position: 'desc' },
    });
    const position = last ? positionAfter(last.position) : positionFirst();

    const list = await this.prisma.list.create({
      data: { boardId: dto.boardId, title: dto.title, position },
      include: { cards: { orderBy: { position: 'asc' } } },
    });
    return this.format(list as List & { cards: Card[] });
  }

  async update(userId: string, listId: string, dto: UpdateListDto): Promise<ListResponse> {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      include: { board: true, cards: { orderBy: { position: 'asc' } } },
    });
    if (!list) throw new NotFoundException('List not found');
    if (list.board.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.list.update({
      where: { id: listId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
      include: { cards: { orderBy: { position: 'asc' } } },
    });
    return this.format(updated as List & { cards: Card[] });
  }

  async delete(userId: string, listId: string): Promise<void> {
    const list = await this.prisma.list.findUnique({
      where: { id: listId },
      include: { board: true },
    });
    if (!list) throw new NotFoundException('List not found');
    if (list.board.userId !== userId) throw new ForbiddenException();

    await this.prisma.list.delete({ where: { id: listId } });
  }

  private format(list: List & { cards: Card[] }): ListResponse {
    return {
      id: list.id,
      boardId: list.boardId,
      title: list.title,
      position: list.position,
      createdAt: list.createdAt.toISOString(),
      cards: list.cards.map((card) => this.formatCard(card)),
    };
  }

  private formatCard(card: Card): CardResponse {
    return {
      id: card.id,
      listId: card.listId,
      title: card.title,
      description: card.description,
      position: card.position,
      isToday: card.isToday,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }
}

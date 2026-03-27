import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../board/board.gateway';
import type { CreateCardDto } from './dto/create-card.dto';
import type { UpdateCardDto } from './dto/update-card.dto';
import type { MoveCardDto } from './dto/move-card.dto';
import type { CardResponse } from '@zenfocus/types';
import type { Card } from '@prisma/client';

function positionAfter(last: number): number {
  return last + 1.0;
}
function positionFirst(): number {
  return 1.0;
}

@Injectable()
export class CardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: BoardGateway,
  ) {}

  async create(userId: string, dto: CreateCardDto): Promise<CardResponse> {
    const list = await this.prisma.list.findUnique({
      where: { id: dto.listId },
      include: { board: true },
    });
    if (!list) throw new NotFoundException('List not found');
    if (list.board.userId !== userId) throw new ForbiddenException();

    const last = await this.prisma.card.findFirst({
      where: { listId: dto.listId },
      orderBy: { position: 'desc' },
    });
    const position = last ? positionAfter(last.position) : positionFirst();

    const card = await this.prisma.card.create({
      data: { listId: dto.listId, title: dto.title, position },
    });
    const response = this.format(card);
    this.gateway.emitCardCreated(list.board.id, response);
    return response;
  }

  async update(userId: string, cardId: string, dto: UpdateCardDto): Promise<CardResponse> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { list: { include: { board: true } } },
    });
    if (!card) throw new NotFoundException('Card not found');
    if (card.list.board.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isToday !== undefined && { isToday: dto.isToday }),
      },
    });
    const response = this.format(updated);
    this.gateway.emitCardUpdated(card.list.board.id, response);
    return response;
  }

  async move(userId: string, cardId: string, dto: MoveCardDto): Promise<CardResponse> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { list: { include: { board: true } } },
    });
    if (!card) throw new NotFoundException('Card not found');
    if (card.list.board.userId !== userId) throw new ForbiddenException();

    const targetList = await this.prisma.list.findUnique({
      where: { id: dto.listId },
      include: { board: true },
    });
    if (!targetList) throw new NotFoundException('Target list not found');
    if (targetList.board.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: { listId: dto.listId, position: dto.position, updatedAt: new Date() },
    });
    const response = this.format(updated);
    this.gateway.emitCardMoved(targetList.board.id, response);
    return response;
  }

  async delete(userId: string, cardId: string): Promise<void> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { list: { include: { board: true } } },
    });
    if (!card) throw new NotFoundException('Card not found');
    if (card.list.board.userId !== userId) throw new ForbiddenException();

    await this.prisma.card.delete({ where: { id: cardId } });
    this.gateway.emitCardDeleted(card.list.board.id, cardId);
  }

  async moveToToday(userId: string, cardId: string): Promise<{ card: CardResponse }> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { list: { include: { board: true } } },
    });
    if (!card) throw new NotFoundException('Card not found');
    if (card.list.board.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: { isToday: true },
    });

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    await this.prisma.focusItem.create({
      data: { userId, text: card.title, date: today },
    });

    const response = this.format(updated);
    this.gateway.emitCardUpdated(card.list.board.id, response);
    return { card: response };
  }

  private format(card: Card): CardResponse {
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

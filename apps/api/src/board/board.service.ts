import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBoardDto } from './dto/create-board.dto';
import type { UpdateBoardDto } from './dto/update-board.dto';
import type {
  BoardDetailResponse,
  BoardSummaryResponse,
  CardResponse,
  ListResponse,
} from '@zenfocus/types';
import type { Board, Card, List } from '@prisma/client';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<BoardSummaryResponse[]> {
    const boards = await this.prisma.board.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { lists: true } } },
    });
    return boards.map((b) => this.formatSummary(b, b._count.lists));
  }

  async findOne(userId: string, boardId: string): Promise<BoardDetailResponse> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        lists: {
          orderBy: { position: 'asc' },
          include: {
            cards: { orderBy: { position: 'asc' } },
          },
        },
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    if (board.userId !== userId) throw new ForbiddenException();
    return this.formatDetail(board as Board & { lists: (List & { cards: Card[] })[] });
  }

  async create(userId: string, dto: CreateBoardDto): Promise<BoardSummaryResponse> {
    const board = await this.prisma.board.create({
      data: { userId, title: dto.title },
      include: { _count: { select: { lists: true } } },
    });
    return this.formatSummary(board, board._count.lists);
  }

  async update(
    userId: string,
    boardId: string,
    dto: UpdateBoardDto,
  ): Promise<BoardSummaryResponse> {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.userId !== userId) throw new ForbiddenException();

    const updated = await this.prisma.board.update({
      where: { id: boardId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
      },
      include: { _count: { select: { lists: true } } },
    });
    return this.formatSummary(updated, updated._count.lists);
  }

  async delete(userId: string, boardId: string): Promise<void> {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new NotFoundException('Board not found');
    if (board.userId !== userId) throw new ForbiddenException();

    await this.prisma.board.delete({ where: { id: boardId } });
  }

  private formatSummary(board: Board, listCount: number): BoardSummaryResponse {
    return {
      id: board.id,
      userId: board.userId,
      title: board.title,
      description: board.description,
      color: board.color,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
      listCount,
    };
  }

  private formatDetail(
    board: Board & { lists: (List & { cards: Card[] })[] },
  ): BoardDetailResponse {
    return {
      ...this.formatSummary(board, board.lists.length),
      lists: board.lists.map((list) => this.formatList(list)),
    };
  }

  private formatList(list: List & { cards: Card[] }): ListResponse {
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
      focusItemId: card.focusItemId,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }
}

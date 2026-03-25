import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import type { BoardDetailResponse, BoardSummaryResponse } from '@zenfocus/types';

@Controller('boards')
export class BoardController {
  constructor(private readonly boards: BoardService) {}

  @Get()
  findAll(@CurrentUser() user: RequestUser): Promise<BoardSummaryResponse[]> {
    return this.boards.findAll(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateBoardDto,
  ): Promise<BoardSummaryResponse> {
    return this.boards.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<BoardDetailResponse> {
    return this.boards.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
  ): Promise<BoardSummaryResponse> {
    return this.boards.update(user.id, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.boards.delete(user.id, id);
  }
}

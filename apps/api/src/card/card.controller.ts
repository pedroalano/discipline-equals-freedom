import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CardService } from './card.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import type { CardResponse } from '@zenfocus/types';

@Controller('cards')
export class CardController {
  constructor(private readonly cards: CardService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateCardDto): Promise<CardResponse> {
    return this.cards.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateCardDto,
  ): Promise<CardResponse> {
    return this.cards.update(user.id, id, dto);
  }

  @Patch(':id/move')
  move(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: MoveCardDto,
  ): Promise<CardResponse> {
    return this.cards.move(user.id, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.cards.delete(user.id, id);
  }
}

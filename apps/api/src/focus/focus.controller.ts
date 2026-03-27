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
  Query,
} from '@nestjs/common';
import { FocusService } from './focus.service';
import { CreateFocusItemDto } from './dto/create-focus-item.dto';
import { UpdateFocusItemDto } from './dto/update-focus-item.dto';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import type { FocusItemListResponse, FocusItemResponse } from '@zenfocus/types';

@Controller('focus')
export class FocusController {
  constructor(private readonly focus: FocusService) {}

  @Get()
  getByDate(
    @CurrentUser() user: RequestUser,
    @Query('date') date: string,
  ): Promise<FocusItemListResponse> {
    return this.focus.getByDate(user.id, date);
  }

  @Post()
  create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateFocusItemDto,
  ): Promise<FocusItemResponse> {
    return this.focus.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateFocusItemDto,
  ): Promise<FocusItemResponse> {
    return this.focus.update(user.id, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.focus.delete(user.id, id);
  }
}

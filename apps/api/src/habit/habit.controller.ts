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
import { HabitService } from './habit.service';
import { CreateHabitDto } from './dto/create-habit.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import type { HabitListResponse, HabitResponse, HabitStreakResponse } from '@zenfocus/types';

@Controller('habits')
export class HabitController {
  constructor(private readonly habit: HabitService) {}

  @Get()
  list(@CurrentUser() user: RequestUser): Promise<HabitListResponse> {
    return this.habit.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateHabitDto): Promise<HabitResponse> {
    return this.habit.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateHabitDto,
  ): Promise<HabitResponse> {
    return this.habit.update(user.id, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.habit.delete(user.id, id);
  }

  @Get(':id/streak')
  getStreak(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<HabitStreakResponse> {
    return this.habit.getStreak(user.id, id);
  }
}

import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ListService } from './list.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import type { ListResponse } from '@zenfocus/types';

@Controller('lists')
export class ListController {
  constructor(private readonly lists: ListService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateListDto): Promise<ListResponse> {
    return this.lists.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateListDto,
  ): Promise<ListResponse> {
    return this.lists.update(user.id, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  delete(@CurrentUser() user: RequestUser, @Param('id') id: string): Promise<void> {
    return this.lists.delete(user.id, id);
  }
}

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateNameDto } from './dto/update-name.dto';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator';
import type { ProfileResponse } from '@zenfocus/types';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: RequestUser): Promise<ProfileResponse> {
    return this.users.getProfile(user.id);
  }

  @Patch('me/name')
  updateName(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateNameDto,
  ): Promise<ProfileResponse> {
    return this.users.updateName(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  deleteAccount(@CurrentUser() user: RequestUser): Promise<void> {
    return this.users.deleteAccount(user.id);
  }
}

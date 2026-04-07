import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { UpdateNameDto } from './dto/update-name.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
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

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('me/password')
  updatePassword(@CurrentUser() user: RequestUser, @Body() dto: UpdatePasswordDto): Promise<void> {
    return this.users.updatePassword(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('me')
  deleteAccount(@CurrentUser() user: RequestUser): Promise<void> {
    return this.users.deleteAccount(user.id);
  }
}

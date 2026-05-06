import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RefreshDto } from './dto/refresh.dto';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser, type RequestUser } from './decorators/current-user.decorator';
import type { AuthResponse } from '@zenfocus/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('magic-link/request')
  requestMagicLink(@Body() dto: RequestMagicLinkDto): Promise<{ message: string }> {
    return this.auth.requestMagicLink(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('magic-link/verify')
  verifyMagicLink(@Body() dto: VerifyMagicLinkDto): Promise<AuthResponse> {
    return this.auth.verifyMagicLink(dto.token);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@CurrentUser() user: RequestUser): Promise<void> {
    return this.auth.logout(user.id);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.auth.refreshTokens(dto.refreshToken);
  }
}

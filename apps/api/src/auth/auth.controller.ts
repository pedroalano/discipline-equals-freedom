import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RefreshDto } from './dto/refresh.dto';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser, type RequestUser } from './decorators/current-user.decorator';
import type { AuthResponse } from '@zenfocus/types';

@Controller('auth')
export class AuthController {
  private readonly appUrl: string;

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {
    this.appUrl = config.getOrThrow<string>('APP_URL');
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('magic-link/request')
  requestMagicLink(@Body() dto: RequestMagicLinkDto): Promise<{ message: string }> {
    return this.auth.requestMagicLink(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('magic-link/complete')
  async completeMagicLink(@Query('token') token: string, @Res() res: Response): Promise<void> {
    if (!token) {
      res.redirect(`${this.appUrl}/login`);
      return;
    }
    try {
      const { accessToken, refreshToken } = await this.auth.verifyMagicLink(token);
      const isProduction = process.env['NODE_ENV'] === 'production';
      const cookieBase = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/',
      };
      res.cookie('access_token', accessToken, cookieBase);
      res.cookie('refresh_token', refreshToken, { ...cookieBase, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.redirect(this.appUrl);
    } catch {
      res.redirect(`${this.appUrl}/login`);
    }
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

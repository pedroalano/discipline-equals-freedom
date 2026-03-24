import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { DailyImageService } from './daily-image.service';

@Controller()
export class DailyImageController {
  constructor(private readonly dailyImageService: DailyImageService) {}

  @Public()
  @Get('daily-image')
  async getDailyImage(@Res() res: Response): Promise<void> {
    const image = await this.dailyImageService.getImage();
    if (!image) {
      res.status(HttpStatus.NO_CONTENT).send();
      return;
    }
    res.status(HttpStatus.OK).json(image);
  }
}

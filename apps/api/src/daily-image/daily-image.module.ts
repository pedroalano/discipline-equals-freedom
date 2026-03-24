import { Module } from '@nestjs/common';
import { DailyImageService } from './daily-image.service';
import { DailyImageController } from './daily-image.controller';

@Module({
  providers: [DailyImageService],
  controllers: [DailyImageController],
})
export class DailyImageModule {}

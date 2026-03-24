import { Module } from '@nestjs/common';
import { FocusService } from './focus.service';
import { FocusController } from './focus.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FocusService],
  controllers: [FocusController],
})
export class FocusModule {}

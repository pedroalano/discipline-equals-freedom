import { Module } from '@nestjs/common';
import { FocusService } from './focus.service';
import { FocusController } from './focus.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CardModule } from '../card/card.module';

@Module({
  imports: [PrismaModule, CardModule],
  providers: [FocusService],
  controllers: [FocusController],
})
export class FocusModule {}

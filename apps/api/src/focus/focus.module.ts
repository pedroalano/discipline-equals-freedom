import { Module } from '@nestjs/common';
import { FocusService } from './focus.service';
import { FocusController } from './focus.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BoardModule } from '../board/board.module';

@Module({
  imports: [PrismaModule, BoardModule],
  providers: [FocusService],
  controllers: [FocusController],
})
export class FocusModule {}

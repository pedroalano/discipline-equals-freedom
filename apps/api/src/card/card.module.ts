import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BoardModule } from '../board/board.module';
import { CardService } from './card.service';
import { CardController } from './card.controller';

@Module({
  imports: [PrismaModule, BoardModule],
  providers: [CardService],
  controllers: [CardController],
})
export class CardModule {}

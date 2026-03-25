import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ListService } from './list.service';
import { ListController } from './list.controller';

@Module({
  imports: [PrismaModule],
  providers: [ListService],
  controllers: [ListController],
})
export class ListModule {}

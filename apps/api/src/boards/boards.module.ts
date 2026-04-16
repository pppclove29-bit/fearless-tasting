import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { BoardsController } from './boards.controller';
import { AdminBoardsController } from './admin-boards.controller';
import { BoardsService } from './boards.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BoardsController, AdminBoardsController],
  providers: [BoardsService],
})
export class BoardsModule {}

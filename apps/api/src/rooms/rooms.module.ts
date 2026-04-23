import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CategoriesModule } from '../categories/categories.module';
import { RoomsService } from './rooms.service';
import { RoomStatsService } from './room-stats.service';
import { RoomsController } from './rooms.controller';
import { RoomMemberGuard } from './guards/room-member.guard';
import { RoomManagerGuard } from './guards/room-manager.guard';

@Module({
  imports: [PrismaModule, AuthModule, CategoriesModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomStatsService, RoomMemberGuard, RoomManagerGuard],
})
export class RoomsModule {}

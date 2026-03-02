import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomMemberGuard } from './guards/room-member.guard';
import { RoomManagerGuard } from './guards/room-manager.guard';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomMemberGuard, RoomManagerGuard],
})
export class RoomsModule {}

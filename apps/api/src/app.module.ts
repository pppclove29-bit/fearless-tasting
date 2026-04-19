import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { LoggerMiddleware } from './common/logger.middleware';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { RoomsModule } from './rooms/rooms.module';
import { NoticesModule } from './notices/notices.module';
import { HealthModule } from './health/health.module';
import { FcmModule } from './fcm/fcm.module';
import { StorageModule } from './storage/storage.module';
import { AdminModule } from './admin/admin.module';
import { BoardsModule } from './boards/boards.module';
import { PlacesModule } from './places/places.module';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 120 }],
    }),
    PrismaModule,
    FcmModule,
    StorageModule,
    AuthModule,
    UsersModule,
    InquiriesModule,
    RoomsModule,
    NoticesModule,
    HealthModule,
    AdminModule,
    BoardsModule,
    PlacesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

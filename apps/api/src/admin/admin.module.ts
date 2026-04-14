import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DemoAccountsController } from './demo-accounts.controller';
import { DemoAccountsService } from './demo-accounts.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [AuthModule],
  controllers: [DemoAccountsController, AdminUsersController],
  providers: [DemoAccountsService, AdminUsersService],
})
export class AdminModule {}

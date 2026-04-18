import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DemoAccountsController } from './demo-accounts.controller';
import { DemoAccountsService } from './demo-accounts.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { FeatureRequestsController } from './feature-requests.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';

@Module({
  imports: [AuthModule],
  controllers: [DemoAccountsController, AdminUsersController, FeatureRequestsController, AdminStatsController],
  providers: [DemoAccountsService, AdminUsersService, AdminStatsService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DemoAccountsController } from './demo-accounts.controller';
import { DemoAccountsService } from './demo-accounts.service';

@Module({
  imports: [AuthModule],
  controllers: [DemoAccountsController],
  providers: [DemoAccountsService],
})
export class AdminModule {}

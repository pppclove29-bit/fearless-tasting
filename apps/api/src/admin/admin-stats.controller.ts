import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminStatsService } from './admin-stats.service';

@ApiTags('관리자 - 통계')
@Controller('admin/stats')
@UseGuards(AdminGuard)
export class AdminStatsController {
  constructor(private readonly adminStatsService: AdminStatsService) {}

  /** 대시보드 KPI (DAU/WAU, 주간 활동 등) */
  @Get('dashboard')
  @ApiOperation({ summary: '대시보드 KPI' })
  getDashboard() {
    return this.adminStatsService.getDashboard();
  }
}

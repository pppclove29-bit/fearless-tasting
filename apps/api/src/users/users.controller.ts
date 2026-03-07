import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('사용자')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** 사용자 목록 조회 */
  @Get()
  @ApiOperation({ summary: '사용자 목록 조회' })
  findAll() {
    return this.usersService.findAll();
  }

  /** 관리자 대시보드 통계 (DAU/WAU/MAU 등) */
  @Get('stats')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '관리자 통계', description: 'DAU, WAU, MAU 등 서비스 통계를 반환합니다.' })
  getStats() {
    return this.usersService.getStats();
  }

  /** 사용자 단건 조회 */
  @Get(':id')
  @ApiOperation({ summary: '사용자 단건 조회' })
  @ApiParam({ name: 'id', description: '사용자 ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}

import { Controller, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminUsersService } from './admin-users.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('관리자 - 유저 관리')
@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  /** 이메일로 유저 검색 */
  @Get('search')
  @ApiOperation({ summary: '이메일로 유저 검색' })
  searchByEmail(@Query('email') email: string) {
    return this.adminUsersService.searchUserByEmail(email);
  }

  /** 유저 역할 변경 */
  @Patch(':id/role')
  @ApiOperation({ summary: '유저 역할 변경' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.adminUsersService.updateUserRole(id, dto.role, req.user.id);
  }
}

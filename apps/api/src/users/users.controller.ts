import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

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

  /** 내 닉네임 수정 */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 닉네임 수정' })
  updateMe(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateNickname(user.id, dto.nickname);
  }

  /** 회원 탈퇴 */
  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '회원 탈퇴' })
  deleteMe(@CurrentUser() user: { id: string }) {
    return this.usersService.deleteAccount(user.id);
  }

  /** 글로벌 랭킹 + 업적 (공개) */
  @Get('rankings')
  @ApiOperation({ summary: '글로벌 랭킹 + 업적' })
  getRankings() {
    return this.usersService.getRankings();
  }

  /** 내가 찜한 식당 목록 */
  @Get('me/wishlists')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내가 찜한 식당 목록' })
  getMyWishlists(@CurrentUser() user: { id: string }) {
    return this.usersService.getMyWishlists(user.id);
  }

  /** 내 알림 목록 */
  @Get('me/notifications')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 알림 목록' })
  getMyNotifications(@CurrentUser() user: { id: string }) {
    return this.usersService.getMyNotifications(user.id);
  }

  /** 안 읽은 알림 수 */
  @Get('me/notifications/unread-count')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '안 읽은 알림 수' })
  getUnreadNotificationCount(@CurrentUser() user: { id: string }) {
    return this.usersService.getUnreadNotificationCount(user.id);
  }

  /** 알림 모두 읽음 처리 */
  @Patch('me/notifications/read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '알림 모두 읽음 처리' })
  markNotificationsRead(@CurrentUser() user: { id: string }) {
    return this.usersService.markNotificationsRead(user.id);
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

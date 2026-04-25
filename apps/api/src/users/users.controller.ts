import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { FcmService } from '../fcm/fcm.service';

@ApiTags('사용자')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly fcmService: FcmService,
  ) {}

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
    return this.usersService.updateProfile(user.id, dto.nickname, dto.profileImageUrl);
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

  /** FCM 토큰 등록 */
  @Post('me/fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'FCM 푸시 토큰 등록' })
  registerFcmToken(
    @CurrentUser() user: { id: string },
    @Body() body: { token: string; device?: string },
  ) {
    return this.fcmService.registerToken(user.id, body.token, body.device);
  }

  /** FCM 토큰 삭제 */
  @Delete('me/fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'FCM 푸시 토큰 삭제' })
  removeFcmToken(
    @CurrentUser() user: { id: string },
    @Body() body: { token: string },
  ) {
    return this.fcmService.removeToken(body.token);
  }

  /** 셀프 푸시 테스트: 본인에게 즉시 알림 발송 */
  @Post('me/push-test')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '본인에게 테스트 푸시 발송' })
  async testPush(@CurrentUser() user: { id: string }) {
    await this.fcmService.sendToUsers(
      [user.id],
      '🔔 푸시 테스트',
      '푸시가 정상 작동합니다!',
      { link: '/profile' },
    );
    return { ok: true };
  }

  /** 푸시 알림 on/off 토글 */
  @Patch('me/push-enabled')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '푸시 알림 수신 설정' })
  async togglePushEnabled(
    @CurrentUser() user: { id: string },
    @Body() body: { enabled: boolean },
  ) {
    return this.usersService.updatePushEnabled(user.id, body.enabled);
  }

  /** 온보딩 완료 처리 */
  @Patch('me/onboarding-completed')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '온보딩 완료 처리' })
  async completeOnboarding(@CurrentUser() user: { id: string }) {
    return this.usersService.completeOnboarding(user.id);
  }

  /** 내가 완료한 튜토리얼 키 목록 */
  @Get('me/tutorials')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '완료한 튜토리얼 키 목록' })
  getCompletedTutorials(@CurrentUser() user: { id: string }) {
    return this.usersService.getCompletedTutorials(user.id);
  }

  /** 튜토리얼 완료 처리 */
  @Post('me/tutorials/:key/complete')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '튜토리얼 완료 처리' })
  @ApiParam({ name: 'key', description: '튜토리얼 키 (create_room, add_restaurant 등)' })
  completeTutorial(
    @CurrentUser() user: { id: string },
    @Param('key') key: string,
  ) {
    return this.usersService.completeTutorial(user.id, key);
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

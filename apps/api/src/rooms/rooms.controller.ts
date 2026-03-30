import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoomMemberGuard } from './guards/room-member.guard';
import { RoomsService } from './rooms.service';
import { RoomStatsService } from './room-stats.service';
import type { CreateRoomDto } from './dto/create-room.dto';
import type { JoinRoomDto } from './dto/join-room.dto';
import type { CreateRoomRestaurantDto } from './dto/create-room-restaurant.dto';
import type { CreateRoomReviewDto } from './dto/create-room-review.dto';
import type { UpdateRoomReviewDto } from './dto/update-room-review.dto';
import type { CreateRoomVisitDto } from './dto/create-room-visit.dto';
import type { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import type { TogglePublicDto } from './dto/toggle-public.dto';
import type { UpdateRoomDto } from './dto/update-room.dto';
import type { UpdateRoomRestaurantDto } from './dto/update-room-restaurant.dto';
import type { UpdateRoomVisitDto } from './dto/update-room-visit.dto';
import type { CreatePollDto } from './dto/create-poll.dto';


interface RequestWithRoomMember extends Request {
  roomMember: { role: 'owner' | 'manager' | 'member' };
}

@ApiTags('방')
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly roomsService: RoomsService,
    private readonly roomStatsService: RoomStatsService,
  ) {}

  // ─── 방 관리 ───

  /** 방 생성 */
  @Post()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 생성' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto.name, user.id, dto.isPublic);
  }

  /** 내 방 목록 */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '내 방 목록' })
  findMyRooms(@CurrentUser() user: { id: string }) {
    return this.roomsService.findMyRooms(user.id);
  }

  /** 초대 코드로 입장 */
  @Post('join')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '초대 코드로 방 입장' })
  join(@CurrentUser() user: { id: string }, @Body() dto: JoinRoomDto) {
    return this.roomsService.join(dto.inviteCode, user.id);
  }

  // ─── 공개 API (비로그인) ───

  /** 플랫폼 공개 통계 */
  @Get('platform-stats')
  @ApiOperation({ summary: '플랫폼 공개 통계 (비로그인 가능)' })
  getPlatformStats() {
    return this.roomStatsService.getPlatformStats();
  }

  /** 공개 맛집 추천 (로그인 불필요) */
  @Get('discover')
  @ApiOperation({ summary: '공개 맛집 추천 리스트 (비로그인 가능)' })
  getDiscoverRestaurants() {
    return this.roomsService.getDiscoverRestaurants();
  }

  // ─── 공개 방 API (비로그인) ───

  /** 공개 방 목록 */
  @Get('public')
  @ApiOperation({ summary: '공개 방 목록 (비로그인 가능)' })
  findPublicRooms(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.roomsService.findPublicRooms(
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(50, parseInt(pageSize, 10)) : 10,
    );
  }

  /** 공개 방 sitemap용 ID 목록 */
  @Get('public/sitemap-ids')
  @ApiOperation({ summary: '공개 방 ID 목록 (sitemap용, 비로그인 가능)' })
  getPublicRoomSitemapIds() {
    return this.roomsService.findPublicRoomIds();
  }

  /** 공개 방 상세 */
  @Get('public/:id')
  @ApiOperation({ summary: '공개 방 상세 (비로그인 가능)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  findPublicRoomDetail(@Param('id') id: string) {
    return this.roomsService.findPublicRoomDetail(id);
  }

  /** 공개 방 식당 상세 */
  @Get('public/:id/restaurants/:rid')
  @ApiOperation({ summary: '공개 방 식당 상세 (비로그인 가능)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'rid', description: '식당 ID' })
  findPublicRoomRestaurantDetail(
    @Param('id') id: string,
    @Param('rid') rid: string,
  ) {
    return this.roomsService.findPublicRoomRestaurantDetail(id, rid);
  }

  /** 방 통계 */
  @Get(':id/stats')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 통계 조회' })
  @ApiParam({ name: 'id', description: '방 ID' })
  getRoomStats(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.roomStatsService.getRoomStats(id, user.id);
  }

  /** 방 상세 */
  @Get(':id')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 상세 조회' })
  @ApiParam({ name: 'id', description: '방 ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.roomsService.findOne(id, user.id);
  }

  /** 방 이름 수정 */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 이름 수정 (방장만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  updateRoom(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.updateRoom(id, dto.name, user.id);
  }

  /** 방 삭제 */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 삭제 (방장만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.roomsService.remove(id, user.id);
  }

  /** 초대 코드 재생성 (owner만) */
  @Patch(':id/invite-code')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '초대 코드 재생성 (방장만, 24시간 만료)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  regenerateInviteCode(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.roomsService.regenerateInviteCode(id, user.id);
  }

  /** 공개 방 설정 (owner만) */
  @Patch(':id/public')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '공개 방 설정 (방장만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  togglePublic(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: TogglePublicDto,
  ) {
    return this.roomsService.togglePublic(id, user.id, dto.isPublic);
  }

  /** 멤버 역할 변경 */
  @Patch(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '멤버 역할 변경 (방장만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'userId', description: '대상 유저 ID' })
  updateMemberRole(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.roomsService.updateMemberRole(id, targetUserId, dto.role, user.id);
  }

  /** 멤버 강퇴 */
  @Delete(':id/members/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '멤버 강퇴 (방장만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'userId', description: '대상 유저 ID' })
  kickMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.roomsService.kickMember(id, targetUserId, user.id);
  }

  /** 방장 위임 */
  @Patch(':id/transfer/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방장 위임 (방장만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'userId', description: '대상 유저 ID' })
  transferOwnership(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.roomsService.transferOwnership(id, targetUserId, user.id);
  }

  /** 방 나가기 */
  @Post(':id/leave')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 나가기' })
  @ApiParam({ name: 'id', description: '방 ID' })
  leave(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.roomsService.leave(id, user.id);
  }

  // ─── 방 내 식당 ───

  /** 방 내 식당 목록 (페이지네이션) */
  @Get(':id/restaurants')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 식당 목록 (페이지네이션)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  findRestaurants(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('sort') sort?: string,
  ) {
    return this.roomsService.findRestaurants(id, user.id, {
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
      search,
      category,
      sort,
    });
  }

  /** 방 내 식당 등록 */
  @Post(':id/restaurants')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 식당 등록' })
  @ApiParam({ name: 'id', description: '방 ID' })
  createRestaurant(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRoomRestaurantDto,
  ) {
    return this.roomsService.createRestaurant(
      id, user.id, dto.name, dto.address, dto.province, dto.city, dto.neighborhood, dto.category, dto.imageUrl, dto.latitude, dto.longitude,
    );
  }

  /** 방 내 식당 상세 */
  @Get(':id/restaurants/:rid')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 식당 상세 (리뷰 포함)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'rid', description: '식당 ID' })
  async findRestaurantDetail(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Req() req: RequestWithRoomMember,
  ) {
    const detail = await this.roomsService.findRestaurantDetail(id, rid);
    return { ...detail, myRole: req.roomMember.role };
  }

  /** 방 내 식당 수정 */
  @Patch(':id/restaurants/:rid')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 식당 수정 (본인 또는 매니저+)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'rid', description: '식당 ID' })
  updateRestaurant(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @CurrentUser() user: { id: string },
    @Req() req: RequestWithRoomMember,
    @Body() dto: UpdateRoomRestaurantDto,
  ) {
    return this.roomsService.updateRestaurant(id, rid, user.id, req.roomMember.role, {
      name: dto.name,
      category: dto.category,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
      isClosed: dto.isClosed,
    });
  }

  /** 방 내 식당 삭제 */
  @Delete(':id/restaurants/:rid')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 식당 삭제 (본인 또는 매니저+)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'rid', description: '식당 ID' })
  removeRestaurant(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @CurrentUser() user: { id: string },
    @Req() req: RequestWithRoomMember,
  ) {
    return this.roomsService.removeRestaurant(id, rid, user.id, req.roomMember.role);
  }

  // ─── 방문 기록 ───

  /** 방문 기록 생성 */
  @Post(':id/restaurants/:rid/visits')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방문 기록 생성' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'rid', description: '식당 ID' })
  createVisit(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRoomVisitDto,
  ) {
    return this.roomsService.createVisit(id, rid, user.id, dto.visitedAt, dto.memo, dto.waitTime, dto.participantIds);
  }

  /** 방문 기록 수정 (생성자 or 매니저+) */
  @Patch(':id/visits/:visitId')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방문 기록 수정 (생성자 또는 매니저+)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'visitId', description: '방문 ID' })
  updateVisit(
    @Param('visitId') visitId: string,
    @CurrentUser() user: { id: string },
    @Req() req: RequestWithRoomMember,
    @Body() dto: UpdateRoomVisitDto,
  ) {
    return this.roomsService.updateVisit(visitId, user.id, req.roomMember.role, {
      visitedAt: dto.visitedAt,
      memo: dto.memo,
      waitTime: dto.waitTime,
    });
  }

  /** 방문 기록 삭제 (생성자 or 매니저+) */
  @Delete(':id/visits/:visitId')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방문 기록 삭제 (생성자 또는 매니저+)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'visitId', description: '방문 ID' })
  removeVisit(
    @Param('visitId') visitId: string,
    @CurrentUser() user: { id: string },
    @Req() req: RequestWithRoomMember,
  ) {
    return this.roomsService.removeVisit(visitId, user.id, req.roomMember.role);
  }

  // ─── 방 내 리뷰 ───

  /** 방문 기록에 리뷰 작성 */
  @Post(':id/visits/:visitId/reviews')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방문 기록에 리뷰 작성 (방문당 1인 1리뷰)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'visitId', description: '방문 ID' })
  createReview(
    @Param('visitId') visitId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRoomReviewDto,
  ) {
    return this.roomsService.createReview(
      visitId, user.id, dto.rating, dto.content, dto.wouldRevisit,
      dto.tasteRating, dto.valueRating, dto.serviceRating,
      dto.cleanlinessRating, dto.accessibilityRating,
      dto.favoriteMenu, dto.tryNextMenu,
    );
  }

  /** 리뷰 수정 (본인만) */
  @Patch(':id/reviews/:revId')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '리뷰 수정 (본인만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'revId', description: '리뷰 ID' })
  updateReview(
    @Param('revId') revId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRoomReviewDto,
  ) {
    return this.roomsService.updateReview(revId, user.id, {
      rating: dto.rating,
      content: dto.content,
      wouldRevisit: dto.wouldRevisit,
      tasteRating: dto.tasteRating,
      valueRating: dto.valueRating,
      serviceRating: dto.serviceRating,
      cleanlinessRating: dto.cleanlinessRating,
      accessibilityRating: dto.accessibilityRating,
      favoriteMenu: dto.favoriteMenu,
      tryNextMenu: dto.tryNextMenu,
    });
  }

  /** 리뷰 삭제 (본인 또는 매니저+) */
  @Delete(':id/reviews/:revId')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '리뷰 삭제 (본인 또는 매니저+)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'revId', description: '리뷰 ID' })
  removeReview(
    @Param('revId') revId: string,
    @CurrentUser() user: { id: string },
    @Req() req: RequestWithRoomMember,
  ) {
    return this.roomsService.removeReview(revId, user.id, req.roomMember.role);
  }

  // ─── 투표 ───

  /** 투표 생성 */
  @Post(':id/polls')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '투표 생성' })
  @ApiParam({ name: 'id', description: '방 ID' })
  createPoll(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePollDto,
  ) {
    return this.roomsService.createPoll(id, user.id, dto.title, dto.options, dto.endsAt);
  }

  /** 투표 목록 조회 */
  @Get(':id/polls')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '투표 목록 조회' })
  @ApiParam({ name: 'id', description: '방 ID' })
  getPolls(@Param('id') id: string) {
    return this.roomsService.getPolls(id);
  }

  /** 투표 참여 */
  @Post(':id/polls/:pollId/vote')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '투표 참여 (선택지에 투표)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'pollId', description: '투표 ID' })
  votePoll(
    @Param('pollId') pollId: string,
    @CurrentUser() user: { id: string },
    @Body() body: { optionId: string },
  ) {
    return this.roomsService.votePoll(pollId, body.optionId, user.id);
  }

  /** 투표 마감 */
  @Patch(':id/polls/:pollId/close')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '투표 마감 (생성자만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'pollId', description: '투표 ID' })
  closePoll(
    @Param('pollId') pollId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.roomsService.closePoll(pollId, user.id);
  }

  // ─── 타임라인 ───

  /** 방 활동 타임라인 */
  @Get(':id/timeline')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 활동 타임라인' })
  @ApiParam({ name: 'id', description: '방 ID' })
  getTimeline(@Param('id') id: string) {
    return this.roomsService.getTimeline(id);
  }

  // ─── 리뷰 비교 ───

  /** 식당별 멤버 리뷰 비교 */
  @Get(':id/restaurants/:rid/compare')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '식당별 멤버 리뷰 비교' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'rid', description: '식당 ID' })
  compareReviews(@Param('rid') rid: string) {
    return this.roomsService.compareReviews(rid);
  }

}

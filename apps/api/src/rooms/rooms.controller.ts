import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RoomMemberGuard } from './guards/room-member.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { CreateRoomRestaurantDto } from './dto/create-room-restaurant.dto';
import { CreateRoomReviewDto } from './dto/create-room-review.dto';
import { UpdateRoomReviewDto } from './dto/update-room-review.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

interface RequestWithRoomMember extends Request {
  roomMember: { role: string };
}

@ApiTags('방')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // ─── 방 관리 ───

  /** 방 생성 */
  @Post()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 생성' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto.name, user.id);
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

  /** 방 상세 */
  @Get(':id')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 상세 조회' })
  @ApiParam({ name: 'id', description: '방 ID' })
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  /** 방 삭제 */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '방 삭제 (방장만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.roomsService.remove(id, user.id);
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

  /** 방 나가기 */
  @Post(':id/leave')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 나가기' })
  @ApiParam({ name: 'id', description: '방 ID' })
  leave(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.roomsService.leave(id, user.id);
  }

  // ─── 방 내 식당 ───

  /** 방 내 식당 목록 */
  @Get(':id/restaurants')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 식당 목록' })
  @ApiParam({ name: 'id', description: '방 ID' })
  findRestaurants(@Param('id') id: string) {
    return this.roomsService.findRestaurants(id);
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
      id, user.id, dto.name, dto.address, dto.province, dto.city, dto.neighborhood, dto.category, dto.imageUrl,
    );
  }

  /** 방 내 식당 상세 */
  @Get(':id/restaurants/:rid')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 식당 상세 (리뷰 포함)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'rid', description: '식당 ID' })
  findRestaurantDetail(@Param('id') id: string, @Param('rid') rid: string) {
    return this.roomsService.findRestaurantDetail(id, rid);
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

  // ─── 방 내 리뷰 ───

  /** 방 내 리뷰 작성 */
  @Post(':id/restaurants/:rid/reviews')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 리뷰 작성' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'rid', description: '식당 ID' })
  createReview(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRoomReviewDto,
  ) {
    return this.roomsService.createReview(id, rid, user.id, dto.rating, dto.content);
  }

  /** 방 내 리뷰 수정 (본인만) */
  @Patch(':id/reviews/:revId')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 리뷰 수정 (본인만)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'revId', description: '리뷰 ID' })
  updateReview(
    @Param('revId') revId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRoomReviewDto,
  ) {
    return this.roomsService.updateReview(revId, user.id, dto.rating, dto.content);
  }

  /** 방 내 리뷰 삭제 (본인 또는 매니저+) */
  @Delete(':id/reviews/:revId')
  @UseGuards(RoomMemberGuard)
  @ApiOperation({ summary: '방 내 리뷰 삭제 (본인 또는 매니저+)' })
  @ApiParam({ name: 'id', description: '방 ID' })
  @ApiParam({ name: 'revId', description: '리뷰 ID' })
  removeReview(
    @Param('revId') revId: string,
    @CurrentUser() user: { id: string },
    @Req() req: RequestWithRoomMember,
  ) {
    return this.roomsService.removeReview(revId, user.id, req.roomMember.role);
  }
}

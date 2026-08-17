import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RoomsService } from './rooms.service';
import { VoteSharedPollDto } from './dto/vote-shared-poll.dto';

/**
 * 공유 링크로 여는 투표 (비로그인).
 *
 * 방의 나머지 데이터(멤버·식당·리뷰)는 여기로 나가지 않는다 — 투표 제목,
 * 선택지, 득표수만. 링크를 아는 사람만 접근 가능하며 발급 후 14일이 지나면 만료된다.
 */
@ApiTags('투표 공유')
@Controller('polls')
export class PollsController {
  constructor(private readonly roomsService: RoomsService) {}

  /** 공유 투표 조회 */
  @Get('shared/:token')
  @Throttle({ default: { ttl: 60000, limit: 60 } })
  @ApiOperation({ summary: '공유 투표 조회 (비로그인 가능)' })
  @ApiParam({ name: 'token', description: '공유 토큰' })
  getSharedPoll(@Param('token') token: string) {
    return this.roomsService.getSharedPoll(token);
  }

  /** 공유 투표 참여 */
  @Post('shared/:token/vote')
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '공유 투표 참여 (비로그인 가능)' })
  @ApiParam({ name: 'token', description: '공유 토큰' })
  voteSharedPoll(@Param('token') token: string, @Body() dto: VoteSharedPollDto) {
    return this.roomsService.voteSharedPoll(token, dto.optionId, dto.guestKey, dto.guestName);
  }
}

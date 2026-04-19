import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlacesService } from './places.service';

@ApiTags('장소 검색')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  /** 네이버 장소 검색 프록시 (start: 1..1000, 페이지당 5개) */
  @Get('naver')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: '네이버 로컬 장소 검색' })
  async searchNaver(
    @Query('q') query: string,
    @Query('start') startStr: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const start = startStr ? Number(startStr) : 1;
    const { items, reason, start: usedStart, hasMore } = await this.placesService.searchNaver(query, start);
    res.setHeader('X-Places-Debug', reason);
    res.setHeader('X-Places-Start', String(usedStart));
    res.setHeader('X-Places-Has-More', hasMore ? '1' : '0');
    return items;
  }
}

import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Response } from 'express';
import { OgService } from './og.service';

@ApiTags('OG 이미지')
@Controller('og')
export class OgController {
  constructor(private readonly ogService: OgService) {}

  /** 공개 방 OG 이미지 (PNG, 1200×630) */
  @Get('public-rooms/:id.png')
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: '공개 방 OG 이미지' })
  async publicRoomOg(@Param('id') id: string, @Res() res: Response) {
    try {
      const png = await this.ogService.renderPublicRoomOg(id);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      res.send(png);
    } catch (err) {
      if (err instanceof NotFoundException) {
        res.status(404).send('Not Found');
        return;
      }
      res.status(500).send('OG 생성 실패');
    }
  }
}

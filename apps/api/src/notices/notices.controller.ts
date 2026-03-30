import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import type { NoticesService } from './notices.service';
import type { CreateNoticeDto } from './dto/create-notice.dto';
import type { UpdateNoticeDto } from './dto/update-notice.dto';

@ApiTags('공지사항')
@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  /** 활성 공지 목록 (공개) */
  @Get()
  @ApiOperation({ summary: '활성 공지 목록', description: '활성화된 공지사항 목록을 조회합니다.' })
  findActive() {
    return this.noticesService.findActive();
  }

  /** 전체 공지 목록 (관리자) */
  @Get('all')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '전체 공지 목록', description: '비활성 포함 전체 공지 목록. 관리자 권한 필요.' })
  findAll() {
    return this.noticesService.findAll();
  }

  /** 공지 생성 (관리자) */
  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지 생성', description: '새 공지사항을 등록합니다. 관리자 권한 필요.' })
  create(@Body() dto: CreateNoticeDto) {
    return this.noticesService.create(dto.title, dto.content, dto.enabled ?? true);
  }

  /** 공지 수정 (관리자) */
  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지 수정', description: '공지사항을 수정합니다. 관리자 권한 필요.' })
  update(@Param('id') id: string, @Body() dto: UpdateNoticeDto) {
    return this.noticesService.update(id, {
      title: dto.title,
      content: dto.content,
      enabled: dto.enabled,
    });
  }

  /** 공지 삭제 (관리자) */
  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '공지 삭제', description: '공지사항을 삭제합니다. 관리자 권한 필요.' })
  remove(@Param('id') id: string) {
    return this.noticesService.remove(id);
  }
}

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { InquiriesService } from './inquiries.service';
import type { CreateInquiryDto } from './dto/create-inquiry.dto';

@ApiTags('문의')
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  /** 문의 등록 */
  @Post()
  @ApiOperation({ summary: '문의 등록', description: '고객 문의를 등록합니다. SMTP 설정 시 관리자에게 이메일 알림.' })
  create(@Body() dto: CreateInquiryDto) {
    return this.inquiriesService.create(dto.category, dto.email, dto.subject, dto.content);
  }

  /** 문의 목록 조회 (관리자 전용) */
  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: '문의 목록 조회', description: '전체 문의 목록을 조회합니다. 관리자 권한 필요.' })
  findAll() {
    return this.inquiriesService.findAll();
  }
}

import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { DemoAccountsService } from './demo-accounts.service';
import { CreateDemoAccountDto } from './dto/create-demo-account.dto';
import { UpdateDemoAccountDto } from './dto/update-demo-account.dto';

@ApiTags('관리자 - 데모 계정')
@Controller('admin/demo-accounts')
@UseGuards(AdminGuard)
export class DemoAccountsController {
  constructor(private readonly demoAccountsService: DemoAccountsService) {}

  /** 데모 계정 생성 */
  @Post()
  @ApiOperation({ summary: '데모 계정 생성' })
  create(@Body() dto: CreateDemoAccountDto) {
    return this.demoAccountsService.create(dto.nickname, dto.memo, dto.profileImageUrl);
  }

  /** 데모 계정 목록 조회 */
  @Get()
  @ApiOperation({ summary: '데모 계정 목록 조회' })
  findAll() {
    return this.demoAccountsService.findAll();
  }

  /** 데모 계정 수정 */
  @Patch(':id')
  @ApiOperation({ summary: '데모 계정 수정' })
  update(@Param('id') id: string, @Body() dto: UpdateDemoAccountDto) {
    return this.demoAccountsService.update(id, dto.nickname, dto.memo, dto.profileImageUrl);
  }

  /** 데모 계정 삭제 */
  @Delete(':id')
  @ApiOperation({ summary: '데모 계정 삭제' })
  remove(@Param('id') id: string) {
    return this.demoAccountsService.remove(id);
  }

  /** 데모 계정으로 로그인 (JWT 토큰 발급) */
  @Post(':id/login')
  @ApiOperation({ summary: '데모 계정으로 로그인' })
  loginAs(@Param('id') id: string) {
    return this.demoAccountsService.loginAs(id);
  }
}

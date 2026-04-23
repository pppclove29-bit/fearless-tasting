import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpsertMappingDto } from './dto/upsert-mapping.dto';

@ApiTags('관리자 - 카테고리')
@Controller('admin/categories')
@UseGuards(AdminGuard)
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** 전체 카테고리 목록 (비활성 포함) */
  @Get()
  @ApiOperation({ summary: '전체 카테고리 목록' })
  list() {
    return this.categoriesService.listAll();
  }

  /** 카테고리 생성 */
  @Post()
  @ApiOperation({ summary: '카테고리 생성' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory({
      name: dto.name,
      emoji: dto.emoji,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive,
    });
  }

  /** 카테고리 수정 */
  @Patch(':id')
  @ApiOperation({ summary: '카테고리 수정' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.updateCategory(id, {
      name: dto.name,
      emoji: dto.emoji,
      displayOrder: dto.displayOrder,
      isActive: dto.isActive,
    });
  }

  /** 카테고리 삭제 */
  @Delete(':id')
  @ApiOperation({ summary: '카테고리 삭제' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deleteCategory(id);
  }

  /** 미매핑 원본 값 목록 (매핑 대기 큐) */
  @Get('unmapped')
  @ApiOperation({ summary: '미매핑 원본 값 목록' })
  unmapped() {
    return this.categoriesService.listUnmapped();
  }

  /** 매핑 규칙 목록 */
  @Get('mappings')
  @ApiOperation({ summary: '매핑 규칙 목록' })
  mappings() {
    return this.categoriesService.listMappings();
  }

  /** 매핑 생성/수정 (+ 기존 식당 일괄 업데이트) */
  @Post('mappings')
  @ApiOperation({ summary: '매핑 생성/수정' })
  upsertMapping(@Body() dto: UpsertMappingDto) {
    return this.categoriesService.upsertMapping(dto.rawInput, dto.categoryId);
  }

  /** 매핑 삭제 */
  @Delete('mappings/:id')
  @ApiOperation({ summary: '매핑 삭제' })
  deleteMapping(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.deleteMapping(id);
  }
}

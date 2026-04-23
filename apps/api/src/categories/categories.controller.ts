import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CategoriesService } from './categories.service';

@ApiTags('카테고리')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** 활성 카테고리 목록 (공개 UI 칩/필터용) */
  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  @ApiOperation({ summary: '활성 카테고리 목록' })
  listActive() {
    return this.categoriesService.listActive();
  }
}

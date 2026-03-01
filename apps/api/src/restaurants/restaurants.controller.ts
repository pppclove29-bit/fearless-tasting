import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { AreaCountsQueryDto } from './dto/area-counts-query.dto';
import { FindRestaurantsQueryDto } from './dto/find-restaurants-query.dto';

@ApiTags('식당')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  /** 식당 목록 조회 (지역 필터 지원) */
  @Get()
  @ApiOperation({ summary: '식당 목록 조회', description: '지역 필터를 적용하여 식당 목록을 조회합니다.' })
  findAll(@Query() query: FindRestaurantsQueryDto) {
    return this.restaurantsService.findAll(
      query.province,
      query.city,
      query.neighborhood,
    );
  }

  /** 지역별 식당 수 + 평균 평점 조회 */
  @Get('areas/counts')
  @ApiOperation({ summary: '지역별 식당 수 조회', description: '계층적 지역별 식당 수와 평균 평점을 조회합니다. 파라미터 없으면 시/도별, province만 있으면 시/군/구별, 둘 다 있으면 읍/면/동별 집계.' })
  getAreaCounts(@Query() query: AreaCountsQueryDto) {
    return this.restaurantsService.getAreaCounts(
      query.province,
      query.city,
    );
  }

  /** 식당 단건 조회 */
  @Get(':id')
  @ApiOperation({ summary: '식당 단건 조회', description: '식당 ID로 상세 정보와 리뷰를 조회합니다.' })
  @ApiParam({ name: 'id', description: '식당 ID' })
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  /** 식당 등록 (로그인 필수) */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '식당 등록', description: '새로운 식당을 등록합니다. 로그인 필수.' })
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(
      dto.name,
      dto.address,
      dto.province,
      dto.city,
      dto.neighborhood,
      dto.category,
      dto.imageUrl,
    );
  }
}

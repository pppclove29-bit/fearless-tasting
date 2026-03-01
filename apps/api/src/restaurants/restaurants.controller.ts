import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { AreaCountsQueryDto } from './dto/area-counts-query.dto';
import { FindRestaurantsQueryDto } from './dto/find-restaurants-query.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  /** 식당 목록 조회 (지역 필터 지원) */
  @Get()
  findAll(@Query() query: FindRestaurantsQueryDto) {
    return this.restaurantsService.findAll(
      query.province,
      query.city,
      query.neighborhood,
    );
  }

  /** 지역별 식당 수 조회 */
  @Get('areas/counts')
  getAreaCounts(@Query() query: AreaCountsQueryDto) {
    return this.restaurantsService.getAreaCounts(
      query.province,
      query.city,
    );
  }

  /** 식당 단건 조회 */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  /** 식당 등록 */
  @Post()
  create(@Body() dto: CreateRestaurantDto) {
    return this.restaurantsService.create(
      dto.name,
      dto.address,
      dto.province,
      dto.city,
      dto.neighborhood,
      dto.latitude,
      dto.longitude,
      dto.category,
      dto.imageUrl,
    );
  }
}

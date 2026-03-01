import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  /** 식당 목록 조회 */
  @Get()
  findAll() {
    return this.restaurantsService.findAll();
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
      dto.neighborhood,
      dto.latitude,
      dto.longitude,
      dto.category,
      dto.imageUrl,
    );
  }
}

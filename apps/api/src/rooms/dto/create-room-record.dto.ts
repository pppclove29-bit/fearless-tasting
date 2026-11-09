import {
  IsBoolean,
  IsDefined,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreateRoomRestaurantDto } from './create-room-restaurant.dto';
import { CreateRoomVisitDto } from './create-room-visit.dto';
import { CreateRoomReviewDto } from './create-room-review.dto';

/**
 * 식당 등록 위저드 한 번에 저장: (식당) + 방문 + 리뷰.
 * restaurantId(기존 식당) 또는 restaurant(새 식당) 중 정확히 하나를 보낸다.
 */
export class CreateRoomRecordDto {
  @ApiPropertyOptional({ description: '기존 식당 ID (기존 식당에 기록할 때)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  restaurantId?: string;

  @ApiPropertyOptional({
    description: '새 식당 정보 (새 식당을 등록하면서 기록할 때)',
    type: CreateRoomRestaurantDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateRoomRestaurantDto)
  restaurant?: CreateRoomRestaurantDto;

  @ApiProperty({ description: '방문 정보', type: CreateRoomVisitDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateRoomVisitDto)
  visit!: CreateRoomVisitDto;

  @ApiProperty({ description: '리뷰 정보', type: CreateRoomReviewDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateRoomReviewDto)
  review!: CreateRoomReviewDto;

  @ApiPropertyOptional({
    description: '기존 식당이 위시리스트면 해제 (위시리스트에서 방문 기록할 때)',
  })
  @IsOptional()
  @IsBoolean()
  clearWishlist?: boolean;
}

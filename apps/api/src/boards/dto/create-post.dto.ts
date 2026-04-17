import { IsString, IsBoolean, IsOptional, IsNumber, MaxLength, ValidateNested, ArrayMaxSize, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PostRestaurantDto {
  @ApiProperty({ description: '식당 이름' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: '주소' })
  @IsString()
  @MaxLength(300)
  address!: string;

  @ApiPropertyOptional({ description: '카테고리' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ description: '위도' })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ description: '경도' })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: '카카오 장소 ID' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  kakaoPlaceId?: string;
}

export class CreatePostDto {
  @ApiProperty({ description: '게시글 제목', example: '맛집 추천합니다' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: '게시글 본문', example: '강남역 근처에 맛있는 곳 발견했어요!' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: '익명 여부', example: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: '태그 식당 목록 (최대 5개)' })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PostRestaurantDto)
  @ArrayMaxSize(5)
  restaurants?: PostRestaurantDto[];
}

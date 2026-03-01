import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRestaurantDto {
  @ApiProperty({ description: '식당 이름', example: '맛있는 김치찌개' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '도로명/지번 주소', example: '서울특별시 강남구 역삼동 123-45' })
  @IsString()
  address!: string;

  @ApiProperty({ description: '시/도', example: '서울특별시' })
  @IsString()
  province!: string;

  @ApiProperty({ description: '시/군/구', example: '강남구' })
  @IsString()
  city!: string;

  @ApiProperty({ description: '읍/면/동', example: '역삼동' })
  @IsString()
  neighborhood!: string;

  @ApiProperty({ description: '카테고리', example: '한식' })
  @IsString()
  category!: string;

  @ApiPropertyOptional({ description: '대표 이미지 URL', example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}

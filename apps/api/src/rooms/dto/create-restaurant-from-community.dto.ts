import { IsString, IsOptional, IsNumber, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRestaurantFromCommunityDto {
  @ApiProperty({ description: '식당 이름' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ description: '주소' })
  @IsString()
  @MaxLength(500)
  address!: string;

  @ApiProperty({ description: '시/도' })
  @IsString()
  @MaxLength(50)
  province!: string;

  @ApiProperty({ description: '시/군/구' })
  @IsString()
  @MaxLength(50)
  city!: string;

  @ApiProperty({ description: '읍/면/동' })
  @IsString()
  @MaxLength(100)
  neighborhood!: string;

  @ApiPropertyOptional({ description: '카테고리' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
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
}

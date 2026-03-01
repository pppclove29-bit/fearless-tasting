import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindRestaurantsQueryDto {
  @ApiPropertyOptional({ description: '시/도', example: '서울특별시' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: '시/군/구', example: '강남구' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: '읍/면/동', example: '역삼동' })
  @IsOptional()
  @IsString()
  neighborhood?: string;
}

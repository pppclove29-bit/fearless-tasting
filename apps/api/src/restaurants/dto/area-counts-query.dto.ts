import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AreaCountsQueryDto {
  @ApiPropertyOptional({ description: '시/도 (없으면 시/도별 집계)', example: '서울특별시' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ description: '시/군/구 (없으면 시/군/구별 집계)', example: '강남구' })
  @IsOptional()
  @IsString()
  city?: string;
}

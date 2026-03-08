import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const WAIT_TIMES = ['없음', '~10분', '~30분', '~1시간', '1시간+'] as const;

export class UpdateRoomRestaurantDto {
  @ApiPropertyOptional({ description: '식당 이름' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: '카테고리' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: '웨이팅' })
  @IsOptional()
  @IsString()
  @IsIn([...WAIT_TIMES, ''])
  waitTime?: string;
}

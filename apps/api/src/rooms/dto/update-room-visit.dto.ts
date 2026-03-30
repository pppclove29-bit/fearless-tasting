import { IsOptional, IsDateString, IsString, IsIn, MaxLength, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const WAIT_TIMES = ['없음', '~10분', '~30분', '~1시간', '1시간+'] as const;

export class UpdateRoomVisitDto {
  @ApiPropertyOptional({ description: '방문 날짜' })
  @IsOptional()
  @IsDateString()
  visitedAt?: string;

  @ApiPropertyOptional({ description: '메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @ApiPropertyOptional({ description: '웨이팅' })
  @IsOptional()
  @IsString()
  @IsIn([...WAIT_TIMES, ''])
  waitTime?: string;

  @ApiPropertyOptional({ description: '배달 여부' })
  @IsOptional()
  @IsBoolean()
  isDelivery?: boolean;
}

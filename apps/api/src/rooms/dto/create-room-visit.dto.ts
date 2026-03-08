import { IsString, IsOptional, IsDateString, IsArray, IsIn, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const WAIT_TIMES = ['없음', '~10분', '~30분', '~1시간', '1시간+'] as const;

export class CreateRoomVisitDto {
  @ApiProperty({ description: '방문 날짜 (YYYY-MM-DD)', example: '2026-03-08' })
  @IsDateString()
  visitedAt!: string;

  @ApiPropertyOptional({ description: '방문 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  memo?: string;

  @ApiPropertyOptional({ description: '웨이팅 (없음/~10분/~30분/~1시간/1시간+)' })
  @IsOptional()
  @IsString()
  @IsIn(WAIT_TIMES)
  waitTime?: string;

  @ApiPropertyOptional({ description: '함께 간 멤버 ID 목록' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];
}

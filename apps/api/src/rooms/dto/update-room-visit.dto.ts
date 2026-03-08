import { IsOptional, IsDateString, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
}

import { IsString, MaxLength, IsBoolean, IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNoticeDto {
  @ApiPropertyOptional({ description: '공지 제목', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '공지 본문' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: '활성 여부' })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서 (작을수록 위)' })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

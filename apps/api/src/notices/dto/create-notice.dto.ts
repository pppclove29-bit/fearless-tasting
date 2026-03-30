import { IsString, MaxLength, IsBoolean, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNoticeDto {
  @ApiProperty({ description: '공지 제목', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: '공지 본문' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: '활성 여부', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '정렬 순서 (작을수록 위)', default: 0 })
  @IsInt()
  @IsOptional()
  sortOrder?: number;
}

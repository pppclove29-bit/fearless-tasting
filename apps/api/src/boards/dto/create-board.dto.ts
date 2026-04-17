import { IsString, IsOptional, IsInt, IsBoolean, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBoardDto {
  @ApiProperty({ description: '게시판 이름', example: '자유게시판' })
  @IsString()
  @MaxLength(50)
  name!: string;

  @ApiProperty({ description: 'URL 슬러그 (영소문자, 숫자, 하이픈)', example: 'free' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: '슬러그는 영소문자, 숫자, 하이픈만 사용 가능합니다' })
  slug!: string;

  @ApiPropertyOptional({ description: '게시판 설명', example: '자유롭게 이야기하는 공간' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({ description: '정렬 순서', example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: '활성 여부', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: '인기글 기준 좋아요 수', example: 5 })
  @IsOptional()
  @IsInt()
  popularThreshold?: number;
}

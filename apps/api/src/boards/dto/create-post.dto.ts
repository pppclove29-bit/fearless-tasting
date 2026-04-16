import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ description: '게시글 제목', example: '맛집 추천합니다' })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: '게시글 본문', example: '강남역 근처에 맛있는 곳 발견했어요!' })
  @IsString()
  content!: string;
}

import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: '댓글 내용', example: '좋은 정보 감사합니다!' })
  @IsString()
  content!: string;
}

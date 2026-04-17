import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: '댓글 내용', example: '좋은 정보 감사합니다!' })
  @IsString()
  content!: string;

  @ApiProperty({ description: '익명 여부', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

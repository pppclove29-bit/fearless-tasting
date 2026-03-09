import { IsString, MaxLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNoticeDto {
  @ApiProperty({ description: '공지 제목', maxLength: 200, required: false })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @ApiProperty({ description: '공지 본문', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiProperty({ description: '활성 여부', required: false })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

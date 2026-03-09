import { IsString, MaxLength, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoticeDto {
  @ApiProperty({ description: '공지 제목', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: '공지 본문' })
  @IsString()
  content!: string;

  @ApiProperty({ description: '활성 여부', required: false, default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

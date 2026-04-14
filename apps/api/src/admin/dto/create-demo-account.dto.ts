import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDemoAccountDto {
  @ApiProperty({ description: '닉네임', example: '데모유저1' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname!: string;

  @ApiPropertyOptional({ description: '관리자 메모' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  memo?: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImageUrl?: string;
}

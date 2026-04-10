import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: '닉네임', example: '맛집탐험가' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname!: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImageUrl?: string;
}

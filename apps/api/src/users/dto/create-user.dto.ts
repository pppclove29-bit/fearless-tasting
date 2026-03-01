import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '닉네임', example: '맛집탐험가' })
  @IsString()
  nickname!: string;

  @ApiPropertyOptional({ description: '프로필 이미지 URL' })
  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}

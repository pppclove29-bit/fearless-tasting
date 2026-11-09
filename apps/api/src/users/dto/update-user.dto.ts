import { IsString, IsOptional, MinLength, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: '닉네임', example: '맛집탐험가' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname!: string;

  @ApiPropertyOptional({
    description: '프로필 이미지 키 (업로드 API가 준 profiles/{userId}.{ext}). null이면 사진 삭제',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(500)
  profileImageUrl?: string | null;
}

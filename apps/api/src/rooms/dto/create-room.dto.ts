import { IsString, MaxLength, MinLength, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ description: '방 이름', example: '맛집 탐험대' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: '공개 방 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

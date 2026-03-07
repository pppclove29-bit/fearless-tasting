import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoomDto {
  @ApiProperty({ description: '방 이름', example: '맛집 탐험대' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

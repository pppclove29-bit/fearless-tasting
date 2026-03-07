import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ description: '닉네임', example: '맛집탐험가' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nickname!: string;
}

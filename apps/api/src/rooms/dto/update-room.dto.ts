import { IsOptional, IsString, MaxLength, MinLength, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoomDto {
  @ApiProperty({ description: '방 이름', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiProperty({ description: '최대 인원 (2~20)', required: false })
  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(20)
  maxMembers?: number;

  @ApiProperty({ description: '공개 방 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

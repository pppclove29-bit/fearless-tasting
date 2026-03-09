import { IsString, MaxLength, MinLength, IsArray, ArrayMinSize, ArrayMaxSize, ValidateNested, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class PollOptionDto {
  @ApiProperty({ description: '선택지 라벨', example: '맛있는 곳' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string;

  @ApiProperty({ description: '연결할 식당 ID (선택)', required: false })
  @IsOptional()
  @IsString()
  restaurantId?: string;
}

export class CreatePollDto {
  @ApiProperty({ description: '투표 제목', example: '오늘 뭐 먹지?' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: '선택지 목록 (2~10개)', type: [PollOptionDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => PollOptionDto)
  options!: PollOptionDto[];

  @ApiProperty({ description: '마감 시각 (ISO 8601, 선택)', required: false })
  @IsOptional()
  @IsDateString()
  endsAt?: string;
}

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

  @ApiProperty({ description: '방 공지사항 (null = 삭제)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  announcement?: string | null;

  @ApiProperty({ description: '위시리스트 탭 표시', required: false })
  @IsOptional()
  @IsBoolean()
  tabWishlistEnabled?: boolean;

  @ApiProperty({ description: '지역 탭 표시', required: false })
  @IsOptional()
  @IsBoolean()
  tabRegionEnabled?: boolean;

  @ApiProperty({ description: '투표 탭 표시', required: false })
  @IsOptional()
  @IsBoolean()
  tabPollEnabled?: boolean;

  @ApiProperty({ description: '통계 탭 표시', required: false })
  @IsOptional()
  @IsBoolean()
  tabStatsEnabled?: boolean;
}

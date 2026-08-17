import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VoteSharedPollDto {
  @ApiProperty({ description: '선택지 ID' })
  @IsString()
  @MaxLength(40)
  optionId!: string;

  /**
   * 브라우저가 생성해 보관하는 랜덤 식별자. 중복 투표를 막기 위한 값이고
   * 개인정보가 아니다 (쿠키 삭제·시크릿창이면 새로 발급된다).
   */
  @ApiProperty({ description: '게스트 식별 토큰 (클라이언트 생성 랜덤값)' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  guestKey!: string;

  @ApiPropertyOptional({ description: '표시 이름 (선택)' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  guestName?: string;
}

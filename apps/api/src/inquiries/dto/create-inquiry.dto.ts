import { IsString, IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const INQUIRY_CATEGORIES = ['region_request', 'bug_report', 'feedback', 'other'] as const;

export class CreateInquiryDto {
  @ApiProperty({
    description: '문의 유형',
    enum: INQUIRY_CATEGORIES,
    example: 'region_request',
  })
  @IsString()
  @IsIn(INQUIRY_CATEGORIES)
  category!: string;

  @ApiProperty({ description: '답변 받을 이메일', example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: '문의 제목', example: '역삼동 지역 추가 요청' })
  @IsString()
  subject!: string;

  @ApiProperty({ description: '문의 내용', example: '역삼동에 새로 생긴 식당을 등록하고 싶은데 지역 목록에 없습니다.' })
  @IsString()
  content!: string;
}

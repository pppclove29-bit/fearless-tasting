import { IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  nickname!: string;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}

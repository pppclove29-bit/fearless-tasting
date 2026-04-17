import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFeatureRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  description!: string;
}

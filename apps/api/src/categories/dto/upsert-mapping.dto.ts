import { IsString, IsInt, MaxLength } from 'class-validator';

export class UpsertMappingDto {
  @IsString()
  @MaxLength(200)
  rawInput!: string;

  @IsInt()
  categoryId!: number;
}

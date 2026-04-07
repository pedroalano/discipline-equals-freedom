import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateNameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}

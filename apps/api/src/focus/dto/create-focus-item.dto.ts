import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateFocusItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text!: string;

  @IsDateString()
  date!: string;
}

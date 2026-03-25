import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title!: string;
}

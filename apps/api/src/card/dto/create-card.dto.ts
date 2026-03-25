import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  listId!: string;
}

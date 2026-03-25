import { IsNumber, IsString } from 'class-validator';

export class MoveCardDto {
  @IsString()
  listId!: string;

  @IsNumber()
  position!: number;
}

import { IsDateString } from 'class-validator';

export class MoveToTodayDto {
  @IsDateString()
  date!: string;
}

import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateFocusItemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  text?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsNumber()
  position?: number;
}

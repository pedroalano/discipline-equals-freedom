import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { CardPriority } from '@prisma/client';

export class CreateCardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  listId!: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsEnum(CardPriority)
  priority?: CardPriority | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsISO8601()
  dueDate?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  labels?: string[];

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a hex string like #aabbcc' })
  color?: string | null;
}

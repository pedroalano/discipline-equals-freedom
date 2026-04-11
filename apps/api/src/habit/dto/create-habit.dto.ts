import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export enum HabitFrequencyDto {
  DAILY = 'DAILY',
  CUSTOM = 'CUSTOM',
}

export class CreateHabitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(HabitFrequencyDto)
  frequency!: HabitFrequencyDto;

  @ValidateIf((o: CreateHabitDto) => o.frequency === HabitFrequencyDto.CUSTOM)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  customDays?: number[];
}

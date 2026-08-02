import {
  IsArray,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class EventTimeDto {
  @IsOptional()
  @IsDateString()
  dateTime?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class AiGenerateEventDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @ValidateNested()
  @Type(() => EventTimeDto)
  start: EventTimeDto;

  @ValidateNested()
  @Type(() => EventTimeDto)
  end: EventTimeDto;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AiGenerateEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AiGenerateEventDto)
  events: AiGenerateEventDto[];
}

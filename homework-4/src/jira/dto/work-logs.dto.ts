import {
  IsArray,
  IsString,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class WorkLogItemDto {
  @IsDateString()
  date: string;

  @IsString()
  summary: string;
}

export class WorkLogDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkLogItemDto)
  worklog: WorkLogItemDto[];
}

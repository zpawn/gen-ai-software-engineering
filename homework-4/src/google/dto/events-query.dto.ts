import { IsString } from 'class-validator';

export class EventsQueryDto {
  @IsString()
  start: string;

  @IsString()
  end: string;
}

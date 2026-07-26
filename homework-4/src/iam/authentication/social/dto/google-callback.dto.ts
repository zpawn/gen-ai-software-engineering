import { IsString, IsOptional } from 'class-validator';
export class GoogleCallbackQueryDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  error?: string;
}

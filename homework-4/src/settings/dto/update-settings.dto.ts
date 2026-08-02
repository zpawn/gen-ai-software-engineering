import {
  IsIn,
  IsUrl,
  IsEnum,
  IsEmail,
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { SummaryLevel } from '../types';
import { JiraAuthType } from '../settings.constants';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  aiModel?: string;

  @IsString()
  @IsOptional()
  aiProvider?: string;

  @IsString()
  @IsOptional()
  aiFineTuning?: string;

  @IsOptional()
  @IsEnum(SummaryLevel)
  aiSummaryLevel?: SummaryLevel;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  googleCalendars?: string[];

  @IsString()
  @IsOptional()
  jiraApiKey?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn([JiraAuthType.BASIC, JiraAuthType.BEARER])
  jiraAuthType: JiraAuthType.BASIC | JiraAuthType.BEARER;

  @IsEmail()
  @IsOptional()
  jiraEmail?: string;

  @IsString()
  @IsOptional()
  jiraIssueKey?: string;

  @IsUrl()
  @IsOptional()
  @ValidateIf(
    (value: UpdateSettingsDto) => value.jiraAuthType === JiraAuthType.BASIC,
  )
  jiraUrl?: string;
}

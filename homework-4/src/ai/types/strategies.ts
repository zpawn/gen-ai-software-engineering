import { AI_MODELS } from '../constants';
import { AiGenerateEventsDto } from '../dto';
import { type SummaryLevel } from '../../settings/types';

export interface AIStrategy {
  initializeClient(): void;
  chat(events: AiGenerateEventsDto['events']): Promise<string>;
  buildPrompt(events: AiGenerateEventsDto['events'], options: Options): string;
}

export type ProviderType = keyof typeof AI_MODELS;

export type Options = {
  llm: string;
  fineTuning: string;
  summaryLevel: SummaryLevel;
};

export type Strategies = Record<ProviderType, (opts: Options) => AIStrategy>;

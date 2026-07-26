import { Injectable } from '@nestjs/common';
import { AiGenerateEventsDto } from '../dto';
import { AIStrategy, Options } from '../types';
import { buildPrompt } from './utils';

@Injectable()
export abstract class BaseAIStrategy implements AIStrategy {
  constructor(
    readonly apiKey: string,
    readonly options: Options,
  ) {
    if (!this.apiKey) {
      throw new Error('API key is required');
    }
  }

  abstract initializeClient(): void;

  abstract chat(events: AiGenerateEventsDto['events']): Promise<string>;

  buildPrompt = buildPrompt;
}

import { Scope, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiGenerateEventsDto } from './dto';
import { User } from '../users/entities';
import { AISettings } from '../settings/entities';
import { AIStrategyFactory } from './strategies/ai-strategy.factory';
import { summaryLevelMap } from './constants';

@Injectable({ scope: Scope.REQUEST })
export class AiService {
  constructor(
    @InjectRepository(AISettings)
    private readonly aiSettingsRepository: Repository<AISettings>,
    private readonly aiStrategyFactory: AIStrategyFactory,
  ) {}

  async generate(userId: User['id'], events: AiGenerateEventsDto['events']) {
    const aiSettings = await this.aiSettingsRepository.findOneBy({
      user: { id: userId },
    });

    if (!aiSettings) {
      throw new NotFoundException('AI settings not found for user');
    }

    try {
      const aiStrategy = this.aiStrategyFactory.getStrategy(aiSettings);
      const result = await aiStrategy.chat(events);

      return result;
    } catch (error) {
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  getSummaryLevels() {
    return summaryLevelMap;
  }
}

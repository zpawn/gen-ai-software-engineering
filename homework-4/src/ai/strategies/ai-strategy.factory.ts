import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AISettings } from '../../settings/entities';
import { AIStrategy, Strategies, ProviderType, AIConfig } from '../types';
import { AI_MODELS, DEFAULT_PROVIDER } from '../constants';
import { OpenRouterStrategy } from './openrouter.strategy';
import { TogetherStrategy } from './together.strategy';

@Injectable()
export class AIStrategyFactory implements OnModuleInit {
  private strategies: Strategies;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.registerStrategies();
  }

  private registerStrategies() {
    const aiConfig = this.configService.get<AIConfig>('ai');

    this.strategies = {
      openrouter: (opts) =>
        new OpenRouterStrategy(aiConfig?.openRouterApiKey || '', opts),
    };
  }

  getStrategy(settings: AISettings): AIStrategy {
    const provider = (settings.provider || DEFAULT_PROVIDER) as ProviderType;
    const llm = settings.llm || AI_MODELS[DEFAULT_PROVIDER].models[0];
    const fineTuning = settings.fineTuning || '';
    const strategyFactory = this.strategies[provider];
    const options = { ...settings, llm, fineTuning };

    if (!strategyFactory) {
      throw new Error(`No strategy found for provider: ${provider}`);
    }

    const strategy = strategyFactory(options);
    strategy.initializeClient();

    return strategy;
  }
}

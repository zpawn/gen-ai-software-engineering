import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AISettings } from '../settings/entities';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AIStrategyFactory } from './strategies/ai-strategy.factory';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([AISettings])],
  controllers: [AiController],
  providers: [AiService, AIStrategyFactory],
  exports: [AiService],
})
export class AiModule {}

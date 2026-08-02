import OpenAI from 'openai';
import { AiGenerateEventsDto } from '../dto';
import { BaseAIStrategy } from './base-ai.strategy';

export class OpenRouterStrategy extends BaseAIStrategy {
  client: OpenAI;

  initializeClient(): void {
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        // Optional. Site URL for rankings on openrouter.ai.
        'HTTP-Referer': 'https://github.com/track-wise-ai',
        // Optional. Site title for rankings on openrouter.ai.
        'X-Title': 'TrackWise',
      },
    });
  }

  async chat(events: AiGenerateEventsDto['events']): Promise<string> {
    const prompt = this.buildPrompt(events, this.options);

    try {
      const result = await this.client.chat.completions.create({
        model: this.options?.llm,
        // temperature: 1,
        // max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      });

      return result.choices[0]?.message?.content || '';
    } catch (error) {
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  }
}

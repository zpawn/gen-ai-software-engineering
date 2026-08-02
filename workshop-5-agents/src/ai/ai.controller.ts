import { Get, Post, Body, Controller } from '@nestjs/common';
import { AiGenerateEventsDto } from './dto';
import { ActiveUser } from '../iam/decorators';
import { AiService } from './ai.service';
import { User } from '../users/entities';

@Controller('/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post()
  generate(
    @ActiveUser('sub') userId: User['id'],
    @Body() eventsDto: AiGenerateEventsDto,
  ) {
    return this.aiService.generate(userId, eventsDto.events);
  }

  @Get('/summary-levels')
  getSummaryLevels() {
    return this.aiService.getSummaryLevels();
  }
}

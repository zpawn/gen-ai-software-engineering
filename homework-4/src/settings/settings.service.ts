import { type Repository, type EntityManager } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities';
import { AI_MODELS } from '../ai/constants';
import { type UpdateSettingsDto, type ResponseSettingsDto } from './dto';
import { AISettings, JiraSettings, GoogleCalendarSettings } from './entities';
import { JiraAuthType } from './settings.constants';
import { SummaryLevel } from './types';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AISettings)
    private readonly aiSettingsRepository: Repository<AISettings>,
    @InjectRepository(JiraSettings)
    private readonly jiraSettingsRepository: Repository<JiraSettings>,
    @InjectRepository(GoogleCalendarSettings)
    private readonly googleSettingsRepository: Repository<GoogleCalendarSettings>,
  ) {}

  async getUserSettings(userId: User['id']): Promise<ResponseSettingsDto> {
    const user = await this.findUserWithRelations(userId);
    return this.mapToResponse(user);
  }

  async updateUserSettings(userId: User['id'], updateDto: UpdateSettingsDto) {
    const user = await this.findUserWithRelations(userId);

    await this.userRepository.manager.transaction(async (transactionEM) => {
      await this.updateAISettings(transactionEM, user, updateDto);
      await this.updateJiraSettings(transactionEM, user, updateDto);
      await this.updateGoogleSettings(transactionEM, user, updateDto);

      await transactionEM.save(User, user);
    });

    return this.getUserSettings(userId);
  }

  ///

  private async findUserWithRelations(userId: User['id']) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: [
        'tokens',
        'aiSettings',
        'jiraSettings',
        'googleCalendarSettings',
      ],
    });

    if (!user) {
      throw new NotFoundException();
    }

    return user;
  }

  private mapToResponse(user: User): ResponseSettingsDto {
    return {
      google: {
        connect: Boolean(user.tokens?.googleAccessToken),
        selectedCalendars: user.googleCalendarSettings?.calendarIds || [],
      },
      ai: {
        models: AI_MODELS,
        selectedModel: user.aiSettings?.llm || '',
        selectedProvider: user.aiSettings?.provider || '',
        fineTuning: user.aiSettings?.fineTuning || '',
        selectedSummaryLevel:
          user.aiSettings?.summaryLevel || SummaryLevel.MEDIUM,
      },
      jira: {
        url: user.jiraSettings?.url || '',
        issueKey: user.jiraSettings?.issueKey || '',
        authType: user.jiraSettings?.authType || JiraAuthType.BEARER,
        email: user.jiraSettings?.email || '',
        apiKey: user.jiraSettings?.apiKey || '',
      },
    };
  }

  private async updateGoogleSettings(
    transactionEntityManager: EntityManager,
    user: User,
    updateDto: UpdateSettingsDto,
  ) {
    if (!user.googleCalendarSettings) {
      user.googleCalendarSettings = this.googleSettingsRepository.create({
        calendarIds: updateDto.googleCalendars || [],
        user: { id: user.id },
      });
    } else {
      user.googleCalendarSettings.calendarIds = updateDto.googleCalendars || [];
    }

    await transactionEntityManager.save(
      GoogleCalendarSettings,
      user.googleCalendarSettings,
    );
  }

  private async updateAISettings(
    transactionEntityManager: EntityManager,
    user: User,
    updateDto: UpdateSettingsDto,
  ) {
    if (!user.aiSettings) {
      user.aiSettings = this.aiSettingsRepository.create({
        llm: updateDto.aiModel || '',
        provider: updateDto.aiProvider || '',
        fineTuning: updateDto.aiFineTuning || '',
        summaryLevel: updateDto.aiSummaryLevel || SummaryLevel.MEDIUM,
        user: { id: user.id },
      });
    } else {
      user.aiSettings.llm = updateDto.aiModel || '';
      user.aiSettings.provider = updateDto.aiProvider || '';
      user.aiSettings.fineTuning = updateDto.aiFineTuning || '';
      user.aiSettings.summaryLevel =
        updateDto.aiSummaryLevel || SummaryLevel.MEDIUM;
    }

    await transactionEntityManager.save(AISettings, user.aiSettings);
  }

  private async updateJiraSettings(
    transactionEntityManager: EntityManager,
    user: User,
    updateDto: UpdateSettingsDto,
  ) {
    if (!user.jiraSettings) {
      user.jiraSettings = this.jiraSettingsRepository.create({
        apiKey: updateDto.jiraApiKey || '',
        authType: updateDto.jiraAuthType || JiraAuthType.BEARER,
        email: updateDto.jiraEmail || '',
        issueKey: updateDto.jiraIssueKey || '',
        url: updateDto.jiraUrl || '',
        user: { id: user.id },
      });
    } else {
      user.jiraSettings.apiKey = updateDto.jiraApiKey || '';
      user.jiraSettings.authType =
        updateDto.jiraAuthType || JiraAuthType.BEARER;
      user.jiraSettings.email = updateDto.jiraEmail || '';
      user.jiraSettings.issueKey = updateDto.jiraIssueKey || '';
      user.jiraSettings.url = updateDto.jiraUrl || '';
    }

    await transactionEntityManager.save(JiraSettings, user.jiraSettings);
  }
}

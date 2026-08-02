import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { User } from '../users/entities';
import { AISettings, JiraSettings, GoogleCalendarSettings } from './entities';
import { JiraAuthType } from './settings.constants';
import { SummaryLevel } from './types';
import { type UpdateSettingsDto } from './dto';

describe('settings', () => {
  describe('SettingsService', () => {
    const userId = 1;

    let mockEntityManager: { save: jest.Mock };
    let mockUserRepository: {
      findOne: jest.Mock;
      manager: { transaction: jest.Mock };
    };
    let mockAiSettingsRepository: { create: jest.Mock };
    let mockJiraSettingsRepository: { create: jest.Mock };
    let mockGoogleSettingsRepository: { create: jest.Mock };
    let service: SettingsService;

    // Returns a plain object standing in for a fully-populated User with
    // non-empty AI, Jira, and Google settings already stored.
    function buildUserWithExistingSettings() {
      return {
        id: userId,
        tokens: { googleAccessToken: 'stored-google-token' },
        aiSettings: {
          llm: 'gpt-4',
          provider: 'openai',
          fineTuning: 'custom-tuning',
          summaryLevel: SummaryLevel.LONG,
        },
        jiraSettings: {
          apiKey: 'test-jira-api-key',
          authType: JiraAuthType.BASIC,
          email: 'existing@example.com',
          issueKey: 'OLD-1',
          url: 'https://existing.atlassian.net',
        },
        googleCalendarSettings: {
          calendarIds: ['calendar-a', 'calendar-b'],
        },
      };
    }

    // Returns a plain object standing in for a brand-new User with no
    // AI, Jira, or Google settings rows created yet.
    function buildUserWithoutSettings() {
      return {
        id: userId,
        tokens: undefined,
        aiSettings: undefined,
        jiraSettings: undefined,
        googleCalendarSettings: undefined,
      };
    }

    beforeEach(async () => {
      mockEntityManager = { save: jest.fn().mockResolvedValue(undefined) };
      mockUserRepository = {
        findOne: jest.fn(),
        manager: {
          transaction: jest.fn(
            async (callback: (em: typeof mockEntityManager) => unknown) =>
              callback(mockEntityManager),
          ),
        },
      };
      // create() mirrors TypeORM's Repository.create() by returning the
      // plain data object it was given, without touching a real database.
      mockAiSettingsRepository = {
        create: jest.fn((data: unknown) => data),
      };
      mockJiraSettingsRepository = {
        create: jest.fn((data: unknown) => data),
      };
      mockGoogleSettingsRepository = {
        create: jest.fn((data: unknown) => data),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SettingsService,
          { provide: getRepositoryToken(User), useValue: mockUserRepository },
          {
            provide: getRepositoryToken(AISettings),
            useValue: mockAiSettingsRepository,
          },
          {
            provide: getRepositoryToken(JiraSettings),
            useValue: mockJiraSettingsRepository,
          },
          {
            provide: getRepositoryToken(GoogleCalendarSettings),
            useValue: mockGoogleSettingsRepository,
          },
        ],
      }).compile();

      service = module.get(SettingsService);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('updateUserSettings (BUG-002)', () => {
      // BUG-002, T-005: updating only jiraIssueKey on an entity with existing
      // non-empty AI/Jira/Google settings must leave every other field intact.
      it('leaves AI, Google, and other Jira fields unchanged when only jiraIssueKey is updated (T-005)', async () => {
        const user = buildUserWithExistingSettings();
        mockUserRepository.findOne.mockResolvedValue(user);

        const updateDto = {
          jiraIssueKey: 'NEW-42',
          jiraAuthType: JiraAuthType.BASIC,
        } as UpdateSettingsDto;

        const result = await service.updateUserSettings(userId, updateDto);

        expect(result.jira.issueKey).toBe('NEW-42');
        expect(result.jira.url).toBe('https://existing.atlassian.net');
        expect(result.jira.email).toBe('existing@example.com');
        expect(result.jira.authType).toBe(JiraAuthType.BASIC);
        expect(result.jira.configured).toBe(true);

        expect(result.ai.selectedModel).toBe('gpt-4');
        expect(result.ai.selectedProvider).toBe('openai');
        expect(result.ai.fineTuning).toBe('custom-tuning');
        expect(result.ai.selectedSummaryLevel).toBe(SummaryLevel.LONG);

        expect(result.google.selectedCalendars).toEqual([
          'calendar-a',
          'calendar-b',
        ]);
      });

      // BUG-002, T-006: the create branch for a brand-new user must still
      // apply the documented defaults for every field omitted from the update.
      it('applies documented defaults on the create branch when AI/Jira/Google fields are omitted (T-006)', async () => {
        const user = buildUserWithoutSettings();
        mockUserRepository.findOne.mockResolvedValue(user);

        const updateDto = {
          jiraAuthType: JiraAuthType.BEARER,
        } as UpdateSettingsDto;

        const result = await service.updateUserSettings(userId, updateDto);

        expect(result.ai.selectedModel).toBe('');
        expect(result.ai.selectedProvider).toBe('');
        expect(result.ai.fineTuning).toBe('');
        expect(result.ai.selectedSummaryLevel).toBe(SummaryLevel.MEDIUM);

        expect(result.jira.authType).toBe(JiraAuthType.BEARER);
        expect(result.jira.email).toBe('');
        expect(result.jira.issueKey).toBe('');
        expect(result.jira.url).toBe('');
        expect(result.jira.configured).toBe(false);

        expect(result.google.selectedCalendars).toEqual([]);
      });

      // BUG-002, T-007: an explicit empty array for googleCalendars must
      // still clear previously stored calendars (distinct from omission).
      it('clears stored calendars when googleCalendars is explicitly an empty array (T-007)', async () => {
        const user = buildUserWithExistingSettings();
        mockUserRepository.findOne.mockResolvedValue(user);

        const updateDto = {
          jiraAuthType: JiraAuthType.BASIC,
          googleCalendars: [],
        } as UpdateSettingsDto;

        const result = await service.updateUserSettings(userId, updateDto);

        expect(result.google.selectedCalendars).toEqual([]);
      });
    });

    describe('getUserSettings / mapToResponse (SEC-001)', () => {
      // SEC-001, T-008: the response must never expose the raw Jira API key
      // and must report configured: true when a key is stored.
      it('reports jira.configured true and omits apiKey when a key is stored (T-008)', async () => {
        const user = buildUserWithExistingSettings();
        mockUserRepository.findOne.mockResolvedValue(user);

        const result = await service.getUserSettings(userId);

        expect(result.jira.configured).toBe(true);
        expect(result.jira).not.toHaveProperty('apiKey');
        expect(JSON.stringify(result)).not.toContain('test-jira-api-key');
      });

      // SEC-001, T-008: the response must report configured: false and omit
      // apiKey when no Jira API key has ever been stored for the user.
      it('reports jira.configured false and omits apiKey when no key is stored (T-008)', async () => {
        const user = buildUserWithoutSettings();
        mockUserRepository.findOne.mockResolvedValue(user);

        const result = await service.getUserSettings(userId);

        expect(result.jira.configured).toBe(false);
        expect(result.jira).not.toHaveProperty('apiKey');
      });

      // SEC-001, T-009: the write path must still be able to store a newly
      // supplied jiraApiKey even though it is no longer echoed back raw.
      it('still writes a newly supplied jiraApiKey through the update path (T-009)', async () => {
        const user = buildUserWithoutSettings();
        mockUserRepository.findOne.mockResolvedValue(user);

        const updateDto = {
          jiraApiKey: 'test-jira-api-key',
          jiraAuthType: JiraAuthType.BEARER,
        } as UpdateSettingsDto;

        const result = await service.updateUserSettings(userId, updateDto);

        expect(result.jira.configured).toBe(true);
        expect(result.jira).not.toHaveProperty('apiKey');
      });
    });
  });
});

import {
  Injectable,
  NotFoundException,
  BadGatewayException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { formatISO } from 'date-fns';
import { User } from '../users/entities';
import { JiraSettings } from '../settings/entities';
import { JiraAuthType } from '../settings/settings.constants';
import { WorkLogDto, WorkLogItemDto } from './dto';

@Injectable()
export class JiraService {
  constructor(
    @InjectRepository(JiraSettings)
    private readonly jiraSettingsRepository: Repository<JiraSettings>,
  ) {}
  async syncWorkLog(userId: User['id'], { worklog }: WorkLogDto) {
    const jiraSettings = await this.jiraSettingsRepository.findOneBy({
      user: { id: userId },
    });

    if (!this.validateSettings(jiraSettings)) {
      throw new NotFoundException('Jira settings not found for user');
    }

    const headers = this.getHeaders(jiraSettings);
    const url = this.getUrl(jiraSettings);

    try {
      await Promise.all(
        worklog.map((item) =>
          fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(this.getPayload(item)),
          })
            .then((res) => res.json())
            .then((data) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              if (data?.error) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                throw new Error(data.error as string);
              }
            }),
        ),
      );
    } catch (error) {
      console.error(error);
      throw new BadGatewayException(
        'Failed to sync worklog: please recheck Jira settings',
      );
    }
  }

  validateSettings(settings?: JiraSettings | null): settings is JiraSettings {
    if (!settings) return false;

    const isBasic = settings?.authType === JiraAuthType.BASIC;

    if (!settings?.url || !settings?.apiKey || !settings?.issueKey) {
      return false;
    }

    if (isBasic && !settings?.email) {
      return false;
    }

    return true;
  }

  getHeaders(settings: JiraSettings) {
    const isBasic = settings?.authType === JiraAuthType.BASIC;

    return {
      'Content-Type': 'application/json',
      Authorization: isBasic
        ? `Basic ${Buffer.from(`${settings.email}:${settings.apiKey}`).toString('base64')}`
        : `Bearer ${settings.apiKey}`,
    };
  }

  getUrl(settings: JiraSettings) {
    return `${settings.url}/rest/api/2/issue/${settings.issueKey}/worklog`;
  }

  getPayload(item: WorkLogItemDto) {
    const startDate = `${formatISO(new Date(item.date), { representation: 'date' })}T10:00:00.000+0000`;

    const payload = {
      timeSpent: '8h',
      started: startDate,
      comment: item.summary,
    };

    return payload;
  }
}

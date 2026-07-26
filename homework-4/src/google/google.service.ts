import { randomUUID } from 'node:crypto';
import { google, Auth } from 'googleapis';
import { startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';
import { Repository } from 'typeorm';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GoogleAuthService } from '../iam/authentication/social/google-auth.service';
import { GoogleCalendarSettings } from '../settings/entities';
import { User } from '../users/entities';
import { EventsQueryDto } from './dto';
import {
  GoogleEvent,
  GoogleCalendarsResponse,
  GoogleEventsResponse,
} from './types';

const sortEvents = (a: GoogleEvent, b: GoogleEvent) => {
  const aDate = a.start?.dateTime || a.start?.date || new Date();
  const bDate = b.start?.dateTime || b.start?.date || new Date();
  const aStart = new Date(aDate);
  const bStart = new Date(bDate);

  return aStart.getTime() - bStart.getTime();
};

const normalizeEvent = (event: GoogleEvent) => ({
  id: event.id || '',
  eventType: event.eventType || 'default',
  start: {
    dateTime: event.start?.dateTime || undefined,
    date: event.start?.date || undefined,
  },
  end: {
    dateTime: event.end?.dateTime || undefined,
    date: event.end?.date || undefined,
  },
  summary: event.summary || '',
  description: event.description || '',
});

@Injectable()
export class GoogleService {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    @InjectRepository(GoogleCalendarSettings)
    private readonly googleSettingsRepository: Repository<GoogleCalendarSettings>,
  ) {}

  async getAuthLink(userId: User['id']) {
    const state = randomUUID();
    const authUrl = await this.googleAuthService.generateAuthUrl(userId, state);

    return { authUrl };
  }

  async getCalendars(auth: Auth.OAuth2Client) {
    const calendar = google.calendar({ version: 'v3', auth });
    let calendarList: GoogleCalendarsResponse;

    try {
      calendarList = await calendar.calendarList.list();
    } catch (error) {
      // todo: create logger
      // todo: handle refresh token expiration
      console.error(error?.response?.data?.error_description);
      throw new InternalServerErrorException('Failed to get calendars');
    }

    return calendarList.data.items;
  }

  async getEvents(
    userId: User['id'],
    auth: Auth.OAuth2Client,
    params: EventsQueryDto,
  ) {
    let events: GoogleEventsResponse[] = [];
    const calendar = google.calendar({ version: 'v3', auth });
    const weekStart = params.start
      ? startOfDay(new Date(params.start))
      : startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday as start of week
    const weekEnd = params.end
      ? endOfDay(new Date(params.end))
      : endOfWeek(new Date(), { weekStartsOn: 1 }); // Sunday as end of week

    const googleSettings = await this.googleSettingsRepository.findOneBy({
      user: { id: userId },
    });

    try {
      events = await Promise.all(
        (googleSettings?.calendarIds || []).map((calendarId) =>
          calendar.events.list({
            calendarId: calendarId,
            timeMin: weekStart.toISOString(),
            timeMax: weekEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          }),
        ),
      );
    } catch (error) {
      // todo: create logger
      // todo: handle refresh token expiration
      console.error(error?.response?.data?.error_description);
      throw new InternalServerErrorException('Failed to get events');
    }

    const sortedEvents: GoogleEvent[] = events
      .flatMap((event) => event?.data?.items || [])
      .map(normalizeEvent)
      .sort(sortEvents);

    return sortedEvents;
  }
}

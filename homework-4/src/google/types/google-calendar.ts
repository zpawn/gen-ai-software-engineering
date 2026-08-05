import { GaxiosResponseWithHTTP2 } from 'googleapis-common';
import { calendar_v3 } from 'googleapis';

export type GoogleEventsResponse =
  GaxiosResponseWithHTTP2<calendar_v3.Schema$Events>;

export type GoogleCalendarsResponse =
  GaxiosResponseWithHTTP2<calendar_v3.Schema$CalendarList>;

export interface GoogleCalendar {
  id: string;
  summary: string;
}

export interface EventDateTime {
  dateTime?: string;
  date?: string;
}

export interface GoogleEvent {
  id: string;
  eventType: string;
  start: EventDateTime;
  end: EventDateTime;
  summary: string;
  description: string;
}

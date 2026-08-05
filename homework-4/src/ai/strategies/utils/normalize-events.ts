import { AiGenerateEventDto } from '../../dto';
import { NormalizeEvent } from './types';

const normalizeEvent = (event: AiGenerateEventDto): NormalizeEvent => ({
  start: event.start?.dateTime || event.start?.date || '',
  end: event?.end?.dateTime || event?.end?.date || '',
  event: `${event?.summary || ''}${
    event?.description ? `. ${event.description}` : ''
  }`,
});

const normalizeEvents = (events?: AiGenerateEventDto[]): NormalizeEvent[] => {
  return (events || []).map(normalizeEvent);
};

export { normalizeEvents, normalizeEvent };

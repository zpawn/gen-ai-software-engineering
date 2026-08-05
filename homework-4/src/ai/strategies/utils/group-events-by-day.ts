import { format, eachDayOfInterval, startOfDay } from 'date-fns';
import { NormalizeEvent, EventsGroupByDay } from './types';

const groupEventsByDay = (events: NormalizeEvent[]): EventsGroupByDay => {
  return events.reduce<EventsGroupByDay>((acc, event) => {
    const start = startOfDay(new Date(event.start));
    const end = startOfDay(new Date(event.end));
    const dates = eachDayOfInterval({ start, end });

    dates.forEach((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');

      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }

      if (!acc[dateStr].includes(event.event)) {
        acc[dateStr].push(event.event);
      }
    });

    return acc;
  }, {});
};

export { groupEventsByDay };

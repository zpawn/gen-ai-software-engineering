import { groupEventsByDay } from './group-events-by-day';
import normalized from './__tests__/normalized';
import grouped from './__tests__/grouped';

describe('ai', () => {
  describe('strategies', () => {
    describe('utils', () => {
      describe('groupEventsByDay', () => {
        it('should return events grouped by day', () => {
          const result = groupEventsByDay(normalized);
          expect(result).toEqual(grouped);
        });

        it('should return empty object if no events', () => {
          const result = groupEventsByDay([]);
          expect(result).toEqual({});
        });

        it('should return events grouped by day if event long more than one day', () => {
          const result = groupEventsByDay([
            {
              start: '2025-07-14T17:00:00+03:00',
              end: '2025-07-16T18:00:00+03:00',
              event: 'Meetup. Boosting RAG and Search.',
            },
          ]);
          expect(result).toEqual({
            '2025-07-14': ['Meetup. Boosting RAG and Search.'],
            '2025-07-15': ['Meetup. Boosting RAG and Search.'],
            '2025-07-16': ['Meetup. Boosting RAG and Search.'],
          });
        });
      });
    });
  });
});

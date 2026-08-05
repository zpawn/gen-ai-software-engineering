import { normalizeEvents } from './normalize-events';
import rawEvents from './__tests__/raw-events';
import normalized from './__tests__/normalized';

describe('ai', () => {
  describe('strategies', () => {
    describe('utils', () => {
      describe('normalizeEvents', () => {
        it('should return events grouped by day', () => {
          expect(normalizeEvents(rawEvents as any)).toEqual(normalized);
        });
      });
    });
  });
});

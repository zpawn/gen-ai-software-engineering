import { cleanEvents, removeEmoji, removeHtmlTags } from './clean-events';

const events = [
  {
    start: '2025-07-14T17:00:00+03:00',
    end: '2025-07-14T18:00:00+03:00',
    event: `Mate academy (Ilia Makarov). <b>Booked by</b>\nIlia Makarov\n<br>Hey!<br><br>Let's have a talk about you and Mate academy. <br>Before the call, you can find more about us at this <a href=\"https://bit.ly/come-link\" target=\"_blank\">link</a>.<br><br>See you soon <span>🙌</span>`,
  },
];
const expected = [
  {
    start: '2025-07-14T17:00:00+03:00',
    end: '2025-07-14T18:00:00+03:00',
    event: `Mate academy (Ilia Makarov). Booked by Ilia Makarov Hey!Let's have a talk about you and Mate academy. Before the call, you can find more about us at this link.See you soon`,
  },
];

const eventWithHtmlTags = `<b>Booked by</b> Ilia Makarov<br><a href=\"https://bit.ly/come-link\" target=\"_blank\">link</a><br>See you soon <span>🙌</span>`;
const eventWithEmoji = '🎤 Music';

describe('ai', () => {
  describe('strategies', () => {
    describe('utils', () => {
      describe('cleanEvents', () => {
        it('should remove html tags', () => {
          const result = removeHtmlTags(eventWithHtmlTags);
          expect(result).toEqual('Booked by Ilia MakarovlinkSee you soon 🙌');
        });
      });

      describe('removeEmoji', () => {
        it('should remove emoji', () => {
          const result = removeEmoji(eventWithEmoji);
          expect(result).toEqual('Music');
        });
      });

      describe('cleanEvents', () => {
        it('should return events grouped by day', () => {
          const result = cleanEvents(events);
          expect(result).toEqual(expected);
        });
      });
    });
  });
});

import { SummaryLevel } from '../../settings/types';

const summaryLevelMap: Record<SummaryLevel, string> = {
  short:
    'Return one brief phrase (≤12 words) in past tense summarizing the day.',
  medium:
    'For each day, return one concise sentence (40–50 words) in past tense summarizing activities.',
  long: 'For each event, write a detailed sentence (40–50 words) in past tense describing topic, participants, and outcomes.',
} as const;

export { summaryLevelMap };

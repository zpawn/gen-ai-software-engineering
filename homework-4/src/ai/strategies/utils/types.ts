export type NormalizeEvent = {
  start: string;
  end: string;
  event: string;
};

export type EventsGroupByDay = Record<string, string[]>;

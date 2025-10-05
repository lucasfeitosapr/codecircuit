import { eventBus } from '../events/EventBus';

export type EventRecord = { event: string; payload: any };

export function captureEvents(events: string[]) {
  const records: EventRecord[] = [];
  const handlers = new Map<string, (payload: any) => void>();

  for (const e of events) {
    const h = (payload: any) => {
      records.push({ event: e, payload });
    };
    handlers.set(e, h);
    eventBus.on(e, h);
  }

  return {
    records,
    stop() {
      for (const [e, h] of handlers) eventBus.off(e, h);
    },
    clear() {
      records.splice(0, records.length);
    },
    find(event: string) {
      return records.filter(r => r.event === event);
    },
  };
}

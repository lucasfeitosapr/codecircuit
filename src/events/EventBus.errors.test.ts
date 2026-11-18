import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventBus } from './EventBus';

// B-022: a handler that throws is caught and re-sent as 'system.error', which nothing listens to,
// so the error disappeared without a trace.
describe('EventBus handler errors (B-022)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('a throwing handler leaves a console error naming the event @B-022', () => {
    const bus = new EventBus();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    bus.on('demo.event', () => {
      throw new Error('boom');
    });

    bus.emit('demo.event', {});

    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls.flat().map(String).join(' ')).toContain('demo.event');
  });

  it('other handlers of the same event still run @B-022', () => {
    const bus = new EventBus();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const second = vi.fn();
    bus.on('demo.event', () => {
      throw new Error('boom');
    });
    bus.on('demo.event', second);

    bus.emit('demo.event', {});
    expect(second).toHaveBeenCalled();
  });
});

import { describe, it, expect } from 'vitest';
import { EventBus } from './EventBus';

describe('EventBus', () => {
  it('should allow subscribe and emit', () => {
    const bus = new EventBus();
    let called = false;
    bus.on('test.hello', () => {
      called = true;
    });
    bus.emit('test.hello', { foo: 'bar' });
    expect(called).toBe(true);
  });

  it('once should only call once', () => {
    const bus = new EventBus();
    let count = 0;
    bus.once('test.once', () => {
      count += 1;
    });
    bus.emit('test.once');
    bus.emit('test.once');
    expect(count).toBe(1);
  });

  it('off should remove handler', () => {
    const bus = new EventBus();
    let count = 0;
    const handler = () => {
      count++;
    };
    bus.on('test.off', handler);
    bus.emit('test.off');
    bus.off('test.off', handler);
    bus.emit('test.off');
    expect(count).toBe(1);
  });

  it('handler errors should emit system.error without crashing', () => {
    const bus = new EventBus();
    let sawSystemError = false;
    bus.on('system.error', () => {
      sawSystemError = true;
    });
    bus.on('test.err', () => {
      throw new Error('boom');
    });
    bus.emit('test.err');
    expect(sawSystemError).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { stateManager } from './StateManager';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

describe('StateManager', () => {
  it('dispatchCommand emits command.dispatched', async () => {
    let saw = false;
    eventBus.on(Events.CommandDispatched, () => { saw = true; });
    await stateManager.dispatchCommand('test.cmd', { a: 1 });
    expect(saw).toBe(true);
  });
});

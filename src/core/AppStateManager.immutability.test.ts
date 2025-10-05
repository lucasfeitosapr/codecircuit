import { describe, it, expect, beforeEach } from 'vitest';
import { createAppStateManager, resetAppStateManager } from './AppStateManager';
import type { ComponentBase, Connection } from '../types';

describe('AppStateManager immutability invariants', () => {
  beforeEach(() => {
    resetAppStateManager();
  });

  it('getters return copies and are not affected by external mutation', () => {
    const sm = createAppStateManager();
    const comp: ComponentBase = {
      id: 'x', type: 'task-resistor', x: 0, y: 0, width: 10, height: 10, name: 'X', status: 'todo', pins: { input: [], output: [] },
    } as any;
    sm.addComponent(comp);

    const a1 = sm.getComponents();
    const a2 = sm.getComponents();
    expect(a1).not.toBe(a2);
    // mutating returned value must not affect state
    (a1 as any).push({ id: 'evil' } as any);
    expect(sm.getComponents().length).toBe(1);

    const c1 = sm.getConnections();
    const c2 = sm.getConnections();
    expect(c1).not.toBe(c2);
  });
});

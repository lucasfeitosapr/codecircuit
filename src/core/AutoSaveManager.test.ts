import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoSaveManager } from './AutoSaveManager';
import { wireEventHandlers } from './EventHandlerWiring';
import type { AppContext } from './AppContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeHooks() {
  return {
    getComponents: vi.fn().mockReturnValue([]),
    getConnections: vi.fn().mockReturnValue([]),
    getCurrentView: vi.fn().mockReturnValue({ type: 'main', components: [], connections: [] }),
  };
}

// ── AutoSaveManager unit tests ────────────────────────────────────────────────

describe('AutoSaveManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('can be instantiated without arguments', () => {
    expect(() => new AutoSaveManager()).not.toThrow();
  });

  it('wireAutoSave() registers event listeners on the eventBus', async () => {
    const { eventBus } = await import('../events/EventBus');
    const spy = vi.spyOn(eventBus, 'on');

    const manager = new AutoSaveManager();
    manager.wireAutoSave(makeHooks());

    expect(spy).toHaveBeenCalled();
    const registeredEvents = spy.mock.calls.map(([event]) => event);
    expect(registeredEvents).toContain('component.created');
    expect(registeredEvents).toContain('component.deleted');
    expect(registeredEvents).toContain('connection.created');
  });

  it('loadSavedState() returns null when localStorage is empty', () => {
    const manager = new AutoSaveManager();
    expect(manager.loadSavedState()).toBeNull();
  });

  it('loadSavedState() returns parsed data when valid JSON is stored', () => {
    const data = {
      components: [{ id: 'c1', type: 'task-resistor' }],
      connections: [],
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('codecircuit_autosave', JSON.stringify(data));

    const manager = new AutoSaveManager();
    const result = manager.loadSavedState();

    expect(result).not.toBeNull();
    expect(result!.components).toHaveLength(1);
    expect(result!.components[0].id).toBe('c1');
  });

  it('loadSavedState() returns null and warns on corrupt JSON', () => {
    localStorage.setItem('codecircuit_autosave', 'not-valid-json{{{');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

    const manager = new AutoSaveManager();
    const result = manager.loadSavedState();

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});

// ── EventHandlerWiring guard test ─────────────────────────────────────────────

describe('wireEventHandlers / wireAutoSave guard', () => {
  it('throws a descriptive error when ctx.autoSaveManager is undefined', () => {
    const noopFn = () => { };
    const incompleteCtx = {
      renderScheduler: { wireEventHandlers: noopFn },
      exportImportManager: { wireAppHandlers: noopFn },
      connectionManager: { wireAppHandlers: noopFn, getConnectionState: () => ({ isConnecting: false }) },
      appStateManager: { wireComponentDeletion: noopFn },
      autoSaveManager: undefined,
    } as unknown as AppContext;

    expect(() => wireEventHandlers(incompleteCtx)).toThrow(
      /wireAutoSave: ctx\.autoSaveManager is undefined/
    );
  });
});

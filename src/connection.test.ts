import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from './events/EventBus';
import { ConnectionManager, createConnectionManager } from './core/ConnectionManager';
import { createAppStateManager, resetAppStateManager } from './core/AppStateManager';
import { ViewStack } from './viewStack';
import type { ComponentBase, PinHit } from './types';

function makeCanvasStub() {
  const c = document.createElement('canvas');
  c.id = 'circuit-board';
  c.width = 800;
  c.height = 600;

  // Provide a minimal 2D context stub so jsdom tests don't require node-canvas
  const ctxStub: any = {
    scale: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    arc: () => {},
    setLineDash: () => {},
    fill: () => {},
    // basic properties used by canvas drawing code
    shadowBlur: 0,
    shadowColor: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };

  (c as any).getContext = () => ctxStub;
  document.body.appendChild(c);
  return c;
}

describe('Connection creation', () => {
  let connectionManager: ConnectionManager;
  let appStateManager: ReturnType<typeof createAppStateManager>;
  let categories: Record<string, { name: string; color: string }>;

  beforeEach(() => {
    document.body.innerHTML = ''; // clean DOM
    makeCanvasStub(); // Ensure canvas exists for managers

    // Reset singletons to avoid conflicts
    vi.clearAllMocks();

    // Reset singletons
    (ViewStack as any).instance = null;
    resetAppStateManager();

    // Setup categories
    categories = {
      frontend: { name: 'Frontend', color: '#00ff88' },
      backend: { name: 'Backend', color: '#4488ff' },
    };

    // Create fresh instances
    appStateManager = createAppStateManager();
    connectionManager = createConnectionManager(eventBus, categories);
  });

  it('creates a connection between output and input pins and prevents duplicates', () => {
    const a: ComponentBase = {
      id: 'a',
      type: 'power-core',
      x: 10,
      y: 10,
      width: 80,
      height: 40,
      pins: { output: [{ x: 80, y: 20 }] },
      status: 'done',
      name: 'Power Core A',
      category: 'frontend',
      createdAt: new Date(),
    };

    const b: ComponentBase = {
      id: 'b',
      type: 'task-resistor',
      x: 200,
      y: 10,
      width: 60,
      height: 20,
      pins: { input: [{ x: 0, y: 10 }] },
      status: 'todo',
      name: 'Task Resistor B',
      category: 'frontend',
      createdAt: new Date(),
    };

    // Set components in state manager
    appStateManager.setComponents([a, b]);

    const outPin: PinHit = {
      component: a,
      pinType: 'output',
      pinIndex: 0,
      x: a.x + 80,
      y: a.y + 20,
      category: 'frontend',
      isInputPin: false,
    };
    const inPin: PinHit = {
      component: b,
      pinType: 'input',
      pinIndex: 0,
      x: b.x + 0,
      y: b.y + 10,
      category: 'frontend',
      isInputPin: true,
    };

    const connection = connectionManager.createConnection(outPin, inPin);
    expect(connection).toBeTruthy();
    expect(connection?.from.component).toBe(a);
    expect(connection?.to.component).toBe(b);

    // Add connection to state for duplicate test
    if (connection) {
      appStateManager.addConnectionToCurrentView(connection);
    }

    // Duplicate should be prevented
    const duplicateConnection = connectionManager.createConnection(outPin, inPin);
    expect(duplicateConnection).toBeNull();
  });

  it('prevents invalid pin direction connections (input->input)', () => {
    const a: ComponentBase = {
      id: 'a',
      type: 'task-resistor',
      x: 10,
      y: 10,
      width: 60,
      height: 20,
      pins: { input: [{ x: 0, y: 10 }], output: [{ x: 60, y: 10 }] },
      status: 'todo',
      name: 'Task Resistor A',
      category: 'frontend',
      createdAt: new Date(),
    };

    const b: ComponentBase = {
      id: 'b',
      type: 'task-resistor',
      x: 100,
      y: 10,
      width: 60,
      height: 20,
      pins: { input: [{ x: 0, y: 10 }], output: [{ x: 60, y: 10 }] },
      status: 'todo',
      name: 'Task Resistor B',
      category: 'frontend',
      createdAt: new Date(),
    };

    appStateManager.setComponents([a, b]);

    const pinA: PinHit = {
      component: a,
      pinType: 'input',
      pinIndex: 0,
      x: a.x,
      y: a.y + 10,
      category: 'frontend',
      isInputPin: true,
    };
    const pinB: PinHit = {
      component: b,
      pinType: 'input',
      pinIndex: 0,
      x: b.x,
      y: b.y + 10,
      category: 'frontend',
      isInputPin: true,
    };

    const connection = connectionManager.createConnection(pinA, pinB);
    expect(connection).toBeNull();
  });
});

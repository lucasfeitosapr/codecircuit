import { describe, it, expect, beforeEach } from 'vitest';
import MotherboardApp from './main';
import type { ComponentBase } from './types';

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
  beforeEach(() => {
    document.body.innerHTML = ''; // clean DOM
  });

  it('creates a connection between output and input pins and prevents duplicates', () => {
    const canvas = makeCanvasStub();
    const app = new (MotherboardApp as any)();
    app.canvas = canvas;
    app.ctx = canvas.getContext('2d');

    const a: ComponentBase = {
      id: 'a',
      type: 'power-core',
      x: 10,
      y: 10,
      width: 80,
      height: 40,
      pins: { output: [{ x: 80, y: 20 }] },
      status: 'done',
    } as any;

    const b: ComponentBase = {
      id: 'b',
      type: 'task-resistor',
      x: 200,
      y: 10,
      width: 60,
      height: 20,
      pins: { input: [{ x: 0, y: 10 }] },
      status: 'todo',
    } as any;

    app.components = [];
    app.connections = [];
    app.components.push(a);
    app.components.push(b);

    const outPin = {
      component: a,
      pinType: 'output',
      pinIndex: 0,
      x: a.x + 80,
      y: a.y + 20,
      category: 'frontend',
    };
    const inPin = {
      component: b,
      pinType: 'input',
      pinIndex: 0,
      x: b.x + 0,
      y: b.y + 10,
      category: 'frontend',
    };

    (app as any).createConnection(outPin, inPin);
    expect(app.connections.length).toBe(1);
    const conn = app.connections[0];
    expect(conn.from.component).toBe(a);
    expect(conn.to.component).toBe(b);

    // Duplicate should be prevented
    (app as any).createConnection(outPin, inPin);
    expect(app.connections.length).toBe(1);
  });

  it('prevents invalid pin direction connections (input->input)', () => {
    const canvas = makeCanvasStub();
    const app = new (MotherboardApp as any)();
    app.canvas = canvas;
    app.ctx = canvas.getContext('2d');

    const a: ComponentBase = {
      id: 'a',
      type: 'task-resistor',
      x: 10,
      y: 10,
      width: 60,
      height: 20,
      pins: { input: [{ x: 0, y: 10 }], output: [{ x: 60, y: 10 }] },
      status: 'todo',
    } as any;

    const b = { ...a, id: 'b' } as ComponentBase;

    app.components = [a, b];
    app.connections = [];

    const pinA = {
      component: a,
      pinType: 'input',
      pinIndex: 0,
      x: a.x,
      y: a.y,
      category: 'frontend',
    };
    const pinB = {
      component: b,
      pinType: 'input',
      pinIndex: 0,
      x: b.x,
      y: b.y,
      category: 'frontend',
    };

    (app as any).createConnection(pinA, pinB);
    expect(app.connections.length).toBe(0);
  });
});

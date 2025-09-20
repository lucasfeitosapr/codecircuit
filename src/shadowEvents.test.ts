import { describe, it, expect } from 'vitest';
import MotherboardApp from './main';
import { eventBus } from './events/EventBus';
import { Events } from './events/eventTypes';

function makeCanvasStub() {
  const c = document.createElement('canvas');
  c.id = 'circuit-board';
  c.width = 800;
  c.height = 600;
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

describe('Shadow events', () => {
  it('emits ComponentCreated when addComponent is called', () => {
    document.body.innerHTML = '';
    const canvas = makeCanvasStub();
    const app = new (MotherboardApp as any)();
    app.canvas = canvas;
    app.ctx = canvas.getContext('2d');

    let saw = false;
    eventBus.on(Events.ComponentCreated, (p: any) => {
      if (p && p.type === 'task-resistor') saw = true;
    });

    app.addComponent('task-resistor', 50, 50);
    expect(saw).toBe(true);
  });

  it('emits ConnectionCreated when createConnection is called', () => {
    document.body.innerHTML = '';
    const canvas = makeCanvasStub();
    const app = new (MotherboardApp as any)();
    app.canvas = canvas;
    app.ctx = canvas.getContext('2d');

    // create two components and then connect them
    app.components = [];
    const a = { id: 'a', type: 'power-core', x: 10, y: 10, width: 80, height: 40, pins: { output: [{ x: 80, y: 20 }] }, status: 'done' } as any;
    const b = { id: 'b', type: 'task-resistor', x: 200, y: 10, width: 60, height: 20, pins: { input: [{ x: 0, y: 10 }] }, status: 'todo' } as any;
    app.components.push(a);
    app.components.push(b);

    const outPin = { component: a, pinType: 'output', pinIndex: 0, x: a.x + 80, y: a.y + 20, category: 'frontend' } as any;
    const inPin = { component: b, pinType: 'input', pinIndex: 0, x: b.x + 0, y: b.y + 10, category: 'frontend' } as any;

    let sawConn = false;
    eventBus.on(Events.ConnectionCreated, (p: any) => {
      if (p && p.from && p.to) sawConn = true;
    });

    app.createConnection(outPin, inPin);
    expect(sawConn).toBe(true);
  });
});

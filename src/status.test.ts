import { describe, it, expect, beforeEach } from 'vitest';
import MotherboardApp from './main';
import type { ComponentBase } from './types';

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

describe('Component status and toggling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('creates components with default status "defined"', () => {
    const canvas = makeCanvasStub();
    const app = new (MotherboardApp as any)();
    app.canvas = canvas;
    app.ctx = canvas.getContext('2d');

    app.components = [];
    app.currentView = {
      type: 'main',
      component: null,
      camera: { x: 0, y: 0, zoom: 1 },
      components: app.components,
      connections: [],
    } as any;

    app.addComponent('task-resistor', 100, 100);
    expect(app.components.length).toBe(1);
    const c: ComponentBase = app.components[0];
    expect(c.status).toBe('defined');
  });

  it('cycles status through defined -> todo -> in-progress -> done -> defined', () => {
    const canvas = makeCanvasStub();
    const app = new (MotherboardApp as any)();
    app.canvas = canvas;
    app.ctx = canvas.getContext('2d');

    app.components = [];
    app.currentView = {
      type: 'main',
      component: null,
      camera: { x: 0, y: 0, zoom: 1 },
      components: app.components,
      connections: [],
    } as any;

    app.addComponent('task-resistor', 10, 10);
    const comp: ComponentBase = app.components[0];
    expect(comp.status).toBe('defined');

    app.toggleComponentStatus(comp);
    expect(comp.status).toBe('todo');

    app.toggleComponentStatus(comp);
    expect(comp.status).toBe('in-progress');

    app.toggleComponentStatus(comp);
    expect(comp.status).toBe('done');

    app.toggleComponentStatus(comp);
    expect(comp.status).toBe('defined');
  });
});

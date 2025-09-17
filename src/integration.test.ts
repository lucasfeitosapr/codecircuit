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
    // basic properties used by canvas drawing code
    shadowBlur: 0,
    shadowColor: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };

  (c as any).getContext = () => ctxStub;

  // Provide a realistic bounding rect for event coordinate calculations
  c.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  } as any);

  document.body.appendChild(c);
  return c;
}

function makeDatasheetDom() {
  const panel = document.createElement('div');
  panel.id = 'datasheet-panel';
  panel.className = 'datasheet';

  const title = document.createElement('div');
  title.id = 'datasheet-title';

  const content = document.createElement('div');
  content.id = 'datasheet-content';

  panel.appendChild(title);
  panel.appendChild(content);
  document.body.appendChild(panel);
}

describe('Integration: basic UI interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('adds components, shows datasheet on click, toggles status on double click and creates connections', () => {
    makeDatasheetDom();
    const canvas = makeCanvasStub();

    // Create app after DOM elements exist
    const app = new (MotherboardApp as any)();

    // Sanity: ensure app.canvas is our canvas
    expect(app.canvas).toBeInstanceOf(HTMLCanvasElement);

    // Ensure initial view is main and empty
    app.components = [];
    app.connections = [];
    app.initializeMainView();

    // Add two components programmatically (simulate drag/drop)
    app.addComponent('task-resistor', 100, 120);
    app.addComponent('power-core', 300, 120);

    expect(app.components.length).toBe(2);

    // Find components by type to avoid ordering/positioning assumptions
    const c1: ComponentBase = (app.components.find((c: any) => c.type === 'task-resistor') || app.components[0]) as ComponentBase;
    const c2: ComponentBase = (app.components.find((c: any) => c.type === 'power-core') || app.components[1]) as ComponentBase;

    // Click on first component to show datasheet (simulate mousedown at component center)
    const rect = canvas.getBoundingClientRect();
    const clickX = rect.left + c1.x + 5; // slight offset inside component
    const clickY = rect.top + c1.y + 5;

    const clickEvent = new MouseEvent('mousedown', { clientX: clickX, clientY: clickY, button: 0, detail: 1 });
    canvas.dispatchEvent(clickEvent);

    // Datasheet should be active and show the title
    const panel = document.getElementById('datasheet-panel')!;
    const title = document.getElementById('datasheet-title')!;
    expect(panel.classList.contains('active')).toBe(true);
    // Use the app's selectedComponent to validate the datasheet title (more robust)
    const selected = (app as any).selectedComponent as ComponentBase;
    expect(selected).not.toBeNull();
    expect(title.textContent).toContain(selected.name || selected.title || '');

    // Double-click to toggle status (simulate detail === 2) at the selected component
    const dblEvent = new MouseEvent('mousedown', { clientX: rect.left + selected.x + 5, clientY: rect.top + selected.y + 5, button: 0, detail: 2 });
    canvas.dispatchEvent(dblEvent);

    // Status should have moved from 'defined' to 'todo'
    expect(selected.status).toBe('todo');

    // Create connection from power-core (output) to task-resistor (input) if pins exist
    const sourceComp = app.components.find((c: any) => c.type === 'power-core') || app.components[0];
    const targetComp = app.components.find((c: any) => c.type === 'task-resistor') || app.components[1];

    const outPin = {
      component: sourceComp,
      pinType: 'output',
      pinIndex: 0,
      x: sourceComp.x + (sourceComp.pins.output?.[0]?.x ?? 0),
      y: sourceComp.y + (sourceComp.pins.output?.[0]?.y ?? 0),
      category: sourceComp.category || 'frontend',
    } as any;

    const inPin = {
      component: targetComp,
      pinType: 'input',
      pinIndex: 0,
      x: targetComp.x + (targetComp.pins.input?.[0]?.x ?? 0),
      y: targetComp.y + (targetComp.pins.input?.[0]?.y ?? 0),
      category: targetComp.category || 'frontend',
    } as any;

    app.createConnection(outPin, inPin);
    expect(app.connections.length).toBe(1);

    // drawConnections should run without throwing (sanity render pass)
    expect(() => app.drawConnections()).not.toThrow();
  });
});

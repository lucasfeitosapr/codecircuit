import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputHandler } from './InputHandler';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { Camera, ComponentBase, PinHit } from '../types';
import { makeCanvasStub } from '../test-utils/canvas';
import { captureEvents } from '../test-utils/eventBusCapture';

describe('InputHandler integration (user interactions via EventBus)', () => {
  let canvas: HTMLCanvasElement;
  let camera: Camera;
  let input: InputHandler;

  beforeEach(() => {
    document.body.innerHTML = '';
    canvas = makeCanvasStub();
    camera = { x: 0, y: 0, zoom: 1 };
    input = new InputHandler(canvas, camera);
  });

  afterEach(() => {
    input.destroy();
    eventBus.clearAll();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('click on component → emits hit-tests and selects component', async () => {
    const comp: ComponentBase = {
      id: 'c1',
      type: 'task-resistor',
      x: 90,
      y: 90,
      width: 20,
      height: 20,
      name: 'C1',
      status: 'todo',
      pins: { input: [], output: [] },
    } as any;

    // Respond to hit-test queries: no pin under mouse, but component hit
    eventBus.on(Events.PIN_HIT_TEST_REQUESTED, (p: any) => {
      p.callback(null);
    });
    eventBus.on(Events.COMPONENT_HIT_TEST_REQUESTED, (p: any) => {
      const { x, y } = p.position;
      const hit = x >= comp.x && x <= comp.x + comp.width && y >= comp.y && y <= comp.y + comp.height;
      p.callback(hit ? comp : null);
    });

    const cap = captureEvents([
      Events.PIN_HIT_TEST_REQUESTED,
      Events.COMPONENT_HIT_TEST_REQUESTED,
      Events.COMPONENT_SELECTED,
    ]);

    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0 }));

    // Verify sequence
    expect(cap.find(Events.PIN_HIT_TEST_REQUESTED).length).toBe(1);
    expect(cap.find(Events.COMPONENT_HIT_TEST_REQUESTED).length).toBe(1);
    const sel = cap.find(Events.COMPONENT_SELECTED)[0];
    expect(sel).toBeTruthy();
    expect(sel.payload.component.id).toBe('c1');

    cap.stop();
  });

  it('connection flow: click output pin then input pin → emits CONNECTION_CREATE_REQUESTED', async () => {
    const a: ComponentBase = { id: 'a', type: 'power-core', x: 10, y: 10, width: 80, height: 40, pins: { output: [{ x: 80, y: 20 }] }, status: 'done', name: 'A' } as any;
    const b: ComponentBase = { id: 'b', type: 'task-resistor', x: 200, y: 10, width: 60, height: 20, pins: { input: [{ x: 0, y: 10 }] }, status: 'todo', name: 'B' } as any;

    const outPin: PinHit = { component: a, pinType: 'output', pinIndex: 0, x: a.x + 80, y: a.y + 20, isInputPin: false, category: 'frontend' } as any;
    const inPin: PinHit = { component: b, pinType: 'input', pinIndex: 0, x: b.x, y: b.y + 10, isInputPin: true, category: 'frontend' } as any;

    // Simple hit logic: specific coordinate selects pins; otherwise no component hit
    eventBus.on(Events.PIN_HIT_TEST_REQUESTED, (p: any) => {
      const { x, y } = p.position;
      const close = (p1: number, p2: number) => Math.abs(p1 - p2) <= 1;
      if (close(x, outPin.x) && close(y, outPin.y)) return p.callback(outPin);
      if (close(x, inPin.x) && close(y, inPin.y)) return p.callback(inPin);
      return p.callback(null);
    });
    eventBus.on(Events.COMPONENT_HIT_TEST_REQUESTED, (p: any) => p.callback(null));

    const cap = captureEvents([
      Events.CONNECTION_MODE_STARTED,
      Events.CONNECTION_CREATE_REQUESTED,
      Events.CONNECTION_MODE_CANCELLED,
    ]);

    // Start at out pin position
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: outPin.x, clientY: outPin.y, button: 0 }));
    // End at in pin position
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: inPin.x, clientY: inPin.y, button: 0 }));

    expect(cap.find(Events.CONNECTION_MODE_STARTED).length).toBe(1);
    const created = cap.find(Events.CONNECTION_CREATE_REQUESTED)[0];
    expect(created).toBeTruthy();
    expect(created.payload.startPin.component.id).toBe('a');
    expect(created.payload.endPin.component.id).toBe('b');

    cap.stop();
  });

  it('invalid connection: output to output should not emit CONNECTION_CREATE_REQUESTED', async () => {
    const a: ComponentBase = { id: 'a', type: 'power-core', x: 10, y: 10, width: 80, height: 40, pins: { output: [{ x: 80, y: 20 }] }, status: 'done', name: 'A' } as any;
    const b: ComponentBase = { id: 'b', type: 'power-core', x: 200, y: 10, width: 80, height: 40, pins: { output: [{ x: 80, y: 20 }] }, status: 'done', name: 'B' } as any;

    const outA: PinHit = { component: a, pinType: 'output', pinIndex: 0, x: a.x + 80, y: a.y + 20, isInputPin: false, category: 'frontend' } as any;
    const outB: PinHit = { component: b, pinType: 'output', pinIndex: 0, x: b.x + 80, y: b.y + 20, isInputPin: false, category: 'frontend' } as any;

    eventBus.on(Events.PIN_HIT_TEST_REQUESTED, (p: any) => {
      const { x, y } = p.position;
      const close = (p1: number, p2: number) => Math.abs(p1 - p2) <= 1;
      if (close(x, outA.x) && close(y, outA.y)) return p.callback(outA);
      if (close(x, outB.x) && close(y, outB.y)) return p.callback(outB);
      return p.callback(null);
    });
    eventBus.on(Events.COMPONENT_HIT_TEST_REQUESTED, (p: any) => p.callback(null));

    const cap = captureEvents([
      Events.CONNECTION_MODE_STARTED,
      Events.CONNECTION_CREATE_REQUESTED,
      Events.CONNECTION_MODE_CANCELLED,
    ]);

    // Start at output of A, then click output of B (invalid)
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: outA.x, clientY: outA.y, button: 0 }));
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: outB.x, clientY: outB.y, button: 0 }));

    expect(cap.find(Events.CONNECTION_MODE_STARTED).length).toBe(1);
    expect(cap.find(Events.CONNECTION_CREATE_REQUESTED).length).toBe(0);
    cap.stop();
  });
});

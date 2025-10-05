import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InputHandler } from './InputHandler';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { Camera, ComponentBase, PinHit } from '../types';
import { makeCanvasStub } from '../test-utils/canvas';
import { captureEvents } from '../test-utils/eventBusCapture';

describe('InputHandler keyboard and pan interactions', () => {
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
  });

  it('Escape cancels connection mode and emits CONNECTION_MODE_CANCELLED', () => {
    // Prepare a pin under the cursor
    const a: ComponentBase = { id: 'a', type: 'power-core', x: 10, y: 10, width: 80, height: 40, pins: { output: [{ x: 80, y: 20 }] }, status: 'done', name: 'A' } as any;
    const outPin: PinHit = { component: a, pinType: 'output', pinIndex: 0, x: 90, y: 30, isInputPin: false, category: 'frontend' } as any;

    // First click puts us into connection mode
    eventBus.on(Events.PIN_HIT_TEST_REQUESTED, (p: any) => {
      const { x, y } = p.position;
      const close = (p1: number, p2: number) => Math.abs(p1 - p2) <= 1;
      if (close(x, outPin.x) && close(y, outPin.y)) return p.callback(outPin);
      return p.callback(null);
    });
    eventBus.on(Events.COMPONENT_HIT_TEST_REQUESTED, (p: any) => p.callback(null));

    const cap = captureEvents([
      Events.CONNECTION_MODE_STARTED,
      Events.CONNECTION_MODE_CANCELLED,
    ]);

    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: outPin.x, clientY: outPin.y, button: 0 }));
    expect(cap.find(Events.CONNECTION_MODE_STARTED).length).toBe(1);

    // Press Esc to cancel
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cap.find(Events.CONNECTION_MODE_CANCELLED).length).toBe(1);

    cap.stop();
  });

  it('Delete emits COMPONENT_DELETE_REQUESTED when a component is selected', () => {
    const comp: ComponentBase = { id: 'c1', type: 'task-resistor', x: 50, y: 50, width: 20, height: 20, pins: { input: [], output: [] }, status: 'todo', name: 'C1' } as any;

    // Select component via hit test + click
    eventBus.on(Events.PIN_HIT_TEST_REQUESTED, (p: any) => p.callback(null));
    eventBus.on(Events.COMPONENT_HIT_TEST_REQUESTED, (p: any) => {
      const { x, y } = p.position;
      const hit = x >= comp.x && x <= comp.x + comp.width && y >= comp.y && y <= comp.y + comp.height;
      p.callback(hit ? comp : null);
    });

    const cap = captureEvents([
      Events.COMPONENT_SELECTED,
      Events.COMPONENT_DELETE_REQUESTED,
    ]);

    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 60, clientY: 60, button: 0 }));
    expect(cap.find(Events.COMPONENT_SELECTED).length).toBe(1);

    // Hit Delete
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    const del = cap.find(Events.COMPONENT_DELETE_REQUESTED)[0];
    expect(del).toBeTruthy();
    expect(del.payload.componentId).toBe('c1');
    cap.stop();
  });

  it('Right-button drag pans and emits CAMERA_PAN_UPDATED with new camera', () => {
    const cap = captureEvents([Events.CAMERA_PAN_UPDATED]);

    // Start right-button (button=2) at 100,100
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 2 }));
    // Move to 130,120
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 120 }));

    const evts = cap.find(Events.CAMERA_PAN_UPDATED);
    expect(evts.length).toBeGreaterThan(0);
    const last = evts[evts.length - 1];
    expect(last.payload.camera.x).toBeTypeOf('number');
    expect(last.payload.camera.y).toBeTypeOf('number');
    expect(last.payload.camera.zoom).toBe(1);

    cap.stop();
  });

  it('Ctrl+Z/Y emits UNDO/REDO_REQUESTED keyboard shortcuts', () => {
    const cap = captureEvents([Events.UNDO_REQUESTED, Events.REDO_REQUESTED]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true }));
    expect(cap.find(Events.UNDO_REQUESTED).length).toBe(1);
    expect(cap.find(Events.REDO_REQUESTED).length).toBe(1);
    cap.stop();
  });
});

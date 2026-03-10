import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  RendererIntegrationManager,
  createRendererIntegrationManager,
} from './RendererIntegrationManager';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

// Mock the dependencies
vi.mock('../rendering/LayeredRenderer', () => ({
  layeredRenderer: {
    render: vi.fn(),
    registerLayer: vi.fn(),
  },
}));

vi.mock('../rendering/ImplementationHelpers', () => ({
  renderComponent: vi.fn(),
}));

vi.mock('../config/featureFlags', () => ({
  isNewRendererEnabled: vi.fn(() => false), // Default to legacy renderer
}));

vi.mock('../renderer', () => ({
  drawGrid: vi.fn(),
  drawSchematicBackground: vi.fn(),
  drawOrthogonalTrace: vi.fn(),
}));

// Mock window methods
Object.assign(window, {
  requestAnimationFrame: vi.fn(cb => {
    setTimeout(cb, 16);
    return 1;
  }),
  cancelAnimationFrame: vi.fn(),
});

describe('RendererIntegrationManager', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let manager: RendererIntegrationManager;

  beforeEach(() => {
    // Create mock canvas and context
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Create mock context since getContext() returns null in test environment
    ctx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      strokeStyle: '',
      fillStyle: '',
      lineWidth: 1,
    } as any;

    manager = new RendererIntegrationManager(canvas, ctx);
  });

  afterEach(() => {
    if (manager) {
      manager.destroy();
    }
    vi.clearAllMocks();
  });

  it('should create manager with canvas and context', () => {
    expect(manager).toBeInstanceOf(RendererIntegrationManager);
  });

  it('should clear canvas before rendering', () => {
    const clearSpy = vi.spyOn(ctx, 'clearRect');

    manager.render();

    expect(clearSpy).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height);
  });

  it('should emit render completion event', () => {
    const emitSpy = vi.spyOn(eventBus, 'emit');

    manager.render();

    expect(emitSpy).toHaveBeenCalledWith(
      Events.RENDER_FRAME_COMPLETE,
      expect.objectContaining({
        renderer: 'layered', // Now using layered renderer by default
        timestamp: expect.any(Number),
        componentsRendered: 0,
        connectionsRendered: 0,
      })
    );
  });

  it('should setup event listeners on creation', () => {
    const eventSpy = vi.spyOn(eventBus, 'on');

    const newManager = new RendererIntegrationManager(canvas, ctx);

    expect(eventSpy).toHaveBeenCalledWith(Events.ComponentCreated, expect.any(Function));
    expect(eventSpy).toHaveBeenCalledWith(Events.ComponentUpdated, expect.any(Function));
    expect(eventSpy).toHaveBeenCalledWith(Events.ComponentDeleted, expect.any(Function));

    newManager.destroy();
  });

  it('should remove event listeners on destroy', () => {
    const offSpy = vi.spyOn(eventBus, 'off');

    manager.destroy();

    expect(offSpy).toHaveBeenCalled();
  });

  it('should return canvas size', () => {
    const size = manager.getCanvasSize();

    expect(size).toEqual({
      width: canvas.width,
      height: canvas.height,
    });
  });

  it('should create manager via factory function', () => {
    const createdManager = createRendererIntegrationManager(canvas, ctx);

    expect(createdManager).toBeInstanceOf(RendererIntegrationManager);

    createdManager.destroy();
  });
});

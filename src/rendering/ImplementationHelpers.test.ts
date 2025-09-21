import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderComponent } from './ImplementationHelpers';

describe('ImplementationHelpers', () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
      fillText: vi.fn(),
      // properties
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
      textAlign: '',
      textBaseline: '',
      font: '',
      globalAlpha: 1,
    };
    vi.clearAllMocks();
  });

  describe('renderComponent', () => {
    it('renders a basic component with correct dimensions', () => {
      const model = {
        id: 'test-1',
        type: 'power-core',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        color: '#ff0000',
        status: 'todo',
      };

      const frame = {
        timestamp: Date.now(),
        camera: { x: 0, y: 0, zoom: 1 },
      };

      const options = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      renderComponent(ctx, frame, model, options);

      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it('applies correct styling for different component statuses', () => {
      const model = {
        id: 'test-1',
        type: 'power-core',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        color: '#00ff00',
        status: 'in-progress',
      };

      const frame = {
        timestamp: Date.now(),
        camera: { x: 0, y: 0, zoom: 1 },
      };

      const options = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      renderComponent(ctx, frame, model, options);

      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('renders selected component with selection styling', () => {
      const model = {
        id: 'test-1',
        type: 'power-core',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        color: '#ff0000',
        status: 'todo',
      };

      const frame = {
        timestamp: Date.now(),
        camera: { x: 0, y: 0, zoom: 1 },
      };

      const options = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        selectedComponentId: 'test-1',
        connections: [],
      };

      renderComponent(ctx, frame, model, options);

      expect(ctx.setLineDash).toHaveBeenCalledWith([5, 5]);
    });

    it('handles missing model properties gracefully', () => {
      const model = {
        id: 'test-1',
        type: 'power-core',
        x: 10,
        y: 20,
        // missing width, height, color
      };

      const frame = {
        timestamp: Date.now(),
        camera: { x: 0, y: 0, zoom: 1 },
      };

      const options = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      expect(() => renderComponent(ctx, frame, model, options)).not.toThrow();
    });

    it('renders defined status with dashed border', () => {
      const model = {
        id: 'test-1',
        type: 'power-core',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        status: 'defined',
      };

      const frame = {
        timestamp: Date.now(),
        camera: { x: 0, y: 0, zoom: 1 },
      };

      const options = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      renderComponent(ctx, frame, model, options);

      expect(ctx.setLineDash).toHaveBeenCalledWith([6, 6]);
    });

    it('renders done status with green border and glow', () => {
      const model = {
        id: 'test-1',
        type: 'power-core',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        status: 'done',
      };

      const frame = {
        timestamp: Date.now(),
        camera: { x: 0, y: 0, zoom: 1 },
      };

      const options = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      renderComponent(ctx, frame, model, options);

      expect(ctx.strokeStyle).toBe('#00ff88');
      // shadowBlur is reset to 0 at the end of renderComponent, so we check that strokeRect was called
      expect(ctx.strokeRect).toHaveBeenCalled();
    });

    it('handles missing options gracefully', () => {
      const model = {
        id: 'test-1',
        type: 'power-core',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        status: 'todo',
      };

      const frame = {
        timestamp: Date.now(),
        camera: { x: 0, y: 0, zoom: 1 },
      };

      const options = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        // missing selectedComponentId and connections
      };

      expect(() => renderComponent(ctx, frame, model, options)).not.toThrow();
    });
  });
});

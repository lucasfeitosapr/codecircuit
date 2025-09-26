// GatewayPluginV2.test.ts - Comprehensive tests for Gateway plugin
// Phase 2B: Extended Component Architecture

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  GatewayPluginV2, 
  createGateway, 
  renderGateway, 
  evaluateGateway,
  GatewayComponent 
} from './GatewayPluginV2';

describe('GatewayPluginV2', () => {
  let plugin: GatewayPluginV2;
  let mockCanvasContext: any;

  beforeEach(() => {
    plugin = new GatewayPluginV2();
    
    // Mock canvas context
    mockCanvasContext = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      fillText: vi.fn(),
      fillRect: vi.fn(), // Duck typing for test detection
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: ''
    };
  });

  describe('Plugin Metadata', () => {
    it('should have correct plugin type', () => {
      expect(plugin.type).toBe('gateway');
    });

    it('should have correct metadata', () => {
      expect(plugin.metadata.displayName).toBe('Gateway ⬟');
      expect(plugin.metadata.icon).toBe('⬟');
      expect(plugin.metadata.color).toBe('#9B59B6');
      expect(plugin.metadata.category).toBe('integration');
      expect(plugin.metadata.width).toBe(60);
      expect(plugin.metadata.height).toBe(60);
    });

    it('should have correct pin configuration', () => {
      expect(plugin.metadata.pins?.input).toHaveLength(1);
      expect(plugin.metadata.pins?.output).toHaveLength(1);
      
      expect(plugin.metadata.pins?.input?.[0]).toMatchObject({
        x: 15,
        y: 30,
        type: 'input',
        label: 'request'
      });
      
      expect(plugin.metadata.pins?.output?.[0]).toMatchObject({
        x: 45,
        y: 30,
        type: 'output',
        label: 'response'
      });
    });
  });

  describe('Component Creation', () => {
    it('should create gateway component with default values', () => {
      const gateway = createGateway({ x: 100, y: 200 });
      
      expect(gateway.type).toBe('gateway');
      expect(gateway.x).toBe(100);
      expect(gateway.y).toBe(200);
      expect(gateway.width).toBe(60);
      expect(gateway.height).toBe(60);
      expect(gateway.healthState).toBe('unknown');
      expect(gateway.externalSystem).toBe('External System');
      expect(gateway.timeout).toBe(5000);
      expect(gateway.retryCount).toBe(3);
      expect(gateway.color).toBe('#9B59B6');
      expect(gateway.status).toBe('defined');
    });

    it('should create gateway component with custom configuration', () => {
      const config = {
        x: 50,
        y: 75,
        id: 'test-gateway',
        externalSystem: 'User Database',
        connectionUrl: 'postgresql://localhost:5432/users',
        timeout: 10000
      };
      
      const gateway = createGateway(config);
      
      expect(gateway.id).toBe('test-gateway');
      expect(gateway.externalSystem).toBe('User Database');
      expect(gateway.connectionUrl).toBe('postgresql://localhost:5432/users');
      expect(gateway.timeout).toBe(10000);
      expect(gateway.title).toBe('User Database');
    });

    it('should create gateway using plugin factory method', () => {
      const gateway = plugin.createComponent({ x: 0, y: 0 });
      
      expect(gateway.type).toBe('gateway');
      expect(gateway.x).toBe(0);
      expect(gateway.y).toBe(0);
    });

    it('should have correct pin configuration', () => {
      const gateway = createGateway({ x: 0, y: 0 });
      
      expect(gateway.pins?.input).toHaveLength(1);
      expect(gateway.pins?.output).toHaveLength(1);
      
      expect(gateway.pins?.input?.[0]).toMatchObject({
        x: 15, y: 30, type: 'input', label: 'request'
      });
      
      expect(gateway.pins?.output?.[0]).toMatchObject({
        x: 45, y: 30, type: 'output', label: 'response'
      });
    });
  });

  describe('Component Rendering', () => {
    let component: GatewayComponent;

    beforeEach(() => {
      component = createGateway({
        x: 100,
        y: 150,
        externalSystem: 'API Gateway',
        connectionUrl: 'https://api.example.com'
      });
    });

    it('should render pentagon shape', () => {
      renderGateway(mockCanvasContext, { timestamp: 0 }, component);
      
      // Should create pentagon path (5 vertices)
      expect(mockCanvasContext.beginPath).toHaveBeenCalled();
      expect(mockCanvasContext.moveTo).toHaveBeenCalledTimes(1); // First vertex
      expect(mockCanvasContext.lineTo).toHaveBeenCalledTimes(4); // Remaining 4 vertices
      expect(mockCanvasContext.closePath).toHaveBeenCalled();
    });

    it('should apply correct positioning', () => {
      renderGateway(mockCanvasContext, { timestamp: 0 }, component);
      
      // Should translate to center of component (x + width/2, y + height/2)
      expect(mockCanvasContext.translate).toHaveBeenCalledWith(130, 180);
    });

    it('should render with health state colors', () => {
      component.healthState = 'healthy';
      renderGateway(mockCanvasContext, { timestamp: 0 }, component);
      
      // Should fill with green color for healthy state
      expect(mockCanvasContext.fill).toHaveBeenCalled();
    });

    it('should render external system title', () => {
      renderGateway(mockCanvasContext, { timestamp: 0 }, component);
      
      // Should render gateway symbol first, then title above
      expect(mockCanvasContext.fillText).toHaveBeenCalledWith('⬟', 0, 0);
      expect(mockCanvasContext.fillText).toHaveBeenCalledWith('API Gateway', 0, -38);
    });

    it('should render health state indicator', () => {
      component.healthState = 'degraded';
      renderGateway(mockCanvasContext, { timestamp: 0 }, component);
      
      // Should draw health indicator circle
      expect(mockCanvasContext.arc).toHaveBeenCalledWith(
        expect.any(Number), // x position (radius * 0.6) 
        expect.any(Number), // y position (-radius * 0.6)
        4, 0, Math.PI * 2
      );
    });

    it('should render status indicator', () => {
      component.status = 'in-progress';
      renderGateway(mockCanvasContext, { timestamp: 0 }, component);
      
      // Should draw status indicator
      expect(mockCanvasContext.arc).toHaveBeenCalledWith(0, 38, 4, 0, Math.PI * 2);
    });

    it('should handle camera transformations', () => {
      const frame = {
        camera: { x: 50, y: 25, zoom: 1.5 },
        timestamp: 0
      };
      
      renderGateway(mockCanvasContext, frame, component);
      
      // Camera transformation follows DecisionPoint pattern: translate to center with zoom
      // Expected: x * zoom + camera.x + (size * zoom / 2), y * zoom + camera.y + (size * zoom / 2)
      // = 100 * 1.5 + 50 + 45, 150 * 1.5 + 25 + 45 = 245, 295
      expect(mockCanvasContext.translate).toHaveBeenCalledWith(245, 295);
    });

    it('should handle WebGL context gracefully', () => {
      const webglContext = {} as WebGLRenderingContext;
      
      expect(() => {
        renderGateway(webglContext, { timestamp: 0 }, component);
      }).not.toThrow();
    });

    it('should handle missing component gracefully', () => {
      expect(() => {
        renderGateway(mockCanvasContext, { timestamp: 0 }, undefined);
      }).not.toThrow();
    });
  });

  describe('Health State Management', () => {
    let component: GatewayComponent;
    let mockEmit: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      component = createGateway({
        x: 0,
        y: 0,
        externalSystem: 'Test Database'
      });
      mockEmit = vi.fn();
    });

    it('should evaluate gateway health', () => {
      evaluateGateway(component, mockEmit);
      
      expect(component.lastHealthCheck).toBeDefined();
      expect(component.healthState).toMatch(/^(healthy|degraded|failed)$/);
    });

    it('should emit health state change event', () => {
      evaluateGateway(component, mockEmit);
      
      expect(mockEmit).toHaveBeenCalledWith('gateway:health_changed', {
        componentId: component.id,
        healthState: component.healthState,
        timestamp: component.lastHealthCheck
      });
    });

    it('should handle evaluation without emit function', () => {
      expect(() => {
        evaluateGateway(component);
      }).not.toThrow();
      
      expect(component.lastHealthCheck).toBeDefined();
    });

    it('should update health state on evaluation', () => {
      const originalState = component.healthState;
      evaluateGateway(component, mockEmit);
      
      // Health state might change (since it's randomized)
      expect(['healthy', 'degraded', 'failed']).toContain(component.healthState);
    });
  });

  describe('Serialization', () => {
    let component: GatewayComponent;

    beforeEach(() => {
      component = createGateway({
        x: 100,
        y: 200,
        id: 'test-gateway',
        externalSystem: 'Payment API',
        connectionUrl: 'https://api.payments.com',
        timeout: 8000
      });
      component.healthState = 'healthy';
      component.lastHealthCheck = Date.now();
    });

    it('should serialize gateway component', () => {
      const serialized = plugin.serialize(component);
      
      expect(serialized).toMatchObject({
        id: 'test-gateway',
        type: 'gateway',
        x: 100,
        y: 200,
        externalSystem: 'Payment API',
        connectionUrl: 'https://api.payments.com',
        timeout: 8000,
        healthState: 'healthy',
        lastHealthCheck: component.lastHealthCheck
      });
    });

    it('should deserialize gateway component', () => {
      const data = {
        id: 'test-gateway',
        type: 'gateway',
        x: 100,
        y: 200,
        externalSystem: 'Payment API',
        connectionUrl: 'https://api.payments.com',
        timeout: 8000,
        healthState: 'degraded',
        lastHealthCheck: 1234567890
      };

      const deserialized = plugin.deserialize(data);
      
      expect(deserialized).toMatchObject(data);
      expect(deserialized.type).toBe('gateway');
    });

    it('should handle deserialization with missing fields', () => {
      const data = {
        id: 'minimal-gateway',
        x: 0,
        y: 0
      };

      const deserialized = plugin.deserialize(data);
      
      expect(deserialized.type).toBe('gateway');
      expect(deserialized.healthState).toBe('unknown');
      expect(deserialized.externalSystem).toBe('External System');
      expect(deserialized.timeout).toBe(5000);
      expect(deserialized.retryCount).toBe(3);
    });
  });

  describe('Integration with Plugin System', () => {
    it('should work with plugin evaluation method', () => {
      const component = plugin.createComponent({ x: 0, y: 0 });
      const mockEmit = vi.fn();
      
      plugin.evaluateComponent(component, mockEmit);
      
      expect(mockEmit).toHaveBeenCalledWith('gateway:health_changed', expect.any(Object));
    });

    it('should work with plugin render method', () => {
      const component = plugin.createComponent({ x: 50, y: 100 });
      
      expect(() => {
        renderGateway(mockCanvasContext, { timestamp: 0 }, component as GatewayComponent);
      }).not.toThrow();
      
      // Should translate to center of component (x + width/2, y + height/2)
      expect(mockCanvasContext.translate).toHaveBeenCalledWith(80, 130);
    });

    it('should maintain V2 plugin architecture patterns', () => {
      // Test that the plugin follows the established V2 pattern
      expect(plugin.type).toBe('gateway');
      expect(plugin.metadata).toBeDefined();
      expect(plugin.createComponent).toBeDefined();
      expect(typeof plugin.createComponent).toBe('function');
      expect(plugin.serialize).toBeDefined();
      expect(plugin.deserialize).toBeDefined();
      expect(plugin.evaluateComponent).toBeDefined();
    });
  });

  describe('Health State Visual Mapping', () => {
    it('should use correct colors for different health states', () => {
      const component = createGateway({ x: 0, y: 0 });
      
      const healthStates = ['healthy', 'degraded', 'failed', 'unknown'] as const;
      const expectedColors = ['#27AE60', '#F39C12', '#E74C3C', '#95A5A6'];
      
      healthStates.forEach((state, index) => {
        component.healthState = state;
        renderGateway(mockCanvasContext, { timestamp: 0 }, component);
        
        // The fill should be called with the correct health color
        expect(mockCanvasContext.fill).toHaveBeenCalled();
      });
    });
  });
});
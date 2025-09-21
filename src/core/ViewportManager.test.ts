/**
 * ViewportManager Test Suite
 * 
 * Comprehensive tests for viewport management including canvas setup,
 * camera operations, coordinate transformations, and event integration.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ViewportManagerImpl, createViewportManager, destroyViewportManager } from './ViewportManager';
import { EventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

// Mock DOM elements
  const createMockCanvas = (width = 800, height = 600) => {
    const mockContext = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn()
    };
    
    const canvas = {
      id: 'test-canvas',
      width: 0,
      height: 0,
      style: { width: '', height: '' },
      getBoundingClientRect: vi.fn(() => ({ 
        width, 
        height, 
        left: 0, 
        top: 0,
        right: width,
        bottom: height,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })),
      getContext: vi.fn(() => mockContext)
    } as any;
    
    // Store reference to context for testing
    (canvas as any)._mockContext = mockContext;
    
    // Mock document.getElementById
    vi.spyOn(document, 'getElementById').mockReturnValue(canvas);
    
    return canvas;
  };// Mock ResizeObserver
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn()
}));
vi.stubGlobal('ResizeObserver', mockResizeObserver);

describe('ViewportManager', () => {
  let eventBus: EventBus;
  let mockCanvas: any;
  let mockContext: any;

  beforeEach(() => {
    eventBus = new EventBus();
    mockCanvas = createMockCanvas();
    mockContext = mockCanvas._mockContext; // Use stored context reference
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      writable: true,
      value: 2
    });
  });

  afterEach(() => {
    destroyViewportManager();
    vi.restoreAllMocks();
  });

  describe('Construction', () => {
    it('should construct with valid canvas and event bus', () => {
      const manager = new ViewportManagerImpl('test-canvas', eventBus);
      
      expect(manager.canvas).toBe(mockCanvas);
      expect(manager.ctx).toEqual(mockContext);
      expect(manager.camera).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it('should throw error if canvas not found', () => {
      vi.spyOn(document, 'getElementById').mockReturnValue(null);
      
      expect(() => {
        new ViewportManagerImpl('missing-canvas', eventBus);
      }).toThrow("Canvas element with id 'missing-canvas' not found");
    });

    it('should throw error if 2D context not available', () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      expect(() => {
        new ViewportManagerImpl('test-canvas', eventBus);
      }).toThrow('Failed to get 2D canvas context');
    });
  });

  describe('Canvas Setup', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
    });

    it('should initialize canvas with proper dimensions', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      
      manager.initialize();
      
      expect(mockCanvas.width).toBe(1600); // 800 * 2 devicePixelRatio
      expect(mockCanvas.height).toBe(1200); // 600 * 2 devicePixelRatio
      expect(mockCanvas.style.width).toBe('800px');
      expect(mockCanvas.style.height).toBe('600px');
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
      
      expect(emitSpy).toHaveBeenCalledWith(
        Events.VIEWPORT_CANVAS_SETUP_COMPLETED,
        expect.objectContaining({
          canvasId: 'test-canvas',
          width: 800,
          height: 600
        })
      );
    });

    it('should setup ResizeObserver when available', () => {
      const mockObserver = { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
      mockResizeObserver.mockReturnValue(mockObserver);
      
      manager.setupCanvas();
      
      expect(mockResizeObserver).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalledWith(mockCanvas);
    });

    it('should handle resize events', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      mockCanvas.getBoundingClientRect.mockReturnValue({ 
        width: 1000, 
        height: 800,
        left: 0,
        top: 0,
        right: 1000,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => ({})
      });
      
      manager.setupCanvas();
      
      expect(emitSpy).toHaveBeenCalledWith(
        Events.VIEWPORT_RESIZED,
        expect.objectContaining({
          width: 1000,
          height: 800,
          pixelRatio: 2
        })
      );
    });
  });

  describe('Camera Operations', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
    });

    it('should set camera position and zoom', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const newCamera = { x: 100, y: 50, zoom: 1.5 };
      
      manager.setCamera(newCamera);
      
      expect(manager.camera).toEqual(newCamera);
      expect(emitSpy).toHaveBeenCalledWith(
        Events.VIEWPORT_CAMERA_UPDATED,
        expect.objectContaining({
          camera: newCamera,
          previousCamera: { x: 0, y: 0, zoom: 1 }
        })
      );
    });

    it('should clamp zoom to valid range', () => {
      manager.setCamera({ x: 0, y: 0, zoom: 5.0 }); // Above max
      expect(manager.camera.zoom).toBe(3.0);
      
      manager.setCamera({ x: 0, y: 0, zoom: 0.05 }); // Below min
      expect(manager.camera.zoom).toBe(0.1);
    });

    it('should update camera with deltas', () => {
      manager.setCamera({ x: 100, y: 50, zoom: 1.0 });
      
      manager.updateCamera(20, 30, 1.5);
      
      expect(manager.camera).toEqual({ x: 120, y: 80, zoom: 1.5 });
    });

    it('should pan camera by delta amounts', () => {
      manager.setCamera({ x: 100, y: 50, zoom: 1.0 });
      
      manager.panCamera(25, -10);
      
      expect(manager.camera).toEqual({ x: 125, y: 40, zoom: 1.0 });
    });
  });

  describe('Zoom to Point', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
      manager.setCamera({ x: 0, y: 0, zoom: 1.0 });
    });

    it('should zoom to cursor position correctly', () => {
      const screenX = 400; // Center of 800px canvas
      const screenY = 300; // Center of 600px canvas
      const zoomFactor = 2.0;
      
      manager.zoomToPoint(zoomFactor, screenX, screenY);
      
      // At zoom 1.0 with camera at (0,0), cursor at screen (400, 300) maps to world (400, 300)
      // At zoom 2.0, to keep cursor at same screen position:
      // worldX = (400 - cameraX) / 2.0 = 400 -> cameraX = 400 - 400 * 2.0 = -400
      // worldY = (300 - cameraY) / 2.0 = 300 -> cameraY = 300 - 300 * 2.0 = -300
      expect(manager.camera.zoom).toBe(2.0);
      expect(manager.camera.x).toBe(-400);
      expect(manager.camera.y).toBe(-300);
    });

    it('should not zoom beyond limits', () => {
      manager.zoomToPoint(10.0, 400, 300); // Way above max
      expect(manager.camera.zoom).toBe(3.0);
      
      manager.setCamera({ x: 0, y: 0, zoom: 0.5 });
      manager.zoomToPoint(0.1, 400, 300); // Way below min
      expect(manager.camera.zoom).toBe(0.1);
    });

    it('should not update if zoom change is minimal', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const initialCamera = { ...manager.camera };
      
      manager.zoomToPoint(1.0001, 400, 300); // Very small change
      
      expect(manager.camera).toEqual(initialCamera);
      expect(emitSpy).not.toHaveBeenCalledWith(Events.VIEWPORT_CAMERA_UPDATED, expect.any(Object));
    });
  });

  describe('Coordinate Transformations', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
    });

    it('should convert screen to world coordinates', () => {
      manager.setCamera({ x: 100, y: 50, zoom: 2.0 });
      
      const worldCoord = manager.screenToWorld({ x: 300, y: 250 });
      
      // (300 - 100) / 2.0 = 100, (250 - 50) / 2.0 = 100
      expect(worldCoord).toEqual({ x: 100, y: 100 });
    });

    it('should convert world to screen coordinates', () => {
      manager.setCamera({ x: 100, y: 50, zoom: 2.0 });
      
      const screenCoord = manager.worldToScreen({ x: 100, y: 100 });
      
      // 100 * 2.0 + 100 = 300, 100 * 2.0 + 50 = 250
      expect(screenCoord).toEqual({ x: 300, y: 250 });
    });

    it('should have consistent round-trip transformations', () => {
      manager.setCamera({ x: -50, y: 25, zoom: 1.5 });
      
      const originalScreen = { x: 123, y: 456 };
      const worldCoord = manager.screenToWorld(originalScreen);
      const backToScreen = manager.worldToScreen(worldCoord);
      
      expect(backToScreen.x).toBeCloseTo(originalScreen.x, 10);
      expect(backToScreen.y).toBeCloseTo(originalScreen.y, 10);
    });
  });

  describe('Viewport Bounds', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
    });

    it('should calculate viewport bounds correctly', () => {
      manager.setCamera({ x: 100, y: 50, zoom: 2.0 });
      
      const bounds = manager.getViewportBounds();
      
      // Top-left: (0 - 100) / 2.0 = -50, (0 - 50) / 2.0 = -25
      // Bottom-right: (800 - 100) / 2.0 = 350, (600 - 50) / 2.0 = 275
      expect(bounds).toEqual({
        left: -50,
        top: -25,
        right: 350,
        bottom: 275,
        width: 400,
        height: 300
      });
    });

    it('should check if point is in viewport', () => {
      manager.setCamera({ x: 0, y: 0, zoom: 1.0 });
      
      expect(manager.isPointInViewport(400, 300)).toBe(true); // Center
      expect(manager.isPointInViewport(0, 0)).toBe(true); // Top-left
      expect(manager.isPointInViewport(800, 600)).toBe(true); // Bottom-right
      expect(manager.isPointInViewport(-100, 300)).toBe(false); // Left of viewport
      expect(manager.isPointInViewport(900, 300)).toBe(false); // Right of viewport
      expect(manager.isPointInViewport(400, -100)).toBe(false); // Above viewport
      expect(manager.isPointInViewport(400, 700)).toBe(false); // Below viewport
    });
  });

  describe('Fit to Viewport', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
    });

    it('should fit bounds to viewport with padding', () => {
      const bounds = { x: 100, y: 50, width: 200, height: 100 };
      
      manager.fitToViewport(bounds);
      
      // Available space: 800 - 100 (padding) = 700px width, 600 - 100 = 500px height
      // Zoom to fit: min(700/200, 500/100) = min(3.5, 5.0) = 3.5, but clamped to max 3.0
      // Center should be at bounds center: (100 + 200/2, 50 + 100/2) = (200, 100)
      // Camera should center this at canvas center: (400, 300)
      expect(manager.camera.zoom).toBe(3.0);
      expect(manager.camera.x).toBeCloseTo(400 - 200 * 3.0); // -200
      expect(manager.camera.y).toBeCloseTo(300 - 100 * 3.0); // 0
    });

    it('should not zoom below minimum', () => {
      const largeBounds = { x: 0, y: 0, width: 10000, height: 8000 };
      
      manager.fitToViewport(largeBounds);
      
      expect(manager.camera.zoom).toBe(0.1); // Minimum zoom
    });
  });

  describe('Wheel Event Handling', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
      mockCanvas.getBoundingClientRect.mockReturnValue({
        left: 10,
        top: 20,
        width: 800,
        height: 600,
        right: 810,
        bottom: 620,
        x: 10,
        y: 20,
        toJSON: () => ({})
      });
    });

    it('should handle wheel zoom in', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const wheelEvent = new WheelEvent('wheel', {
        clientX: 410, // 400 relative to canvas
        clientY: 320, // 300 relative to canvas
        deltaY: -100  // Zoom in
      });

      manager.handleWheelEvent(wheelEvent);

      expect(emitSpy).toHaveBeenCalledWith(
        Events.VIEWPORT_ZOOM_REQUESTED,
        expect.objectContaining({
          zoomFactor: 1.1, // 1 + 0.1
          screenX: 400,
          screenY: 300,
          wheelDelta: -100
        })
      );
    });

    it('should handle wheel zoom out', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const wheelEvent = new WheelEvent('wheel', {
        clientX: 410,
        clientY: 320,
        deltaY: 100 // Zoom out
      });

      manager.handleWheelEvent(wheelEvent);

      expect(emitSpy).toHaveBeenCalledWith(
        Events.VIEWPORT_ZOOM_REQUESTED,
        expect.objectContaining({
          zoomFactor: 0.9, // 1 - 0.1
          screenX: 400,
          screenY: 300,
          wheelDelta: 100
        })
      );
    });

    it('should prevent default wheel behavior', () => {
      const wheelEvent = new WheelEvent('wheel', {
        clientX: 410,
        clientY: 320,
        deltaY: 100
      });
      const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault');

      manager.handleWheelEvent(wheelEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });

  describe('Event Integration', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
    });

    it('should respond to pan requests', () => {
      const initialCamera = { ...manager.camera };
      
      eventBus.emit(Events.VIEWPORT_PAN_REQUESTED, {
        deltaX: 50,
        deltaY: -25,
        timestamp: Date.now()
      });
      
      expect(manager.camera.x).toBe(initialCamera.x + 50);
      expect(manager.camera.y).toBe(initialCamera.y - 25);
    });

    it('should respond to zoom requests', () => {
      eventBus.emit(Events.VIEWPORT_ZOOM_REQUESTED, {
        zoomFactor: 1.5,
        screenX: 400,
        screenY: 300,
        timestamp: Date.now()
      });
      
      expect(manager.camera.zoom).toBe(1.5);
    });
  });

  describe('Destruction', () => {
    let manager: ViewportManagerImpl;

    beforeEach(() => {
      manager = new ViewportManagerImpl('test-canvas', eventBus);
      manager.initialize();
    });

    it('should throw error when using destroyed manager', () => {
      manager.destroy();
      
      expect(() => {
        manager.initialize();
      }).toThrow('ViewportManager has been destroyed');
    });

    it('should clean up ResizeObserver', () => {
      const mockObserver = { disconnect: vi.fn(), observe: vi.fn(), unobserve: vi.fn() };
      mockResizeObserver.mockReturnValue(mockObserver);
      
      const newManager = new ViewportManagerImpl('test-canvas', eventBus);
      newManager.setupCanvas();
      newManager.destroy();
      
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });

  describe('Singleton Factory', () => {
    afterEach(() => {
      destroyViewportManager();
    });

    it('should create singleton instance', () => {
      const manager1 = createViewportManager('test-canvas', eventBus);
      
      expect(() => {
        createViewportManager('test-canvas', eventBus);
      }).toThrow('ViewportManager instance already exists');
      
      expect(manager1).toBeDefined();
    });

    it('should allow recreation after destruction', () => {
      const manager1 = createViewportManager('test-canvas', eventBus);
      destroyViewportManager();
      
      const manager2 = createViewportManager('test-canvas', eventBus);
      
      expect(manager2).toBeDefined();
      expect(manager2).not.toBe(manager1);
    });
  });
});
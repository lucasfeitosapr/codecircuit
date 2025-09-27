import { describe, it, expect, beforeEach, vi } from 'vitest';
import UILayer, {
  type SelectionBox,
  type GuideLine,
  type UIOverlay,
  type ConnectionIntent,
} from './UILayer';
import type { ComponentBase, PinHit } from '../../types';

describe('UILayer', () => {
  let uiLayer: UILayer;
  let mockCtx: CanvasRenderingContext2D;
  let mockFrame: any;
  let mockComponent: ComponentBase;
  let mockPinHit: PinHit;

  beforeEach(() => {
    uiLayer = new UILayer();

    // Mock canvas context
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      strokeStyle: '',
      lineWidth: 1,
      shadowColor: '',
      shadowBlur: 0,
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      setLineDash: vi.fn(),
    } as any;

    mockFrame = {
      timestamp: 1000,
      camera: { x: 0, y: 0, zoom: 1 },
    };

    mockComponent = {
      id: 'comp1',
      type: 'power-core',
      x: 100,
      y: 100,
      width: 80,
      height: 40,
      name: 'Test Component',
      pins: { input: [], output: [] },
      status: 'defined',
      title: 'Test Component',
      description: '',
      category: 'frontend',
      createdAt: new Date(),
    };

    mockPinHit = {
      component: mockComponent,
      pinType: 'output',
      pinIndex: 0,
      x: 180,
      y: 120,
      category: 'frontend',
    };
  });

  describe('Selection Box Management', () => {
    it('should add selection box', () => {
      const selectionId = uiLayer.addSelectionBox(mockComponent, 'single');

      expect(selectionId).toMatch(/^selection_\d+_\d+$/);
    });

    it('should add selection box with different types', () => {
      const singleId = uiLayer.addSelectionBox(mockComponent, 'single');
      const multiId = uiLayer.addSelectionBox(mockComponent, 'multi');
      const hoverId = uiLayer.addSelectionBox(mockComponent, 'hover');

      expect(singleId).toMatch(/^selection_\d+_\d+$/);
      expect(multiId).toMatch(/^selection_\d+_\d+$/);
      expect(hoverId).toMatch(/^selection_\d+_\d+$/);
    });

    it('should update selection box', () => {
      const selectionId = uiLayer.addSelectionBox(mockComponent, 'single');

      const updatedComponent = { ...mockComponent, x: 200, y: 200 };
      uiLayer.updateSelectionBox(selectionId, updatedComponent);

      // Should not throw
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should remove selection box', () => {
      const selectionId = uiLayer.addSelectionBox(mockComponent, 'single');

      const removed = uiLayer.removeSelectionBox(selectionId);
      expect(removed).toBe(true);
    });

    it('should clear all selection boxes', () => {
      uiLayer.addSelectionBox(mockComponent, 'single');
      uiLayer.addSelectionBox(mockComponent, 'multi');

      uiLayer.clearSelectionBoxes();
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should render selection boxes', () => {
      uiLayer.addSelectionBox(mockComponent, 'single');

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  describe('Guide Line Management', () => {
    it('should add guide line', () => {
      const guideId = uiLayer.addGuideLine({
        type: 'horizontal',
        startX: 0,
        startY: 100,
        endX: 200,
        endY: 100,
        color: '#00ff88',
        opacity: 0.8,
        dashed: true,
        label: 'Test Guide',
      });

      expect(guideId).toMatch(/^guide_\d+_\d+$/);
    });

    it('should remove guide line', () => {
      const guideId = uiLayer.addGuideLine({
        type: 'vertical',
        startX: 100,
        startY: 0,
        endX: 100,
        endY: 200,
        color: '#ff0000',
        opacity: 0.6,
      });

      const removed = uiLayer.removeGuideLine(guideId);
      expect(removed).toBe(true);
    });

    it('should clear all guide lines', () => {
      uiLayer.addGuideLine({
        type: 'horizontal',
        startX: 0,
        startY: 100,
        endX: 200,
        endY: 100,
        color: '#00ff88',
        opacity: 0.8,
      });

      uiLayer.clearGuideLines();
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should render guide lines', () => {
      uiLayer.addGuideLine({
        type: 'horizontal',
        startX: 0,
        startY: 100,
        endX: 200,
        endY: 100,
        color: '#00ff88',
        opacity: 0.8,
        dashed: true,
      });

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should add alignment guides for components', () => {
      const components = [
        mockComponent,
        { ...mockComponent, id: 'comp2', x: 100, y: 150 }, // Same x, different y
        { ...mockComponent, id: 'comp3', x: 200, y: 100 }, // Same y, different x
      ];

      const guideIds = uiLayer.addAlignmentGuides(mockComponent, components);

      expect(guideIds.length).toBeGreaterThan(0);
      expect(guideIds.every(id => id.match(/^guide_\d+_\d+$/))).toBe(true);
    });
  });

  describe('UI Overlay Management', () => {
    it('should add UI overlay', () => {
      const overlayId = uiLayer.addUIOverlay({
        type: 'tooltip',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        content: 'Test tooltip',
        visible: true,
      });

      expect(overlayId).toMatch(/^overlay_\d+_\d+$/);
    });

    it('should update UI overlay', () => {
      const overlayId = uiLayer.addUIOverlay({
        type: 'tooltip',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        content: 'Test tooltip',
        visible: true,
      });

      uiLayer.updateUIOverlay(overlayId, {
        content: 'Updated tooltip',
        visible: false,
      });

      // Should not throw
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should remove UI overlay', () => {
      const overlayId = uiLayer.addUIOverlay({
        type: 'context-menu',
        x: 100,
        y: 100,
        width: 150,
        height: 100,
        content: 'Menu item 1\nMenu item 2',
        visible: true,
      });

      const removed = uiLayer.removeUIOverlay(overlayId);
      expect(removed).toBe(true);
    });

    it('should clear all UI overlays', () => {
      uiLayer.addUIOverlay({
        type: 'tooltip',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        content: 'Test tooltip',
        visible: true,
      });

      uiLayer.clearUIOverlays();
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should render different overlay types', () => {
      const overlayTypes: UIOverlay['type'][] = [
        'tooltip',
        'context-menu',
        'datasheet',
        'connection-hint',
      ];

      overlayTypes.forEach(type => {
        uiLayer.addUIOverlay({
          type,
          x: 100,
          y: 100,
          width: 200,
          height: 100,
          content: `Test ${type}`,
          visible: true,
        });
      });

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should only render visible overlays', () => {
      uiLayer.addUIOverlay({
        type: 'tooltip',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        content: 'Visible tooltip',
        visible: true,
      });

      uiLayer.addUIOverlay({
        type: 'tooltip',
        x: 200,
        y: 200,
        width: 200,
        height: 50,
        content: 'Hidden tooltip',
        visible: false,
      });

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });

  describe('Connection Intent Management', () => {
    it('should add connection intent', () => {
      const intentId = uiLayer.addConnectionIntent({
        startPin: mockPinHit,
        isValid: true,
        category: 'frontend',
      });

      expect(intentId).toMatch(/^intent_\d+_\d+$/);
    });

    it('should update connection intent', () => {
      const intentId = uiLayer.addConnectionIntent({
        startPin: mockPinHit,
        isValid: true,
        category: 'frontend',
      });

      const endPin = { ...mockPinHit, x: 300, y: 200 };
      uiLayer.updateConnectionIntent(intentId, {
        endPin,
        isValid: false,
      });

      // Should not throw
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should remove connection intent', () => {
      const intentId = uiLayer.addConnectionIntent({
        startPin: mockPinHit,
        isValid: true,
        category: 'frontend',
      });

      const removed = uiLayer.removeConnectionIntent(intentId);
      expect(removed).toBe(true);
    });

    it('should clear all connection intents', () => {
      uiLayer.addConnectionIntent({
        startPin: mockPinHit,
        isValid: true,
        category: 'frontend',
      });

      uiLayer.clearConnectionIntents();
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should render connection intents', () => {
      uiLayer.addConnectionIntent({
        startPin: mockPinHit,
        isValid: true,
        category: 'frontend',
      });

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should render connection intents with end pin', () => {
      const endPin = { ...mockPinHit, x: 300, y: 200 };

      uiLayer.addConnectionIntent({
        startPin: mockPinHit,
        endPin,
        isValid: false,
        category: 'frontend',
      });

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });

  describe('Rendering', () => {
    it('should render without errors with empty state', () => {
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should render all UI elements', () => {
      uiLayer.addSelectionBox(mockComponent, 'single');
      uiLayer.addGuideLine({
        type: 'horizontal',
        startX: 0,
        startY: 100,
        endX: 200,
        endY: 100,
        color: '#00ff88',
        opacity: 0.8,
      });
      uiLayer.addUIOverlay({
        type: 'tooltip',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        content: 'Test tooltip',
        visible: true,
      });
      uiLayer.addConnectionIntent({
        startPin: mockPinHit,
        isValid: true,
        category: 'frontend',
      });

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should apply camera transformations', () => {
      mockFrame.camera = { x: 50, y: 50, zoom: 2 };

      uiLayer.addSelectionBox(mockComponent, 'single');
      uiLayer.addGuideLine({
        type: 'horizontal',
        startX: 0,
        startY: 100,
        endX: 200,
        endY: 100,
        color: '#00ff88',
        opacity: 0.8,
      });

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should handle missing frame properties', () => {
      const incompleteFrame = {
        timestamp: 1000,
        // Missing camera
      };

      uiLayer.addSelectionBox(mockComponent, 'single');

      // Should not throw
      expect(() => uiLayer.render(mockCtx, incompleteFrame as any)).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old elements', () => {
      uiLayer.addSelectionBox(mockComponent, 'hover'); // Should be cleaned up
      uiLayer.addSelectionBox(mockComponent, 'single'); // Should not be cleaned up

      // Simulate time passing
      mockFrame.timestamp = 10000; // 9 seconds later

      uiLayer.render(mockCtx, mockFrame);

      // Should not throw
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should cleanup old guide lines', () => {
      uiLayer.addGuideLine({
        type: 'horizontal',
        startX: 0,
        startY: 100,
        endX: 200,
        endY: 100,
        color: '#00ff88',
        opacity: 0.8,
      });

      // Simulate time passing
      mockFrame.timestamp = 10000;

      uiLayer.render(mockCtx, mockFrame);

      // Should not throw
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should cleanup old UI overlays', () => {
      uiLayer.addUIOverlay({
        type: 'tooltip',
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        content: 'Test tooltip',
        visible: true,
      });

      // Simulate time passing
      mockFrame.timestamp = 10000;

      uiLayer.render(mockCtx, mockFrame);

      // Should not throw
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should cleanup old connection intents', () => {
      uiLayer.addConnectionIntent({
        startPin: mockPinHit,
        isValid: true,
        category: 'frontend',
      });

      // Simulate time passing
      mockFrame.timestamp = 10000;

      uiLayer.render(mockCtx, mockFrame);

      // Should not throw
      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle render errors gracefully', () => {
      const errorCtx = {
        save: vi.fn(() => {
          throw new Error('Canvas error');
        }),
        restore: vi.fn(),
      } as any;

      uiLayer.addSelectionBox(mockComponent, 'single');

      // Should not throw even if canvas operations fail
      expect(() => uiLayer.render(errorCtx, mockFrame)).not.toThrow();
    });

    it('should handle missing selection box during update', () => {
      const nonExistentId = 'selection_999_999';
      const updatedComponent = { ...mockComponent, x: 200, y: 200 };

      // Should not throw when trying to update non-existent selection box
      expect(() => uiLayer.updateSelectionBox(nonExistentId, updatedComponent)).not.toThrow();
    });

    it('should handle missing UI overlay during update', () => {
      const nonExistentId = 'overlay_999_999';

      // Should not throw when trying to update non-existent overlay
      expect(() => uiLayer.updateUIOverlay(nonExistentId, { content: 'Updated' })).not.toThrow();
    });

    it('should handle missing connection intent during update', () => {
      const nonExistentId = 'intent_999_999';

      // Should not throw when trying to update non-existent intent
      expect(() => uiLayer.updateConnectionIntent(nonExistentId, { isValid: false })).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of UI elements', () => {
      // Add many UI elements
      for (let i = 0; i < 50; i++) {
        uiLayer.addSelectionBox({ ...mockComponent, id: `comp${i}` }, 'single');
        uiLayer.addGuideLine({
          type: 'horizontal',
          startX: i * 10,
          startY: i * 10,
          endX: (i + 1) * 10,
          endY: i * 10,
          color: '#00ff88',
          opacity: 0.8,
        });
        uiLayer.addUIOverlay({
          type: 'tooltip',
          x: i * 20,
          y: i * 20,
          width: 100,
          height: 30,
          content: `Tooltip ${i}`,
          visible: true,
        });
      }

      expect(() => uiLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });
});

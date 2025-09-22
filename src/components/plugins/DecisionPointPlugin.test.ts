// DecisionPointPlugin.test.ts - Test suite for Decision Point plugin
// Part of Phase 7A: Core Extended Components

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  DecisionPointPlugin,
  createDecisionPoint,
  renderDecisionPoint,
  evaluateDecisionPoint,
  type DecisionPointComponent
} from './DecisionPointPlugin';
import { componentSystem } from '../ComponentSystem';

// Mock canvas context for rendering tests
const mockCanvasContext = {
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  fillRect: vi.fn(), // Added for duck typing
  constructor: { name: 'CanvasRenderingContext2D' }, // Added for type detection
  set fillStyle(value: string) {},
  set strokeStyle(value: string) {},
  set lineWidth(value: number) {},
  set font(value: string) {},
  set textAlign(value: string) {},
  set textBaseline(value: string) {},
} as unknown as CanvasRenderingContext2D;

describe('DecisionPointPlugin', () => {
  beforeEach(() => {
    // Clear any existing registrations
    componentSystem.unregister('decision-point');
    vi.clearAllMocks();
  });

  describe('Plugin Registration', () => {
    it('should register successfully with ComponentSystem', () => {
      componentSystem.register(DecisionPointPlugin);
      
      const plugin = componentSystem.get('decision-point');
      expect(plugin).toBeDefined();
      expect(plugin?.id).toBe('decision-point');
      expect(plugin?.displayName).toBe('Decision Point ◆');
    });

    it('should prevent duplicate registration', () => {
      componentSystem.register(DecisionPointPlugin);
      
      expect(() => {
        componentSystem.register(DecisionPointPlugin);
      }).toThrow('Plugin with id decision-point already registered');
    });
  });

  describe('Component Creation', () => {
    it('should create decision point with default configuration', () => {
      const component = createDecisionPoint({ x: 100, y: 200 });
      
      expect(component.type).toBe('decision-point');
      expect(component.x).toBe(100);
      expect(component.y).toBe(200);
      expect(component.width).toBe(60);
      expect(component.height).toBe(60);
      expect(component.condition).toBe('condition?');
      expect(component.trueLabel).toBe('TRUE');
      expect(component.falseLabel).toBe('FALSE');
      expect(component.color).toBe('#4ECDC4');
      expect(component.status).toBe('defined');
      expect(component.lastResult).toBeUndefined();
      expect(component.evaluationCount).toBe(0);
    });

    it('should create component with custom configuration', () => {
      const component = createDecisionPoint({
        x: 50,
        y: 75,
        id: 'custom-decision',
        condition: 'user.isPremium',
        trueLabel: 'PREMIUM',
        falseLabel: 'BASIC'
      });
      
      expect(component.id).toBe('custom-decision');
      expect(component.condition).toBe('user.isPremium');
      expect(component.trueLabel).toBe('PREMIUM');
      expect(component.falseLabel).toBe('BASIC');
      expect(component.title).toBe('user.isPremium');
    });

    it('should configure pins correctly', () => {
      const component = createDecisionPoint({ x: 0, y: 0 });
      
      // Input pin configuration
      expect(component.pins.input).toHaveLength(1);
      expect(component.pins.input![0]).toEqual({
        x: 30,
        y: 0,
        type: 'input',
        label: 'condition'
      });
      
      // Output pin configuration
      expect(component.pins.output).toHaveLength(2);
      expect(component.pins.output![0]).toEqual({
        x: 60,
        y: 30,
        type: 'success',
        label: 'TRUE'
      });
      expect(component.pins.output![1]).toEqual({
        x: 0,
        y: 30,
        type: 'failure',
        label: 'FALSE'
      });
    });
  });

  describe('Component Rendering', () => {
    let component: DecisionPointComponent;

    beforeEach(() => {
      component = createDecisionPoint({
        x: 100,
        y: 150,
        condition: 'auth.valid',
        trueLabel: 'SUCCESS',
        falseLabel: 'FAILURE'
      });
    });

    it('should render diamond shape', () => {
      renderDecisionPoint(mockCanvasContext, { timestamp: 0 }, component);
      
      // Verify diamond path creation
      expect(mockCanvasContext.beginPath).toHaveBeenCalled();
      expect(mockCanvasContext.moveTo).toHaveBeenCalledWith(0, -30); // Top
      expect(mockCanvasContext.lineTo).toHaveBeenCalledWith(30, 0);   // Right
      expect(mockCanvasContext.lineTo).toHaveBeenCalledWith(0, 30);   // Bottom
      expect(mockCanvasContext.lineTo).toHaveBeenCalledWith(-30, 0);  // Left
      expect(mockCanvasContext.closePath).toHaveBeenCalled();
    });

    it('should apply correct positioning', () => {
      renderDecisionPoint(mockCanvasContext, { timestamp: 0 }, component);
      
      expect(mockCanvasContext.translate).toHaveBeenCalledWith(130, 180);
    });

    it('should render condition title', () => {
      renderDecisionPoint(mockCanvasContext, { timestamp: 0 }, component);
      
      expect(mockCanvasContext.fillText).toHaveBeenCalledWith('auth.valid', 0, -38);
    });

    it('should render output labels', () => {
      renderDecisionPoint(mockCanvasContext, { timestamp: 0 }, component);
      
      expect(mockCanvasContext.fillText).toHaveBeenCalledWith('SUCCESS', 45, -8);
      expect(mockCanvasContext.fillText).toHaveBeenCalledWith('FAILURE', -45, -8);
    });

    it('should handle result-based border coloring', () => {
      // Clear previous calls
      vi.clearAllMocks();
      
      // Test TRUE result coloring
      component.lastResult = true;
      renderDecisionPoint(mockCanvasContext, { timestamp: 0 }, component);
      
      // Should have called stroke for border and arrows
      expect(mockCanvasContext.stroke).toHaveBeenCalled();
    });

    it('should render status indicator', () => {
      component.status = 'in-progress';
      renderDecisionPoint(mockCanvasContext, { timestamp: 0 }, component);
      
      expect(mockCanvasContext.arc).toHaveBeenCalledWith(0, 38, 4, 0, Math.PI * 2);
    });

    it('should handle WebGL context gracefully', () => {
      const webglContext = {} as WebGLRenderingContext;
      
      expect(() => {
        renderDecisionPoint(webglContext, { timestamp: 0 }, component);
      }).not.toThrow();
    });

    it('should handle missing component gracefully', () => {
      expect(() => {
        renderDecisionPoint(mockCanvasContext, { timestamp: 0 }, undefined);
      }).not.toThrow();
    });
  });

  describe('Component Evaluation', () => {
    let component: DecisionPointComponent;
    let mockEmit: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      component = createDecisionPoint({
        x: 0,
        y: 0,
        condition: 'user.isValid'
      });
      mockEmit = vi.fn();
    });

    it('should evaluate decision and emit event', () => {
      evaluateDecisionPoint(component, mockEmit);
      
      expect(component.evaluationCount).toBe(1);
      expect(component.lastResult).toBeDefined();
      expect(mockEmit).toHaveBeenCalledWith('decision.evaluated', {
        componentId: component.id,
        condition: 'user.isValid',
        result: expect.any(Boolean),
        timestamp: expect.any(Number),
        evaluationCount: 1
      });
    });

    it('should increment evaluation count on multiple calls', () => {
      evaluateDecisionPoint(component, mockEmit);
      evaluateDecisionPoint(component, mockEmit);
      evaluateDecisionPoint(component, mockEmit);
      
      expect(component.evaluationCount).toBe(3);
      expect(mockEmit).toHaveBeenCalledTimes(3);
    });

    it('should handle invalid component gracefully', () => {
      const invalidComponent = { type: 'INVALID' };
      
      expect(() => {
        evaluateDecisionPoint(invalidComponent, mockEmit);
      }).not.toThrow();
      
      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should handle missing component gracefully', () => {
      expect(() => {
        evaluateDecisionPoint(null, mockEmit);
      }).not.toThrow();
      
      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('Serialization', () => {
    let component: DecisionPointComponent;

    beforeEach(() => {
      component = createDecisionPoint({
        x: 100,
        y: 200,
        condition: 'test.condition'
      });
      component.lastResult = true;
      component.evaluationCount = 5;
    });

    it('should serialize component correctly', () => {
      const serialized = DecisionPointPlugin.serialize!(component);
      
      expect(serialized.type).toBe('decision-point');
      expect(serialized.x).toBe(100);
      expect(serialized.y).toBe(200);
      expect(serialized.condition).toBe('test.condition');
      expect(serialized.evaluationCount).toBe(5);
      expect(serialized.lastResult).toBeUndefined(); // Runtime data should be removed
    });

    it('should deserialize component correctly', () => {
      const data = {
        id: 'test-decision',
        type: 'DECISION_POINT',
        x: 150,
        y: 250,
        condition: 'deserialize.test',
        evaluationCount: 10,
        lastResult: true // Should be reset
      };
      
      const deserialized = DecisionPointPlugin.deserialize!(data);
      
      expect(deserialized.type).toBe('decision-point');
      expect(deserialized.x).toBe(150);
      expect(deserialized.y).toBe(250);
      expect(deserialized.condition).toBe('deserialize.test');
      expect(deserialized.lastResult).toBeUndefined(); // Runtime data reset
      expect(deserialized.evaluationCount).toBe(0); // Runtime data reset
    });
  });

  describe('Integration', () => {
    it('should work with plugin system lifecycle', () => {
      // Register plugin
      componentSystem.register(DecisionPointPlugin);
      
      // Create component using plugin
      const component = createDecisionPoint({
        x: 300,
        y: 400,
        condition: 'integration.test'
      });
      
      // Test plugin methods
      const plugin = componentSystem.get('decision-point')!;
      
      // Test render (should not throw)
      expect(() => {
        plugin.render!(mockCanvasContext, { timestamp: 0 }, component);
      }).not.toThrow();
      
      // Test evaluate (should not throw)
      expect(() => {
        plugin.evaluate!(component, vi.fn());
      }).not.toThrow();
      
      // Test serialization roundtrip
      const serialized = plugin.serialize!(component);
      const deserialized = plugin.deserialize!(serialized);
      
      expect(deserialized.type).toBe(component.type);
      expect(deserialized.condition).toBe(component.condition);
    });
  });
});
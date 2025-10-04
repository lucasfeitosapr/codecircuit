// DecisionPointPluginV2.test.ts - Comprehensive tests for Decision Point plugin
// Tests diamond-shaped conditional logic component with custom TRUE/FALSE pins

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DecisionPointPluginV2, DecisionPointComponent } from './DecisionPointPluginV2';
import { eventBus } from '../../events/EventBus';

describe('DecisionPointPluginV2', () => {
  let plugin: DecisionPointPluginV2;
  let mockCanvasContext: any;

  beforeEach(() => {
    plugin = new DecisionPointPluginV2();

    // Mock canvas context
    mockCanvasContext = {
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
      fillRect: vi.fn(), // Duck typing for test detection
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      shadowColor: '',
      shadowBlur: 0,
    };
  });

  describe('Plugin Metadata', () => {
    it('should have correct plugin type', () => {
      expect(plugin.type).toBe('decision-point');
    });

    it('should have correct metadata', () => {
      expect(plugin.metadata.displayName).toBe('Decision Point ◆');
      expect(plugin.metadata.icon).toBe('◆');
      expect(plugin.metadata.color).toBe('#4ECDC4');
      expect(plugin.metadata.category).toBe('flow-control');
    });

    it('should have diamond dimensions', () => {
      expect(plugin.metadata.width).toBe(60);
      expect(plugin.metadata.height).toBe(60);
    });

    it('should have 1 input pin and 2 output pins', () => {
      expect(plugin.metadata.pins.input).toHaveLength(1);
      expect(plugin.metadata.pins.output).toHaveLength(2);
    });

    it('should have correctly positioned input pin', () => {
      const inputPin = plugin.metadata.pins.input![0];
      expect(inputPin.x).toBe(30); // Top center
      expect(inputPin.y).toBe(0);
      expect(inputPin.type).toBe('input');
      expect(inputPin.label).toBe('condition');
    });

    it('should have TRUE pin on right', () => {
      const truePin = plugin.metadata.pins.output![0];
      expect(truePin.x).toBe(60);
      expect(truePin.y).toBe(30);
      expect(truePin.type).toBe('success');
      expect(truePin.label).toBe('TRUE');
    });

    it('should have FALSE pin on left', () => {
      const falsePin = plugin.metadata.pins.output![1];
      expect(falsePin.x).toBe(0);
      expect(falsePin.y).toBe(30);
      expect(falsePin.type).toBe('failure');
      expect(falsePin.label).toBe('FALSE');
    });
  });

  describe('Component Creation', () => {
    it('should create decision point with default values', () => {
      const component = plugin.createComponent({ x: 100, y: 200 });

      expect(component.type).toBe('decision-point');
      expect(component.x).toBe(100);
      expect(component.y).toBe(200);
      expect(component.width).toBe(60);
      expect(component.height).toBe(60);
    });

    it('should set default condition text', () => {
      const component = plugin.createComponent({ x: 100, y: 200 });

      expect(component.condition).toBe('condition?');
      expect(component.title).toBe('Decision Point'); // Falls back to 'Decision Point' when condition is default
    });

    it('should accept custom condition', () => {
      const component = plugin.createComponent({
        x: 100,
        y: 200,
        condition: 'x > 10',
      });

      expect(component.condition).toBe('x > 10');
      expect(component.title).toBe('x > 10');
    });

    it('should set default TRUE/FALSE labels', () => {
      const component = plugin.createComponent({ x: 100, y: 200 });

      expect(component.trueLabel).toBe('TRUE');
      expect(component.falseLabel).toBe('FALSE');
    });

    it('should accept custom output labels', () => {
      const component = plugin.createComponent({
        x: 100,
        y: 200,
        trueLabel: 'YES',
        falseLabel: 'NO',
      });

      expect(component.trueLabel).toBe('YES');
      expect(component.falseLabel).toBe('NO');

      // Output pins should use custom labels
      const truePin = component.pins.output![0];
      expect(truePin.label).toBe('YES');
    });

    it('should initialize with defined status', () => {
      const component = plugin.createComponent({ x: 100, y: 200 });

      expect(component.status).toBe('defined');
    });

    it('should initialize evaluation state', () => {
      const component = plugin.createComponent({ x: 100, y: 200 });

      expect(component.lastResult).toBeUndefined();
      expect(component.evaluationCount).toBe(0);
    });

    it('should generate unique ID', () => {
      // Wait 1ms between calls to ensure different timestamps
      const comp1 = plugin.createComponent({ x: 100, y: 200 });

      // Sleep for 1ms to get different timestamp
      const start = Date.now();
      while (Date.now() === start) {
        // busy wait for 1ms
      }

      const comp2 = plugin.createComponent({ x: 100, y: 200 });

      expect(comp1.id).not.toBe(comp2.id);
      expect(comp1.id).toMatch(/^decision_\d+$/);
    });

    it('should accept custom ID', () => {
      const component = plugin.createComponent({
        x: 100,
        y: 200,
        id: 'custom-decision-1',
      });

      expect(component.id).toBe('custom-decision-1');
    });

    it('should set teal color', () => {
      const component = plugin.createComponent({ x: 100, y: 200 });

      expect(component.color).toBe('#4ECDC4');
    });

    it('should have correct pin configuration', () => {
      const component = plugin.createComponent({ x: 100, y: 200 });

      expect(component.pins.input).toHaveLength(1);
      expect(component.pins.output).toHaveLength(2);

      // Input pin at top center
      expect(component.pins.input![0]).toEqual({
        x: 30,
        y: 0,
        type: 'input',
        label: 'condition',
      });

      // TRUE output on right
      expect(component.pins.output![0]).toEqual({
        x: 60,
        y: 30,
        type: 'success',
        label: 'TRUE',
      });

      // FALSE output on left
      expect(component.pins.output![1]).toEqual({
        x: 0,
        y: 30,
        type: 'failure',
        label: 'FALSE',
      });
    });
  });

  describe('Component Rendering', () => {
    let component: DecisionPointComponent;
    let frame: any;

    beforeEach(() => {
      component = plugin.createComponent({ x: 100, y: 100 });
      frame = {
        camera: { x: 0, y: 0, zoom: 1 },
        width: 800,
        height: 600,
      };
    });

    it('should render without errors', () => {
      expect(() => {
        plugin.renderComponent(mockCanvasContext, frame, component);
      }).not.toThrow();
    });

    it('should use canvas transformations', () => {
      plugin.renderComponent(mockCanvasContext, frame, component);

      expect(mockCanvasContext.save).toHaveBeenCalled();
      expect(mockCanvasContext.restore).toHaveBeenCalled();
      expect(mockCanvasContext.translate).toHaveBeenCalled();
    });

    it('should draw diamond shape', () => {
      plugin.renderComponent(mockCanvasContext, frame, component);

      expect(mockCanvasContext.beginPath).toHaveBeenCalled();
      expect(mockCanvasContext.moveTo).toHaveBeenCalled();
      expect(mockCanvasContext.lineTo).toHaveBeenCalled();
      expect(mockCanvasContext.closePath).toHaveBeenCalled();
      expect(mockCanvasContext.fill).toHaveBeenCalled();
      expect(mockCanvasContext.stroke).toHaveBeenCalled();
    });

    it('should render with camera zoom', () => {
      frame.camera.zoom = 2;

      plugin.renderComponent(mockCanvasContext, frame, component);

      expect(mockCanvasContext.translate).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render with camera offset', () => {
      frame.camera.x = 50;
      frame.camera.y = 100;

      plugin.renderComponent(mockCanvasContext, frame, component);

      expect(mockCanvasContext.translate).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render title text', () => {
      component.title = 'Is Valid?';

      plugin.renderComponent(mockCanvasContext, frame, component);

      expect(mockCanvasContext.fillText).toHaveBeenCalledWith(
        'Is Valid?',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render diamond symbol', () => {
      plugin.renderComponent(mockCanvasContext, frame, component);

      expect(mockCanvasContext.fillText).toHaveBeenCalledWith(
        '◆',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render output indicators when size > 40', () => {
      component.width = 60;
      component.height = 60;

      plugin.renderComponent(mockCanvasContext, frame, component);

      // Should render TRUE and FALSE labels
      const fillTextCalls = mockCanvasContext.fillText.mock.calls;
      const hasOutputLabels = fillTextCalls.some(
        (call: any) => call[0] === 'TRUE' || call[0] === 'FALSE'
      );
      expect(hasOutputLabels).toBe(true);
    });

    it('should not render output indicators when size <= 40', () => {
      frame.camera.zoom = 0.5; // Makes screen size = 30

      plugin.renderComponent(mockCanvasContext, frame, component);

      const fillTextCalls = mockCanvasContext.fillText.mock.calls;
      const hasOutputLabels = fillTextCalls.some(
        (call: any) => call[0] === 'TRUE' || call[0] === 'FALSE'
      );
      expect(hasOutputLabels).toBe(false);
    });

    it('should render status indicator', () => {
      component.status = 'done';

      plugin.renderComponent(mockCanvasContext, frame, component);

      expect(mockCanvasContext.arc).toHaveBeenCalled();
    });

    it('should use different colors for different statuses', () => {
      const statuses = ['defined', 'todo', 'in-progress', 'done'];

      statuses.forEach(status => {
        mockCanvasContext.fillStyle = '';
        component.status = status as any;
        plugin.renderComponent(mockCanvasContext, frame, component);
        expect(mockCanvasContext.fillStyle).toBeTruthy();
      });
    });

    it('should apply glow effect for in-progress status', () => {
      component.status = 'in-progress';

      plugin.renderComponent(mockCanvasContext, frame, component);

      // Shadow blur should be set during rendering, check it was called
      // Note: It gets reset to 0 after rendering
      expect(mockCanvasContext.shadowColor).toBeTruthy();
    });

    it('should apply glow effect for done status', () => {
      component.status = 'done';

      plugin.renderComponent(mockCanvasContext, frame, component);

      // Shadow color should be set for glow effect
      expect(mockCanvasContext.shadowColor).toBeTruthy();
    });

    it('should render custom output labels', () => {
      component.trueLabel = 'PASS';
      component.falseLabel = 'FAIL';

      plugin.renderComponent(mockCanvasContext, frame, component);

      const fillTextCalls = mockCanvasContext.fillText.mock.calls;
      const hasCustomLabels = fillTextCalls.some(
        (call: any) => call[0] === 'PASS' || call[0] === 'FAIL'
      );
      expect(hasCustomLabels).toBe(true);
    });

    it('should render arrows pointing to outputs', () => {
      plugin.renderComponent(mockCanvasContext, frame, component);

      // Arrows use stroke commands
      expect(mockCanvasContext.stroke).toHaveBeenCalled();
    });

    it('should skip rendering for non-canvas context', () => {
      const invalidContext = {} as any;

      expect(() => {
        plugin.renderComponent(invalidContext, frame, component);
      }).not.toThrow();

      // Should not call canvas methods
      expect(mockCanvasContext.save).not.toHaveBeenCalled();
    });
  });

  describe('Component Evaluation', () => {
    let component: DecisionPointComponent;

    beforeEach(() => {
      component = plugin.createComponent({
        x: 100,
        y: 100,
        condition: 'x > 5',
      });
    });

    it('should update lastResult', () => {
      plugin.evaluateComponent(component);

      expect(component.lastResult).toBeDefined();
      expect(typeof component.lastResult).toBe('boolean');
    });

    it('should increment evaluation count', () => {
      expect(component.evaluationCount).toBe(0);

      plugin.evaluateComponent(component);
      expect(component.evaluationCount).toBe(1);

      plugin.evaluateComponent(component);
      expect(component.evaluationCount).toBe(2);
    });

    it('should emit decision.evaluated event', () => {
      const eventSpy = vi.fn();
      eventBus.on('decision.evaluated', eventSpy);

      plugin.evaluateComponent(component);

      expect(eventSpy).toHaveBeenCalledWith({
        componentId: component.id,
        condition: 'x > 5',
        result: expect.any(Boolean),
        timestamp: expect.any(Number),
        evaluationCount: 1,
      });
    });

    it('should handle multiple evaluations', () => {
      const eventSpy = vi.fn();
      eventBus.on('decision.evaluated', eventSpy);

      plugin.evaluateComponent(component);
      plugin.evaluateComponent(component);
      plugin.evaluateComponent(component);

      expect(eventSpy).toHaveBeenCalledTimes(3);
      expect(component.evaluationCount).toBe(3);
    });

    it('should skip evaluation for non-decision-point components', () => {
      const nonDecisionComponent = {
        ...component,
        type: 'task-resistor',
      } as any;

      const eventSpy = vi.fn();
      eventBus.on('decision.evaluated', eventSpy);

      plugin.evaluateComponent(nonDecisionComponent);

      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Serialization', () => {
    let component: DecisionPointComponent;

    beforeEach(() => {
      component = plugin.createComponent({
        x: 100,
        y: 200,
        id: 'decision-1',
        condition: 'isValid',
        trueLabel: 'VALID',
        falseLabel: 'INVALID',
      });
      component.lastResult = true;
      component.evaluationCount = 5;
    });

    it('should serialize component properties', () => {
      const serialized = plugin.serialize(component);

      expect(serialized.id).toBe('decision-1');
      expect(serialized.type).toBe('decision-point');
      expect(serialized.x).toBe(100);
      expect(serialized.y).toBe(200);
      expect(serialized.condition).toBe('isValid');
      expect(serialized.trueLabel).toBe('VALID');
      expect(serialized.falseLabel).toBe('INVALID');
    });

    it('should exclude runtime-only properties', () => {
      const serialized = plugin.serialize(component);

      expect(serialized.lastResult).toBeUndefined();
    });

    it('should preserve evaluation count', () => {
      const serialized = plugin.serialize(component);

      expect(serialized.evaluationCount).toBe(5);
    });

    it('should preserve pin configuration', () => {
      const serialized = plugin.serialize(component);

      expect(serialized.pins.input).toHaveLength(1);
      expect(serialized.pins.output).toHaveLength(2);
      expect(serialized.pins.output[0].label).toBe('VALID');
      expect(serialized.pins.output[1].label).toBe('INVALID');
    });

    it('should handle serialization of undefined optional fields', () => {
      const minimalComponent = plugin.createComponent({ x: 50, y: 50 });

      const serialized = plugin.serialize(minimalComponent);

      expect(serialized).toHaveProperty('condition');
      expect(serialized).toHaveProperty('trueLabel');
      expect(serialized).toHaveProperty('falseLabel');
    });
  });

  describe('Deserialization', () => {
    it('should deserialize component data', () => {
      const data = {
        id: 'decision-1',
        type: 'decision-point',
        x: 150,
        y: 250,
        width: 60,
        height: 60,
        condition: 'x < 100',
        trueLabel: 'YES',
        falseLabel: 'NO',
        status: 'done',
        pins: {
          input: [{ x: 30, y: 0, type: 'input', label: 'condition' }],
          output: [
            { x: 60, y: 30, type: 'success', label: 'YES' },
            { x: 0, y: 30, type: 'failure', label: 'NO' },
          ],
        },
      };

      const component = plugin.deserialize(data);

      expect(component.id).toBe('decision-1');
      expect(component.type).toBe('decision-point');
      expect(component.x).toBe(150);
      expect(component.y).toBe(250);
      expect(component.condition).toBe('x < 100');
      expect(component.trueLabel).toBe('YES');
      expect(component.falseLabel).toBe('NO');
    });

    it('should reset runtime state on deserialization', () => {
      const data = {
        id: 'decision-1',
        type: 'decision-point',
        x: 100,
        y: 100,
        width: 60,
        height: 60,
        lastResult: true,
        evaluationCount: 10,
        pins: { input: [], output: [] },
      };

      const component = plugin.deserialize(data);

      expect(component.lastResult).toBeUndefined();
      expect(component.evaluationCount).toBe(0);
    });

    it('should ensure type is decision-point', () => {
      const data = {
        id: 'comp-1',
        type: 'wrong-type',
        x: 100,
        y: 100,
        pins: { input: [], output: [] },
      };

      const component = plugin.deserialize(data);

      expect(component.type).toBe('decision-point');
    });

    it('should preserve all custom properties', () => {
      const data = {
        id: 'decision-custom',
        type: 'decision-point',
        x: 100,
        y: 100,
        width: 60,
        height: 60,
        condition: 'custom condition',
        trueLabel: 'ACCEPT',
        falseLabel: 'REJECT',
        status: 'in-progress',
        color: '#FF0000',
        customProp: 'custom value',
        pins: { input: [], output: [] },
      };

      const component = plugin.deserialize(data) as any;

      expect(component.condition).toBe('custom condition');
      expect(component.trueLabel).toBe('ACCEPT');
      expect(component.falseLabel).toBe('REJECT');
      expect(component.customProp).toBe('custom value');
    });
  });

  describe('Round-trip Serialization', () => {
    it('should preserve data through serialize-deserialize cycle', () => {
      const original = plugin.createComponent({
        x: 100,
        y: 200,
        id: 'test-decision',
        condition: 'validate()',
        trueLabel: 'VALID',
        falseLabel: 'INVALID',
      });

      const serialized = plugin.serialize(original);
      const deserialized = plugin.deserialize(serialized);

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.type).toBe(original.type);
      expect(deserialized.x).toBe(original.x);
      expect(deserialized.y).toBe(original.y);
      expect(deserialized.condition).toBe(original.condition);
      expect(deserialized.trueLabel).toBe(original.trueLabel);
      expect(deserialized.falseLabel).toBe(original.falseLabel);
    });

    it('should reset evaluation state in round-trip', () => {
      const original = plugin.createComponent({ x: 100, y: 100 });
      plugin.evaluateComponent(original);
      plugin.evaluateComponent(original);

      const serialized = plugin.serialize(original);
      const deserialized = plugin.deserialize(serialized);

      expect(deserialized.lastResult).toBeUndefined();
      expect(deserialized.evaluationCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-size component', () => {
      const component = plugin.createComponent({ x: 100, y: 100 });
      component.width = 0;
      component.height = 0;

      expect(() => {
        plugin.renderComponent(mockCanvasContext, { camera: { x: 0, y: 0, zoom: 1 } }, component);
      }).not.toThrow();
    });

    it('should handle extreme zoom levels', () => {
      const component = plugin.createComponent({ x: 100, y: 100 });

      expect(() => {
        plugin.renderComponent(
          mockCanvasContext,
          { camera: { x: 0, y: 0, zoom: 0.1 } },
          component
        );
      }).not.toThrow();

      expect(() => {
        plugin.renderComponent(
          mockCanvasContext,
          { camera: { x: 0, y: 0, zoom: 10 } },
          component
        );
      }).not.toThrow();
    });

    it('should handle missing camera in frame', () => {
      const component = plugin.createComponent({ x: 100, y: 100 });

      expect(() => {
        plugin.renderComponent(mockCanvasContext, {} as any, component);
      }).not.toThrow();
    });

    it('should handle empty condition', () => {
      const component = plugin.createComponent({
        x: 100,
        y: 100,
        condition: '',
      });

      // Empty condition falls back to 'Decision Point' title
      expect(component.title).toBe('Decision Point');
      expect(() => {
        plugin.renderComponent(mockCanvasContext, { camera: { x: 0, y: 0, zoom: 1 } }, component);
      }).not.toThrow();
    });

    it('should handle very long labels', () => {
      const component = plugin.createComponent({
        x: 100,
        y: 100,
        trueLabel: 'VERY_LONG_LABEL_THAT_MIGHT_OVERFLOW',
        falseLabel: 'ANOTHER_VERY_LONG_LABEL',
      });

      expect(() => {
        plugin.renderComponent(mockCanvasContext, { camera: { x: 0, y: 0, zoom: 1 } }, component);
      }).not.toThrow();
    });
  });
});

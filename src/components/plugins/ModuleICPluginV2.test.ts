import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModuleICPluginV2, ModuleICComponent } from './ModuleICPluginV2';
import { eventBus } from '../../events/EventBus';
import { Events } from '../../events/eventTypes';
import { createSchematicViewManager } from '../../core/SchematicViewManager';
import { createAppStateManager, resetAppStateManager } from '../../core/AppStateManager';
import { ViewStack } from '../../viewStack';
import type { ComponentBase, ViewState } from '../../types';

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
    shadowBlur: 0,
    shadowColor: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };

  (c as any).getContext = () => ctxStub;
  document.body.appendChild(c);
  return c;
}

describe('ModuleICPluginV2', () => {
  let plugin: ModuleICPluginV2;
  let appStateManager: ReturnType<typeof createAppStateManager>;

  beforeEach(() => {
    document.body.innerHTML = '';
    makeCanvasStub();

    // Reset singletons
    vi.clearAllMocks();
    (ViewStack as any).instance = null;
    resetAppStateManager();

    // Create fresh instances
    plugin = new ModuleICPluginV2();
    appStateManager = createAppStateManager();
  });

  describe('Component Creation', () => {
    it('should create a basic Module IC component', () => {
      const moduleIC = plugin.createComponent({
        x: 100,
        y: 200,
        title: 'Test Module',
      });

      expect(moduleIC).toBeDefined();
      expect(moduleIC.type).toBe('module-ic');
      expect(moduleIC.x).toBe(100);
      expect(moduleIC.y).toBe(200);
      expect(moduleIC.title).toBe('Test Module');
      expect(moduleIC.width).toBe(100);
      expect(moduleIC.height).toBe(60);
      expect(moduleIC.color).toBe('#4444ff');
      expect(moduleIC.status).toBe('defined');
    });

    it('should initialize empty internal structure', () => {
      const moduleIC = plugin.createComponent({ x: 0, y: 0 });

      expect(moduleIC.internalComponents).toEqual([]);
      expect(moduleIC.internalConnections).toEqual([]);
    });

    it('should create proper pin configuration', () => {
      const moduleIC = plugin.createComponent({ x: 0, y: 0 });

      expect(moduleIC.pins).toBeDefined();
      expect(moduleIC.pins.input).toHaveLength(1);
      expect(moduleIC.pins.output).toHaveLength(1);

      expect(moduleIC.pins.input![0]).toEqual({
        x: 0,
        y: 30,
        type: 'energy',
      });

      expect(moduleIC.pins.output![0]).toEqual({
        x: 100,
        y: 30,
        type: 'energy',
      });
    });

    it('should accept custom internal components during creation', () => {
      const internalComponent: ComponentBase = {
        id: 'internal-1',
        type: 'task-resistor',
        x: 10,
        y: 10,
        width: 60,
        height: 20,
        name: 'Internal Task',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
      };

      const moduleIC = plugin.createComponent({
        x: 0,
        y: 0,
        internalComponents: [internalComponent],
      });

      expect(moduleIC.internalComponents).toHaveLength(1);
      expect(moduleIC.internalComponents![0]).toEqual(internalComponent);
    });
  });

  describe('Rendering', () => {
    it('should render without errors with minimal frame', () => {
      const moduleIC = plugin.createComponent({ x: 100, y: 100 });
      const ctx = makeCanvasStub().getContext('2d');
      const frame = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        payload: { connections: [] },
      };

      expect(() => {
        plugin.renderComponent(ctx as any, frame as any, moduleIC);
      }).not.toThrow();
    });

    it('should handle different component statuses', () => {
      const statuses = ['defined', 'todo', 'in-progress', 'done'];
      const ctx = makeCanvasStub().getContext('2d');
      const frame = {
        camera: { x: 0, y: 0, zoom: 1 },
        categories: {},
        payload: { connections: [] },
      };

      statuses.forEach(status => {
        const moduleIC = plugin.createComponent({ x: 100, y: 100 });
        moduleIC.status = status as any;

        expect(() => {
          plugin.renderComponent(ctx as any, frame as any, moduleIC);
        }).not.toThrow();
      });
    });

    it('should handle null/undefined contexts gracefully', () => {
      const moduleIC = plugin.createComponent({ x: 100, y: 100 });
      const frame = { camera: { x: 0, y: 0, zoom: 1 } };

      expect(() => {
        plugin.renderComponent(null as any, frame as any, moduleIC);
      }).not.toThrow();

      expect(() => {
        plugin.renderComponent(undefined as any, frame as any, moduleIC);
      }).not.toThrow();
    });
  });

  describe('Serialization & Deserialization', () => {
    it('should serialize a basic Module IC', () => {
      const moduleIC = plugin.createComponent({
        x: 100,
        y: 200,
        title: 'Test Module',
      });

      const serialized = plugin.serialize(moduleIC);

      expect(serialized).toMatchObject({
        type: 'module-ic',
        x: 100,
        y: 200,
        title: 'Test Module',
        internalComponents: [],
        internalConnections: [],
      });
    });

    it('should serialize Module IC with internal components', () => {
      const internalComponent: ComponentBase = {
        id: 'internal-1',
        type: 'task-resistor',
        x: 10,
        y: 10,
        width: 60,
        height: 20,
        name: 'Internal Task',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
      };

      const moduleIC = plugin.createComponent({
        x: 100,
        y: 200,
        internalComponents: [internalComponent],
      });

      const serialized = plugin.serialize(moduleIC);

      expect(serialized.internalComponents).toHaveLength(1);
      expect(serialized.internalComponents[0]).toMatchObject({
        id: 'internal-1',
        type: 'task-resistor',
        x: 10,
        y: 10,
      });
    });

    it('should deserialize a basic Module IC', () => {
      const data = {
        id: 'module-1',
        type: 'module-ic',
        x: 100,
        y: 200,
        title: 'Test Module',
        color: '#4444ff',
        status: 'defined',
      };

      const moduleIC = plugin.deserialize(data);

      expect(moduleIC.type).toBe('module-ic');
      expect(moduleIC.x).toBe(100);
      expect(moduleIC.y).toBe(200);
      expect(moduleIC.title).toBe('Test Module');
      expect(moduleIC.internalComponents).toEqual([]);
      expect(moduleIC.internalConnections).toEqual([]);
    });

    it('should deserialize Module IC with internal components', () => {
      const data = {
        id: 'module-1',
        type: 'module-ic',
        x: 100,
        y: 200,
        title: 'Test Module',
        internalComponents: [
          {
            id: 'internal-1',
            type: 'task-resistor',
            x: 10,
            y: 10,
            width: 60,
            height: 20,
          },
        ],
        internalConnections: [],
      };

      const moduleIC = plugin.deserialize(data);

      expect(moduleIC.internalComponents).toHaveLength(1);
      expect(moduleIC.internalComponents![0]).toMatchObject({
        id: 'internal-1',
        type: 'task-resistor',
        x: 10,
        y: 10,
      });
    });

    it('should handle malformed deserialization data gracefully', () => {
      const malformedData = {
        type: 'module-ic',
        // Missing required fields
      };

      const moduleIC = plugin.deserialize(malformedData);

      expect(moduleIC.type).toBe('module-ic');
      expect(moduleIC.internalComponents).toEqual([]);
      expect(moduleIC.internalConnections).toEqual([]);
    });
  });

  describe('Round-trip Serialization', () => {
    it('should maintain component integrity through serialize/deserialize cycle', () => {
      const original = plugin.createComponent({
        x: 100,
        y: 200,
        title: 'Test Module',
        internalComponents: [
          {
            id: 'internal-1',
            type: 'task-resistor',
            x: 10,
            y: 10,
            width: 60,
            height: 20,
            name: 'Internal Task',
            status: 'in-progress',
            category: 'frontend',
            createdAt: new Date(),
          },
        ],
      });

      const serialized = plugin.serialize(original);
      const deserialized = plugin.deserialize(serialized);

      expect(deserialized.type).toBe(original.type);
      expect(deserialized.x).toBe(original.x);
      expect(deserialized.y).toBe(original.y);
      expect(deserialized.title).toBe(original.title);
      expect(deserialized.internalComponents).toHaveLength(1);
      expect(deserialized.internalComponents![0].id).toBe('internal-1');
    });
  });

  describe('Internal Component Management', () => {
    it('should enter schematic view and return internal structure', () => {
      const internalComponent: ComponentBase = {
        id: 'internal-1',
        type: 'task-resistor',
        x: 10,
        y: 10,
        width: 60,
        height: 20,
        name: 'Internal Task',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
      };

      const moduleIC = plugin.createComponent({
        x: 100,
        y: 200,
        internalComponents: [internalComponent],
      });

      const schematicView = plugin.enterSchematicView(moduleIC);

      expect(schematicView.components).toHaveLength(1);
      expect(schematicView.components[0]).toEqual(internalComponent);
      expect(schematicView.connections).toEqual([]);
    });

    it('should handle empty internal structure', () => {
      const moduleIC = plugin.createComponent({ x: 100, y: 200 });

      const schematicView = plugin.enterSchematicView(moduleIC);

      expect(schematicView.components).toEqual([]);
      expect(schematicView.connections).toEqual([]);
    });

    it('should add internal components', () => {
      const moduleIC = plugin.createComponent({ x: 100, y: 200 });
      const newComponent: ComponentBase = {
        id: 'new-internal',
        type: 'power-core',
        x: 20,
        y: 20,
        width: 80,
        height: 40,
        name: 'Internal Power',
        status: 'done',
        category: 'backend',
        createdAt: new Date(),
      };

      plugin.addInternalComponent(moduleIC, newComponent);

      expect(moduleIC.internalComponents).toHaveLength(1);
      expect(moduleIC.internalComponents![0]).toEqual(newComponent);
    });
  });

  describe('Plugin Metadata', () => {
    it('should have correct metadata', () => {
      expect(plugin.type).toBe('module-ic');
      expect(plugin.metadata.displayName).toBe('Module IC');
      expect(plugin.metadata.icon).toBe('⬛');
      expect(plugin.metadata.color).toBe('#4444ff');
      expect(plugin.metadata.category).toBe('containers');
      expect(plugin.metadata.width).toBe(100);
      expect(plugin.metadata.height).toBe(60);
    });

    it('should have proper pin metadata', () => {
      const { pins } = plugin.metadata;

      expect(pins.input).toHaveLength(1);
      expect(pins.output).toHaveLength(1);

      expect(pins.input[0]).toEqual({
        x: 0,
        y: 30,
        type: 'energy',
        label: 'input',
      });

      expect(pins.output[0]).toEqual({
        x: 100,
        y: 30,
        type: 'energy',
        label: 'output',
      });
    });
  });
});
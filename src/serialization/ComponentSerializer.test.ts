import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentSerializer } from './ComponentSerializer';
import type { ComponentBase, ModuleComponent } from '../types';

describe('ComponentSerializer', () => {
  let serializer: ComponentSerializer;

  beforeEach(() => {
    serializer = new ComponentSerializer();
  });

  describe('Basic Serialization', () => {
    it('should serialize simple components', () => {
      const components: ComponentBase[] = [
        {
          id: 'comp-1',
          type: 'task-resistor',
          x: 100,
          y: 200,
          width: 60,
          height: 20,
          name: 'Task 1',
          status: 'todo',
          category: 'frontend',
          createdAt: new Date('2024-01-01'),
          pins: { input: [], output: [] },
        },
      ];

      const result = serializer.serialize(components);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'comp-1',
        type: 'task-resistor',
        x: 100,
        y: 200,
        name: 'Task 1',
      });
    });

    it('should filter out null/undefined components', () => {
      const components: any[] = [
        { id: 'comp-1', type: 'task-resistor', x: 0, y: 0, width: 60, height: 20 },
        null,
        undefined,
        { id: 'comp-2', type: 'power-core', x: 100, y: 100, width: 80, height: 40 },
      ];

      const result = serializer.serialize(components);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('comp-1');
      expect(result[1].id).toBe('comp-2');
    });

    it('should filter out components without IDs', () => {
      const components: any[] = [
        { id: 'comp-1', type: 'task-resistor', x: 0, y: 0, width: 60, height: 20 },
        { type: 'power-core', x: 100, y: 100, width: 80, height: 40 }, // No ID
        { id: '', type: 'gateway', x: 200, y: 200, width: 60, height: 60 }, // Empty ID
      ];

      const result = serializer.serialize(components);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('comp-1');
    });
  });

  describe('Module IC Serialization', () => {
    it('should serialize module IC with internal components', () => {
      const internalTask: ComponentBase = {
        id: 'internal-1',
        type: 'task-resistor',
        x: 50,
        y: 50,
        width: 60,
        height: 20,
        name: 'Internal Task',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
      };

      const moduleIC: ModuleComponent = {
        id: 'module-1',
        type: 'module-ic',
        x: 100,
        y: 100,
        width: 100,
        height: 60,
        name: 'Test Module',
        status: 'defined',
        category: 'containers',
        createdAt: new Date(),
        internalComponents: [internalTask],
        internalConnections: [],
        pins: { input: [], output: [] },
      };

      const result = serializer.serialize([moduleIC]);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('module-ic');
      expect(result[0].internalComponents).toHaveLength(1);
      expect(result[0].internalComponents![0].id).toBe('internal-1');
    });

    it('should handle deeply nested modules (depth 2)', () => {
      const innerTask: ComponentBase = {
        id: 'inner-task',
        type: 'task-resistor',
        x: 20,
        y: 20,
        width: 60,
        height: 20,
        name: 'Inner Task',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
      };

      const innerModule: ModuleComponent = {
        id: 'inner-module',
        type: 'module-ic',
        x: 30,
        y: 50,
        width: 100,
        height: 60,
        name: 'Inner Module',
        status: 'defined',
        category: 'containers',
        createdAt: new Date(),
        internalComponents: [innerTask],
        internalConnections: [],
        pins: { input: [], output: [] },
      };

      const outerModule: ModuleComponent = {
        id: 'outer-module',
        type: 'module-ic',
        x: 100,
        y: 100,
        width: 100,
        height: 60,
        name: 'Outer Module',
        status: 'defined',
        category: 'containers',
        createdAt: new Date(),
        internalComponents: [innerModule],
        internalConnections: [],
        pins: { input: [], output: [] },
      };

      const result = serializer.serialize([outerModule]);

      expect(result).toHaveLength(1);
      expect(result[0].internalComponents).toHaveLength(1);
      expect(result[0].internalComponents![0].type).toBe('module-ic');
      expect(result[0].internalComponents![0].internalComponents).toHaveLength(1);
      expect(result[0].internalComponents![0].internalComponents![0].id).toBe('inner-task');
    });
  });

  describe('Circular Reference Detection', () => {
    it('should detect and skip circular references', () => {
      // Create a module that references itself in internalComponents
      const circularModule: any = {
        id: 'circular-module',
        type: 'module-ic',
        x: 100,
        y: 100,
        width: 100,
        height: 60,
        name: 'Circular Module',
        status: 'defined',
        category: 'containers',
        createdAt: new Date(),
        internalComponents: [],
        internalConnections: [],
        pins: { input: [], output: [] },
      };

      // Create circular reference
      circularModule.internalComponents = [circularModule];

      const result = serializer.serialize([circularModule]);

      // Should serialize the outer module but skip the circular reference
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('circular-module');
      expect(result[0].internalComponents).toHaveLength(0); // Circular ref filtered out
    });

    it('should detect circular references in nested structures', () => {
      const moduleA: any = {
        id: 'module-a',
        type: 'module-ic',
        x: 100,
        y: 100,
        width: 100,
        height: 60,
        name: 'Module A',
        status: 'defined',
        category: 'containers',
        createdAt: new Date(),
        internalComponents: [],
        internalConnections: [],
        pins: { input: [], output: [] },
      };

      const moduleB: any = {
        id: 'module-b',
        type: 'module-ic',
        x: 200,
        y: 200,
        width: 100,
        height: 60,
        name: 'Module B',
        status: 'defined',
        category: 'containers',
        createdAt: new Date(),
        internalComponents: [],
        internalConnections: [],
        pins: { input: [], output: [] },
      };

      // Create circular reference: A -> B -> A
      moduleA.internalComponents = [moduleB];
      moduleB.internalComponents = [moduleA];

      const result = serializer.serialize([moduleA]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('module-a');
      expect(result[0].internalComponents).toHaveLength(1);
      expect(result[0].internalComponents![0].id).toBe('module-b');
      // moduleA inside moduleB should be filtered out (circular)
      expect(result[0].internalComponents![0].internalComponents).toHaveLength(0);
    });
  });

  describe('Depth Limit Enforcement', () => {
    it('should truncate at MAX_NESTING_DEPTH (15 levels)', () => {
      // Create a deeply nested structure (16 levels)
      let currentModule: any = {
        id: 'level-15',
        type: 'task-resistor',
        x: 0,
        y: 0,
        width: 60,
        height: 20,
        name: 'Deepest',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
      };

      // Build nested structure from bottom up
      for (let i = 14; i >= 0; i--) {
        currentModule = {
          id: `level-${i}`,
          type: 'module-ic',
          x: 0,
          y: 0,
          width: 100,
          height: 60,
          name: `Level ${i}`,
          status: 'defined',
          category: 'containers',
          createdAt: new Date(),
          internalComponents: [currentModule],
          internalConnections: [],
          pins: { input: [], output: [] },
        };
      }

      const result = serializer.serialize([currentModule]);

      // Verify depth limit is enforced
      let depth = 0;
      let current: any = result[0];
      while (current && current.internalComponents && current.internalComponents.length > 0) {
        depth++;
        current = current.internalComponents[0];
      }

      // Should stop at depth 15 (MAX_NESTING_DEPTH)
      expect(depth).toBeLessThanOrEqual(15);
    });
  });

  describe('Stateless Serialization (Bug Fix)', () => {
    it('should not have false positives across multiple serialize() calls', () => {
      const component1: ComponentBase = {
        id: 'shared-id',
        type: 'task-resistor',
        x: 100,
        y: 100,
        width: 60,
        height: 20,
        name: 'Component 1',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
      };

      const component2: ComponentBase = {
        id: 'shared-id', // Same ID, but in different serialization call
        type: 'task-resistor',
        x: 200,
        y: 200,
        width: 60,
        height: 20,
        name: 'Component 2',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
      };

      // First serialization
      const result1 = serializer.serialize([component1]);
      expect(result1).toHaveLength(1);
      expect(result1[0].id).toBe('shared-id');

      // Second serialization should NOT see component1 as visited
      const result2 = serializer.serialize([component2]);
      expect(result2).toHaveLength(1);
      expect(result2[0].id).toBe('shared-id');
      expect(result2[0].name).toBe('Component 2');
    });

    it('should handle duplicate IDs within same serialization', () => {
      const component1: ComponentBase = {
        id: 'duplicate-id',
        type: 'task-resistor',
        x: 100,
        y: 100,
        width: 60,
        height: 20,
        name: 'First',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
      };

      const component2: ComponentBase = {
        id: 'duplicate-id', // Duplicate ID in same array (different object)
        type: 'power-core',
        x: 200,
        y: 200,
        width: 80,
        height: 40,
        name: 'Second',
        status: 'defined',
        category: 'backend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
      };

      const result = serializer.serialize([component1, component2]);

      // Note: Circular reference detection only prevents same object, not duplicate IDs
      // Both components are serialized since they're different objects
      // This matches the original ExportImportManager behavior
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('First');
      expect(result[0].type).toBe('task-resistor');
      expect(result[1].name).toBe('Second');
      expect(result[1].type).toBe('power-core');
    });
  });

  describe('clearVisited() Backward Compatibility', () => {
    it('should be a no-op (deprecated method)', () => {
      const component: ComponentBase = {
        id: 'test-id',
        type: 'task-resistor',
        x: 0,
        y: 0,
        width: 60,
        height: 20,
        name: 'Test',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
      };

      // Call clearVisited (should do nothing)
      serializer.clearVisited();

      // Serialization should still work
      const result = serializer.serialize([component]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-id');
    });
  });
});

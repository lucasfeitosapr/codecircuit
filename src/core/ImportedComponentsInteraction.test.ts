// ImportedComponentsInteraction.test.ts - Integration test for imported component interaction
// Tests that imported components are fully interactive (clickable, moveable)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import { ExportImportManager } from './ExportImportManager';
import { getAppStateManager, resetAppStateManager, createAppStateManager } from './AppStateManager';
import type { ComponentBase } from '../types';

describe('Imported Components Interaction (Integration)', () => {
  let exportImportManager: ExportImportManager;
  let stateManager: any;

  beforeEach(() => {
    // Reset state
    resetAppStateManager();
    stateManager = createAppStateManager();

    // Create export/import manager
    exportImportManager = new ExportImportManager({
      getComponents: () => stateManager.getComponents(),
      getConnections: () => stateManager.getConnections(),
    });
  });

  afterEach(() => {
    eventBus.clearAll();
    resetAppStateManager();
  });

  describe('Event Emission on Import', () => {
    it('should emit ComponentCreated events for all imported components', async () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      const projectData = {
        name: 'Test Project',
        components: [
          {
            id: 'imported-1',
            type: 'task-resistor',
            x: 100,
            y: 100,
            width: 60,
            height: 20,
            pins: { input: [], output: [] },
            status: 'todo',
          },
          {
            id: 'imported-2',
            type: 'power-core',
            x: 200,
            y: 200,
            width: 80,
            height: 40,
            pins: { input: [], output: [] },
            status: 'todo',
          },
          {
            id: 'imported-3',
            type: 'decision-point',
            x: 300,
            y: 300,
            width: 60,
            height: 60,
            pins: { input: [], output: [] },
            status: 'todo',
          },
        ],
        connections: [],
      };

      // Listen for PROJECT_IMPORTED event
      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      // Should emit ComponentCreated for each imported component
      expect(eventSpy).toHaveBeenCalledTimes(3);

      // Verify each component's event
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'imported-1',
          type: 'task-resistor',
          source: 'import',
        })
      );
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'imported-2',
          type: 'power-core',
          source: 'import',
        })
      );
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'imported-3',
          type: 'decision-point',
          source: 'import',
        })
      );
    });

    it('should mark imported components with source="import"', async () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      const projectData = {
        name: 'Test Project',
        components: [
          {
            id: 'imported-component',
            type: 'module-ic',
            x: 150,
            y: 150,
            width: 100,
            height: 60,
            pins: { input: [], output: [] },
            status: 'todo',
            internalComponents: [],
            internalConnections: [],
          },
        ],
        connections: [],
      };

      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      expect(eventSpy).toHaveBeenCalledWith({
        id: 'imported-component',
        type: 'module-ic',
        model: expect.objectContaining({
          id: 'imported-component',
          type: 'module-ic',
        }),
        source: 'import',
      });
    });
  });

  describe('Component State After Import', () => {
    it('should have all components in state after import', async () => {
      const projectData = {
        name: 'Test Project',
        components: [
          {
            id: 'comp-1',
            type: 'task-resistor',
            x: 100,
            y: 100,
            width: 60,
            height: 20,
            pins: { input: [], output: [] },
            status: 'todo',
          },
          {
            id: 'comp-2',
            type: 'gateway',
            x: 200,
            y: 200,
            width: 80,
            height: 80,
            pins: { input: [], output: [] },
            status: 'done',
          },
        ],
        connections: [],
      };

      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      const components = stateManager.getComponents();
      expect(components).toHaveLength(2);
      expect(components[0].id).toBe('comp-1');
      expect(components[1].id).toBe('comp-2');
    });

    it('should preserve component properties during import', async () => {
      const projectData = {
        name: 'Test Project',
        components: [
          {
            id: 'detailed-component',
            type: 'module-ic',
            x: 250,
            y: 350,
            width: 120,
            height: 80,
            title: 'Custom Module',
            description: 'Test description',
            category: 'backend',
            status: 'in-progress',
            pins: {
              input: [{ x: 0, y: 40, type: 'energy', label: 'in' }],
              output: [{ x: 120, y: 40, type: 'energy', label: 'out' }],
            },
            internalComponents: [],
            internalConnections: [],
          },
        ],
        connections: [],
      };

      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      const component = stateManager.getComponents()[0];
      expect(component.id).toBe('detailed-component');
      expect(component.type).toBe('module-ic');
      expect(component.title).toBe('Custom Module');
      expect(component.description).toBe('Test description');
      expect(component.category).toBe('backend');
      expect(component.status).toBe('in-progress');
      expect(component.x).toBe(250);
      expect(component.y).toBe(350);
    });
  });

  describe('Event-Driven System Registration', () => {
    it('should allow systems to register imported components via events', async () => {
      const registeredComponents: ComponentBase[] = [];

      // Simulate a system (like hit-testing) that registers components on creation
      const systemHandler = (payload: any) => {
        registeredComponents.push(payload.model);
      };

      eventBus.on(Events.ComponentCreated, systemHandler);

      const projectData = {
        name: 'Test Project',
        components: [
          {
            id: 'sys-comp-1',
            type: 'task-resistor',
            x: 100,
            y: 100,
            width: 60,
            height: 20,
            pins: { input: [], output: [] },
            status: 'todo',
          },
          {
            id: 'sys-comp-2',
            type: 'decision-point',
            x: 200,
            y: 200,
            width: 60,
            height: 60,
            pins: { input: [], output: [] },
            status: 'done',
          },
        ],
        connections: [],
      };

      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      // Systems should have registered both components
      expect(registeredComponents).toHaveLength(2);
      expect(registeredComponents[0].id).toBe('sys-comp-1');
      expect(registeredComponents[1].id).toBe('sys-comp-2');
    });

    it('should emit events in correct order for nested Module ICs', async () => {
      const eventOrder: string[] = [];

      eventBus.on(Events.ComponentCreated, (payload: any) => {
        eventOrder.push(payload.id);
      });

      const projectData = {
        name: 'Test Project',
        components: [
          {
            id: 'module-parent',
            type: 'module-ic',
            x: 100,
            y: 100,
            width: 100,
            height: 60,
            pins: { input: [], output: [] },
            status: 'todo',
            internalComponents: [
              {
                id: 'internal-task',
                type: 'task-resistor',
                x: 20,
                y: 20,
                width: 60,
                height: 20,
                pins: { input: [], output: [] },
                status: 'todo',
              },
            ],
            internalConnections: [],
          },
        ],
        connections: [],
      };

      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      // Parent module should be registered
      expect(eventOrder).toContain('module-parent');
      // Internal components are NOT imported at root level (they stay internal)
      expect(eventOrder).not.toContain('internal-task');
    });
  });

  describe('Import Edge Cases', () => {
    it('should handle empty project import', async () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      const projectData = {
        name: 'Empty Project',
        components: [],
        connections: [],
      };

      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      expect(eventSpy).not.toHaveBeenCalled();
      expect(stateManager.getComponents()).toHaveLength(0);
    });

    it('should replace existing components on import', async () => {
      // Add some existing components
      stateManager.setComponents(
        [
          {
            id: 'existing-1',
            type: 'task-resistor',
            x: 50,
            y: 50,
            width: 60,
            height: 20,
            pins: { input: [], output: [] },
            status: 'todo',
          },
        ],
        false
      ); // Don't emit events for existing

      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      const projectData = {
        name: 'New Project',
        components: [
          {
            id: 'new-1',
            type: 'power-core',
            x: 100,
            y: 100,
            width: 80,
            height: 40,
            pins: { input: [], output: [] },
            status: 'todo',
          },
        ],
        connections: [],
      };

      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      // Should only have the new imported component
      expect(stateManager.getComponents()).toHaveLength(1);
      expect(stateManager.getComponents()[0].id).toBe('new-1');

      // Should emit event for the new component
      expect(eventSpy).toHaveBeenCalledTimes(1);
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new-1',
          source: 'import',
        })
      );
    });

    it('should handle large import (100+ components)', async () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      // Generate large project
      const components = Array.from({ length: 150 }, (_, i) => ({
        id: `bulk-comp-${i}`,
        type: 'task-resistor',
        x: (i % 10) * 100,
        y: Math.floor(i / 10) * 50,
        width: 60,
        height: 20,
        pins: { input: [], output: [] },
        status: 'todo',
      }));

      const projectData = {
        name: 'Large Project',
        components,
        connections: [],
      };

      await new Promise<void>(resolve => {
        eventBus.on(Events.PROJECT_IMPORTED, (payload: any) => {
          stateManager.setComponents(payload.components);
          resolve();
        });

        exportImportManager.importProjectData(projectData);
      });

      // Should emit event for all 150 components
      expect(eventSpy).toHaveBeenCalledTimes(150);
      expect(stateManager.getComponents()).toHaveLength(150);
    });
  });

  describe('Backwards Compatibility', () => {
    it('should support performance mode with emitEvents=false', () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      const components = [
        {
          id: 'perf-comp',
          type: 'task-resistor',
          x: 100,
          y: 100,
          width: 60,
          height: 20,
          pins: { input: [], output: [] },
          status: 'todo',
        },
      ];

      // Performance mode - no events
      stateManager.setComponents(components, false);

      expect(eventSpy).not.toHaveBeenCalled();
      expect(stateManager.getComponents()).toHaveLength(1);
    });
  });
});

/**
 * ImportedComponentMovement.test.ts - Test component movement after import
 *
 * This test validates that imported components can be moved/dragged properly
 * and that the spatial index is correctly updated during movement.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentLifecycleManager } from './ComponentLifecycleManager';
import { ExportImportManager } from './ExportImportManager';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import RuntimeLayer from '../rendering/layers/RuntimeLayer';
import type { ComponentBase, ViewState } from '../types';

describe('Imported Component Movement', () => {
  let componentLifecycleManager: ComponentLifecycleManager;
  let exportImportManager: ExportImportManager;
  let runtimeLayer: RuntimeLayer;
  let currentView: ViewState;
  let mockCanvas: HTMLCanvasElement;
  let mockCtx: CanvasRenderingContext2D;

  const componentTypes = {
    'task-resistor': {
      type: 'task-resistor',
      width: 60,
      height: 30,
      name: 'Task Resistor',
    },
    'power-core': {
      type: 'power-core',
      width: 60,
      height: 60,
      name: 'Power Core',
    },
  };

  const categories = {
    frontend: { name: 'Frontend', color: '#00ff88' },
    backend: { name: 'Backend', color: '#ff8800' },
  };

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(),
    } as any;

    mockCtx = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 50 })),
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
    } as any;

    mockCanvas.getContext = vi.fn(() => mockCtx);

    // Initialize runtime layer
    runtimeLayer = new RuntimeLayer();

    // Initialize current view
    currentView = {
      type: 'main',
      components: [],
      connections: [],
    };

    // Initialize managers
    componentLifecycleManager = new ComponentLifecycleManager(
      eventBus,
      runtimeLayer,
      componentTypes,
      categories
    );

    exportImportManager = new ExportImportManager();

    // Setup PROJECT_IMPORTED event handler to simulate main app behavior
    eventBus.on('project.imported', (payload: { components: any[]; connections: any[] }) => {
      console.log('📦 PROJECT_IMPORTED event received, updating currentView...');
      currentView.components = payload.components;
      currentView.connections = payload.connections;

      // Rebuild spatial index with imported components
      if (payload.components.length > 0) {
        componentLifecycleManager.rebuildSpatialIndex(payload.components);
        console.log(`🗂️ Spatial index rebuilt with ${payload.components.length} imported components`);
      }
    });

    console.log('🧪 Test setup complete - spatial indexing enabled:',
      componentLifecycleManager.getSpatialIndexStats().enabled);
  });

  describe('Component Movement After Import', () => {
    it('should allow moving imported components', async () => {
      // Create a test project with components
      const testProject = {
        version: '1.0.0',
        name: 'Movement Test Project',
        createdAt: new Date().toISOString(),
        components: [
          {
            id: 'imported-task-1',
            type: 'task-resistor',
            x: 100,
            y: 100,
            width: 60,
            height: 30,
            status: 'todo',
            category: 'frontend',
            name: 'Imported Task',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'imported-power-1',
            type: 'power-core',
            x: 200,
            y: 200,
            width: 60,
            height: 60,
            status: 'done',
            category: 'backend',
            name: 'Imported Power Core',
            createdAt: new Date().toISOString(),
          },
        ],
        connections: [],
        views: {},
      };

      console.log('📦 Importing test project with components:', testProject.components.length);

      // Import the project (returns void, but emits events)
      await new Promise<void>((resolve, reject) => {
        // Listen for completion
        const successHandler = () => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          resolve();
        };
        const errorHandler = (payload: { error: string }) => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          reject(new Error(payload.error));
        };

        eventBus.on('project.imported', successHandler);
        eventBus.on('project.import.error', errorHandler);

        exportImportManager.importProjectData(testProject);
      });

      console.log('✅ Import successful');

      // Verify components were imported
      const importedComponents = currentView.components;
      expect(importedComponents).toHaveLength(2);

      const taskComponent = importedComponents.find(c => c.id === 'imported-task-1');
      const powerComponent = importedComponents.find(c => c.id === 'imported-power-1');

      expect(taskComponent).toBeDefined();
      expect(powerComponent).toBeDefined();
      expect(taskComponent?.x).toBe(100);
      expect(taskComponent?.y).toBe(100);

      console.log('🔍 Testing component hit detection...');

      // Test hit detection works for imported components
      const hitComponent = componentLifecycleManager.getComponentAt(110, 110, currentView);
      expect(hitComponent).toBeDefined();
      expect(hitComponent?.id).toBe('imported-task-1');

      console.log('✅ Hit detection works for imported component');

      // Test moving the component
      console.log('🚚 Testing component movement...');

      const originalX = taskComponent!.x;
      const originalY = taskComponent!.y;
      const newX = 300;
      const newY = 250;

      // Update component position (simulating drag operation)
      componentLifecycleManager.updateComponent(taskComponent!, {
        x: newX,
        y: newY,
      });

      // Verify position was updated
      expect(taskComponent!.x).toBe(newX);
      expect(taskComponent!.y).toBe(newY);

      console.log(`📍 Component moved from (${originalX}, ${originalY}) to (${newX}, ${newY})`);

      // Test hit detection at new position
      const hitComponentNew = componentLifecycleManager.getComponentAt(newX + 10, newY + 10, currentView);
      expect(hitComponentNew).toBeDefined();
      expect(hitComponentNew?.id).toBe('imported-task-1');

      // Test hit detection at old position (should be null)
      const hitComponentOld = componentLifecycleManager.getComponentAt(originalX + 10, originalY + 10, currentView);
      expect(hitComponentOld).toBeNull();

      console.log('✅ Hit detection updated correctly after movement');

      // Test spatial index stats
      const spatialStats = componentLifecycleManager.getSpatialIndexStats();
      console.log('🗂️ Spatial index stats:', spatialStats);

      if (spatialStats.enabled) {
        expect(spatialStats.components).toBeGreaterThan(0);
      }
    });

    it('should handle multiple component movements after import', async () => {
      // Create project with multiple components
      const testProject = {
        version: '1.0.0',
        name: 'Multi Movement Test',
        createdAt: new Date().toISOString(),
        components: Array.from({ length: 5 }, (_, i) => ({
          id: `multi-component-${i}`,
          type: 'task-resistor',
          x: 100 + i * 80,
          y: 100 + i * 50,
          width: 60,
          height: 30,
          status: 'todo',
          category: 'frontend',
          name: `Component ${i}`,
          createdAt: new Date().toISOString(),
        })),
        connections: [],
        views: {},
      };

      // Import project
      await new Promise<void>((resolve, reject) => {
        const successHandler = () => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          resolve();
        };
        const errorHandler = (payload: { error: string }) => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          reject(new Error(payload.error));
        };

        eventBus.on('project.imported', successHandler);
        eventBus.on('project.import.error', errorHandler);

        exportImportManager.importProjectData(testProject);
      });

      const importedComponents = currentView.components;
      expect(importedComponents).toHaveLength(5);

      // Move all components
      const movements = [];
      for (let i = 0; i < importedComponents.length; i++) {
        const component = importedComponents[i];
        const newX = 400 + i * 60;
        const newY = 300 + i * 40;

        movements.push({ component, oldX: component.x, oldY: component.y, newX, newY });

        componentLifecycleManager.updateComponent(component, {
          x: newX,
          y: newY,
        });
      }

      // Verify all movements
      for (const { component, newX, newY } of movements) {
        expect(component.x).toBe(newX);
        expect(component.y).toBe(newY);

        // Test hit detection at new position
        const hitComponent = componentLifecycleManager.getComponentAt(newX + 10, newY + 10, currentView);
        expect(hitComponent?.id).toBe(component.id);
      }

      console.log('✅ Multiple component movements successful');
    });

    it('should maintain spatial index integrity during movement', async () => {
      // Import project
      const testProject = {
        version: '1.0.0',
        name: 'Spatial Index Test',
        createdAt: new Date().toISOString(),
        components: [
          {
            id: 'spatial-test-1',
            type: 'task-resistor',
            x: 50,
            y: 50,
            width: 60,
            height: 30,
            status: 'todo',
            category: 'frontend',
            name: 'Spatial Test Component',
            createdAt: new Date().toISOString(),
          },
        ],
        connections: [],
        views: {},
      };

      await new Promise<void>((resolve, reject) => {
        const successHandler = () => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          resolve();
        };
        const errorHandler = (payload: { error: string }) => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          reject(new Error(payload.error));
        };

        eventBus.on('project.imported', successHandler);
        eventBus.on('project.import.error', errorHandler);

        exportImportManager.importProjectData(testProject);
      });
      const component = currentView.components[0];

      // Get initial spatial index stats
      const initialStats = componentLifecycleManager.getSpatialIndexStats();

      // Move component multiple times
      const positions = [
        { x: 100, y: 100 },
        { x: 200, y: 150 },
        { x: 300, y: 200 },
        { x: 50, y: 50 }, // Back to original
      ];

      for (const pos of positions) {
        componentLifecycleManager.updateComponent(component, pos);

        // Verify hit detection works at new position
        const hitComponent = componentLifecycleManager.getComponentAt(pos.x + 10, pos.y + 10, currentView);
        expect(hitComponent?.id).toBe(component.id);

        // Verify spatial index integrity
        const stats = componentLifecycleManager.getSpatialIndexStats();
        if (stats.enabled) {
          expect(stats.components).toBe(initialStats.components);
        }
      }

      console.log('✅ Spatial index integrity maintained during movement');
    });

    it('should handle edge cases in component movement', async () => {
      const testProject = {
        version: '1.0.0',
        name: 'Edge Case Test',
        createdAt: new Date().toISOString(),
        components: [
          {
            id: 'edge-case-1',
            type: 'task-resistor',
            x: 0,
            y: 0,
            width: 60,
            height: 30,
            status: 'todo',
            category: 'frontend',
            name: 'Edge Case Component',
            createdAt: new Date().toISOString(),
          },
        ],
        connections: [],
        views: {},
      };

      await new Promise<void>((resolve, reject) => {
        const successHandler = () => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          resolve();
        };
        const errorHandler = (payload: { error: string }) => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          reject(new Error(payload.error));
        };

        eventBus.on('project.imported', successHandler);
        eventBus.on('project.import.error', errorHandler);

        exportImportManager.importProjectData(testProject);
      });
      const component = currentView.components[0];

      // Test edge cases
      const edgeCases = [
        { x: -100, y: -100 }, // Negative coordinates
        { x: 0, y: 0 },       // Origin
        { x: 5000, y: 5000 }, // Large coordinates
        { x: 0.5, y: 0.5 },   // Fractional coordinates
      ];

      for (const pos of edgeCases) {
        componentLifecycleManager.updateComponent(component, pos);
        expect(component.x).toBe(pos.x);
        expect(component.y).toBe(pos.y);

        // Verify hit detection still works
        const hitComponent = componentLifecycleManager.getComponentAt(pos.x + 10, pos.y + 10, currentView);
        expect(hitComponent?.id).toBe(component.id);
      }

      console.log('✅ Edge cases handled correctly');
    });
  });

  describe('Performance Impact', () => {
    it('should maintain performance with many imported components', async () => {
      // Create project with many components
      const componentCount = 100;
      const testProject = {
        version: '1.0.0',
        name: 'Performance Test',
        createdAt: new Date().toISOString(),
        components: Array.from({ length: componentCount }, (_, i) => ({
          id: `perf-component-${i}`,
          type: 'task-resistor',
          x: (i % 10) * 80,
          y: Math.floor(i / 10) * 60,
          width: 60,
          height: 30,
          status: 'todo',
          category: 'frontend',
          name: `Performance Component ${i}`,
          createdAt: new Date().toISOString(),
        })),
        connections: [],
        views: {},
      };

      const importStart = performance.now();
      await new Promise<void>((resolve, reject) => {
        const successHandler = () => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          resolve();
        };
        const errorHandler = (payload: { error: string }) => {
          eventBus.off('project.imported', successHandler);
          eventBus.off('project.import.error', errorHandler);
          reject(new Error(payload.error));
        };

        eventBus.on('project.imported', successHandler);
        eventBus.on('project.import.error', errorHandler);

        exportImportManager.importProjectData(testProject);
      });
      const importTime = performance.now() - importStart;

      expect(currentView.components).toHaveLength(componentCount);
      console.log(`📊 Import time for ${componentCount} components: ${importTime.toFixed(2)}ms`);

      // Test hit detection performance
      const hitTestStart = performance.now();
      for (let i = 0; i < 100; i++) {
        const x = Math.random() * 800;
        const y = Math.random() * 600;
        componentLifecycleManager.getComponentAt(x, y, currentView);
      }
      const hitTestTime = performance.now() - hitTestStart;

      console.log(`🎯 Hit test time for 100 queries: ${hitTestTime.toFixed(2)}ms`);

      // Test movement performance
      const moveStart = performance.now();
      for (let i = 0; i < 10; i++) {
        const component = currentView.components[i];
        componentLifecycleManager.updateComponent(component, {
          x: component.x + 10,
          y: component.y + 10,
        });
      }
      const moveTime = performance.now() - moveStart;

      console.log(`🚚 Movement time for 10 components: ${moveTime.toFixed(2)}ms`);

      // Performance should be reasonable
      expect(importTime).toBeLessThan(500); // Less than 500ms to import 100 components
      expect(hitTestTime).toBeLessThan(50); // Less than 50ms for 100 hit tests
      expect(moveTime).toBeLessThan(50); // Less than 50ms to move 10 components
    });
  });
});
/**
 * Command Integration Tests - Phase 4 State Management Migration
 * 
 * Tests for the integration layer that connects the Command pattern
 * with the existing MotherboardApp.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandIntegration, createCommandIntegration } from './CommandIntegration';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

// Mock app for testing
const createMockApp = () => ({
  currentView: {
    type: 'main',
    components: [],
    connections: [],
  },
  components: [],
  connections: [],
  selectedComponent: null,
  camera: { x: 0, y: 0, zoom: 1 },
});

describe('CommandIntegration', () => {
  let integration: CommandIntegration;
  let mockApp: any;

  beforeEach(() => {
    mockApp = createMockApp();
    integration = new CommandIntegration(mockApp);
  });

  describe('Component Creation Integration', () => {
    it('should add component to current view when created', () => {
      const component = {
        id: 'test-component',
        type: 'power-core',
        x: 100,
        y: 200,
        title: 'Test Component',
        status: 'todo',
      };

      eventBus.emit(Events.ComponentCreated, {
        id: component.id,
        model: component,
        source: 'test',
      });

      expect(mockApp.currentView.components).toHaveLength(1);
      expect(mockApp.currentView.components[0]).toEqual(component);
    });

    it('should add component to top-level components on main view', () => {
      const component = {
        id: 'test-component',
        type: 'power-core',
        x: 100,
        y: 200,
        title: 'Test Component',
        status: 'todo',
      };

      eventBus.emit(Events.ComponentCreated, {
        id: component.id,
        model: component,
        source: 'test',
      });

      expect(mockApp.components).toHaveLength(1);
      expect(mockApp.components[0]).toEqual(component);
    });

    it('should set first component as selected', () => {
      const component = {
        id: 'test-component',
        type: 'power-core',
        x: 100,
        y: 200,
        title: 'Test Component',
        status: 'todo',
      };

      eventBus.emit(Events.ComponentCreated, {
        id: component.id,
        model: component,
        source: 'test',
      });

      expect(mockApp.selectedComponent).toEqual(component);
    });
  });

  describe('Component Update Integration', () => {
    beforeEach(() => {
      const component = {
        id: 'test-component',
        type: 'power-core',
        x: 100,
        y: 200,
        title: 'Test Component',
        status: 'todo',
      };

      mockApp.currentView.components.push(component);
      mockApp.components.push(component);
      mockApp.selectedComponent = component;
    });

    it('should update component in current view', () => {
      eventBus.emit(Events.ComponentUpdated, {
        id: 'test-component',
        updates: { status: 'in-progress' },
        source: 'test',
      });

      expect(mockApp.currentView.components[0].status).toBe('in-progress');
    });

    it('should update component in top-level components', () => {
      eventBus.emit(Events.ComponentUpdated, {
        id: 'test-component',
        updates: { status: 'done' },
        source: 'test',
      });

      expect(mockApp.components[0].status).toBe('done');
    });

    it('should update selected component', () => {
      eventBus.emit(Events.ComponentUpdated, {
        id: 'test-component',
        updates: { title: 'Updated Title' },
        source: 'test',
      });

      expect(mockApp.selectedComponent.title).toBe('Updated Title');
    });
  });

  describe('Component Deletion Integration', () => {
    beforeEach(() => {
      const component = {
        id: 'test-component',
        type: 'power-core',
        x: 100,
        y: 200,
        title: 'Test Component',
        status: 'todo',
      };

      mockApp.currentView.components.push(component);
      mockApp.components.push(component);
      mockApp.selectedComponent = component;
    });

    it('should remove component from current view', () => {
      eventBus.emit(Events.ComponentDeleted, {
        id: 'test-component',
        source: 'test',
      });

      expect(mockApp.currentView.components).toHaveLength(0);
    });

    it('should remove component from top-level components', () => {
      eventBus.emit(Events.ComponentDeleted, {
        id: 'test-component',
        source: 'test',
      });

      expect(mockApp.components).toHaveLength(0);
    });

    it('should clear selection if deleted component was selected', () => {
      eventBus.emit(Events.ComponentDeleted, {
        id: 'test-component',
        source: 'test',
      });

      expect(mockApp.selectedComponent).toBeNull();
    });
  });

  describe('Connection Integration', () => {
    it('should add connection to current view', () => {
      const connection = {
        id: 'test-connection',
        from: { componentId: 'comp1', pinIndex: 0, pinType: 'output' as const },
        to: { componentId: 'comp2', pinIndex: 0, pinType: 'input' as const },
        category: 'frontend',
        createdAt: new Date(),
      };

      eventBus.emit(Events.ConnectionCreated, {
        id: connection.id,
        from: connection.from,
        to: connection.to,
        type: connection.category,
        source: 'test',
      });

      expect(mockApp.currentView.connections).toHaveLength(1);
      expect(mockApp.currentView.connections[0].id).toBe(connection.id);
    });

    it('should remove connection from current view', () => {
      const connection = {
        id: 'test-connection',
        from: { componentId: 'comp1', pinIndex: 0, pinType: 'output' as const },
        to: { componentId: 'comp2', pinIndex: 0, pinType: 'input' as const },
        category: 'frontend',
        createdAt: new Date(),
      };

      mockApp.currentView.connections.push(connection);

      eventBus.emit(Events.ConnectionDeleted, {
        id: 'test-connection',
        source: 'test',
      });

      expect(mockApp.currentView.connections).toHaveLength(0);
    });
  });

  describe('Command History Integration', () => {
    it('should provide command history access', () => {
      const history = integration.getCommandHistory();
      expect(history).toBeDefined();
      expect(history.past).toBeDefined();
      expect(history.future).toBeDefined();
      expect(history.present).toBeDefined();
    });

    it('should check undo availability', () => {
      const canUndo = integration.canUndo();
      expect(typeof canUndo).toBe('boolean');
    });

    it('should check redo availability', () => {
      const canRedo = integration.canRedo();
      expect(typeof canRedo).toBe('boolean');
    });

    it('should clear command history', () => {
      integration.clearHistory();
      const history = integration.getCommandHistory();
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(0);
      expect(history.present).toBeNull();
    });
  });

  describe('State Management Integration', () => {
    it('should provide state access', () => {
      const state = integration.getState();
      expect(state).toBeDefined();
      expect(state.components).toBeDefined();
      expect(state.connections).toBeDefined();
      expect(state.view).toBeDefined();
    });

    it('should allow state subscription', () => {
      const callback = vi.fn();
      const unsubscribe = integration.subscribe('stateChanged', callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Clean up
      unsubscribe();
    });

    it('should initialize app state', () => {
      // Add some test data
      const component = {
        id: 'test-component',
        type: 'power-core',
        x: 100,
        y: 200,
        title: 'Test Component',
        status: 'todo',
      };

      mockApp.components.push(component);
      mockApp.selectedComponent = component;

      integration.initializeAppState();

      const state = integration.getState();
      expect(state.components['test-component']).toEqual(component);
      expect(state.selectedComponentId).toBe('test-component');
    });
  });

  describe('Factory Function', () => {
    it('should create integration instance', () => {
      const integration = createCommandIntegration(mockApp);
      expect(integration).toBeInstanceOf(CommandIntegration);
    });
  });

  describe('Cleanup', () => {
    it('should destroy integration properly', () => {
      integration.destroy();
      // Integration should be marked as not initialized
      expect(integration['isInitialized']).toBe(false);
    });
  });
});

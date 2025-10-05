// AppStateManager.test.ts - Comprehensive tests for centralized state management
// Tests core application state coordination that was previously in main.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppStateManager, resetAppStateManager, createAppStateManager } from './AppStateManager';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, Connection, ViewState } from '../types';

describe('AppStateManager', () => {
  let stateManager: AppStateManager;
  let mockComponent: ComponentBase;
  let mockConnection: Connection;

  beforeEach(() => {
    // Reset singleton before each test
    resetAppStateManager();
    stateManager = createAppStateManager();

    // Mock component
    mockComponent = {
      id: 'test-comp-1',
      type: 'task-resistor',
      x: 100,
      y: 100,
      width: 60,
      height: 20,
      name: 'Test Component',
      title: 'Test Component',
      pins: {
        input: [{ x: 0, y: 10, type: 'energy' }],
        output: [{ x: 60, y: 10, type: 'energy' }],
      },
      status: 'defined',
    };

    // Mock connection
    mockConnection = {
      id: 'test-conn-1',
      from: {
        component: mockComponent,
        pinType: 'output',
        pinIndex: 0,
        x: 160,
        y: 110,
        category: 'frontend',
      },
      to: {
        component: mockComponent,
        pinType: 'input',
        pinIndex: 0,
        x: 100,
        y: 110,
        category: 'frontend',
      },
      category: 'frontend',
    };
  });

  afterEach(() => {
    // Reset app state manager
    resetAppStateManager();

    // Clear all event bus handlers to prevent interference between tests
    eventBus.clearAll();

    // Clear any pending timers
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      expect(stateManager.getComponents()).toEqual([]);
      expect(stateManager.getConnections()).toEqual([]);
      expect(stateManager.getSelectedComponent()).toBeNull();
      expect(stateManager.isInTransition()).toBe(false);
    });

    it('should initialize with main view', () => {
      const view = stateManager.getCurrentView();
      expect(view.type).toBe('main');
      expect(view.component).toBeNull();
      expect(view.camera).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it('should enforce singleton pattern', () => {
      expect(() => createAppStateManager()).toThrow(
        'AppStateManager instance already exists'
      );
    });
  });

  describe('Component Management', () => {
    it('should add components to state', () => {
      stateManager.addComponent(mockComponent);
      const components = stateManager.getComponents();

      expect(components).toHaveLength(1);
      expect(components[0].id).toBe('test-comp-1');
    });

    it('should emit ComponentCreated event when adding component', () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      stateManager.addComponent(mockComponent);

      expect(eventSpy).toHaveBeenCalledWith({
        id: 'test-comp-1',
        type: 'task-resistor',
        model: mockComponent,
        source: 'legacy',
      });
    });

    it('should remove components from state', () => {
      stateManager.addComponent(mockComponent);
      stateManager.removeComponent('test-comp-1');

      expect(stateManager.getComponents()).toEqual([]);
    });

    it('should emit ComponentDeleted event when removing component', () => {
      const eventSpy = vi.fn();
      stateManager.addComponent(mockComponent);

      eventBus.on(Events.ComponentDeleted, eventSpy);
      stateManager.removeComponent('test-comp-1');

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-comp-1',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should set components array', () => {
      const components = [mockComponent, { ...mockComponent, id: 'test-comp-2' }];
      stateManager.setComponents(components);

      expect(stateManager.getComponents()).toHaveLength(2);
    });

    it('should emit ComponentCreated events when setting components with emitEvents=true', () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      const components = [
        mockComponent,
        { ...mockComponent, id: 'test-comp-2' },
        { ...mockComponent, id: 'test-comp-3' },
      ];

      stateManager.setComponents(components, true);

      // Should emit event for each component
      expect(eventSpy).toHaveBeenCalledTimes(3);
      expect(eventSpy).toHaveBeenCalledWith({
        id: 'test-comp-1',
        type: 'task-resistor',
        model: mockComponent,
        source: 'import',
      });
      expect(eventSpy).toHaveBeenCalledWith({
        id: 'test-comp-2',
        type: 'task-resistor',
        model: expect.objectContaining({ id: 'test-comp-2' }),
        source: 'import',
      });
    });

    it('should NOT emit events when setting components with emitEvents=false', () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      const components = [mockComponent, { ...mockComponent, id: 'test-comp-2' }];

      stateManager.setComponents(components, false);

      expect(eventSpy).not.toHaveBeenCalled();
      expect(stateManager.getComponents()).toHaveLength(2);
    });

    it('should emit ComponentCreated events by default (for import compatibility)', () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      const components = [mockComponent];
      stateManager.setComponents(components); // No second parameter

      expect(eventSpy).toHaveBeenCalledWith({
        id: 'test-comp-1',
        type: 'task-resistor',
        model: mockComponent,
        source: 'import',
      });
    });

    it('should return immutable component array', () => {
      stateManager.addComponent(mockComponent);
      const components1 = stateManager.getComponents();
      const components2 = stateManager.getComponents();

      expect(components1).not.toBe(components2); // Different array instances
      expect(components1).toEqual(components2); // Same content
    });
  });

  describe('View-Aware Component Management', () => {
    it('should add component to main view correctly', () => {
      stateManager.addComponentToCurrentView(mockComponent);

      const components = stateManager.getComponents();
      const view = stateManager.getCurrentView();

      expect(components).toHaveLength(1);
      expect(view.components).toHaveLength(1);
      expect(components[0].id).toBe('test-comp-1');
    });

    it('should add component only to schematic view', () => {
      // Switch to schematic view
      const schematicView: ViewState = {
        type: 'schematic',
        component: mockComponent,
        camera: { x: 0, y: 0, zoom: 1 },
        components: [],
        connections: [],
      };
      stateManager.setCurrentView(schematicView);

      const newComponent = { ...mockComponent, id: 'internal-comp-1' };
      stateManager.addComponentToCurrentView(newComponent);

      // Should NOT add to global components
      expect(stateManager.getComponents()).toHaveLength(0);

      // Should add to current view
      const view = stateManager.getCurrentView();
      expect(view.components).toHaveLength(1);
      expect(view.components[0].id).toBe('internal-comp-1');
    });

    it('should emit view-aware event when adding to current view', () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.ComponentCreated, eventSpy);

      stateManager.addComponentToCurrentView(mockComponent);

      expect(eventSpy).toHaveBeenCalledWith({
        id: 'test-comp-1',
        type: 'task-resistor',
        model: mockComponent,
        source: 'view-aware',
      });
    });
  });

  describe('Connection Management', () => {
    it('should add connections to state', () => {
      stateManager.addConnection(mockConnection);

      expect(stateManager.getConnections()).toHaveLength(1);
    });

    it('should remove connections from state', () => {
      stateManager.addConnection(mockConnection);
      stateManager.removeConnection('test-conn-1');

      expect(stateManager.getConnections()).toEqual([]);
    });

    it('should set connections array', () => {
      const connections = [mockConnection, { ...mockConnection, id: 'test-conn-2' }];
      stateManager.setConnections(connections);

      expect(stateManager.getConnections()).toHaveLength(2);
    });

    it('should return immutable connection array', () => {
      stateManager.addConnection(mockConnection);
      const conn1 = stateManager.getConnections();
      const conn2 = stateManager.getConnections();

      expect(conn1).not.toBe(conn2); // Different array instances
      expect(conn1).toEqual(conn2); // Same content
    });
  });

  describe('View-Aware Connection Management', () => {
    it('should add connection to main view correctly', () => {
      stateManager.addConnectionToCurrentView(mockConnection);

      const connections = stateManager.getConnections();
      const view = stateManager.getCurrentView();

      expect(connections).toHaveLength(1);
      expect(view.connections).toHaveLength(1);
    });

    it('should add connection only to schematic view', () => {
      const schematicView: ViewState = {
        type: 'schematic',
        component: mockComponent,
        camera: { x: 0, y: 0, zoom: 1 },
        components: [],
        connections: [],
      };
      stateManager.setCurrentView(schematicView);

      const internalConnection = { ...mockConnection, id: 'internal-conn-1' };
      stateManager.addConnectionToCurrentView(internalConnection);

      // Should NOT add to global connections
      expect(stateManager.getConnections()).toHaveLength(0);

      // Should add to current view
      const view = stateManager.getCurrentView();
      expect(view.connections).toHaveLength(1);
    });

    it('should NOT emit CONNECTION_CREATED event (ConnectionManager already does this)', () => {
      // addConnectionToCurrentView intentionally does NOT emit CONNECTION_CREATED
      // to prevent infinite event loop (ConnectionManager already emits it)
      const eventSpy = vi.fn();
      eventBus.on(Events.CONNECTION_CREATED, eventSpy);

      stateManager.addConnectionToCurrentView(mockConnection);

      // Verify event was NOT emitted (prevents infinite loop)
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Component Selection', () => {
    it('should set selected component', () => {
      stateManager.setSelectedComponent(mockComponent);

      expect(stateManager.getSelectedComponent()).toBe(mockComponent);
    });

    it('should clear selected component', () => {
      stateManager.setSelectedComponent(mockComponent);
      stateManager.setSelectedComponent(null);

      expect(stateManager.getSelectedComponent()).toBeNull();
    });

    it('should emit selection changed event', () => {
      const eventSpy = vi.fn();
      eventBus.on('component.selection.changed', eventSpy);

      stateManager.setSelectedComponent(mockComponent);

      expect(eventSpy).toHaveBeenCalledWith({
        component: mockComponent,
        timestamp: expect.any(Number),
      });
    });

    it('should respond to COMPONENT_SELECTED event', () => {
      eventBus.emit(Events.COMPONENT_SELECTED, { component: mockComponent });

      expect(stateManager.getSelectedComponent()).toBe(mockComponent);
    });
  });

  describe('View Management', () => {
    it('should set current view', () => {
      const newView: ViewState = {
        type: 'schematic',
        component: mockComponent,
        camera: { x: 100, y: 200, zoom: 1.5 },
        components: [],
        connections: [],
      };

      stateManager.setCurrentView(newView);

      const view = stateManager.getCurrentView();
      expect(view.type).toBe('schematic');
      expect(view.component).toBe(mockComponent);
      expect(view.camera.zoom).toBe(1.5);
    });

    it('should emit view changed event', () => {
      const eventSpy = vi.fn();
      eventBus.on('view.changed', eventSpy);

      const newView: ViewState = {
        type: 'schematic',
        component: mockComponent,
        camera: { x: 0, y: 0, zoom: 1 },
        components: [],
        connections: [],
      };

      stateManager.setCurrentView(newView);

      expect(eventSpy).toHaveBeenCalledWith({
        view: newView,
        timestamp: expect.any(Number),
      });
    });

    it('should return immutable view state', () => {
      const view1 = stateManager.getCurrentView();
      const view2 = stateManager.getCurrentView();

      expect(view1).not.toBe(view2); // Different object instances
      expect(view1).toEqual(view2); // Same content
    });
  });

  describe('Transition State', () => {
    it('should track transition state', () => {
      expect(stateManager.isInTransition()).toBe(false);

      stateManager.setTransitioning(true);
      expect(stateManager.isInTransition()).toBe(true);

      stateManager.setTransitioning(false);
      expect(stateManager.isInTransition()).toBe(false);
    });
  });

  describe('FPS Tracking', () => {
    it('should calculate FPS correctly', () => {
      stateManager.updateFPS(1000);
      stateManager.updateFPS(1016.67); // ~60 FPS

      expect(stateManager.getFPS()).toBeCloseTo(60, 0);
    });

    it('should track last time', () => {
      stateManager.updateFPS(1000);

      expect(stateManager.getLastTime()).toBe(1000);
    });

    it('should update FPS display element if exists', () => {
      const fpsElement = document.createElement('div');
      fpsElement.id = 'fps-counter';
      document.body.appendChild(fpsElement);

      stateManager.updateFPS(1000);
      stateManager.updateFPS(1016.67);

      expect(fpsElement.textContent).toBe('FPS: 60');

      document.body.removeChild(fpsElement);
    });
  });

  describe('State Subscription System', () => {
    it('should notify subscribers when components change', () => {
      const listener = vi.fn();
      stateManager.subscribe('components', listener);

      stateManager.addComponent(mockComponent);

      expect(listener).toHaveBeenCalledWith([mockComponent]);
    });

    it('should notify subscribers when selection changes', () => {
      const listener = vi.fn();
      stateManager.subscribe('selectedComponent', listener);

      stateManager.setSelectedComponent(mockComponent);

      expect(listener).toHaveBeenCalledWith(mockComponent);
    });

    it('should notify subscribers when view changes', () => {
      const listener = vi.fn();
      stateManager.subscribe('currentView', listener);

      const newView: ViewState = {
        type: 'schematic',
        component: mockComponent,
        camera: { x: 0, y: 0, zoom: 1 },
        components: [],
        connections: [],
      };

      stateManager.setCurrentView(newView);

      expect(listener).toHaveBeenCalled();
    });

    it('should allow unsubscribing', () => {
      const listener = vi.fn();
      const unsubscribe = stateManager.subscribe('components', listener);

      stateManager.addComponent(mockComponent);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      stateManager.addComponent({ ...mockComponent, id: 'test-comp-2' });

      expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should support multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      stateManager.subscribe('components', listener1);
      stateManager.subscribe('components', listener2);

      stateManager.addComponent(mockComponent);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('Event Bus Integration', () => {
    it('should respond to ComponentUpdated events', () => {
      stateManager.addComponent(mockComponent);

      eventBus.emit(Events.ComponentUpdated, {
        id: 'test-comp-1',
        changes: { status: 'done' },
      });

      const component = stateManager.getComponents()[0];
      expect(component.status).toBe('done');
    });

    it('should notify listeners when component updated via event', () => {
      const listener = vi.fn();
      stateManager.subscribe('components', listener);
      stateManager.addComponent(mockComponent);

      listener.mockClear();

      eventBus.emit(Events.ComponentUpdated, {
        id: 'test-comp-1',
        changes: { x: 200 },
      });

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('State Utilities', () => {
    it('should clear all state', () => {
      stateManager.addComponent(mockComponent);
      stateManager.addConnection(mockConnection);
      stateManager.setSelectedComponent(mockComponent);
      stateManager.setTransitioning(true);

      stateManager.clearState();

      expect(stateManager.getComponents()).toEqual([]);
      expect(stateManager.getConnections()).toEqual([]);
      expect(stateManager.getSelectedComponent()).toBeNull();
      expect(stateManager.isInTransition()).toBe(false);
      expect(stateManager.getCurrentView().type).toBe('main');
    });

    it('should notify all listeners when clearing state', () => {
      const componentsListener = vi.fn();
      const connectionsListener = vi.fn();
      const selectionListener = vi.fn();

      stateManager.subscribe('components', componentsListener);
      stateManager.subscribe('connections', connectionsListener);
      stateManager.subscribe('selectedComponent', selectionListener);

      stateManager.clearState();

      expect(componentsListener).toHaveBeenCalledWith([]);
      expect(connectionsListener).toHaveBeenCalledWith([]);
      expect(selectionListener).toHaveBeenCalledWith(null);
    });

    it('should create state snapshot', () => {
      stateManager.addComponent(mockComponent);
      stateManager.addConnection(mockConnection);
      stateManager.setSelectedComponent(mockComponent);

      const snapshot = stateManager.getSnapshot();

      expect(snapshot.components).toHaveLength(1);
      expect(snapshot.connections).toHaveLength(1);
      expect(snapshot.selectedComponent).toBe(mockComponent);
    });

    it('should restore from snapshot', () => {
      const snapshot = {
        components: [mockComponent],
        connections: [mockConnection],
        selectedComponent: mockComponent,
      };

      stateManager.restoreFromSnapshot(snapshot);

      expect(stateManager.getComponents()).toHaveLength(1);
      expect(stateManager.getConnections()).toHaveLength(1);
      expect(stateManager.getSelectedComponent()).toBe(mockComponent);
    });

    it('should restore partial snapshot', () => {
      stateManager.addComponent(mockComponent);

      const partialSnapshot = {
        selectedComponent: mockComponent,
      };

      stateManager.restoreFromSnapshot(partialSnapshot);

      expect(stateManager.getComponents()).toHaveLength(1); // Unchanged
      expect(stateManager.getSelectedComponent()).toBe(mockComponent); // Changed
    });
  });

  describe('Edge Cases', () => {
    it('should handle updating non-existent component', () => {
      const listener = vi.fn();
      stateManager.subscribe('components', listener);

      eventBus.emit(Events.ComponentUpdated, {
        id: 'non-existent',
        changes: { status: 'done' },
      });

      // Should not notify listeners
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle removing non-existent component', () => {
      stateManager.addComponent(mockComponent);

      stateManager.removeComponent('non-existent');

      expect(stateManager.getComponents()).toHaveLength(1); // Unchanged
    });

    it('should handle removing non-existent connection', () => {
      stateManager.addConnection(mockConnection);

      stateManager.removeConnection('non-existent');

      expect(stateManager.getConnections()).toHaveLength(1); // Unchanged
    });
  });
});

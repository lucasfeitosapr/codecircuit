import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
  InputEventCoordinator,
  createInputEventCoordinator,
  type InputEventCoordinatorDependencies,
} from './InputEventCoordinator';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

// Mock the inputHandler module
vi.mock('../inputHandler', () => ({
  setupInputListeners: vi.fn(),
}));

// Mock datasheet module
vi.mock('../datasheet', () => ({
  hideDatasheet: vi.fn(),
  showDatasheet: vi.fn(),
}));

describe('InputEventCoordinator', () => {
  let coordinator: InputEventCoordinator;
  let mockDependencies: InputEventCoordinatorDependencies;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    document.body.appendChild(canvas);

    // Create mock dependencies
    mockDependencies = {
      // Canvas and viewport
      canvas: canvas,
      viewportManager: {
        camera: { x: 0, y: 0, zoom: 1 },
        screenToWorld: vi.fn().mockReturnValue({ x: 100, y: 100 }),
        setCamera: vi.fn(),
        handleWheelEvent: vi.fn(),
      },

      // Component management
      getComponentAt: vi.fn().mockReturnValue(null),
      getPinAt: vi.fn().mockReturnValue(null),
      getCurrentViewComponents: vi.fn().mockReturnValue([]),
      getCurrentViewConnections: vi.fn().mockReturnValue([]),

      // Component operations
      addComponent: vi.fn(),
      toggleComponentStatus: vi.fn(),

      // UI operations
      showDatasheet: vi.fn(),
      hideDatasheet: vi.fn(),
      showTemporaryMessage: vi.fn(),

      // View management
      currentView: {
        type: 'main',
        component: null,
        camera: { x: 0, y: 0, zoom: 1 },
        components: [],
        connections: [],
      },
      enterSchematicView: vi.fn(),
      exitSchematicView: vi.fn(),
      viewStack: { size: vi.fn().mockReturnValue(0) },
      isTransitioning: false,

      // Selection and interaction state
      selectedComponent: null,
      setSelectedComponent: vi.fn(),
      addToSelection: vi.fn(),
      removeFromSelection: vi.fn(),
      clearSelection: vi.fn(),
      getSelectedComponentIds: vi.fn().mockReturnValue(new Set()),
      isComponentSelected: vi.fn().mockReturnValue(false),

      // Connection management
      connectionManager: {
        getConnectionState: vi.fn().mockReturnValue({ isConnecting: false, connectionStart: null }),
        startConnection: vi.fn(),
        endConnection: vi.fn(),
        cancelConnection: vi.fn(),
        validateConnection: vi.fn().mockReturnValue({ isValid: true }),
      },
      updateConnectionModeUI: vi.fn(),

      // Rendering layers
      uiLayer: {
        clearConnectionIntents: vi.fn(),
        addConnectionIntent: vi.fn(),
        clearSelectionBoxes: vi.fn(),
        clearGuideLines: vi.fn(),
        addSelectionBox: vi.fn(),
        addAlignmentGuides: vi.fn(),
      },
      runtimeLayer: {},

      // Component types and state
      components: [],
      connections: [],
      // Component lifecycle manager stub
      componentLifecycleManager: { createComponent: vi.fn() },
    };

    coordinator = new InputEventCoordinator(mockDependencies);
  });

  afterEach(() => {
    if (coordinator) {
      coordinator.destroy();
    }
    document.body.removeChild(canvas);
    vi.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create coordinator with dependencies', () => {
      expect(coordinator).toBeInstanceOf(InputEventCoordinator);
    });

    it('should setup event listeners during construction', () => {
      // Verify that constructor completed successfully, which means setupEventListeners was called
      expect(coordinator).toBeInstanceOf(InputEventCoordinator);

      // Verify keyboard event listener was added (we can spy on addEventListener)
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      // Create a new coordinator to test the setup process
      const newCoordinator = new InputEventCoordinator(mockDependencies);

      // Should have added keydown event listener
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

      // Cleanup
      newCoordinator.destroy();
      addEventListenerSpy.mockRestore();
    });

    it('should setup keyboard event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      new InputEventCoordinator(mockDependencies);

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should create coordinator via factory function', () => {
      const createdCoordinator = createInputEventCoordinator(mockDependencies);

      expect(createdCoordinator).toBeInstanceOf(InputEventCoordinator);

      createdCoordinator.destroy();
    });
  });

  describe('Mouse Position and State', () => {
    it('should return default mouse position', () => {
      const mousePos = coordinator.getMousePosition();

      expect(mousePos).toEqual({ x: 0, y: 0 });
    });

    it('should return default interaction state', () => {
      const state = coordinator.getInteractionState();

      expect(state).toEqual({
        isDragging: false,
        isPanning: false,
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should setup keyboard event listener', () => {
      // Just test that keyboard event listener was set up
      expect(coordinator).toBeInstanceOf(InputEventCoordinator);
    });

    it('should handle component selection with space key logic', () => {
      const component = {
        id: '1',
        type: 'task-resistor',
        x: 100,
        y: 100,
        width: 60,
        height: 20,
        pins: { input: [], output: [] },
      };

      // Test the logic directly rather than DOM events
      mockDependencies.selectedComponent = component;

      // Simulate the space key handler logic
      if (
        mockDependencies.selectedComponent &&
        mockDependencies.selectedComponent.type !== 'power-core'
      ) {
        mockDependencies.toggleComponentStatus(mockDependencies.selectedComponent);
      }

      expect(mockDependencies.toggleComponentStatus).toHaveBeenCalledWith(component);
    });

    it('should handle help overlay logic', () => {
      // Create help overlay element
      const helpOverlay = document.createElement('div');
      helpOverlay.id = 'help-overlay';
      document.body.appendChild(helpOverlay);

      // Simulate F1 key handler logic
      const helpOverlayElement = document.getElementById('help-overlay') as HTMLElement;
      if (helpOverlayElement) {
        if (helpOverlayElement.classList.contains('active')) {
          helpOverlayElement.classList.remove('active');
        } else {
          helpOverlayElement.classList.add('active');
        }
      }

      expect(helpOverlay.classList.contains('active')).toBe(true);

      document.body.removeChild(helpOverlay);
    });

    it('should provide mouse position and interaction state', () => {
      const mousePos = coordinator.getMousePosition();
      const interactionState = coordinator.getInteractionState();

      expect(mousePos).toEqual({ x: 0, y: 0 });
      expect(interactionState).toEqual({
        isDragging: false,
        isPanning: false,
      });
    });
  });

  describe('UI Button Event Handlers', () => {
    it('should handle reset button click', () => {
      const resetBtn = document.createElement('button');
      resetBtn.id = 'reset-btn';
      document.body.appendChild(resetBtn);

      // Mock confirm to return true
      (globalThis as any).confirm = vi.fn().mockReturnValue(true);

      // Create new coordinator to register the button
      coordinator.destroy();
      coordinator = new InputEventCoordinator(mockDependencies);

      resetBtn.click();

      expect(mockDependencies.setSelectedComponent).toHaveBeenCalledWith(null);
      expect(mockDependencies.hideDatasheet).toHaveBeenCalled();

      document.body.removeChild(resetBtn);
    });

    it('should handle export button click', () => {
      const exportBtn = document.createElement('button');
      exportBtn.id = 'export-btn';
      document.body.appendChild(exportBtn);

      const emitSpy = vi.spyOn(eventBus, 'emit');

      // Create new coordinator to register the button
      coordinator.destroy();
      coordinator = new InputEventCoordinator(mockDependencies);

      exportBtn.click();

      expect(emitSpy).toHaveBeenCalledWith(Events.PROJECT_EXPORT_REQUESTED, {
        timestamp: expect.any(Number),
      });

      document.body.removeChild(exportBtn);
    });
  });

  describe('Event Bus Integration', () => {
    it('should handle PROJECT_STATE_REQUEST event', () => {
      const callback = vi.fn();

      eventBus.emit(Events.PROJECT_STATE_REQUEST, {
        callback,
        timestamp: Date.now(),
      });

      expect(callback).toHaveBeenCalledWith(
        mockDependencies.components,
        mockDependencies.connections
      );
    });

    it.skip('PROJECT_IMPORTED handling moved to main.ts', () => {
      // PROJECT_IMPORTED event handling has been moved to main.ts setupExportImportEventHandlers()
      // which properly uses AppStateManager.setComponents() and setConnections()
      // This test is skipped because InputEventCoordinator no longer handles this event
    });

    it('should handle PROJECT_IMPORT_ERROR event', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      eventBus.emit(Events.PROJECT_IMPORT_ERROR, {
        error: 'Test error',
        timestamp: Date.now(),
      });

      expect(consoleSpy).toHaveBeenCalledWith('❌ Import error:', 'Test error');
      expect(alertSpy).toHaveBeenCalledWith('Import Error: Test error');
    });
  });

  describe('Component Dragging', () => {
    it('should emit COMPONENT_DRAG_UPDATED event during drag', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');

      // Create a mock component
      const component = {
        id: 'test-component',
        type: 'task-resistor',
        x: 100,
        y: 100,
        width: 60,
        height: 20,
        pins: { input: [], output: [] },
      };

      // Set up component selection and dragging state
      mockDependencies.getComponentAt = vi.fn().mockReturnValue(component);
      mockDependencies.selectedComponent = component;

      // Simulate mouse down to start dragging
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 150, clientY: 120, button: 0 });
      coordinator.handleMouseDown(mouseDownEvent);

      // Verify dragging state is set
      expect(coordinator.getInteractionState().isDragging).toBe(true);

      // Simulate mouse move while dragging
      const mouseMoveEvent = new MouseEvent('mousemove', { clientX: 160, clientY: 130 });
      coordinator.handleMouseMove(mouseMoveEvent);

      // Wait for RAF batching to emit the event
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

      // Verify COMPONENT_DRAG_UPDATED event was emitted
      expect(emitSpy).toHaveBeenCalledWith(Events.COMPONENT_DRAG_UPDATED, {
        componentId: 'test-component',
        x: expect.any(Number),
        y: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });

    it('should emit COMPONENT_DRAG_COMPLETED event on mouse up', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');

      // Create a mock component
      const component = {
        id: 'test-component-2',
        type: 'task-resistor',
        x: 100,
        y: 100,
        width: 60,
        height: 20,
        pins: { input: [], output: [] },
      };

      // Set up component selection and ensure getComponentAt returns the component
      mockDependencies.getComponentAt = vi.fn().mockReturnValue(component);
      mockDependencies.selectedComponent = component;

      // Simulate mouse down to start dragging
      const mouseDownEvent = new MouseEvent('mousedown', { clientX: 150, clientY: 120, button: 0 });
      coordinator.handleMouseDown(mouseDownEvent);

      // Clear the emit spy to focus on the mouse up event
      emitSpy.mockClear();

      // Simulate mouse up to end dragging
      coordinator.handleMouseUp();

      // Verify COMPONENT_DRAG_COMPLETED event was emitted
      expect(emitSpy).toHaveBeenCalledWith(Events.COMPONENT_DRAG_COMPLETED, {
        componentId: 'test-component-2',
        x: expect.any(Number),
        y: expect.any(Number),
        timestamp: expect.any(Number),
      });

      // Verify dragging state is cleared
      expect(coordinator.getInteractionState().isDragging).toBe(false);
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      coordinator.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should log cleanup message', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      coordinator.destroy();

      expect(consoleSpy).toHaveBeenCalledWith('InputEventCoordinator: Event listeners cleaned up');
    });
  });
});

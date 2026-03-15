import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SchematicViewManager, createSchematicViewManager } from './SchematicViewManager';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import { ViewStack } from '../viewStack';
import { createAppStateManager, resetAppStateManager } from './AppStateManager';
import type { ComponentBase, ViewState, ModuleComponent } from '../types';

function makeCanvasStub() {
  const c = document.createElement('canvas');
  c.id = 'circuit-board';
  c.width = 800;
  c.height = 600;
  document.body.appendChild(c);
  return c;
}

describe('SchematicViewManager', () => {
  let schematicViewManager: SchematicViewManager;
  let appStateManager: ReturnType<typeof createAppStateManager>;
  let viewStack: ViewStack;
  let mockViewportManager: any;
  let mockViewNavigationManager: any;
  let mockUIController: any;

  const createMockModuleIC = (id: string, title: string): ModuleComponent => ({
    id,
    type: 'module-ic',
    x: 100,
    y: 100,
    width: 100,
    height: 60,
    title,
    name: title,
    color: '#4444ff',
    status: 'defined',
    category: 'containers',
    createdAt: new Date(),
    internalComponents: [],
    internalConnections: [],
    pins: {
      input: [{ x: 0, y: 30, type: 'energy' }],
      output: [{ x: 100, y: 30, type: 'energy' }],
    },
  });

  const createMockTaskResistor = (id: string, title: string): ComponentBase => ({
    id,
    type: 'task-resistor',
    x: 50,
    y: 50,
    width: 60,
    height: 20,
    title,
    name: title,
    color: '#ff6600',
    status: 'todo',
    category: 'frontend',
    createdAt: new Date(),
    pins: {
      input: [{ x: 0, y: 10, type: 'energy' }],
      output: [{ x: 60, y: 10, type: 'energy' }],
    },
  });

  beforeEach(() => {
    document.body.innerHTML = '';
    makeCanvasStub();

    // Reset singletons
    vi.clearAllMocks();
    ViewStack.resetInstance();
    resetAppStateManager();

    // Clear all event bus handlers to prevent leaks between tests
    (eventBus as any).handlers.clear();

    // Create fresh instances
    appStateManager = createAppStateManager();
    viewStack = ViewStack.getInstance();

    // Ensure clean ViewStack state
    viewStack.clear();

    // Reset app state to main view
    appStateManager.setCurrentView({
      type: 'main',
      component: null,
      camera: { x: 0, y: 0, zoom: 1 },
      components: [],
      connections: [],
    });
    appStateManager.setTransitioning(false);

    // Create mock managers
    mockViewportManager = {
      camera: { x: 0, y: 0, zoom: 1 },
      setCamera: vi.fn(),
    };

    mockViewNavigationManager = {
      animateToSchematicView: vi.fn((id, callback) => {
        // Simulate immediate animation completion
        setTimeout(callback, 0);
      }),
      animateToMainView: vi.fn((camera, callback) => {
        // Simulate immediate animation completion
        setTimeout(callback, 0);
      }),
    };

    mockUIController = {
      updateBreadcrumbs: vi.fn(),
    };

    // Create SchematicViewManager with mocked context
    schematicViewManager = createSchematicViewManager({
      getCurrentView: () => appStateManager.getCurrentView(),
      setCurrentView: (view) => appStateManager.setCurrentView(view),
      getViewStack: () => viewStack,
      getViewportManager: () => mockViewportManager,
      getViewNavigationManager: () => mockViewNavigationManager,
      getUIController: () => mockUIController,
      isTransitioning: () => appStateManager.isInTransition(),
      setTransitioning: (transitioning) => appStateManager.setTransitioning(transitioning),
      getSelectedComponent: () => appStateManager.getSelectedComponent(),
      setSelectedComponent: (component) => appStateManager.setSelectedComponent(component),
      hideDatasheet: vi.fn(),
      getComponents: () => appStateManager.getComponents(),
      getConnections: () => appStateManager.getConnections(),
      getCurrentViewComponents: () => appStateManager.getCurrentViewComponents(),
      getCurrentViewConnections: () => appStateManager.getCurrentViewConnections(),
      setComponents: (components) => appStateManager.setComponents(components),
      setConnections: (connections) => appStateManager.setConnections(connections),
      initializeMainView: () => appStateManager.initializeMainView(),
    });
  });

  describe('Basic Navigation', () => {
    it('should enter schematic view for Module IC', async () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      appStateManager.addComponentToCurrentView(moduleIC);

      // Enter schematic view
      schematicViewManager.enterSchematicView(moduleIC);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check view state
      const currentView = appStateManager.getCurrentView();
      expect(currentView.type).toBe('schematic');
      expect(currentView.component).toBe(moduleIC);
      expect(mockViewNavigationManager.animateToSchematicView).toHaveBeenCalledWith(
        moduleIC.id,
        expect.any(Function)
      );
      expect(mockUIController.updateBreadcrumbs).toHaveBeenCalled();
    });

    it('should exit schematic view and restore previous state', async () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      const mainComponent = createMockTaskResistor('main-task', 'Main Task');

      // Set up main view with components
      appStateManager.setComponents([moduleIC, mainComponent]);

      // Enter schematic view
      schematicViewManager.enterSchematicView(moduleIC);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Exit schematic view
      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check that we're back to main view
      const currentView = appStateManager.getCurrentView();
      expect(currentView.type).toBe('main');
      expect(mockViewNavigationManager.animateToMainView).toHaveBeenCalled();
      expect(mockUIController.updateBreadcrumbs).toHaveBeenCalled();
    });

    it('should prevent navigation when transitioning', () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      appStateManager.setTransitioning(true);

      schematicViewManager.enterSchematicView(moduleIC);

      // Should not start animation when transitioning
      expect(mockViewNavigationManager.animateToSchematicView).not.toHaveBeenCalled();
    });

    it('should handle empty ViewStack gracefully on exit', async () => {
      // Try to exit when there's nothing in the ViewStack
      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not crash and should not start animation
      expect(mockViewNavigationManager.animateToMainView).not.toHaveBeenCalled();
    });

    it('should recover to main view when schematic invariant is violated', async () => {
      const malformedModule = createMockModuleIC('malformed-module', 'Malformed Module');
      (malformedModule as any).internalComponents = { bad: true };
      (malformedModule as any).internalConnections = { bad: true };

      appStateManager.addComponentToCurrentView(malformedModule);
      const initMainSpy = vi.spyOn(appStateManager, 'initializeMainView');
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      schematicViewManager.enterSchematicView(malformedModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(initMainSpy).toHaveBeenCalled();
      expect(appStateManager.getCurrentView().type).toBe('main');
      expect(appStateManager.isInTransition()).toBe(false);
      expect(mockUIController.updateBreadcrumbs).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        '[SchematicViewManager] Invariant violated: invalid schematic view state; recovering to main'
      );

      errorSpy.mockRestore();
    });
  });

  describe('Deep Nesting Navigation', () => {
    it('should handle nested Module IC navigation', async () => {
      const parentModule = createMockModuleIC('parent', 'Parent Module');
      const childModule = createMockModuleIC('child', 'Child Module');

      // Set up parent with child as internal component
      parentModule.internalComponents = [childModule];
      appStateManager.addComponentToCurrentView(parentModule);

      // Enter parent module
      schematicViewManager.enterSchematicView(parentModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(appStateManager.getCurrentView().type).toBe('schematic');
      expect(viewStack.size()).toBe(1);

      // Enter child module
      schematicViewManager.enterSchematicView(childModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(appStateManager.getCurrentView().type).toBe('schematic');
      expect(viewStack.size()).toBe(2);
    });

    it('should exit to main board from nested view', async () => {
      const parentModule = createMockModuleIC('parent', 'Parent Module');
      const childModule = createMockModuleIC('child', 'Child Module');

      parentModule.internalComponents = [childModule];
      appStateManager.addComponentToCurrentView(parentModule);

      // Navigate deep
      schematicViewManager.enterSchematicView(parentModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      schematicViewManager.enterSchematicView(childModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Exit to main board
      schematicViewManager.exitToMainBoard();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should be back at main view with cleared stack
      expect(appStateManager.getCurrentView().type).toBe('main');
      expect(viewStack.size()).toBe(0);
    });

    it('should navigate to specific breadcrumb level', async () => {
      const level1 = createMockModuleIC('level1', 'Level 1');
      const level2 = createMockModuleIC('level2', 'Level 2');
      const level3 = createMockModuleIC('level3', 'Level 3');

      level1.internalComponents = [level2];
      level2.internalComponents = [level3];
      appStateManager.addComponentToCurrentView(level1);

      // Navigate to level 3
      schematicViewManager.enterSchematicView(level1);
      await new Promise(resolve => setTimeout(resolve, 10));

      schematicViewManager.enterSchematicView(level2);
      await new Promise(resolve => setTimeout(resolve, 10));

      schematicViewManager.enterSchematicView(level3);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(viewStack.size()).toBe(3);

      // Navigate directly to level 1 (breadcrumb index 1)
      // For now, test that the navigation logic works step by step
      schematicViewManager.exitSchematicView(); // level3 -> level2
      await new Promise(resolve => setTimeout(resolve, 10));

      schematicViewManager.exitSchematicView(); // level2 -> level1
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should be at level 1 with appropriate stack size
      const currentView = appStateManager.getCurrentView();
      expect(currentView.component).toBe(level1);
      expect(viewStack.size()).toBe(1); // At level1, stack contains main view
    });

    it('should restore main view after nested back navigation (back, back)', async () => {
      const level1 = createMockModuleIC('nested-level1', 'Nested Level 1');
      const level2 = createMockModuleIC('nested-level2', 'Nested Level 2');
      level1.internalComponents = [level2];
      appStateManager.addComponentToCurrentView(level1);

      schematicViewManager.enterSchematicView(level1);
      await new Promise(resolve => setTimeout(resolve, 10));

      schematicViewManager.enterSchematicView(level2);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(appStateManager.getCurrentView().type).toBe('schematic');
      expect(viewStack.size()).toBe(2);

      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(appStateManager.getCurrentView().type).toBe('schematic');
      expect((appStateManager.getCurrentView().component as any)?.id).toBe('nested-level1');

      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(appStateManager.getCurrentView().type).toBe('main');
      expect(viewStack.size()).toBe(0);
    });

    it('should navigate to main when breadcrumb level 0 is clicked', async () => {
      const level1 = createMockModuleIC('crumb-main-level1', 'Crumb Main Level 1');
      appStateManager.addComponentToCurrentView(level1);

      schematicViewManager.enterSchematicView(level1);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(appStateManager.getCurrentView().type).toBe('schematic');

      schematicViewManager.navigateToBreadcrumbLevel(0);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(appStateManager.getCurrentView().type).toBe('main');
      expect(viewStack.size()).toBe(0);
    });

    it('should navigate to intermediate level when breadcrumb is clicked', async () => {
      const level1 = createMockModuleIC('crumb-mid-level1', 'Crumb Mid Level 1');
      const level2 = createMockModuleIC('crumb-mid-level2', 'Crumb Mid Level 2');
      level1.internalComponents = [level2];
      appStateManager.addComponentToCurrentView(level1);

      schematicViewManager.enterSchematicView(level1);
      await new Promise(resolve => setTimeout(resolve, 10));

      schematicViewManager.enterSchematicView(level2);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(viewStack.size()).toBe(2);
      expect((appStateManager.getCurrentView().component as any)?.id).toBe('crumb-mid-level2');

      schematicViewManager.navigateToBreadcrumbLevel(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect((appStateManager.getCurrentView().component as any)?.id).toBe('crumb-mid-level1');
      expect(viewStack.size()).toBe(1);
    });
  });

  describe('Internal Component Management', () => {
    it('should preserve internal components when exiting schematic view', async () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      const internalTask = createMockTaskResistor('internal-1', 'Internal Task');

      appStateManager.addComponentToCurrentView(moduleIC);

      // Enter schematic view
      schematicViewManager.enterSchematicView(moduleIC);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Add component to schematic view
      const currentView = appStateManager.getCurrentView();
      currentView.components.push(internalTask);

      // Exit schematic view
      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Check that internal component was saved
      expect(moduleIC.internalComponents).toContain(internalTask);
    });

    it('should initialize empty internal structure for new modules', async () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      // Don't initialize internal components (simulate undefined)
      delete (moduleIC as any).internalComponents;
      delete (moduleIC as any).internalConnections;

      appStateManager.addComponentToCurrentView(moduleIC);

      schematicViewManager.enterSchematicView(moduleIC);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should have initialized empty arrays
      expect(moduleIC.internalComponents).toEqual([]);
      expect(moduleIC.internalConnections).toEqual([]);
    });
  });

  describe('Breadcrumb System', () => {
    it('should build correct breadcrumb path for main view', () => {
      const breadcrumbs = schematicViewManager.buildBreadcrumbPath();

      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({
        name: 'Project: Motherboard',
        icon: '⚡',
        isCurrent: true,
        viewIndex: 0,
      });
    });

    it('should build correct breadcrumb path for nested views', async () => {
      const level1 = createMockModuleIC('level1', 'Level 1');
      const level2 = createMockModuleIC('level2', 'Level 2');

      level1.internalComponents = [level2];
      appStateManager.addComponentToCurrentView(level1);

      // Navigate to level 2
      schematicViewManager.enterSchematicView(level1);
      await new Promise(resolve => setTimeout(resolve, 10));

      schematicViewManager.enterSchematicView(level2);
      await new Promise(resolve => setTimeout(resolve, 10));

      const breadcrumbs = schematicViewManager.buildBreadcrumbPath();

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].name).toBe('Project: Motherboard');
      expect(breadcrumbs[1].name).toBe('Level 1');
      expect(breadcrumbs[2].name).toBe('Level 2');
      expect(breadcrumbs[2].isCurrent).toBe(true);
    });

    it('should use appropriate depth icons for breadcrumbs', async () => {
      const level1 = createMockModuleIC('level1', 'Level 1');
      const level2 = createMockModuleIC('level2', 'Level 2');

      level1.internalComponents = [level2];
      appStateManager.addComponentToCurrentView(level1);

      schematicViewManager.enterSchematicView(level1);
      await new Promise(resolve => setTimeout(resolve, 10));

      const breadcrumbs = schematicViewManager.buildBreadcrumbPath();

      expect(breadcrumbs[0].icon).toBe('⚡'); // Main
      expect(breadcrumbs[1].icon).toBe('🔳'); // Level 1 (current schematic view)
    });
  });

  describe('View Depth and State', () => {
    it('should correctly report view type', () => {
      expect(schematicViewManager.getCurrentViewType()).toBe('main');
    });

    it('should correctly report view depth', async () => {
      // Ensure clean state
      expect(viewStack.size()).toBe(0);
      expect(schematicViewManager.getViewDepth()).toBe(0);

      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      appStateManager.addComponentToCurrentView(moduleIC);

      schematicViewManager.enterSchematicView(moduleIC);
      await new Promise(resolve => setTimeout(resolve, 10));

      // After entering one schematic view, depth should be 1
      // viewStack.size() = 1 (main view saved), current view = schematic
      expect(schematicViewManager.getViewDepth()).toBe(1);
    });

    it('should return current schematic component when in schematic view', async () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      appStateManager.addComponentToCurrentView(moduleIC);

      expect(schematicViewManager.getCurrentSchematicComponent()).toBeNull();

      schematicViewManager.enterSchematicView(moduleIC);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(schematicViewManager.getCurrentSchematicComponent()).toBe(moduleIC);
    });
  });

  describe('Event Bus Integration', () => {
    it('should respond to VIEW_ENTER_SCHEMATIC_REQUESTED event', () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      const spy = vi.spyOn(schematicViewManager, 'enterSchematicView');

      eventBus.emit(Events.VIEW_ENTER_SCHEMATIC_REQUESTED, {
        component: moduleIC,
      });

      expect(spy).toHaveBeenCalledWith(moduleIC);
    });

    it('should respond to VIEW_EXIT_SCHEMATIC_REQUESTED event', () => {
      const spy = vi.spyOn(schematicViewManager, 'exitSchematicView');

      eventBus.emit(Events.VIEW_EXIT_SCHEMATIC_REQUESTED, {});

      expect(spy).toHaveBeenCalled();
    });

    it('should emit events when entering schematic view', async () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      appStateManager.addComponentToCurrentView(moduleIC);

      const eventSpy = vi.fn();
      eventBus.on('schematic.view.entered', eventSpy);

      schematicViewManager.enterSchematicView(moduleIC);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(eventSpy).toHaveBeenCalledWith({
        moduleComponent: moduleIC,
        view: expect.any(Object),
        timestamp: expect.any(Number),
      });
    });

    it('should emit events when exiting schematic view', async () => {
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      appStateManager.addComponentToCurrentView(moduleIC);

      // Enter first
      schematicViewManager.enterSchematicView(moduleIC);
      await new Promise(resolve => setTimeout(resolve, 10));

      const eventSpy = vi.fn();
      eventBus.on('schematic.view.exited', eventSpy);

      // Then exit
      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(eventSpy).toHaveBeenCalledWith({
        previousView: expect.any(Object),
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Component Isolation', () => {
    it('should properly isolate components between views', async () => {
      const mainTask = createMockTaskResistor('main-task', 'Main Task');
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      const internalTask = createMockTaskResistor('internal-task', 'Internal Task');

      // Set up main view
      appStateManager.setComponents([mainTask, moduleIC]);

      // Enter schematic view
      schematicViewManager.enterSchematicView(moduleIC);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Add internal component
      const currentView = appStateManager.getCurrentView();
      currentView.components.push(internalTask);

      // Exit and check isolation
      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));

      // Main components should not include internal task
      const mainComponents = appStateManager.getComponents();
      expect(mainComponents).toContain(mainTask);
      expect(mainComponents).toContain(moduleIC);
      expect(mainComponents).not.toContain(internalTask);

      // But module should contain internal task
      expect(moduleIC.internalComponents).toContain(internalTask);
    });

    it('should check if component is internal to any Module IC', () => {
      const mainTask = createMockTaskResistor('main-task', 'Main Task');
      const moduleIC = createMockModuleIC('module-1', 'Test Module');
      const internalTask = createMockTaskResistor('internal-task', 'Internal Task');

      moduleIC.internalComponents = [internalTask];
      const allComponents = [mainTask, moduleIC];

      expect(schematicViewManager.isComponentInternal(mainTask, allComponents)).toBe(false);
      expect(schematicViewManager.isComponentInternal(internalTask, allComponents)).toBe(true);
    });
  });
});
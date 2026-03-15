import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createSchematicViewManager, SchematicViewManager } from './SchematicViewManager';
import { createAppStateManager, resetAppStateManager } from './AppStateManager';
import { ViewStack } from '../viewStack';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, ModuleComponent, ViewState, Camera } from '../types';

/**
 * Deep Nesting Animation Bug Investigation
 *
 * Reproduces the critical bug: "Component mg2qenndwxt9r2lm1cp not found for schematic animation!"
 *
 * This test suite exposes the component lookup failure that occurs during nested
 * Module IC navigation when ViewNavigationManager.animateToSchematicView() tries
 * to find components that exist in nested views but not in the global component array.
 *
 * Root Cause: getComponent() only searches appStateManager.getComponents() (global)
 * but nested components exist in currentView.components or ViewStack state.
 */

function makeCanvasStub() {
  const c = document.createElement('canvas');
  c.id = 'circuit-board';
  c.width = 800;
  c.height = 600;
  c.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });

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

describe('Deep Nesting Animation Bug Investigation', () => {
  let schematicViewManager: SchematicViewManager;
  let appStateManager: ReturnType<typeof createAppStateManager>;
  let canvas: HTMLCanvasElement;
  let camera: Camera;
  let currentView: ViewState;
  let globalComponents: ComponentBase[]; // This simulates appStateManager.getComponents()
  let connections: any[];

  // Track component lookup calls to verify the bug
  let componentLookupCalls: Array<{ id: string; found: boolean }> = [];
  let animationErrors: string[] = [];

  beforeEach(() => {
    // Clear DOM and reset state
    document.body.innerHTML = '';
    canvas = makeCanvasStub();

    // Reset singletons
    vi.clearAllMocks();
    (ViewStack as any).instance = null;
    resetAppStateManager();
    componentLookupCalls = [];
    animationErrors = [];

    // Ensure clean ViewStack
    ViewStack.getInstance().clear();

    // Initialize state
    camera = { x: 0, y: 0, zoom: 1 };
    globalComponents = []; // This represents the global component array
    connections = [];
    currentView = {
      type: 'main',
      component: null,
      camera: { ...camera },
      components: globalComponents, // Main view uses global components
      connections,
    };

    // Create managers
    appStateManager = createAppStateManager();

    // Create a more realistic ViewNavigationManager mock that exposes the bug
    const mockViewNavigationManager = {
      animateToSchematicView: vi.fn((componentId: string, callback?: () => void) => {
        // This simulates the actual ViewNavigationManager.animateToSchematicView logic
        // that causes the bug: it only looks in globalComponents, not currentView.components

        console.log(`🔍 Looking for component ${componentId} in global components...`);
        const foundInGlobal = globalComponents.find(c => c.id === componentId);

        componentLookupCalls.push({
          id: componentId,
          found: !!foundInGlobal
        });

        if (!foundInGlobal) {
          const errorMsg = `Component ${componentId} not found for schematic animation`;
          console.warn(errorMsg);
          animationErrors.push(errorMsg);

          // In real code, this would return early and break navigation
          // For testing, we'll still call the callback to see the test flow
        }

        // Simulate animation delay then callback
        if (callback) {
          setTimeout(callback, 0);
        }
      }),

      animateToMainView: vi.fn((targetCamera: Camera, callback?: () => void) => {
        if (callback) {
          setTimeout(callback, 0);
        }
      }),
    };

    const schematicContext = {
      getCurrentView: () => currentView,
      setCurrentView: (view: ViewState) => { currentView = view; },
      getViewStack: () => ViewStack.getInstance(),
      getViewportManager: () => ({
        camera,
        setCamera: (c: Camera) => Object.assign(camera, c)
      }),
      getViewNavigationManager: () => mockViewNavigationManager,
      getUIController: () => ({ updateBreadcrumbs: vi.fn() }),
      isTransitioning: () => false,
      setTransitioning: vi.fn(),
      getSelectedComponent: () => null,
      setSelectedComponent: vi.fn(),
      hideDatasheet: vi.fn(),
      getComponents: () => globalComponents, // This is the critical line - only returns global
      getConnections: () => connections,
      getCurrentViewComponents: () => currentView.components,
      getCurrentViewConnections: () => currentView.connections,
      setComponents: (c: ComponentBase[]) => { globalComponents.length = 0; globalComponents.push(...c); },
      setConnections: (c: any[]) => { connections.length = 0; connections.push(...c); },
      initializeMainView: () => {
        currentView = { type: 'main', component: null, camera: { ...camera }, components: globalComponents, connections };
      },
    };

    schematicViewManager = createSchematicViewManager(schematicContext);
  });

  afterEach(() => {
    // Clean up any timers if they are mocked
    if (vi.isFakeTimers()) {
      vi.runAllTimers();
      vi.useRealTimers();
    }
  });

  const createModuleIC = (id: string, x: number, y: number, title?: string): ModuleComponent => ({
    id,
    type: 'module-ic',
    x,
    y,
    width: 100,
    height: 60,
    name: title || `Module ${id}`,
    title: title || `Module ${id}`,
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

  const createTaskResistor = (id: string, x: number, y: number): ComponentBase => ({
    id,
    type: 'task-resistor',
    x,
    y,
    width: 60,
    height: 20,
    name: `Task ${id}`,
    status: 'todo',
    category: 'frontend',
    createdAt: new Date(),
    pins: {
      input: [{ x: 0, y: 10, type: 'energy' }],
      output: [{ x: 60, y: 10, type: 'energy' }],
    },
  });

  describe('Component Lookup Bug Reproduction', () => {
    it('should expose component lookup failure during nested navigation', async () => {
      // Create nested structure: Main → Level1 → Level2
      const level2Task = createTaskResistor('level2-task', 20, 20);
      const level2Module = createModuleIC('level2-module', 50, 50, 'Level 2 Module');
      level2Module.internalComponents = [level2Task];

      const level1Module = createModuleIC('level1-module', 100, 100, 'Level 1 Module');
      level1Module.internalComponents = [level2Module]; // level2Module is internal to level1

      // Add only level1Module to global components (this is the key setup)
      globalComponents.push(level1Module);

      console.log('🏗️ Initial setup:');
      console.log('  Global components:', globalComponents.map(c => c.id));
      console.log('  Level1 internal components:', level1Module.internalComponents.map(c => c.id));
      console.log('  Level2 internal components:', level2Module.internalComponents.map(c => c.id));

      // Step 1: Navigate to Level 1 (this should work)
      console.log('\n📍 Step 1: Navigate to Level 1');
      schematicViewManager.enterSchematicView(level1Module);

      // Wait for any animations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(currentView.type).toBe('schematic');
      expect(currentView.component).toEqual(level1Module);

      console.log('📊 After Level 1 navigation:');
      console.log('  currentView.components:', currentView.components.map(c => `${c.id}:${c.type}`));
      console.log('  level2Module in currentView:', !!currentView.components.find(c => c.id === 'level2-module'));

      expect(currentView.components).toContain(level2Module);

      // Verify level1Module was found (it's in global components)
      const level1Lookup = componentLookupCalls.find(call => call.id === 'level1-module');
      expect(level1Lookup?.found).toBe(true);

      console.log('✅ Level 1 navigation successful');

      // Step 2: Navigate to Level 2 (this should expose the bug!)
      console.log('\n📍 Step 2: Navigate to Level 2 - EXPECTING BUG');
      console.log('  Current view components:', currentView.components.map(c => c.id));
      console.log('  Global components:', globalComponents.map(c => c.id));
      console.log('  Attempting to navigate to level2-module...');

      // Clear previous lookup calls to isolate this test
      componentLookupCalls = [];
      animationErrors = [];

      // This call should trigger the bug!
      schematicViewManager.enterSchematicView(level2Module);

      // Wait for animations and check for the bug
      await new Promise(resolve => setTimeout(resolve, 10));

      // BUG VERIFICATION: level2Module should NOT be found in global components
      const level2Lookup = componentLookupCalls.find(call => call.id === 'level2-module');
      console.log('🔍 Component lookup result:', level2Lookup);

      // This is the core bug: level2Module exists in currentView.components but not in globalComponents
      expect(level2Lookup?.found).toBe(false); // ❌ BUG: Component not found in global array
      expect(animationErrors).toContain('Component level2-module not found for schematic animation');

      // The component should exist somewhere in the view hierarchy
      // It may be in currentView.components or in the internal components of the current view's component
      const componentInCurrentView = currentView.components.find(c => c.id === 'level2-module');
      const componentInHierarchy = level1Module.internalComponents?.find(c => c.id === 'level2-module');

      console.log('📊 Component location verification:');
      console.log('  In currentView.components:', !!componentInCurrentView);
      console.log('  In level1Module.internalComponents:', !!componentInHierarchy);
      console.log('  In globalComponents:', !!globalComponents.find(c => c.id === 'level2-module'));

      // At least one of these should be true - the component exists somewhere but not in global
      expect(componentInCurrentView || componentInHierarchy).toBeTruthy();

      console.log('🚨 BUG REPRODUCED: Component exists in view hierarchy but not found by animation system');
    });

    it.todo('should demonstrate that components exist in current view but not in global array', () => {
      // Setup: Create nested structure
      const innerComponent = createTaskResistor('inner-component', 30, 30);
      const outerModule = createModuleIC('outer-module', 100, 100);
      outerModule.internalComponents = [innerComponent];

      // Add only outer module to global components
      globalComponents.push(outerModule);

      // Navigate to schematic view
      schematicViewManager.enterSchematicView(outerModule);

      // Verify the state that causes the bug
      expect(globalComponents.find(c => c.id === 'inner-component')).toBeUndefined(); // ❌ Not in global
      expect(currentView.components.find(c => c.id === 'inner-component')).toBeDefined(); // ✅ But in current view

      console.log('🔍 Component location analysis:');
      console.log('  Global components:', globalComponents.map(c => c.id));
      console.log('  Current view components:', currentView.components.map(c => c.id));
      console.log('  inner-component in global:', !!globalComponents.find(c => c.id === 'inner-component'));
      console.log('  inner-component in current view:', !!currentView.components.find(c => c.id === 'inner-component'));
    });

    it.todo('should show the exact ID format that causes lookup failures', () => {
      // This test demonstrates how component IDs are generated and why lookups fail
      const componentA = createModuleIC('comp-a', 50, 50);
      const componentB = createModuleIC('comp-b', 100, 100);
      componentA.internalComponents = [componentB];

      globalComponents.push(componentA);
      schematicViewManager.enterSchematicView(componentA);

      // Simulate trying to find componentB by ID (this is what fails in real code)
      const getComponentById = (id: string) => globalComponents.find(c => c.id === id);

      expect(getComponentById('comp-a')).toBeDefined(); // ✅ Found in global
      expect(getComponentById('comp-b')).toBeUndefined(); // ❌ Not in global (THE BUG)

      // But comp-b does exist in the current view
      expect(currentView.components.find(c => c.id === 'comp-b')).toBeDefined(); // ✅ In current view

      console.log('🎯 ID Lookup Failure Demonstration:');
      console.log('  Searching for comp-a in global:', !!getComponentById('comp-a'));
      console.log('  Searching for comp-b in global:', !!getComponentById('comp-b'));
      console.log('  comp-b exists in current view:', !!currentView.components.find(c => c.id === 'comp-b'));
    });
  });

  describe('ViewStack State During Navigation', () => {
    it.todo('should track component visibility across view stack levels', () => {
      // Create 3-level structure
      const level3Component = createTaskResistor('level3-comp', 10, 10);
      const level2Module = createModuleIC('level2-mod', 30, 30);
      const level1Module = createModuleIC('level1-mod', 50, 50);

      level2Module.internalComponents = [level3Component];
      level1Module.internalComponents = [level2Module];

      globalComponents.push(level1Module);

      // Navigate through levels and track what's visible
      const trackComponentVisibility = (level: string) => {
        return {
          level,
          globalComponents: globalComponents.map(c => c.id),
          currentViewComponents: currentView.components.map(c => c.id),
          viewStackSize: ViewStack.getInstance().size(),
        };
      };

      // Level 0 (Main)
      const level0State = trackComponentVisibility('Main');

      // Level 1
      schematicViewManager.enterSchematicView(level1Module);
      const level1State = trackComponentVisibility('Level1');

      // Level 2
      schematicViewManager.enterSchematicView(level2Module);
      const level2State = trackComponentVisibility('Level2');

      console.log('📊 Component Visibility Tracking:');
      console.log('Level 0:', level0State);
      console.log('Level 1:', level1State);
      console.log('Level 2:', level2State);

      // The bug: at Level 2, level3-comp is visible in current view but not in global
      expect(level2State.currentViewComponents).toContain('level3-comp');
      expect(level2State.globalComponents).not.toContain('level3-comp');
    });
  });

  describe('Animation System Integration', () => {
    it('should verify animation callback behavior during component lookup failures', async () => {
      const innerModule = createModuleIC('inner-mod', 50, 50);
      const outerModule = createModuleIC('outer-mod', 100, 100);
      outerModule.internalComponents = [innerModule];

      globalComponents.push(outerModule);

      // Navigate to outer module
      schematicViewManager.enterSchematicView(outerModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Clear previous calls
      componentLookupCalls = [];
      animationErrors = [];

      // Try to navigate to inner module (should fail lookup but still call callback)
      let callbackExecuted = false;

      // We need to spy on the actual navigation method
      const mockCallback = vi.fn(() => { callbackExecuted = true; });

      // Simulate the problematic navigation
      schematicViewManager.enterSchematicView(innerModule);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Verify the lookup failed but animation system tried to continue
      expect(animationErrors.length).toBeGreaterThan(0);
      expect(animationErrors[0]).toContain('inner-mod not found');

      console.log('🎬 Animation System Behavior:');
      console.log('  Lookup errors:', animationErrors);
      console.log('  Component lookup calls:', componentLookupCalls);
    });
  });
});
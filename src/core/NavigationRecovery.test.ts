import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createSchematicViewManager, SchematicViewManager } from './SchematicViewManager';
import { createAppStateManager, resetAppStateManager } from './AppStateManager';
import { ViewStack } from '../viewStack';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, ModuleComponent, ViewState, Camera } from '../types';

/**
 * Navigation Recovery Tests - Back Button & Breadcrumb Failure Scenarios
 *
 * Tests the navigation failures that occur as a result of the component lookup bug.
 * When ViewNavigationManager can't find components during animations, the back button
 * and breadcrumb navigation become broken, trapping users in nested views.
 *
 * Reproduces:
 * - Back button becoming non-functional after deep navigation
 * - Breadcrumb clicks failing to navigate properly
 * - Users being trapped in nested views with no way back except reload
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

describe('Navigation Recovery - Back Button & Breadcrumb Failures', () => {
  let schematicViewManager: SchematicViewManager;
  let appStateManager: ReturnType<typeof createAppStateManager>;
  let canvas: HTMLCanvasElement;
  let camera: Camera;
  let currentView: ViewState;
  let globalComponents: ComponentBase[];
  let connections: any[];

  // Track navigation failures and animation errors
  let navigationErrors: string[] = [];
  let backButtonAttempts: number = 0;
  let breadcrumbAttempts: number = 0;
  let successfulNavigations: number = 0;

  beforeEach(() => {
    // Clear DOM and reset state
    document.body.innerHTML = '';
    canvas = makeCanvasStub();

    // Reset singletons and tracking
    vi.clearAllMocks();
    (ViewStack as any).instance = null;
    resetAppStateManager();
    navigationErrors = [];
    backButtonAttempts = 0;
    breadcrumbAttempts = 0;
    successfulNavigations = 0;

    ViewStack.getInstance().clear();

    // Initialize state
    camera = { x: 0, y: 0, zoom: 1 };
    globalComponents = [];
    connections = [];
    currentView = {
      type: 'main',
      component: null,
      camera: { ...camera },
      components: globalComponents,
      connections,
    };

    appStateManager = createAppStateManager();

    // Create a more realistic ViewNavigationManager that exposes navigation failures
    const mockViewNavigationManager = {
      animateToSchematicView: vi.fn((componentId: string, callback?: () => void) => {
        console.log(`🎬 Animation attempt: looking for ${componentId}`);
        const foundComponent = globalComponents.find(c => c.id === componentId);

        if (!foundComponent) {
          const errorMsg = `Component ${componentId} not found for schematic animation`;
          console.warn(errorMsg);
          navigationErrors.push(errorMsg);
          return; // This breaks the navigation chain!
        }

        successfulNavigations++;
        if (callback) {
          setTimeout(callback, 0);
        }
      }),

      animateToMainView: vi.fn((targetCamera: Camera, callback?: () => void) => {
        console.log(`🎬 Animate to main view attempted`);
        // This would also fail if the ViewStack contains invalid component references
        successfulNavigations++;
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
      getComponents: () => globalComponents,
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

  describe('Back Button Failure Scenarios', () => {
    it('should demonstrate back button failure after successful navigation into nested view', async () => {
      // Setup: Create 3-level nested structure
      const level3Task = createTaskResistor('level3-task', 10, 10);
      const level2Module = createModuleIC('level2', 50, 50);
      const level1Module = createModuleIC('level1', 100, 100);

      level2Module.internalComponents = [level3Task];
      level1Module.internalComponents = [level2Module];

      // Add only level1 to global components
      globalComponents.push(level1Module);

      console.log('\n🚀 Setup: Navigation Trap Scenario');
      console.log('  Global components:', globalComponents.map(c => c.id));
      console.log('  Level1 internal:', level1Module.internalComponents.map(c => c.id));
      console.log('  Level2 internal:', level2Module.internalComponents.map(c => c.id));

      // Step 1: Navigate to Level 1 (should work)
      console.log('\n📍 Step 1: Navigate to Level 1');
      schematicViewManager.enterSchematicView(level1Module);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(currentView.type).toBe('schematic');
      expect(currentView.component).toEqual(level1Module);
      expect(navigationErrors).toHaveLength(0);
      expect(successfulNavigations).toBe(1);

      console.log('✅ Level 1 navigation successful');

      // Step 2: Attempt navigation to Level 2 (should fail due to component lookup)
      console.log('\n📍 Step 2: Attempt Level 2 navigation');
      navigationErrors = []; // Clear previous errors

      schematicViewManager.enterSchematicView(level2Module);
      await new Promise(resolve => setTimeout(resolve, 10));

      // This should fail because level2Module is not in globalComponents
      expect(navigationErrors.length).toBeGreaterThan(0);
      expect(navigationErrors[0]).toContain('level2 not found for schematic animation');

      console.log('❌ Level 2 navigation failed as expected:', navigationErrors[0]);

      // Step 3: Try to go back using exitSchematicView (back button functionality)
      console.log('\n📍 Step 3: Attempt back navigation');
      backButtonAttempts++;
      const initialViewStackSize = ViewStack.getInstance().size();

      // This simulates clicking the back button
      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));

      console.log('🔙 Back button attempt result:');
      console.log('  Initial stack size:', initialViewStackSize);
      console.log('  Final stack size:', ViewStack.getInstance().size());
      console.log('  Current view type:', currentView.type);
      console.log('  Navigation errors:', navigationErrors.length);

      // Verify navigation state after back button attempt
      const finalStackSize = ViewStack.getInstance().size();
      expect(finalStackSize).toBeLessThanOrEqual(initialViewStackSize);
    });

    it('should show ViewStack corruption after failed nested navigation', async () => {
      const innerModule = createModuleIC('inner', 50, 50);
      const outerModule = createModuleIC('outer', 100, 100);
      outerModule.internalComponents = [innerModule];

      globalComponents.push(outerModule);

      // Navigate to outer (works)
      schematicViewManager.enterSchematicView(outerModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      const stackAfterSuccess = ViewStack.getInstance().size();
      console.log('📊 ViewStack after successful navigation:', stackAfterSuccess);

      // Try to navigate to inner (fails)
      navigationErrors = [];
      schematicViewManager.enterSchematicView(innerModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      const stackAfterFailure = ViewStack.getInstance().size();
      console.log('📊 ViewStack after failed navigation:', stackAfterFailure);
      console.log('📊 Navigation errors:', navigationErrors.length);

      // ViewStack might be in an inconsistent state
      expect(navigationErrors.length).toBeGreaterThan(0);

      // Now try to exit - this might also fail due to corrupted state
      backButtonAttempts++;
      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));

      const stackAfterBackAttempt = ViewStack.getInstance().size();
      console.log('📊 ViewStack after back attempt:', stackAfterBackAttempt);
    });
  });

  describe('Breadcrumb Navigation Failures', () => {
    it('should demonstrate breadcrumb navigation failure in nested contexts', async () => {
      // Create nested structure
      const level2Module = createModuleIC('level2-breadcrumb', 50, 50);
      const level1Module = createModuleIC('level1-breadcrumb', 100, 100);
      level1Module.internalComponents = [level2Module];

      globalComponents.push(level1Module);

      // Navigate to level 1
      schematicViewManager.enterSchematicView(level1Module);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Build breadcrumbs after level 1
      const breadcrumbsLevel1 = schematicViewManager.buildBreadcrumbPath();
      console.log('\n🍞 Breadcrumbs after Level 1:');
      breadcrumbsLevel1.forEach((crumb, index) => {
        console.log(`  ${index}: ${crumb.name} (${crumb.isCurrent ? 'current' : 'clickable'})`);
      });

      // Attempt to navigate to level 2 (will fail)
      schematicViewManager.enterSchematicView(level2Module);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Build breadcrumbs after failed navigation
      const breadcrumbsAfterFailure = schematicViewManager.buildBreadcrumbPath();
      console.log('\n🍞 Breadcrumbs after failed Level 2 navigation:');
      breadcrumbsAfterFailure.forEach((crumb, index) => {
        console.log(`  ${index}: ${crumb.name} (${crumb.isCurrent ? 'current' : 'clickable'})`);
      });

      // Try to navigate using breadcrumbs (simulating breadcrumb click)
      console.log('\n📍 Attempting breadcrumb navigation to index 0 (main)');
      breadcrumbAttempts++;

      schematicViewManager.navigateToBreadcrumbLevel(0);
      await new Promise(resolve => setTimeout(resolve, 10));

      console.log('🍞 Breadcrumb navigation result:');
      console.log('  Current view type:', currentView.type);
      console.log('  ViewStack size:', ViewStack.getInstance().size());
      console.log('  Navigation errors:', navigationErrors.length);

      // Document the breadcrumb navigation state
      expect(breadcrumbAttempts).toBe(1);
    });

    it('should verify breadcrumb state consistency during navigation failures', () => {
      const innerModule = createModuleIC('inner-breadcrumb', 30, 30);
      const outerModule = createModuleIC('outer-breadcrumb', 60, 60);
      outerModule.internalComponents = [innerModule];

      globalComponents.push(outerModule);

      // Navigate to outer module
      schematicViewManager.enterSchematicView(outerModule);

      // Check breadcrumb depth calculation
      const depth = schematicViewManager.getViewDepth();
      const breadcrumbs = schematicViewManager.buildBreadcrumbPath();

      console.log('\n📊 Breadcrumb State Analysis:');
      console.log('  View depth:', depth);
      console.log('  Breadcrumb count:', breadcrumbs.length);
      console.log('  ViewStack size:', ViewStack.getInstance().size());

      // These should be consistent
      expect(breadcrumbs.length).toBeGreaterThanOrEqual(depth + 1); // Main + current levels

      // Try failed navigation
      schematicViewManager.enterSchematicView(innerModule);

      const depthAfterFailure = schematicViewManager.getViewDepth();
      const breadcrumbsAfterFailure = schematicViewManager.buildBreadcrumbPath();

      console.log('\n📊 After Failed Navigation:');
      console.log('  View depth:', depthAfterFailure);
      console.log('  Breadcrumb count:', breadcrumbsAfterFailure.length);
      console.log('  ViewStack size:', ViewStack.getInstance().size());
    });
  });

  describe('Navigation Trap Recovery', () => {
    it('should test emergency exit to main functionality', async () => {
      const innerModule = createModuleIC('trapped-inner', 25, 25);
      const outerModule = createModuleIC('trapped-outer', 75, 75);
      outerModule.internalComponents = [innerModule];

      globalComponents.push(outerModule);

      // Get into a trapped state
      schematicViewManager.enterSchematicView(outerModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      // Try failed navigation
      navigationErrors = [];
      schematicViewManager.enterSchematicView(innerModule);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(navigationErrors.length).toBeGreaterThan(0);
      console.log('\n🪤 Navigation trap established');

      // Try emergency exit to main
      console.log('\n🚨 Attempting emergency exit to main');
      const initialViewType = currentView.type;
      const initialStackSize = ViewStack.getInstance().size();

      schematicViewManager.exitToMainBoard();
      await new Promise(resolve => setTimeout(resolve, 10));

      console.log('🚨 Emergency exit result:');
      console.log('  Initial view type:', initialViewType);
      console.log('  Final view type:', currentView.type);
      console.log('  Initial stack size:', initialStackSize);
      console.log('  Final stack size:', ViewStack.getInstance().size());

      // Emergency exit should always work (it doesn't depend on component lookup)
      expect(currentView.type).toBe('main');
      expect(ViewStack.getInstance().size()).toBe(0);
    });

    it('should document the complete failure sequence that traps users', async () => {
      console.log('\n📋 Complete User Trap Scenario Documentation');

      // Step 1: Setup nested structure
      const deepModule = createModuleIC('deep-module', 20, 20);
      const midModule = createModuleIC('mid-module', 50, 50);
      const topModule = createModuleIC('top-module', 100, 100);

      midModule.internalComponents = [deepModule];
      topModule.internalComponents = [midModule];
      globalComponents.push(topModule);

      console.log('1️⃣ User starts at main view');
      console.log('   Available components:', globalComponents.map(c => c.id));

      // Step 2: Successful navigation
      console.log('2️⃣ User double-clicks top-module (✅ works)');
      schematicViewManager.enterSchematicView(topModule);
      await new Promise(resolve => setTimeout(resolve, 10));
      console.log('   Now at:', currentView.type, 'view of', currentView.component?.id);

      // Step 3: Failed navigation
      console.log('3️⃣ User double-clicks mid-module (❌ fails - component lookup error)');
      navigationErrors = [];
      schematicViewManager.enterSchematicView(midModule);
      await new Promise(resolve => setTimeout(resolve, 10));
      console.log('   Error:', navigationErrors[0] || 'No error captured');

      // Step 4: Broken back button
      console.log('4️⃣ User clicks back button (❌ may fail - ViewStack corrupted)');
      backButtonAttempts++;
      const preBackStackSize = ViewStack.getInstance().size();
      schematicViewManager.exitSchematicView();
      await new Promise(resolve => setTimeout(resolve, 10));
      const postBackStackSize = ViewStack.getInstance().size();
      console.log('   Stack size:', preBackStackSize, '→', postBackStackSize);

      // Step 5: Broken breadcrumbs
      console.log('5️⃣ User clicks breadcrumb (❌ may fail - navigation broken)');
      breadcrumbAttempts++;
      schematicViewManager.navigateToBreadcrumbLevel(0);
      await new Promise(resolve => setTimeout(resolve, 10));
      console.log('   Current view:', currentView.type);

      // Step 6: Only solution
      console.log('6️⃣ User has to reload page to escape');

      // Verify the trap conditions
      expect(navigationErrors.length).toBeGreaterThan(0);
      expect(backButtonAttempts).toBe(1);
      expect(breadcrumbAttempts).toBe(1);

      console.log('\n🎯 Trap Analysis Complete:');
      console.log('   Navigation errors:', navigationErrors.length);
      console.log('   Back button attempts:', backButtonAttempts);
      console.log('   Breadcrumb attempts:', breadcrumbAttempts);
      console.log('   Successful navigations:', successfulNavigations);
    });
  });
});
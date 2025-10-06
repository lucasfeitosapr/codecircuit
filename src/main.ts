/**
 * Refactored main.ts - Significantly simplified by extracting functionality to specialized modules
 * This version demonstrates much cleaner separation of concerns following the architectural rules
 */

import { ViewStack } from './viewStack';
import { eventBus } from './events/EventBus';
import { Events } from './events/eventTypes';

// Core managers
import {
  createViewportManager,
  getViewportManager,
  type ViewportManager,
} from './core/ViewportManager';
import { ExportImportManager } from './core/ExportImportManager';
import { ConnectionManager, createConnectionManager } from './core/ConnectionManager';
import {
  ComponentLifecycleManager,
  createComponentLifecycleManager,
} from './core/ComponentLifecycleManager';
import { InputEventCoordinator, createInputEventCoordinator } from './core/InputEventCoordinator';
import { ComponentRegistry, createComponentRegistry } from './components/ComponentRegistry';
import { UIController, createUIController } from './ui/UIController';
import { ViewNavigationManager } from './ui/ViewNavigationManager';

// New extracted managers
import { AppStateManager, createAppStateManager } from './core/AppStateManager';
import {
  KeyboardShortcutManager,
  createKeyboardShortcutManager,
} from './core/KeyboardShortcutManager';
import { NotificationManager, createNotificationManager } from './core/NotificationManager';
import { SchematicViewManager, createSchematicViewManager } from './core/SchematicViewManager';
import {
  ApplicationInitializer,
  createApplicationInitializer,
} from './core/ApplicationInitializer';

// Legacy imports (to be gradually reduced)
import { showDatasheet as showDatasheetUI, hideDatasheet as hideDatasheetUI } from './datasheet';
import { LegacyRenderer, type LegacyRendererContext } from './rendering/LegacyRenderer';
import { RenderScheduler } from './rendering/RenderScheduler';
import { PerformanceConfig } from './config/performanceConfig';
import './core/RealWorldMovementTest'; // Browser console testing utilities
import { createRoot } from 'react-dom/client';
import React from 'react';
import { MotherboardReactUI } from './ui/react/App';
// import { layeredRenderer } from './rendering/LayeredRenderer'; // Unused import
import RuntimeLayer from './rendering/layers/RuntimeLayer';
import UILayer from './rendering/layers/UILayer';
import { RenderProfiler } from './rendering/RenderProfiler';

// Types
import type {
  ViewState,
  Camera,
  ComponentBase,
  Connection,
  PinHit,
  ModuleComponent,
} from './types';

/**
 * MotherboardApp - Main application class (significantly refactored)
 *
 * This class now primarily serves as a coordinator between specialized managers
 * rather than containing business logic directly. Most functionality has been
 * extracted to dedicated modules following the architectural principles.
 */
export class MotherboardApp {
  // Core Managers
  private appStateManager!: AppStateManager;
  private viewportManager!: ViewportManager;
  private keyboardShortcutManager!: KeyboardShortcutManager;
  private notificationManager!: NotificationManager;
  private schematicViewManager!: SchematicViewManager;
  private applicationInitializer!: ApplicationInitializer;

  // Existing managers (already well-extracted)
  private exportImportManager!: ExportImportManager;
  private connectionManager!: ConnectionManager;
  private componentLifecycleManager!: ComponentLifecycleManager;
  private inputEventCoordinator!: InputEventCoordinator;
  private componentRegistry!: ComponentRegistry;
  private uiController!: UIController;
  private viewNavigationManager!: ViewNavigationManager;

  // Legacy runtime layers (to be gradually migrated to LayeredRenderer)
  private runtimeLayer!: RuntimeLayer;
  private uiLayer!: UILayer;

  // Performance optimization modules (Phase 2B)
  private renderScheduler!: RenderScheduler;

  // Configuration data
  private componentTypes!: Record<string, Partial<ComponentBase>>;
  private categories!: Record<string, { name: string; color: string }>;

  // Mouse position tracking for connection drawing
  public mousePos: { x: number; y: number } = { x: 0, y: 0 };

  // Convenience getters that delegate to managers
  get canvas(): HTMLCanvasElement {
    return this.viewportManager.canvas;
  }

  get ctx(): CanvasRenderingContext2D {
    return this.viewportManager.ctx;
  }

  get camera(): Camera {
    return this.viewportManager.camera;
  }

  // State accessors that delegate to AppStateManager
  get components(): ComponentBase[] {
    return this.appStateManager.getComponents();
  }

  get connections(): Connection[] {
    return this.appStateManager.getConnections();
  }

  get selectedComponent(): ComponentBase | null {
    return this.appStateManager.getSelectedComponent();
  }

  get currentView(): ViewState {
    return this.appStateManager.getCurrentView();
  }

  get isTransitioning(): boolean {
    return this.appStateManager.isInTransition();
  }

  constructor() {
    this.initializeManagers();
    this.setupConfiguration();
    this.initializeApplication();
  }

  private initializeManagers() {
    try {
      console.log('🚀 Starting application initialization...');

      // Initialize core managers first (order matters)
      this.appStateManager = createAppStateManager();
      this.notificationManager = createNotificationManager();

      // Initialize ViewportManager with proper error handling
      try {
        this.viewportManager = createViewportManager('circuit-board', eventBus);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes('ViewportManager instance already exists')
        ) {
          this.viewportManager = getViewportManager();
        } else {
          throw new Error(
            `Failed to initialize ViewportManager: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }

      // Initialize managers that don't have dependencies
      this.exportImportManager = new ExportImportManager();
      this.componentRegistry = createComponentRegistry(eventBus);

      // Initialize rendering layers (these will be configured later)
      this.runtimeLayer = new RuntimeLayer();
      this.uiLayer = new UILayer();

      console.log('✅ Core managers initialized');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      console.error('❌ Failed to initialize managers:', errorMessage);
      this.notificationManager?.error(`Initialization failed: ${errorMessage}`);
      throw error;
    }
  }

  private setupConfiguration() {
    // ComponentTypes now populated automatically by plugin registration
    this.componentTypes = {};

    this.categories = {
      frontend: { name: 'Frontend', color: '#00ff88' },
      backend: { name: 'Backend', color: '#4488ff' },
      database: { name: 'Database', color: '#ffaa00' },
      security: { name: 'Security', color: '#ff0088' },
      testing: { name: 'Testing', color: '#88ff00' },
      devops: { name: 'DevOps', color: '#ff8800' },
      design: { name: 'Design', color: '#aa44ff' },
      research: { name: 'Research', color: '#00aaff' },
    };
  }

  private initializeApplication() {
    try {
      console.log('⚙️ Initializing application components...');

      // Initialize dependent managers that need configuration
      this.connectionManager = createConnectionManager(eventBus, this.categories);

      this.componentLifecycleManager = createComponentLifecycleManager(
        eventBus,
        this.runtimeLayer,
        this.componentTypes,
        this.categories
      );

      // Initialize keyboard shortcut manager
      this.keyboardShortcutManager = createKeyboardShortcutManager({
        getSelectedComponent: () => this.appStateManager.getSelectedComponent(),
        setSelectedComponent: component => this.appStateManager.setSelectedComponent(component),
        getCurrentView: () => this.appStateManager.getCurrentView(),
        isTransitioning: () => this.appStateManager.isInTransition(),
        getViewStackSize: () => ViewStack.getInstance().size(),
        getMainComponents: () => this.appStateManager.getComponents(),
        toggleComponentStatus: component =>
          this.componentLifecycleManager.toggleComponentStatus(component),
        showTemporaryMessage: (message, duration) =>
          this.notificationManager.showTemporaryMessage(message, duration),
        exitSchematicView: () => this.schematicViewManager.exitSchematicView(),
        enterSchematicView: component =>
          this.schematicViewManager.enterSchematicView(component as ModuleComponent),
        cancelConnection: () => this.connectionManager.cancelConnection(),
        isConnecting: () => this.connectionManager.getConnectionState().isConnecting,
      });

      // Initialize schematic view manager
      this.schematicViewManager = createSchematicViewManager({
        getCurrentView: () => this.appStateManager.getCurrentView(),
        setCurrentView: view => this.appStateManager.setCurrentView(view),
        getViewStack: () => ViewStack.getInstance(),
        getViewportManager: () => this.viewportManager,
        getViewNavigationManager: () => this.viewNavigationManager,
        getUIController: () => this.uiController,
        isTransitioning: () => this.appStateManager.isInTransition(),
        setTransitioning: transitioning => this.appStateManager.setTransitioning(transitioning),
        getSelectedComponent: () => this.appStateManager.getSelectedComponent(),
        setSelectedComponent: component => this.appStateManager.setSelectedComponent(component),
        hideDatasheet: () => hideDatasheetUI(),
        getComponents: () => this.appStateManager.getComponents(),
        getConnections: () => this.appStateManager.getConnections(),
        setComponents: components => this.appStateManager.setComponents(components),
        setConnections: connections => this.appStateManager.setConnections(connections),
      });

      // Initialize InputEventCoordinator
      this.inputEventCoordinator = createInputEventCoordinator({
        canvas: this.viewportManager.canvas,
        viewportManager: this.viewportManager,
        getComponentAt: this.getComponentAt.bind(this),
        getPinAt: this.getPinAt.bind(this),
        getCurrentViewComponents: this.getCurrentViewComponents.bind(this),
        getCurrentViewConnections: this.getCurrentViewConnections.bind(this),
        addComponent: this.addComponent.bind(this),
        toggleComponentStatus: this.toggleComponentStatus.bind(this),
        showDatasheet: this.showDatasheet.bind(this),
        hideDatasheet: this.hideDatasheet.bind(this),
        showTemporaryMessage: (message, duration) =>
          this.notificationManager.showTemporaryMessage(message, duration),
        currentView: this.appStateManager.getCurrentView(),
        enterSchematicView: component => this.schematicViewManager.enterSchematicView(component),
        exitSchematicView: () => this.schematicViewManager.exitSchematicView(),
        viewStack: ViewStack.getInstance(),
        isTransitioning: this.appStateManager.isInTransition(),
        selectedComponent: this.appStateManager.getSelectedComponent(),
        setSelectedComponent: component => this.appStateManager.setSelectedComponent(component),
        connectionManager: this.connectionManager,
        updateConnectionModeUI: this.updateConnectionModeUI.bind(this),
        componentLifecycleManager: this.componentLifecycleManager,
        uiLayer: this.uiLayer,
        runtimeLayer: this.runtimeLayer,
        components: this.appStateManager.getComponents(),
        connections: this.appStateManager.getConnections(),
      });

      // Initialize ViewNavigationManager
      this.viewNavigationManager = new ViewNavigationManager({
        viewportManager: this.viewportManager,
        components: this.appStateManager.getComponents(),
        getCurrentView: () => this.schematicViewManager.getCurrentViewType(),
        getViewStack: () => {
          // TODO: This should come from schematicViewManager
          return [];
        },
        setCurrentView: (viewType: string) => {
          const currentView = this.appStateManager.getCurrentView();
          currentView.type = viewType as ViewState['type'];
          this.appStateManager.setCurrentView(currentView);
        },
        pushView: (view: string) => {
          // TODO: Delegate to schematicViewManager
        },
        popView: () => {
          // TODO: Delegate to schematicViewManager
        },
        requestAnimationFrame: (callback: (time: number) => void) =>
          requestAnimationFrame(callback),
        getComponent: (id: string) => {
          // Enhanced component lookup that searches across all possible component locations
          // to fix the deep nesting animation bug

          // 1. First try global components (main view navigation)
          const globalComponent = this.appStateManager.getComponents().find(c => c.id === id);
          if (globalComponent) {
            return globalComponent;
          }

          // 2. Try current view components (schematic view navigation)
          const currentView = this.appStateManager.getCurrentView();
          if (currentView.type === 'schematic' && currentView.components) {
            const currentViewComponent = currentView.components.find(c => c.id === id);
            if (currentViewComponent) {
              return currentViewComponent;
            }
          }

          // 3. Try internal components of current view's component (nested navigation)
          if (currentView.type === 'schematic' && currentView.component?.type === 'module-ic') {
            const moduleComponent = currentView.component as any; // ModuleComponent
            if (moduleComponent.internalComponents) {
              const internalComponent = moduleComponent.internalComponents.find((c: any) => c.id === id);
              if (internalComponent) {
                return internalComponent;
              }
            }
          }

          // 4. Try components in ViewStack (back navigation scenarios)
          const viewStack = ViewStack.getInstance();
          const stackViews = viewStack.serialize();
          for (const stackView of stackViews) {
            if (stackView.components) {
              const stackComponent = stackView.components.find((c: any) => c.id === id);
              if (stackComponent) {
                return stackComponent;
              }
            }
          }

          // 5. Deep search in all Module IC internal components (thorough fallback)
          const searchInModuleICs = (components: ComponentBase[]): ComponentBase | undefined => {
            for (const component of components) {
              if (component.type === 'module-ic') {
                const moduleIC = component as any; // ModuleComponent
                if (moduleIC.internalComponents) {
                  const found = moduleIC.internalComponents.find((c: any) => c.id === id);
                  if (found) {
                    return found;
                  }
                  // Recursive search in nested Module ICs
                  const deepFound = searchInModuleICs(moduleIC.internalComponents);
                  if (deepFound) {
                    return deepFound;
                  }
                }
              }
            }
            return undefined;
          };

          // Search in global components' internal structure
          const deepGlobalSearch = searchInModuleICs(this.appStateManager.getComponents());
          if (deepGlobalSearch) {
            return deepGlobalSearch;
          }

          // Search in current view components' internal structure
          if (currentView.components) {
            const deepCurrentViewSearch = searchInModuleICs(currentView.components);
            if (deepCurrentViewSearch) {
              return deepCurrentViewSearch;
            }
          }

          console.warn(`Component ${id} not found in any component location (global, current view, ViewStack, or nested)`);
          return undefined;
        },
      });

      // Initialize UIController
      this.uiController = createUIController({
        getCurrentView: () => this.appStateManager.getCurrentView(),
        getViewStack: () => ViewStack.getInstance(),
        getComponents: () => this.appStateManager.getComponents(),
        getConnections: () => this.appStateManager.getConnections(),
        getSelectedComponent: () => this.appStateManager.getSelectedComponent(),
        getCanvas: () => this.canvas,
        getCamera: () => this.viewportManager.camera,
        setComponents: components => this.appStateManager.setComponents(components),
        setConnections: connections => this.appStateManager.setConnections(connections),
        setSelectedComponent: component => this.appStateManager.setSelectedComponent(component),
        exitSchematicView: () => this.schematicViewManager.exitSchematicView(),
        hideDatasheet: () => this.hideDatasheet(),
        navigateToBreadcrumbLevel: level =>
          this.schematicViewManager.navigateToBreadcrumbLevel(level),
        handleKeyboardShortcut: () => {}, // Now handled by KeyboardShortcutManager
        addComponent: this.addComponent.bind(this),
        onMouseDown: this.onMouseDown.bind(this),
        onMouseMove: this.onMouseMove.bind(this),
        onMouseUp: this.onMouseUp.bind(this),
        onWheel: this.onWheel.bind(this),
  // setMousePos is not part of UIControllerContext; mouse position updates are handled via InputEventCoordinator
      });

      // Initialize ApplicationInitializer
      this.applicationInitializer = createApplicationInitializer({
        getComponents: () => this.appStateManager.getComponents(),
        getConnections: () => this.appStateManager.getConnections(),
        getCurrentView: () => this.appStateManager.getCurrentView(),
        getSelectedComponent: () => this.appStateManager.getSelectedComponent(),
        getCamera: () => this.viewportManager.camera,
        addComponent: this.addComponent.bind(this),
        createConnection: this.createConnection.bind(this),
        componentRegistry: this.componentRegistry,
        componentTypes: this.componentTypes,
        categories: this.categories,
        // Provide shared layer instances so LayeredRenderer reuses them
        runtimeLayer: this.runtimeLayer,
        uiLayer: this.uiLayer,
      });

      // Start the application
      this.start();

      console.log('✅ Application components initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown application initialization error';
      console.error('❌ Failed to initialize application:', errorMessage);
      this.notificationManager?.error(`Application initialization failed: ${errorMessage}`);
      throw error;
    }
  }

  private start() {
    // Initialize ViewportManager
    this.viewportManager.initialize();

    // Setup UI
    this.uiController.setupKeyboardShortcuts();
    this.uiController.setupImportHandler();
    this.uiController.setupUI();

    // Initialize main view
    this.initializeMainView();

    // Run application initialization
    this.applicationInitializer.initialize();

    // Phase 2B: Initialize RenderScheduler BEFORE setting up event handlers
    this.renderScheduler = new RenderScheduler(
      (timestamp: number) => {
        this.appStateManager.updateFPS(timestamp);
        this.render();
      },
      () =>
        this.runtimeLayer.hasActiveAnimations() ||
        this.hasActiveConnectionAnimations() ||
        RenderProfiler.isRecording()
    );

    // Setup event handlers (will now be able to call markDirty)
    this.setupEventHandlers();

    // Start smart rendering (initial render will happen)
    this.renderScheduler.start();
    
    console.log('🚀 MotherboardApp started successfully');
    console.log('⚡ Performance optimizations enabled - render on demand');
    
    // Force an initial render to show the board
    this.renderScheduler.markDirty();
    console.log('🎨 Initial render triggered');

    // Initialize React UI overlay
    this.initializeReactUI();
  }

  private setupEventHandlers() {
    this.setupExportImportEventHandlers();
    this.setupConnectionManagerEventHandlers();
    this.setupComponentDeletionEventHandlers();
    this.setupRenderSchedulerEventHandlers(); // Phase 2B: Mark dirty on changes
  }

  /**
   * Phase 2B: Setup event handlers for RenderScheduler
   * Mark dirty when things change to trigger re-render
   * 
   * Note: VIEWPORT_CAMERA_UPDATED fires on every mouse move during pan,
   * so the scheduler will render continuously during panning (expected behavior)
   */
  private setupRenderSchedulerEventHandlers() {
    // Component changes
  eventBus.on(Events.ComponentCreated, () => this.renderScheduler.markDirty());
  eventBus.on(Events.ComponentUpdated, () => this.renderScheduler.markDirty());
  eventBus.on(Events.ComponentDeleted, () => this.renderScheduler.markDirty());
  // No explicit constant for status changed/moved in Events; these are emitted via ComponentUpdated
    
    // High-frequency interaction updates (dragging, connection preview)
    // Ensure we render on every drag move so components visually follow the cursor
    eventBus.on(Events.COMPONENT_DRAG_UPDATED, () => this.renderScheduler.markDirty());
    // While drawing a connection preview, re-render on mouse move to update the rubber band line
    eventBus.on('connection.drawing', () => this.renderScheduler.markDirty());
    
    // Connection changes
  eventBus.on(Events.ConnectionCreated, () => this.renderScheduler.markDirty());
  eventBus.on(Events.ConnectionDeleted, () => this.renderScheduler.markDirty());
    
    // Camera/Viewport changes (fires on every mousemove during pan - this is expected!)
    eventBus.on(Events.VIEWPORT_CAMERA_UPDATED, () => this.renderScheduler.markDirty());
    eventBus.on(Events.VIEWPORT_ZOOM_REQUESTED, () => this.renderScheduler.markDirty());
    eventBus.on(Events.VIEWPORT_PAN_REQUESTED, () => this.renderScheduler.markDirty());
    
    // View changes
  // For view/selection changes, use existing events if defined; otherwise rely on ComponentUpdated triggering renders
    
    console.log('⚡ RenderScheduler event handlers configured - rendering on demand');
  }

  /**
   * Handle component deletion requests and cascade-delete related connections
   * Keeps AppStateManager and ConnectionManager in sync and updates Module IC internals when needed
   */
  private setupComponentDeletionEventHandlers(): void {
    eventBus.on(Events.COMPONENT_DELETE_REQUESTED, (payload: { componentId: string }) => {
      const componentId = payload.componentId;
      const currentView = this.appStateManager.getCurrentView();

      // Build list of connections to remove (view-aware)
      const connectionsToRemove = (currentView.type === 'main'
        ? this.appStateManager.getConnections()
        : currentView.connections
      ).filter(
        conn =>
          conn.from.component.id === componentId || conn.to.component.id === componentId
      );

      // Remove connections from both AppState and ConnectionManager
      for (const conn of connectionsToRemove) {
        this.appStateManager.removeConnectionFromCurrentView(conn.id);
        // Keep ConnectionManager's internal store in sync
        this.connectionManager.removeConnection(conn.id);
      }

      // Remove the component (view-aware)
      this.appStateManager.removeComponentFromCurrentView(componentId);

      // Clear selection and hide datasheet if it was the selected component
      const selected = this.appStateManager.getSelectedComponent();
      if (selected && selected.id === componentId) {
        this.appStateManager.setSelectedComponent(null);
        this.hideDatasheet();
      }

      // If we're inside a Module IC schematic, mirror current view arrays to the module internals
      if (currentView.type === 'schematic' && currentView.component?.type === 'module-ic') {
        const moduleComponent = currentView.component as ModuleComponent;
        moduleComponent.internalComponents = [...currentView.components];
        moduleComponent.internalConnections = [...currentView.connections];
      }
    });
  }

  private initializeMainView() {
    const mainView: ViewState = {
      type: 'main',
      component: null,
      camera: { x: 0, y: 0, zoom: 1 },
      components: [...this.appStateManager.getComponents()],
      connections: [...this.appStateManager.getConnections()],
    };

    this.appStateManager.setCurrentView(mainView);
    this.uiController.updateBreadcrumbs();
  }

  // Initialize React UI and mount into index.html
  private initializeReactUI() {
    const rootEl = document.getElementById('react-ui-root');
    if (!rootEl) {
      console.warn('React UI root element not found');
      return;
    }
    try {
  const root = createRoot(rootEl);
  root.render(React.createElement(MotherboardReactUI));
      console.log('⚛️ React UI initialized');
    } catch (e) {
      console.error('Failed to initialize React UI', e);
    }
  }

  // Delegated methods - these now primarily delegate to appropriate managers

  addComponent(type: string, x: number, y: number): ComponentBase | null {
    const component = this.componentLifecycleManager.createComponent(
      type,
      x,
      y,
      this.appStateManager.getCurrentView()
    );

    if (component) {
      this.appStateManager.addComponentToCurrentView(component);
      this.appStateManager.setSelectedComponent(component);
      this.showDatasheet(component);
    }

    return component;
  }

  getComponentAt(x: number, y: number): ComponentBase | null {
    return this.componentLifecycleManager.getComponentAt(
      x,
      y,
      this.appStateManager.getCurrentView()
    );
  }

  setMousePos(pos: { x: number; y: number }): void {
    this.mousePos = pos;
  }

  getPinAt(x: number, y: number): PinHit | null {
    return this.connectionManager.getPinAt(x, y, this.getCurrentViewComponents());
  }

  getCurrentViewComponents(): ComponentBase[] {
    const currentView = this.appStateManager.getCurrentView();
    if (currentView.type === 'main') {
      // Main view: return global components
      return this.appStateManager.getComponents();
    } else {
      // Schematic view: return view-specific components (module internal)
      return currentView.components;
    }
  }

  getCurrentViewConnections(): Connection[] {
    const currentView = this.appStateManager.getCurrentView();
    if (currentView.type === 'main') {
      return this.appStateManager.getConnections();
    } else {
      return this.connectionManager.getConnectionsForView(currentView);
    }
  }

  createConnection(startPin: PinHit, endPin: PinHit): Connection | null {
    const connection = this.connectionManager.createConnection(startPin, endPin);
    if (connection) {
      this.appStateManager.addConnectionToCurrentView(connection);

      // Emit the legacy ConnectionCreated event for backward compatibility
      eventBus.emit(Events.ConnectionCreated, {
        id: connection.id,
        from: connection.from,
        to: connection.to,
        type: connection.category,
        metadata: {},
        source: 'legacy',
      });
    }
    return connection;
  }

  toggleComponentStatus(component: ComponentBase): void {
    this.componentLifecycleManager.toggleComponentStatus(component);

    // Update datasheet if this is the selected component
    if (this.appStateManager.getSelectedComponent() === component) {
      this.showDatasheet(component);
    }
  }

  showDatasheet(component: ComponentBase): void {
    showDatasheetUI(this, component);
  }

  hideDatasheet(): void {
    hideDatasheetUI();
  }

  // Event handler methods
  onMouseDown(e: MouseEvent): void {
    this.inputEventCoordinator.handleMouseDown(e);
  }

  onMouseMove(e: MouseEvent): void {
    this.inputEventCoordinator.handleMouseMove(e);
  }

  onMouseUp(): void {
    this.inputEventCoordinator.handleMouseUp();
  }

  onWheel(e: WheelEvent): void {
    this.viewportManager.handleWheelEvent(e);
  }

  // Legacy rendering methods (delegated to LegacyRenderer)
  private getRendererContext(): LegacyRendererContext {
    return {
      ctx: this.ctx,
      canvas: this.canvas,
      camera: this.camera,
      categories: this.categories,
      selectedComponent: this.appStateManager.getSelectedComponent(),
      currentView: this.appStateManager.getCurrentView(),
      connectionManager: this.connectionManager,
      inputEventCoordinator: this.inputEventCoordinator,
      isTransitioning: this.appStateManager.isInTransition(),
      getCurrentViewComponents: () => this.getCurrentViewComponents(),
      getCurrentViewConnections: () => this.getCurrentViewConnections(),
    };
  }

  render(): void {
    LegacyRenderer.render(this.getRendererContext());
  }

  /**
   * Determine if there are any time-based connection animations that require continuous rendering.
   * Connections animate when the source component is in-progress or done (see rendererHelpers.drawDataFlow/drawActiveTrace).
   */
  private hasActiveConnectionAnimations(): boolean {
    try {
      const conns = this.getCurrentViewConnections();
      for (const conn of conns) {
        const fromStatus = conn?.from?.component?.status as any;
        if (fromStatus === 'in-progress' || fromStatus === 'done') return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  updateConnectionModeUI(): void {
    const indicator = document.getElementById('connection-mode');
    if (!indicator) return;
    const connectionState = this.connectionManager.getConnectionState();
    if (connectionState.isConnecting) {
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }

  // Phase 2B: Removed old animate() method - now using RenderScheduler
  // The RenderScheduler handles animation loop and only renders when needed

  // Project management methods (delegated to managers)
  exportProject(): void {
    eventBus.emit(Events.PROJECT_EXPORT_REQUESTED, {
      timestamp: Date.now(),
    });
  }

  exportProjectData(): any {
    // This will be handled by the ExportImportManager through events
    return {
      name: 'Motherboard Project',
      created: new Date().toISOString(),
      components: this.appStateManager.getComponents(),
      connections: this.appStateManager.getConnections(),
      version: '1.0.0',
    };
  }

  importProjectData(projectData: any): void {
    // Use data-based import event so no file dialog is triggered
    eventBus.emit(Events.PROJECT_DATA_IMPORT_REQUESTED, {
      projectData,
      timestamp: Date.now(),
    });
  }

  // Event handler setup methods (extracted)
  private setupExportImportEventHandlers(): void {
    // Handle requests for current project state
    eventBus.on(
      Events.PROJECT_STATE_REQUEST,
      (payload: { callback: (components: any[], connections: any[]) => void }) => {
        // Ensure current view state is saved to module internal structure before export
        const currentView = this.appStateManager.getCurrentView();
        if (currentView.type === 'schematic' && currentView.component) {
          currentView.component.internalComponents = [...currentView.components];
          currentView.component.internalConnections = [...currentView.connections];
        }

        payload.callback(
          this.appStateManager.getComponents(),
          this.appStateManager.getConnections()
        );
      }
    );

    // Handle project import completion
    eventBus.on(Events.PROJECT_IMPORTED, (payload: { components: any[]; connections: any[] }) => {
      this.appStateManager.setComponents(payload.components);
      this.appStateManager.setConnections(payload.connections);
      this.appStateManager.setSelectedComponent(null);
      this.initializeMainView();
      this.viewportManager.setCamera({ x: 0, y: 0, zoom: 1 });

      // Rebuild spatial index so imported components can be selected/moved
      this.componentLifecycleManager.rebuildSpatialIndex(payload.components);
    });

    // Handle import errors
    eventBus.on(Events.PROJECT_IMPORT_ERROR, (payload: { error: string }) => {
      this.notificationManager.error(`Import Error: ${payload.error}`);
    });

    // Handle export completion
    eventBus.on(
      Events.PROJECT_EXPORTED,
      (payload: { componentCount: number; connectionCount: number }) => {
        this.notificationManager.success(
          `Project exported: ${payload.componentCount} components, ${payload.connectionCount} connections`
        );
      }
    );
  }

  private setupConnectionManagerEventHandlers(): void {
    // Handle connection creation requests from UI
    eventBus.on(Events.CONNECTION_CREATE_REQUESTED, (payload: any) => {
      const pinHit = this.connectionManager.getPinAt(
        payload.x,
        payload.y,
        this.getCurrentViewComponents()
      );
      if (pinHit) {
        if (this.connectionManager.getConnectionState().isConnecting) {
          this.connectionManager.endConnection(pinHit);
        } else {
          this.connectionManager.startConnection(pinHit);
        }
      }
    });

    // Handle connection state changes for UI updates
    eventBus.on('connection.start', () => {
      this.updateConnectionModeUI();
    });

    eventBus.on('connection.cancelled', () => {
      this.updateConnectionModeUI();
      this.uiLayer.clearConnectionIntents();
    });

    // Handle successful connection creation
    eventBus.on(Events.ConnectionCreated, (payload: any) => {
      if (
        payload.connection &&
        !this.appStateManager.getConnections().find(c => c.id === payload.connection.id)
      ) {
        this.appStateManager.addConnectionToCurrentView(payload.connection);
      }

      // Add runtime effects for new connection
      const categoryColor = this.categories[payload.type ?? 'frontend']?.color || '#00ff88';
      this.runtimeLayer.energyFlow(
        payload.from.x,
        payload.from.y,
        payload.to.x,
        payload.to.y,
        categoryColor
      );

      this.updateConnectionModeUI();
    });
  }

  // Utility methods
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Legacy compatibility methods (deprecated but kept for backward compatibility)
  setupCanvas(): void {
    console.warn('setupCanvas() is deprecated. Canvas setup is now handled by ViewportManager.');
  }

  setupEventListeners(): void {
    console.warn(
      'setupEventListeners() is deprecated. Event listeners are handled by specialized managers.'
    );
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Apply persisted feature flags before app creation
  try {
    const raw = localStorage.getItem('mb_performance_flags');
    if (raw) {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          if (k in PerformanceConfig) (PerformanceConfig as any)[k] = !!v;
        }
      }
    }
  } catch {}

  const app = new MotherboardApp();

  // Phase 2B+: Enable EventBus batching for performance
  if (PerformanceConfig.ENABLE_EVENT_BATCHING) {
    eventBus.setBatching(true);
    console.log('🔄 EventBus batching enabled for high-frequency events');
  }

  // Make app globally accessible for debugging
  (window as any).app = app;
  // Initialize FX panel and bind toggles
  try {
    const panel = document.getElementById('fx-panel');
    const btn = document.getElementById('fx-btn');
    if (panel && btn) {
      btn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
      });

      // Sync initial checkbox states from PerformanceConfig
      const inputs = panel.querySelectorAll('input[type="checkbox"][data-flag]');
      inputs.forEach(input => {
        const key = (input as HTMLInputElement).dataset.flag as keyof typeof PerformanceConfig;
        if (key && key in PerformanceConfig) {
          (input as HTMLInputElement).checked = !!(PerformanceConfig as any)[key];
        }
        input.addEventListener('change', () => {
          const k = (input as HTMLInputElement).dataset.flag as string;
          const val = (input as HTMLInputElement).checked;
          if (k in PerformanceConfig) {
            (PerformanceConfig as any)[k] = val;
            // Persist a subset of flags
            try {
              const raw = localStorage.getItem('mb_performance_flags');
              const obj = raw ? JSON.parse(raw) : {};
              obj[k] = val;
              localStorage.setItem('mb_performance_flags', JSON.stringify(obj));
            } catch {}
            // Request a re-render so changes apply immediately
            (app as any).renderScheduler?.markDirty?.();
          }
        });
      });

      // Reset to defaults button (clears stored overrides and reapplies defaults)
      const resetBtn = document.getElementById('fx-reset');
      resetBtn?.addEventListener('click', () => {
        try {
          localStorage.removeItem('mb_performance_flags');
        } catch {}
        // Re-sync inputs from current PerformanceConfig (which reflects defaults when not overridden)
        inputs.forEach(input => {
          const key = (input as HTMLInputElement).dataset.flag as keyof typeof PerformanceConfig;
          if (key && key in PerformanceConfig) {
            (input as HTMLInputElement).checked = !!(PerformanceConfig as any)[key];
          }
        });
        // Trigger a render
        (app as any).renderScheduler?.markDirty?.();
      });
    }
  } catch {}
  // Invalidate optimized connection cache on relevant events
  import('./ui/rendererHelpers')
    .then(({ connectionRenderer }) => {
      eventBus.on(Events.ConnectionCreated, (payload: any) => {
        try { if (payload?.connection) connectionRenderer.invalidateConnection(payload.connection); } catch {}
      });
      eventBus.on(Events.ConnectionDeleted, (payload: any) => {
        try { if (payload?.connection) connectionRenderer.invalidateConnection(payload.connection); } catch {}
      });
      eventBus.on('connections.component_updated', (payload: any) => {
        try { if (payload?.componentId) connectionRenderer.markComponentMoved(payload.componentId); } catch {}
      });
    })
    .catch(() => {});
  // Expose profiling API for profiling.html integration
  (window as any).renderProfiler = RenderProfiler.publicAPI();

  // While profiling is active, keep the scheduler ticking so FPS updates
  try {
    const rp: any = (window as any).renderProfiler;
    if (rp && !rp.__wrappedForScheduler) {
      const originalStart = rp.startRecording?.bind(rp);
      const originalStop = rp.stopRecording?.bind(rp);

      let rafId: number | null = null;
      const tick = () => {
        // Mark dirty to force a render frame and profiler sample
        (app as any).renderScheduler?.markDirty?.();
        rafId = requestAnimationFrame(tick);
      };

      rp.startRecording = () => {
        originalStart?.();
        // Kick the scheduler once immediately
        (app as any).renderScheduler?.markDirty?.();
        if (rafId == null) rafId = requestAnimationFrame(tick);
      };

      rp.stopRecording = () => {
        const result = originalStop?.();
        if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        // One last render to flush final stats
        (app as any).renderScheduler?.markDirty?.();
        return result;
      };

      rp.__wrappedForScheduler = true;
    }
  } catch (e) {
    // non-fatal; profiling wrapper is best-effort
    console.warn('Profiler scheduler wrapper failed', e);
  }
});

export default MotherboardApp;

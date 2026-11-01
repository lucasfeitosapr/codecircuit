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
import { PartsTrayRenderer, createPartsTrayRenderer } from './ui/PartsTrayRenderer';
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
import { HistoryManager } from './core/HistoryManager';
import { AutoSaveManager } from './core/AutoSaveManager';
import { bootstrapDOM } from './core/DOMBootstrap';
import { wireEventHandlers } from './core/EventHandlerWiring';

// Legacy imports (to be gradually reduced)
import { showDatasheet as showDatasheetUI, hideDatasheet as hideDatasheetUI } from './datasheet';
import { LegacyRenderer, type LegacyRendererContext } from './rendering/LegacyRenderer';
import { RenderScheduler } from './rendering/RenderScheduler';
import { PerformanceConfig } from './config/FeatureFlagAdapter';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { MotherboardReactUI } from './ui/react/App';
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
  private partsTrayRenderer!: PartsTrayRenderer;
  private viewNavigationManager!: ViewNavigationManager;

  // Legacy runtime layers (to be gradually migrated to LayeredRenderer)
  private runtimeLayer!: RuntimeLayer;
  private uiLayer!: UILayer;

  // Performance optimization modules (Phase 2B)
  private renderScheduler!: RenderScheduler;

  // Undo/redo history
  private historyManager!: HistoryManager;

  // Auto-save persistence
  private autoSaveManager!: AutoSaveManager;

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
            `Failed to initialize ViewportManager: ${error instanceof Error ? error.message : 'Unknown error'
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
        getSelectedComponentIds: () => this.appStateManager.getSelectedComponentIds(),
        getCurrentView: () => this.appStateManager.getCurrentView(),
        getCurrentViewComponents: () => this.getCurrentViewComponents(),
        getCurrentViewConnections: () => this.getCurrentViewConnections(),
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
        addComponentToCurrentView: component => this.appStateManager.addComponentToCurrentView(component),
        addConnectionToCurrentView: connection => this.appStateManager.addConnectionToCurrentView(connection),
        pushHistorySnapshot: () => this.historyManager.pushSnapshot(),
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
        getCurrentViewComponents: () => this.appStateManager.getCurrentViewComponents(),
        getCurrentViewConnections: () => this.appStateManager.getCurrentViewConnections(),
        setComponents: components => this.appStateManager.setComponents(components),
        setConnections: connections => this.appStateManager.setConnections(connections),
        initializeMainView: () => this.appStateManager.initializeMainView(),
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
        getCurrentView: () => this.appStateManager.getCurrentView(),
        enterSchematicView: component => this.schematicViewManager.enterSchematicView(component),
        exitSchematicView: () => this.schematicViewManager.exitSchematicView(),
        viewStack: ViewStack.getInstance(),
        getIsTransitioning: () => this.appStateManager.isInTransition(),
        getSelectedComponent: () => this.appStateManager.getSelectedComponent(),
        setSelectedComponent: component => this.appStateManager.setSelectedComponent(component),
        addToSelection: component => this.appStateManager.addToSelection(component),
        removeFromSelection: componentId => this.appStateManager.removeFromSelection(componentId),
        clearSelection: () => this.appStateManager.clearSelection(),
        getSelectedComponentIds: () => this.appStateManager.getSelectedComponentIds(),
        isComponentSelected: componentId => this.appStateManager.isComponentSelected(componentId),
        connectionManager: this.connectionManager,
        updateConnectionModeUI: this.updateConnectionModeUI.bind(this),
        componentLifecycleManager: this.componentLifecycleManager,
        uiLayer: this.uiLayer,
        runtimeLayer: this.runtimeLayer,
        getComponents: () => this.appStateManager.getComponents(),
        getConnections: () => this.appStateManager.getConnections(),
      });

      // Initialize ViewNavigationManager
      this.viewNavigationManager = new ViewNavigationManager({
        viewportManager: this.viewportManager,
        components: this.appStateManager.getComponents(),
        getCurrentView: () => this.schematicViewManager.getCurrentViewType(),
        getViewStack: () => ViewStack.getInstance().serialize(),
        setCurrentView: (viewType: string) => {
          const currentView = this.appStateManager.getCurrentView();
          currentView.type = viewType as ViewState['type'];
          this.appStateManager.setCurrentView(currentView);
        },
        pushView: (view: string) => {
          const comp = this.appStateManager.findComponentDeep(view, ViewStack.getInstance());
          if (comp) {
            this.schematicViewManager.enterSchematicView(comp as ModuleComponent);
          }
        },
        popView: () => {
          this.schematicViewManager.exitSchematicView();
        },
        requestAnimationFrame: (callback: (time: number) => void) =>
          requestAnimationFrame(callback),
        getComponent: (id: string) => {
          const found = this.appStateManager.findComponentDeep(id, ViewStack.getInstance());
          if (!found) {
            console.warn(`Component ${id} not found in any location`);
          }
          return found;
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
        handleKeyboardShortcut: () => { }, // Now handled by KeyboardShortcutManager
        addComponent: this.addComponent.bind(this),
        onMouseDown: this.onMouseDown.bind(this),
        onMouseMove: this.onMouseMove.bind(this),
        onMouseUp: this.onMouseUp.bind(this),
        onWheel: this.onWheel.bind(this),
        // setMousePos is not part of UIControllerContext; mouse position updates are handled via InputEventCoordinator
      });

      // Initialize PartsTrayRenderer (Phase 4 - Dynamic Parts Tray)
      this.partsTrayRenderer = createPartsTrayRenderer({
        containerSelector: '#parts-tray-components',
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

    // Initialize AutoSaveManager BEFORE setupEventHandlers so ctx.autoSaveManager
    // is defined when wireAutoSave() runs inside wireEventHandlers().
    this.autoSaveManager = new AutoSaveManager();

    // Initialize undo/redo history manager
    this.historyManager = new HistoryManager(
      () => ({
        components: this.getCurrentViewComponents(),
        connections: this.getCurrentViewConnections(),
      }),
      snapshot => {
        const currentView = this.appStateManager.getCurrentView();
        if (currentView.type === 'main') {
          this.appStateManager.setComponents(snapshot.components, false);
          this.appStateManager.setConnections(snapshot.connections);
          this.initializeMainView();
        } else {
          // Schematic view: restore to current view's component internals
          currentView.components = [...snapshot.components];
          currentView.connections = [...snapshot.connections];
          this.appStateManager.setCurrentView(currentView);
        }
        this.appStateManager.setSelectedComponent(null);
        this.hideDatasheet();
        this.componentLifecycleManager.rebuildSpatialIndex(snapshot.components);
      }
    );

    // Setup event handlers (will now be able to call markDirty)
    this.setupEventHandlers();

    // Auto-save/load: restore persisted state or start fresh
    this.initializeAutoSave();

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

  /**
   * Phase 4: Wire event handlers via managers' wireAppHandlers methods.
   * Each manager owns its own event wiring; main.ts just provides the hooks.
   */
  private setupEventHandlers() {
    // Phase 3 (CC-12): Event handler wiring extracted to EventHandlerWiring module
    wireEventHandlers(this.buildAppContext());
  }

  /**
   * Build AppContext from current manager instances for event wiring.
   */
  private buildAppContext() {
    return {
      appStateManager: this.appStateManager,
      viewportManager: this.viewportManager,
      notificationManager: this.notificationManager,
      connectionManager: this.connectionManager,
      componentLifecycleManager: this.componentLifecycleManager,
      schematicViewManager: this.schematicViewManager,
      keyboardShortcutManager: this.keyboardShortcutManager,
      historyManager: this.historyManager,
      inputEventCoordinator: this.inputEventCoordinator,
      exportImportManager: this.exportImportManager,
      applicationInitializer: this.applicationInitializer,
      autoSaveManager: this.autoSaveManager,
      componentRegistry: this.componentRegistry,
      uiController: this.uiController,
      partsTrayRenderer: this.partsTrayRenderer,
      viewNavigationManager: this.viewNavigationManager,
      renderScheduler: this.renderScheduler,
      runtimeLayer: this.runtimeLayer,
      uiLayer: this.uiLayer,
      componentTypes: this.componentTypes,
      categories: this.categories,
      viewStack: ViewStack.getInstance(),
    };
  }

  /**
   * Initialize auto-save: attempt to restore persisted state, then wire
   * event listeners so every future mutation is saved to localStorage.
   */
  private initializeAutoSave() {
    const saved = this.autoSaveManager.loadSavedState();

    if (saved) {
      try {
        // Disable auto-save during restore to avoid redundant write-back
        this.autoSaveManager.setEnabled(false);

        this.exportImportManager.importProjectData(saved);

        this.autoSaveManager.setEnabled(true);
        this.notificationManager.showTemporaryMessage(
          `Board restored (${saved.components.length} components)`,
          2000
        );
        console.log('💾 AutoSave: state restored successfully');
      } catch (e) {
        this.autoSaveManager.setEnabled(true);
        console.warn('⚠️ AutoSave: failed to restore state, starting fresh', e);
      }
    }

    // Auto-save wiring now handled by EventHandlerWiring module
  }

  private initializeMainView() {
    this.appStateManager.initializeMainView();
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
    this.historyManager.pushSnapshot();
    const component = this.componentLifecycleManager.createComponent(
      type,
      x,
      y,
      this.appStateManager.getCurrentView()
    );

    if (component) {
      // Note: createComponent() already pushes into currentView.components and emits
      // ComponentCreated. Do NOT call addComponentToCurrentView here — that would
      // double-push the same component.
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
    return this.appStateManager.getCurrentViewComponents();
  }

  getCurrentViewConnections(): Connection[] {
    return this.appStateManager.getCurrentViewConnections();
  }

  createConnection(startPin: PinHit, endPin: PinHit): Connection | null {
    this.historyManager.pushSnapshot();
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
    this.historyManager.pushSnapshot();
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

  // Phase 4: Event handler setup methods moved to their respective managers via wireAppHandlers().

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
  } catch {
    // Ignore localStorage errors
  }

  const app = new MotherboardApp();

  // Phase 2B+: Enable EventBus batching for performance
  if (PerformanceConfig.ENABLE_EVENT_BATCHING) {
    eventBus.setBatching(true);
    console.log('🔄 EventBus batching enabled for high-frequency events');
  }

  // Make app globally accessible for debugging
  (window as any).app = app;

  // Phase 3 (CC-15): Bootstrap DOM-dependent features
  // Skip in test environments to avoid EventBus listener overhead in performance tests
  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
    bootstrapDOM({
      renderScheduler: (app as any).renderScheduler,
    });
  }
});

export default MotherboardApp;

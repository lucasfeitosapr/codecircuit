/**
 * Refactored main.ts - Significantly simplified by extracting functionality to specialized modules
 * This version demonstrates much cleaner separation of concerns following the architectural rules
 */

import { ViewStack } from './viewStack';
import { eventBus } from './events/EventBus';
import { Events } from './events/eventTypes';

// Core managers
import { createViewportManager, getViewportManager, type ViewportManager } from './core/ViewportManager';
import { ExportImportManager } from './core/ExportImportManager';
import { ConnectionManager, createConnectionManager } from './core/ConnectionManager';
import { ComponentLifecycleManager, createComponentLifecycleManager } from './core/ComponentLifecycleManager';
import { InputEventCoordinator, createInputEventCoordinator } from './core/InputEventCoordinator';
import { ComponentRegistry, createComponentRegistry } from './components/ComponentRegistry';
import { UIController, createUIController } from './ui/UIController';
import { ViewNavigationManager } from './ui/ViewNavigationManager';

// New extracted managers
import { AppStateManager, createAppStateManager } from './core/AppStateManager';
import { KeyboardShortcutManager, createKeyboardShortcutManager } from './core/KeyboardShortcutManager';
import { NotificationManager, createNotificationManager } from './core/NotificationManager';
import { SchematicViewManager, createSchematicViewManager } from './core/SchematicViewManager';
import { ApplicationInitializer, createApplicationInitializer } from './core/ApplicationInitializer';

// Legacy imports (to be gradually reduced)
import { setupInputListeners } from './inputHandler';
import { showDatasheet as showDatasheetUI, hideDatasheet as hideDatasheetUI } from './datasheet';
import { LegacyRenderer, type LegacyRendererContext } from './rendering/LegacyRenderer';
import { layeredRenderer } from './rendering/LayeredRenderer';
import RuntimeLayer from './rendering/layers/RuntimeLayer';
import UILayer from './rendering/layers/UILayer';

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

  // Configuration data
  private componentTypes!: Record<string, Partial<ComponentBase>>;
  private categories!: Record<string, { name: string; color: string }>;

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
    // Initialize core managers
    this.appStateManager = createAppStateManager();
    this.notificationManager = createNotificationManager();

    // Initialize ViewportManager
    try {
      this.viewportManager = createViewportManager('circuit-board', eventBus);
    } catch (error) {
      if (error instanceof Error && error.message.includes('ViewportManager instance already exists')) {
        this.viewportManager = getViewportManager();
      } else {
        throw error;
      }
    }

    // Initialize existing managers
    this.exportImportManager = new ExportImportManager();
    this.componentRegistry = createComponentRegistry(eventBus);
    
    // These will be initialized after configuration is set up
    this.runtimeLayer = new RuntimeLayer();
    this.uiLayer = new UILayer();
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
      setSelectedComponent: (component) => this.appStateManager.setSelectedComponent(component),
      getCurrentView: () => this.appStateManager.getCurrentView(),
      isTransitioning: () => this.appStateManager.isInTransition(),
      getViewStackSize: () => new ViewStack().size(), // TODO: Get from schematicViewManager
      getMainComponents: () => this.appStateManager.getComponents(),
      toggleComponentStatus: (component) => this.componentLifecycleManager.toggleComponentStatus(component),
      showTemporaryMessage: (message, duration) => this.notificationManager.showTemporaryMessage(message, duration),
      exitSchematicView: () => this.schematicViewManager.exitSchematicView(),
      enterSchematicView: (component) => this.schematicViewManager.enterSchematicView(component as ModuleComponent),
      cancelConnection: () => this.connectionManager.cancelConnection(),
      isConnecting: () => this.connectionManager.getConnectionState().isConnecting,
    });

    // Initialize schematic view manager
    this.schematicViewManager = createSchematicViewManager({
      getCurrentView: () => this.appStateManager.getCurrentView(),
      setCurrentView: (view) => this.appStateManager.setCurrentView(view),
      getViewStack: () => new ViewStack(), // TODO: Make this a shared instance
      getViewportManager: () => this.viewportManager,
      getViewNavigationManager: () => this.viewNavigationManager,
      getUIController: () => this.uiController,
      isTransitioning: () => this.appStateManager.isInTransition(),
      setTransitioning: (transitioning) => this.appStateManager.setTransitioning(transitioning),
      getSelectedComponent: () => this.appStateManager.getSelectedComponent(),
      setSelectedComponent: (component) => this.appStateManager.setSelectedComponent(component),
      hideDatasheet: () => hideDatasheetUI(),
      getComponents: () => this.appStateManager.getComponents(),
      getConnections: () => this.appStateManager.getConnections(),
      setComponents: (components) => this.appStateManager.setComponents(components),
      setConnections: (connections) => this.appStateManager.setConnections(connections),
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
      showTemporaryMessage: (message, duration) => this.notificationManager.showTemporaryMessage(message, duration),
      currentView: this.appStateManager.getCurrentView(),
      enterSchematicView: (component) => this.schematicViewManager.enterSchematicView(component),
      exitSchematicView: () => this.schematicViewManager.exitSchematicView(),
      viewStack: new ViewStack(), // TODO: Make this shared
      isTransitioning: this.appStateManager.isInTransition(),
      selectedComponent: this.appStateManager.getSelectedComponent(),
      setSelectedComponent: (component) => this.appStateManager.setSelectedComponent(component),
      connectionManager: this.connectionManager,
      updateConnectionModeUI: this.updateConnectionModeUI.bind(this),
      componentLifecycleManager: this.componentLifecycleManager,
      uiLayer: this.uiLayer,
      runtimeLayer: this.runtimeLayer,
      components: this.appStateManager.getComponents(),
      connections: this.appStateManager.getConnections()
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
      setCurrentView: (view: string) => {
        const currentView = this.appStateManager.getCurrentView();
        currentView.type = view as ViewState['type'];
        this.appStateManager.setCurrentView(currentView);
      },
      pushView: (view: string) => {
        // TODO: Delegate to schematicViewManager
      },
      popView: () => {
        // TODO: Delegate to schematicViewManager
      },
      requestAnimationFrame: (callback: FrameRequestCallback) => requestAnimationFrame(callback),
      getComponent: (id: string) => this.appStateManager.getComponents().find(c => c.id === id)
    });

    // Initialize UIController
    this.uiController = createUIController({
      getCurrentView: () => this.appStateManager.getCurrentView(),
      getViewStack: () => new ViewStack(), // TODO: Make this shared
      getComponents: () => this.appStateManager.getComponents(),
      getConnections: () => this.appStateManager.getConnections(),
      getSelectedComponent: () => this.appStateManager.getSelectedComponent(),
      setComponents: (components) => this.appStateManager.setComponents(components),
      setConnections: (connections) => this.appStateManager.setConnections(connections),
      setSelectedComponent: (component) => this.appStateManager.setSelectedComponent(component),
      exitSchematicView: () => this.schematicViewManager.exitSchematicView(),
      hideDatasheet: () => this.hideDatasheet(),
      navigateToBreadcrumbLevel: (level) => this.schematicViewManager.navigateToBreadcrumbLevel(level),
      handleKeyboardShortcut: () => {}, // Now handled by KeyboardShortcutManager
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
  }

  private start() {
    // Initialize ViewportManager
    this.viewportManager.initialize();
    
    // Setup input listeners
    setupInputListeners(this);
    
    // Setup UI
    this.uiController.setupKeyboardShortcuts();
    this.uiController.setupImportHandler();
    this.uiController.setupUI();
    
    // Initialize main view
    this.initializeMainView();
    
    // Run application initialization
    this.applicationInitializer.initialize();
    
    // Setup event handlers
    this.setupEventHandlers();
    
    // Start animation loop
    this.animate();

    console.log('🚀 MotherboardApp started successfully');
  }

  private setupEventHandlers() {
    this.setupExportImportEventHandlers();
    this.setupConnectionManagerEventHandlers();
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

  // Delegated methods - these now primarily delegate to appropriate managers
  
  addComponent(type: string, x: number, y: number): ComponentBase | null {
    const component = this.componentLifecycleManager.createComponent(type, x, y, this.appStateManager.getCurrentView());
    
    if (component) {
      this.appStateManager.addComponent(component);
      this.appStateManager.setSelectedComponent(component);
      this.showDatasheet(component);
    }
    
    return component;
  }

  getComponentAt(x: number, y: number): ComponentBase | null {
    return this.componentLifecycleManager.getComponentAt(x, y, this.appStateManager.getCurrentView());
  }

  getPinAt(x: number, y: number): PinHit | null {
    return this.connectionManager.getPinAt(x, y, this.getCurrentViewComponents());
  }

  getCurrentViewComponents(): ComponentBase[] {
    return this.appStateManager.getCurrentView().components;
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
      this.appStateManager.addConnection(connection);
      
      // Emit the legacy ConnectionCreated event for backward compatibility
      eventBus.emit(Events.ConnectionCreated, { 
        id: connection.id, 
        from: connection.from, 
        to: connection.to, 
        type: connection.category, 
        metadata: {}, 
        source: 'legacy' 
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
      getCurrentViewConnections: () => this.getCurrentViewConnections()
    };
  }

  render(): void {
    LegacyRenderer.render(this.getRendererContext());
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

  animate(currentTime?: number): void {
    this.appStateManager.updateFPS(currentTime || performance.now());
    this.render();
    requestAnimationFrame(this.animate.bind(this));
  }

  // Project management methods (delegated to managers)
  exportProject(): void {
    eventBus.emit(Events.PROJECT_EXPORT_REQUESTED, {
      timestamp: Date.now()
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
    eventBus.emit(Events.PROJECT_IMPORT_REQUESTED, {
      projectData,
      timestamp: Date.now()
    });
  }

  // Event handler setup methods (extracted)
  private setupExportImportEventHandlers(): void {
    // Handle requests for current project state
    eventBus.on(Events.PROJECT_STATE_REQUEST, (payload: { callback: (components: any[], connections: any[]) => void }) => {
      payload.callback(this.appStateManager.getComponents(), this.appStateManager.getConnections());
    });

    // Handle project import completion
    eventBus.on(Events.PROJECT_IMPORTED, (payload: { components: any[], connections: any[] }) => {
      this.appStateManager.setComponents(payload.components);
      this.appStateManager.setConnections(payload.connections);
      this.appStateManager.setSelectedComponent(null);
      this.initializeMainView();
      this.viewportManager.setCamera({ x: 0, y: 0, zoom: 1 });
    });

    // Handle import errors
    eventBus.on(Events.PROJECT_IMPORT_ERROR, (payload: { error: string }) => {
      this.notificationManager.error(`Import Error: ${payload.error}`);
    });

    // Handle export completion
    eventBus.on(Events.PROJECT_EXPORTED, (payload: { componentCount: number, connectionCount: number }) => {
      this.notificationManager.success(`Project exported: ${payload.componentCount} components, ${payload.connectionCount} connections`);
    });
  }

  private setupConnectionManagerEventHandlers(): void {
    // Handle connection creation requests from UI
    eventBus.on(Events.CONNECTION_CREATE_REQUESTED, (payload: any) => {
      const pinHit = this.connectionManager.getPinAt(payload.x, payload.y, this.getCurrentViewComponents());
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
      if (payload.connection && !this.appStateManager.getConnections().find(c => c.id === payload.connection.id)) {
        this.appStateManager.addConnection(payload.connection);
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
    console.warn('setupEventListeners() is deprecated. Event listeners are handled by specialized managers.');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new MotherboardApp();
  // Make app globally accessible for debugging
  (window as any).app = app;
});

export default MotherboardApp;
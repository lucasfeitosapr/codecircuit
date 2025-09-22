import { ViewStack } from './viewStack';
import { eventBus } from './events/EventBus';
import { Events } from './events/eventTypes';
import { stateManager } from './state/StateManager';
import { ExportImportManager } from './core/ExportImportManager';
import { createViewportManager, getViewportManager, type ViewportManager } from './core/ViewportManager';
import { ConnectionManager, createConnectionManager } from './core/ConnectionManager';
import { ComponentLifecycleManager, createComponentLifecycleManager } from './core/ComponentLifecycleManager';
import { InputEventCoordinator, createInputEventCoordinator } from './core/InputEventCoordinator';
import { hexToRgb as _hexToRgb, getPointOnPath as _getPointOnPath } from './utils';
import * as rendererHelpers from './ui/rendererHelpers';
import * as cameraTransitions from './ui/cameraTransitions';
import {
  drawGrid as rendererDrawGrid,
  drawSchematicBackground as rendererDrawSchematicBackground,
  drawOrthogonalTrace as rendererDrawOrthogonalTrace,
} from './renderer';
import { setupInputListeners } from './inputHandler';
import { showDatasheet as showDatasheetUI, hideDatasheet as hideDatasheetUI } from './datasheet';
import { layeredRenderer } from './rendering/LayeredRenderer';
import { renderComponent } from './rendering/ImplementationHelpers';
import { renderComponentWrapper } from './ui/componentRenderer';
import { isNewRendererEnabled } from './config/featureFlags';
import { componentSystem } from './components/ComponentSystem';
import { DecisionPointPlugin } from './components/plugins/DecisionPointPlugin';
import BackgroundLayer from './rendering/layers/BackgroundLayer';
import ImplementationLayer from './rendering/layers/ImplementationLayer';
import ConnectionsLayer from './rendering/layers/ConnectionsLayer';
import RuntimeLayer from './rendering/layers/RuntimeLayer';
import UILayer from './rendering/layers/UILayer';
import { ProjectSerializer } from './utils/ProjectSerializer';
import { LegacyRenderer, type LegacyRendererContext } from './rendering/LegacyRenderer';

// Import V2 plugins for event-driven architecture  
import { DecisionPointPluginV2 } from './components/plugins/DecisionPointPluginV2';
import { PowerCorePluginV2 } from './components/plugins/PowerCorePluginV2';
import { ModuleICPluginV2 } from './components/plugins/ModuleICPluginV2'; 
import { TaskResistorPluginV2 } from './components/plugins/TaskResistorPluginV2';
import { ComponentRegistry, createComponentRegistry } from './components/ComponentRegistry';
import type {
  ViewState,
  Camera,
  ComponentBase,
  Connection,
  PinHit,
  ModuleComponent,
} from './types';

/* src/main.ts
   Migrated from main.js - minimal TypeScript annotations to start the refactor.
   Further modularization and stricter typing will follow in subsequent steps.
*/

export class MotherboardApp {
  // Viewport management (extracted to ViewportManager)
  viewportManager: ViewportManager;
  
  // Application state
  components: ComponentBase[];
  connections: Connection[];
  selectedComponent: ComponentBase | null;
  lastTime: number;
  fps: number;
  // Input state now managed by InputEventCoordinator
  // isDragging: boolean;
  // dragOffset: { x: number; y: number };
  // isPanning: boolean;
  // panStart: { x: number; y: number };
  // mousePos: { x: number; y: number };
  // Connection state now managed by ConnectionManager
  // isConnecting: boolean;
  // connectionStart: PinHit | null;
  viewStack: ViewStack;
  currentView: ViewState;
  isTransitioning: boolean;
  componentTypes: Record<string, Partial<ComponentBase>>;
  categories: Record<string, { name: string; color: string }>;
  runtimeLayer: RuntimeLayer;
  uiLayer: UILayer;
  exportImportManager: ExportImportManager;
  connectionManager: ConnectionManager;
  componentLifecycleManager: ComponentLifecycleManager;
  inputEventCoordinator: InputEventCoordinator;
  componentRegistry: ComponentRegistry;

  // Convenience getters for viewport properties
  get canvas(): HTMLCanvasElement {
    return this.viewportManager.canvas;
  }

  get ctx(): CanvasRenderingContext2D {
    return this.viewportManager.ctx;
  }

  get camera(): Camera {
    return this.viewportManager.camera;
  }

  // Legacy compatibility setters for testing (DEPRECATED)
  set canvas(value: HTMLCanvasElement) {
    console.warn('Setting canvas directly is deprecated. Canvas is now managed by ViewportManager.');
    // For backward compatibility during transition
    (this.viewportManager as any).canvas = value;
  }

  set ctx(value: CanvasRenderingContext2D) {
    console.warn('Setting ctx directly is deprecated. Context is now managed by ViewportManager.');
    // For backward compatibility during transition
    (this.viewportManager as any).ctx = value;
  }

  constructor() {
    // Initialize ViewportManager for canvas and camera management
    // In test environments, use existing instance if available
    try {
      this.viewportManager = createViewportManager('circuit-board', eventBus);
    } catch (error) {
      if (error instanceof Error && error.message.includes('ViewportManager instance already exists')) {
        this.viewportManager = getViewportManager();
      } else {
        throw error;
      }
    }
    
    this.components = [];
    this.connections = [];
    this.selectedComponent = null;
    this.lastTime = 0;
    this.fps = 0;
    // Input state initialization now handled by InputEventCoordinator
    // this.isDragging = false;
    // this.dragOffset = { x: 0, y: 0 };
    // this.isPanning = false;
    // this.panStart = { x: 0, y: 0 };
    // this.mousePos = { x: 0, y: 0 };
    // Connection state initialization now handled by ConnectionManager

    // View management for schematic navigation
    this.viewStack = new ViewStack(); // Stack of views for navigation (refactored to ViewStack)
    this.currentView = {
      type: 'main', // 'main' or 'schematic'
      component: null, // For schematic views, which module we're inside
      camera: { x: 0, y: 0, zoom: 1 },
      components: [], // Components visible in this view
      connections: [], // Connections visible in this view
    };
    this.isTransitioning = false;

    // ComponentTypes now populated automatically by plugin registration
    // This eliminates the 5-file manual coordination problem!
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

    // Initialize Phase 3 layers
    this.runtimeLayer = new RuntimeLayer();
    this.uiLayer = new UILayer();

    // Phase 5: Initialize managers that are needed during init()
    this.exportImportManager = new ExportImportManager();
    this.connectionManager = createConnectionManager(eventBus, this.categories);
    
    // Phase 5A: Initialize ComponentRegistry for event-driven plugin coordination
    this.componentRegistry = createComponentRegistry(eventBus);
    
    // Phase 6C: Initialize ComponentLifecycleManager
    this.componentLifecycleManager = createComponentLifecycleManager(
      eventBus,
      this.runtimeLayer,
      this.componentTypes,
      this.categories
    );

    // Phase 6D: Initialize InputEventCoordinator
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
      showTemporaryMessage: this.showTemporaryMessage.bind(this),
      currentView: this.currentView,
      enterSchematicView: this.enterSchematicView.bind(this),
      exitSchematicView: this.exitSchematicView.bind(this),
      viewStack: this.viewStack,
      isTransitioning: this.isTransitioning,
      selectedComponent: this.selectedComponent,
      setSelectedComponent: (component: ComponentBase | null) => {
        this.selectedComponent = component;
      },
      connectionManager: this.connectionManager,
      updateConnectionModeUI: this.updateConnectionModeUI.bind(this),
      componentLifecycleManager: this.componentLifecycleManager,
      uiLayer: this.uiLayer,
      runtimeLayer: this.runtimeLayer,
      components: this.components,
      connections: this.connections
    });

    this.init();
    this.initializeMainView();

    // Phase 7A: Register Extended Component Plugins
    this.initializeExtendedComponents();
    
    // Phase 2A: Initialize V2 Plugin System (Event-Driven Architecture) 
    this.setupPluginSystem();

    // Register layers (idempotent during app lifecycle)
    try {
      layeredRenderer.registerLayer(BackgroundLayer.name, BackgroundLayer as any);
      layeredRenderer.registerLayer(ImplementationLayer.name, ImplementationLayer as any);
      layeredRenderer.registerLayer(ConnectionsLayer.name, ConnectionsLayer as any);
      layeredRenderer.registerLayer(RuntimeLayer.name, RuntimeLayer as any);
      layeredRenderer.registerLayer(UILayer.name, UILayer as any);
    } catch (e) {
      // ignore if already registered
    }

    try {
      // initialize state manager snapshot from current app state (Phase-1)
      // StateManager expects records keyed by id; convert arrays to maps keyed by component/connection id
      const componentsById = this.components.reduce((acc: Record<string, any>, c: any) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, any>);

      const connectionsById = this.connections.reduce((acc: Record<string, any>, conn: any) => {
        acc[conn.id] = conn;
        return acc;
      }, {} as Record<string, any>);

      stateManager.setSnapshot({
        components: componentsById,
        connections: connectionsById,
        view: this.currentView,
  selectedComponentId: (this.selectedComponent as any)?.id ?? null,
  selectedComponentIds: this.selectedComponent ? [(this.selectedComponent as any).id] : [],
        camera: { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom },
      } as any);
    } catch (err) {
      // avoid affecting runtime if snapshotting fails
      // eslint-disable-next-line no-console
      console.error('Failed to initialize stateManager snapshot', err);
    }

    // Optional demo seeding: append `?seedDemo=true` to the URL to populate sample components for smoke tests
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('seedDemo') === 'true') {
          // richer, idempotent seeding: components + connections + varied statuses
          if (this.components.length === 0) {
            this.addComponent('power-core', 100, 100);
            this.addComponent('module-ic', 320, 120);
            this.addComponent('task-resistor', 220, 220);

            // set statuses to show different visuals
            const p = this.components[0];
            const m = this.components[1];
            const r = this.components[2];
            if (p) p.status = 'done';
            if (m) m.status = 'in-progress';
            if (r) r.status = 'todo';

            // add connections: power-core -> module-ic, module-ic -> task-resistor
            try {
              const fromPin = { component: p, pinType: 'output' as 'output', pinIndex: 0, x: p.x + (p.pins?.output?.[0]?.x ?? 0), y: p.y + (p.pins?.output?.[0]?.y ?? 0), category: p.category };
              const toPin = { component: m, pinType: 'input' as 'input', pinIndex: 0, x: m.x + (m.pins?.input?.[0]?.x ?? 0), y: m.y + (m.pins?.input?.[0]?.y ?? 0), category: m.category };
              this.createConnection(fromPin, toPin);

              const fromPin2 = { component: m, pinType: 'output' as 'output', pinIndex: 0, x: m.x + (m.pins?.output?.[0]?.x ?? 0), y: m.y + (m.pins?.output?.[0]?.y ?? 0), category: m.category };
              const toPin2 = { component: r, pinType: 'input' as 'input', pinIndex: 0, x: r.x + (r.pins?.input?.[0]?.x ?? 0), y: r.y + (r.pins?.input?.[0]?.y ?? 0), category: r.category };
              this.createConnection(fromPin2, toPin2);
            } catch (e) {
              // ignore any seeding errors
            }
          }
        }
      }
    } catch (e) {
      // ignore in non-browser or unexpected environments
    }

    // Phase 5: Setup event handlers for managers (after init)
    this.setupExportImportEventHandlers();
    this.setupConnectionManagerEventHandlers();
  }

  initializeMainView() {
    // Set up the main board view with defensive array copying
    this.currentView = {
      type: 'main',
      component: null,
      camera: { x: 0, y: 0, zoom: 1 },
      components: [...this.components], // Create defensive copy to prevent reference issues
      connections: [...this.connections], // Create defensive copy
    };
    this.updateBreadcrumbs();
  }

  /**
   * Phase 7A: Initialize Extended Component System
   * Registers all extended component plugins for professional architecture visualization
   */
  initializeExtendedComponents() {
    try {
      // Register Decision Point ◆ plugin (idempotent)
      if (!componentSystem.get('decision-point')) {
        componentSystem.register(DecisionPointPlugin);
      }
      
      console.log('✅ Phase 7A: Extended Components initialized successfully');
      console.log(`   - Decision Point ◆ registered`);
      
      // Emit event for UI updates
      eventBus.emit(Events.EXTENDED_COMPONENTS_INITIALIZED, {
        plugins: componentSystem.list().map(p => ({ id: p.id, displayName: p.displayName }))
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize extended components:', error);
    }
  }

  init() {
    // Initialize ViewportManager (replaces setupCanvas)
    this.viewportManager.initialize();
    
    // Wire input listeners via the inputHandler module
    setupInputListeners(this);
    this.setupKeyboardShortcuts();
    this.setupImportHandler();
    this.setupUI();
    this.animate();
  }

  setupCanvas() {
    // DEPRECATED: Canvas setup is now handled by ViewportManager
    // This method is kept for backward compatibility but does nothing
    console.warn('setupCanvas() is deprecated. Canvas setup is now handled by ViewportManager.');
  }

  setupEventListeners() {
    // This method is now deprecated - event listeners are handled by inputHandler.ts and setupUI()
    // Keeping method stub to avoid breaking changes
  }

  setupUI() {
    // Close help overlay when clicking outside
    const helpOverlay = document.getElementById('help-overlay');
    if (helpOverlay) {
      helpOverlay.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (target?.id === 'help-overlay') {
          target.classList.remove('active');
        }
      });
    }

    // UI controls
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.exitSchematicView();
      });
    }

    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        const overlay = document.getElementById('help-overlay');
        if (overlay) overlay.classList.add('active');
      });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset the entire board? This cannot be undone.')) {
          this.components = [];
          this.connections = [];
          this.selectedComponent = null;
          this.hideDatasheet();
        }
      });
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        // Phase 5: Use new ExportImportManager instead of legacy method
        eventBus.emit(Events.PROJECT_EXPORT_REQUESTED, {
          timestamp: Date.now()
        });
      });
    }
  }

  setupPluginSystem() {
    // Phase 5B: Event-driven plugin coordination
    // Listen for plugin registrations to automatically update componentTypes
    eventBus.on(Events.PLUGIN_REGISTERED, (payload: any) => {
      const { pluginType, metadata } = payload;
      
      // Convert plugin metadata to componentType format
      const componentType = {
        name: metadata.displayName,
        icon: metadata.icon,
        color: metadata.color,
        width: metadata.width || 60,
        height: metadata.height || 40,
        pins: metadata.pins || { input: [], output: [] }
      };
      
      // Add to componentTypes (replacing manual coordination)
      this.componentTypes[pluginType] = componentType;
      
      console.log(`✅ ComponentType auto-updated: ${metadata.displayName} (${pluginType})`);
    });

    // Register V2 plugins - single registration triggers all coordination
    this.componentRegistry.register(new DecisionPointPluginV2());
    this.componentRegistry.register(new PowerCorePluginV2());
    this.componentRegistry.register(new ModuleICPluginV2());
    this.componentRegistry.register(new TaskResistorPluginV2());

    console.log('🚀 Event-driven plugin system initialized');
    console.log('📊 ComponentTypes populated:', Object.keys(this.componentTypes));
    console.log('🔧 V2 Plugins registered:', this.componentRegistry.getPluginTypes());
  }

  onMouseDown(e: MouseEvent) {
    // Delegate all mouse down handling to InputEventCoordinator
    this.inputEventCoordinator.handleMouseDown(e);
  }

  onMouseMove(e: MouseEvent) {
    // Delegate all mouse move handling to InputEventCoordinator
    this.inputEventCoordinator.handleMouseMove(e);
  }

  onMouseUp() {
    // Delegate all mouse up handling to InputEventCoordinator
    this.inputEventCoordinator.handleMouseUp();
  }

  onWheel(e: WheelEvent) {
    // Delegate wheel handling to ViewportManager
    this.viewportManager.handleWheelEvent(e);
  }

  addComponent(type: string, x: number, y: number) {
    // Delegate to ComponentLifecycleManager
    const component = this.componentLifecycleManager.createComponent(type, x, y, this.currentView);
    
    if (component) {
      // For main view, also sync with global arrays to maintain backward compatibility
      // Only if currentView.components is not the same reference as this.components
      if (this.currentView.type === 'main' && this.currentView.components !== this.components) {
        this.components.push(component);
      }
      
      this.selectedComponent = component;
      this.showDatasheet(component);
    }
    
    return component;
  }

  getComponentAt(x: number, y: number) {
    // Delegate to ComponentLifecycleManager
    return this.componentLifecycleManager.getComponentAt(x, y, this.currentView);
  }

  getPinAt(x: number, y: number): PinHit | null {
    // Delegate to ConnectionManager
    return this.connectionManager.getPinAt(x, y, this.getCurrentViewComponents());
  }

  getCurrentViewComponents() {
    return this.currentView.components;
  }

  getCurrentViewConnections() {
    // For main view, return the legacy connections array
    // For schematic views, use the ConnectionManager
    if (this.currentView.type === 'main') {
      return this.connections;
    } else {
      return this.connectionManager.getConnectionsForView(this.currentView);
    }
  }

  createConnection(startPin: PinHit, endPin: PinHit) {
    // Delegate to ConnectionManager (it handles all connection state management)
    const connection = this.connectionManager.createConnection(startPin, endPin);
    if (connection) {
      // Add to legacy connections array for backward compatibility
      this.connections.push(connection);
      
      // Emit the legacy ConnectionCreated event for backward compatibility
      try {
        eventBus.emit(Events.ConnectionCreated, { 
          id: connection.id, 
          from: connection.from, 
          to: connection.to, 
          type: connection.category, 
          metadata: {}, 
          source: 'legacy' 
        });
      } catch (err) {
        console.error('Failed to emit ConnectionCreated from main.createConnection', err);
      }
    }
    return connection;
  }

  toggleComponentStatus(component: ComponentBase) {
    // Delegate to ComponentLifecycleManager
    this.componentLifecycleManager.toggleComponentStatus(component);
    
    // Update datasheet if this is the selected component
    if (this.selectedComponent === component) {
      this.showDatasheet(component);
    }
  }

  showDatasheet(component: ComponentBase) {
    // Delegate to datasheet module
    showDatasheetUI(this, component);
  }

  hideDatasheet() {
    // Delegate to datasheet module
    hideDatasheetUI();
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  exportProject() {
    const projectData = this.exportProjectData();

    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'motherboard-project.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  exportProjectData() {
    // Enhanced export that includes internal components and connections
    const projectData = {
      name: 'Motherboard Project',
      created: new Date().toISOString(),
      components: ProjectSerializer.serializeComponents(this.components),
      connections: ProjectSerializer.serializeConnections(this.connections),
      version: '1.0.0',
    };

    return projectData;
  }

  // Serialization methods extracted to ProjectSerializer module

  // Import project data
  importProjectData(projectData: any) {
    try {
      // Clear current state
      this.components = [];
      this.connections = [];
      this.selectedComponent = null;
      this.hideDatasheet();

      // Use ProjectSerializer for deserialization
      const { components, connections } = ProjectSerializer.importProjectData(projectData);
      this.components = components;
      this.connections = connections;

      // Reset view to main
      this.initializeMainView();

      console.log('✅ Project imported successfully');
    } catch (error) {
      console.error('❌ Failed to import project:', error);
      throw error;
    }
  }

  // All serialization/deserialization methods extracted to ProjectSerializer module

  // Add file input handler for importing
  setupImportHandler() {
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        // Phase 5: Use new ExportImportManager instead of legacy method
        eventBus.emit(Events.PROJECT_IMPORT_REQUESTED, {
          timestamp: Date.now()
        });
      });
    }
  }

  // Phase 5: Setup event handlers for the new ExportImportManager
  setupExportImportEventHandlers() {
    // Handle requests for current project state
    eventBus.on(Events.PROJECT_STATE_REQUEST, (payload: { callback: (components: any[], connections: any[]) => void, timestamp: number }) => {
      // Provide a snapshot of components that includes any internal components
      // from an open schematic view. Without this, components created while
      // inside a schematic (e.g. Decision Points) live in currentView.components
      // and are not present on the root this.components array — so they would
      // be missing from exported project files.
      const componentsSnapshot = this.components.map(c => {
        const copy: any = { ...(c as any) };
        if ((c as any).type === 'module-ic') {
          copy.internalComponents = (c as any).internalComponents ? (c as any).internalComponents.map((ic: any) => ({ ...ic })) : [];
          copy.internalConnections = (c as any).internalConnections ? (c as any).internalConnections.map((ic: any) => ({ ...ic })) : [];
        }
        return copy;
      });

      // If the user currently has a schematic open, ensure that the module
      // being edited contains the live internal components/connections from
      // the current view so they're included in the exported snapshot.
      if (this.currentView.type === 'schematic' && this.currentView.component) {
        const moduleId = this.currentView.component.id;
        const idx = componentsSnapshot.findIndex(c => c.id === moduleId);
        if (idx !== -1) {
          componentsSnapshot[idx].internalComponents = [...this.currentView.components];
          componentsSnapshot[idx].internalConnections = [...this.currentView.connections];
        } else {
          // If the module isn't present at root for some reason, add it
          const moduleCopy: any = { ...this.currentView.component };
          moduleCopy.internalComponents = [...this.currentView.components];
          moduleCopy.internalConnections = [...this.currentView.connections];
          componentsSnapshot.push(moduleCopy);
        }
      }

      payload.callback(componentsSnapshot, this.connections);
    });

    // Handle project import completion
    eventBus.on(Events.PROJECT_IMPORTED, (payload: { components: any[], connections: any[], projectData: any, componentCount: number, connectionCount: number, timestamp: number }) => {
      // Replace current project state with imported data
      this.components = payload.components;
      this.connections = payload.connections;
      
      // Separate main-level components from internal components
      const mainComponents = payload.components.filter(comp => {
        // Main components are those not contained within any Module IC
        return !this.isComponentInternal(comp, payload.components);
      });
      
      // Update current view to reflect only main-level components
      this.currentView.components = mainComponents;
      this.currentView.connections = this.connections.filter(conn => {
        // Only include connections between main-level components
        const fromMain = mainComponents.some(c => c.id === conn.from.component.id);
        const toMain = mainComponents.some(c => c.id === conn.to.component.id);
        return fromMain && toMain;
      });
      
      // Ensure Module ICs have their internal components properly isolated
      payload.components.forEach(component => {
        if (component.type === 'module-ic' && component.internalComponents) {
          // Internal components should NOT appear in main view
          console.log(`📦 Module IC "${component.name}" has ${component.internalComponents.length} internal components`);
        }
      });
      
      // Reset camera and selection
      this.viewportManager.setCamera({ x: 0, y: 0, zoom: 1 });
      this.selectedComponent = null;
      
      console.log(`✅ Project imported: ${payload.componentCount} components, ${payload.connectionCount} connections`);
      console.log(`📍 Main view has ${mainComponents.length} components, ${this.currentView.connections.length} connections`);
    });

    // Handle import errors
    eventBus.on(Events.PROJECT_IMPORT_ERROR, (payload: { error: string, filename?: string, projectData?: any, timestamp: number }) => {
      console.error('❌ Import error:', payload.error);
      alert(`Import Error: ${payload.error}`);
    });

    // Handle export completion
    eventBus.on(Events.PROJECT_EXPORTED, (payload: { projectData: any, componentCount: number, connectionCount: number, timestamp: number }) => {
      console.log(`✅ Project exported: ${payload.componentCount} components, ${payload.connectionCount} connections`);
    });

    // Handle download completion
    eventBus.on(Events.PROJECT_DOWNLOAD_COMPLETED, (payload: { filename: string, size: number, timestamp: number }) => {
      console.log(`✅ Download completed: ${payload.filename} (${payload.size} bytes)`);
    });
  }

  // Phase 5: Setup event handlers for the new ConnectionManager
  setupConnectionManagerEventHandlers() {
    // Handle connection creation requests from UI
    eventBus.on(Events.CONNECTION_CREATE_REQUESTED, (payload: any) => {
      const pinHit = this.connectionManager.getPinAt(payload.x, payload.y, this.getCurrentViewComponents());
      if (pinHit) {
        if (this.connectionManager.getConnectionState().isConnecting) {
          // End connection
          this.connectionManager.endConnection(pinHit);
        } else {
          // Start connection
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
      // Add connection to main array if not already there (for drag-and-drop connections)
      if (payload.connection && !this.connections.find(c => c.id === payload.connection.id)) {
        this.connections.push(payload.connection);
        console.log('✅ Connection added to main array:', payload.connection.id);
      }
      
      // Add connection to current view if not main view
      if (payload.connection && this.currentView.type !== 'main') {
        if (!this.currentView.connections) {
          this.currentView.connections = [];
        }
        if (!this.currentView.connections.find(c => c.id === payload.connection.id)) {
          this.currentView.connections.push(payload.connection);
          console.log('✅ Connection added to schematic view:', payload.connection.id);
        }
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
      
      // Add glow effects at connection points
      this.runtimeLayer.glowEffect(payload.from.x, payload.from.y, categoryColor, 600);
      this.runtimeLayer.glowEffect(payload.to.x, payload.to.y, categoryColor, 600);
      
      this.updateConnectionModeUI();
    });

    // Handle pin interactions for UI feedback
    eventBus.on('pin.interaction', (payload: any) => {
      // Update cursor or visual feedback based on pin interaction
      if (payload.action === 'hover' && this.connectionManager.getConnectionState().isConnecting) {
        // Visual feedback for potential connection target
        const isValid = this.connectionManager.validateConnection(
          this.connectionManager.getConnectionState().connectionStart!,
          payload.pin
        ).isValid;
        
        // Update UI layer with connection intent
        this.uiLayer.clearConnectionIntents();
        this.uiLayer.addConnectionIntent({
          startPin: this.connectionManager.getConnectionState().connectionStart!,
          endPin: payload.pin,
          isValid,
          category: this.connectionManager.getConnectionState().connectionStart!.category ?? 'frontend'
        });
      }
    });
  }

  // Helper method to create renderer context
  private getRendererContext(): LegacyRendererContext {
    return {
      ctx: this.ctx,
      canvas: this.canvas,
      camera: this.camera,
      categories: this.categories,
      selectedComponent: this.selectedComponent,
      currentView: this.currentView,
      connectionManager: this.connectionManager,
      inputEventCoordinator: this.inputEventCoordinator,
      isTransitioning: this.isTransitioning,
      getCurrentViewComponents: () => this.getCurrentViewComponents(),
      getCurrentViewConnections: () => this.getCurrentViewConnections()
    };
  }

  // Delegated drawing methods (extracted to LegacyRenderer)
  drawGrid() {
    LegacyRenderer.drawGrid(this.getRendererContext());
  }

  drawSchematicBackground() {
    LegacyRenderer.drawSchematicBackground(this.getRendererContext());
  }

  drawTransitionOverlay() {
    LegacyRenderer.drawTransitionOverlay(this.getRendererContext());
  }

  drawComponent(component: ComponentBase) {
    LegacyRenderer.drawComponent(this.getRendererContext(), component);
  }



  render() {
    // Delegate all rendering to the extracted LegacyRenderer module
    LegacyRenderer.render(this.getRendererContext());
  }

  drawConnections() {
    LegacyRenderer.drawConnections(this.getRendererContext());
  }

  drawIntentionTrace(fromX: number, fromY: number, toX: number, toY: number) {
    LegacyRenderer.drawIntentionTrace(this.getRendererContext(), fromX, fromY, toX, toY);
  }

  drawTempConnection() {
    LegacyRenderer.drawTempConnection(this.getRendererContext());
  }

  drawOrthogonalTrace(fromX: number, fromY: number, toX: number, toY: number) {
    LegacyRenderer.drawOrthogonalTrace(this.getRendererContext(), fromX, fromY, toX, toY);
  }

  drawTraceBackground(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isActive: boolean
  ) {
    LegacyRenderer.drawTraceBackground(this.getRendererContext(), fromX, fromY, toX, toY, color, isActive);
  }

  drawActiveTrace(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isPowered: boolean
  ) {
    LegacyRenderer.drawActiveTrace(this.getRendererContext(), fromX, fromY, toX, toY, color, isPowered);
  }

  drawDataFlow(
    connection: Connection,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isPowered: boolean
  ) {
    LegacyRenderer.drawDataFlow(this.getRendererContext(), connection, fromX, fromY, toX, toY, color, isPowered);
  }

  getPointOnPath(points: { x: number; y: number }[], ratio: number) {
    return _getPointOnPath(points, ratio);
  }

  hexToRgb(hex: string) {
    return _hexToRgb(hex);
  }

  updateConnectionModeUI() {
    const indicator = document.getElementById('connection-mode');
    if (!indicator) return;
    const connectionState = this.connectionManager.getConnectionState();
    if (connectionState.isConnecting) {
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }

  // Component Hierarchy Helper Methods
  private isComponentInternal(component: ComponentBase, allComponents: ComponentBase[]): boolean {
    // Check if this component is contained within any Module IC
    return allComponents.some(containerComponent => {
      if (containerComponent.type === 'module-ic') {
        const moduleComponent = containerComponent as ModuleComponent;
        return moduleComponent.internalComponents?.some(internal => internal.id === component.id) || false;
      }
      return false;
    });
  }

  // Schematic View Navigation Methods
  enterSchematicView(moduleComponent: ModuleComponent) {
    if (this.isTransitioning) return;

    // Save current view state with proper array copying
    const currentViewState = {
      type: this.currentView.type,
      component: this.currentView.component,
      camera: { ...this.camera },
      selectedComponent: this.selectedComponent,
      // Create defensive copies to prevent reference issues
      components: [...this.currentView.components],
      connections: [...this.currentView.connections],
    };
    this.viewStack.push(currentViewState);

    // Initialize internal components if they don't exist
    if (!moduleComponent.internalComponents) {
      moduleComponent.internalComponents = [];
      moduleComponent.internalConnections = [];
    }

    // Switch to schematic view
    this.isTransitioning = true;
    this.hideDatasheet();
    this.selectedComponent = null;

    // Animate transition
    this.animateToSchematicView(moduleComponent, () => {
      this.currentView = {
        type: 'schematic',
        component: moduleComponent,
        camera: { x: 0, y: 0, zoom: 1 },
        // Create defensive copies to prevent contamination
        components: [...(moduleComponent.internalComponents ?? [])],
        connections: [...(moduleComponent.internalConnections ?? [])],
      };

      // Update camera to schematic view
      this.viewportManager.setCamera({ ...this.currentView.camera });
      this.isTransitioning = false;
      this.updateBreadcrumbs();
    });
  }

  exitSchematicView() {
    if (this.isTransitioning || this.viewStack.size() === 0) return;

    // Save current schematic state to the component's internal structure
    if (this.currentView.type === 'schematic' && this.currentView.component) {
      this.currentView.component.internalComponents = [...this.currentView.components];
      this.currentView.component.internalConnections = [...this.currentView.connections];
    }

    // Restore previous view
    const previousView = this.viewStack.pop();
    if (!previousView) {
      // Nothing to restore — safely exit
      this.isTransitioning = false;
      return;
    }

    this.isTransitioning = true;
    this.hideDatasheet();
    this.selectedComponent = null;

    this.animateToMainView(previousView.camera, () => {
      // Restore the previous view with proper array isolation
      this.currentView = {
        type: previousView.type,
        component: previousView.component,
        camera: { ...previousView.camera },
        components: [...(previousView.components || [])], // Use saved components from viewStack
        connections: [...(previousView.connections || [])], // Use saved connections from viewStack
      };

      // For main view, also sync with global arrays to maintain backward compatibility
      if (previousView.type === 'main') {
        // Restore global arrays from the saved state
        this.components.length = 0; // Clear existing
        this.components.push(...this.currentView.components);
        
        this.connections.length = 0; // Clear existing  
        this.connections.push(...this.currentView.connections);
      }

      this.viewportManager.setCamera({ ...previousView.camera });
      this.selectedComponent = previousView.selectedComponent;
      this.isTransitioning = false;
      this.updateBreadcrumbs();
    });
  }

  // Camera utility methods for smooth transitions
  private interpolateCamera(start: Camera, end: Camera, progress: number): Camera {
    return cameraTransitions.interpolateCamera(start, end, progress);
  }

  private getCameraDistance(cam1: Camera, cam2: Camera): number {
    return cameraTransitions.getCameraDistance(cam1, cam2);
  }

  // Get center position for a component (useful for focusing camera)
  private getComponentCenter(component: ComponentBase): { x: number; y: number } {
    return cameraTransitions.getComponentCenter(component);
  }

  // Calculate optimal camera position to focus on a component
  private getFocusCameraPosition(component: ComponentBase, zoom: number = 1): Camera {
    return cameraTransitions.getFocusCameraPosition(component, zoom);
  }

  // Enhanced transition configuration with dynamic duration based on distance
  private calculateTransitionDuration(start: Camera, end: Camera): number {
    return cameraTransitions.calculateTransitionDuration(start, end, this.transitionConfig.duration);
  }

  // Easing functions for smooth animations
  private easeInOutCubic(t: number): number {
    return cameraTransitions.easeInOutCubic(t);
  }

  private easeOutCubic(t: number): number {
    return cameraTransitions.easeOutCubic(t);
  }

  private easeInOutQuart(t: number): number {
    return cameraTransitions.easeInOutQuart(t);
  }

  // Configuration for transition animations
  private transitionConfig = {
    duration: 800, // milliseconds
    zoomOutFactor: 0.3,
    focusZoom: 1.2,
    easingFunction: this.easeInOutCubic.bind(this),
  };

  // Public method to configure transition parameters
  public setTransitionConfig(config: Partial<typeof this.transitionConfig>) {
    this.transitionConfig = { ...this.transitionConfig, ...config };
  }

  // Method to get current transition config (useful for debugging/tuning)
  public getTransitionConfig() {
    return { ...this.transitionConfig };
  }

  animateToSchematicView(moduleComponent: ModuleComponent, callback: () => void) {
    const startTime = performance.now();
    const startCamera = { ...this.camera };

    // Calculate target position using utility methods
    const focusCamera = this.getFocusCameraPosition(moduleComponent, this.transitionConfig.focusZoom);
    const finalCamera = { x: 0, y: 0, zoom: 1 }; // Schematic view starts at origin

    // Intermediate zoom-out camera for cinematic effect
    const midCamera = {
      x: startCamera.x + (focusCamera.x - startCamera.x) * 0.3,
      y: startCamera.y + (focusCamera.y - startCamera.y) * 0.3,
      zoom: this.transitionConfig.zoomOutFactor,
    };

    // Calculate dynamic duration based on camera movement distance
    const duration = this.calculateTransitionDuration(startCamera, finalCamera);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.5) {
        // Phase 1: Zoom out while panning toward target (cinematic effect)
        const phaseProgress = progress * 2;
        const phaseEased = this.easeOutCubic(phaseProgress);

        this.viewportManager.setCamera(this.interpolateCamera(startCamera, midCamera, phaseEased));
      } else {
        // Phase 2: Zoom into target with final positioning
        const phaseProgress = (progress - 0.5) * 2;

        // Transition from mid position to focus, then to final schematic position
        const focusPhase = Math.min(phaseProgress * 1.5, 1);
        const finalPhase = Math.max((phaseProgress - 0.6) / 0.4, 0);

        if (finalPhase === 0) {
          this.viewportManager.setCamera(this.interpolateCamera(midCamera, focusCamera, focusPhase));
        } else {
          this.viewportManager.setCamera(this.interpolateCamera(focusCamera, finalCamera, this.easeInOutCubic(finalPhase)));
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final position is exact
        this.viewportManager.setCamera({ ...finalCamera });
        callback();
      }
    };

    requestAnimationFrame(animate);
  }

  animateToMainView(targetCamera: Camera, callback: () => void) {
    const startTime = performance.now();
    const startCamera = { ...this.camera };
    
    // Calculate dynamic duration based on camera movement distance
    const duration = this.calculateTransitionDuration(startCamera, targetCamera);
    
    // Smooth transition back to the previous view's camera position
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.transitionConfig.easingFunction(progress);

      // Smooth interpolation to target camera state using utility method
      this.viewportManager.setCamera(this.interpolateCamera(startCamera, targetCamera, easedProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final position is exact
        this.viewportManager.setCamera({ ...targetCamera });
        callback();
      }
    };

    requestAnimationFrame(animate);
  }

  updateBreadcrumbs() {
    // Update the breadcrumb navigation in the UI with full path
    const breadcrumbNav = document.getElementById('breadcrumb-nav') as HTMLElement;
    const backBtn = document.getElementById('back-btn') as HTMLElement;

    if (!breadcrumbNav || !backBtn) return;

    // Build breadcrumb path from view stack
    const breadcrumbPath = this.buildBreadcrumbPath();
    
    // Clear existing breadcrumbs
    breadcrumbNav.innerHTML = '';
    
    // Create breadcrumb items
    breadcrumbPath.forEach((item, index) => {
      // Add separator before each item (except first)
      if (index > 0) {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = '>';
        breadcrumbNav.appendChild(separator);
      }
      
      // Create breadcrumb item
      const breadcrumbItem = document.createElement('span');
      breadcrumbItem.className = `breadcrumb-item ${item.isCurrent ? 'current' : ''}`;
      breadcrumbItem.setAttribute('data-view-index', index.toString());
      
      // Add depth indicator
      const depthIndicator = document.createElement('span');
      depthIndicator.className = 'depth-indicator';
      depthIndicator.textContent = item.icon;
      breadcrumbItem.appendChild(depthIndicator);
      
      // Add text content
      const textNode = document.createTextNode(item.name);
      breadcrumbItem.appendChild(textNode);
      
      // Add click handler for navigation (except current item)
      if (!item.isCurrent) {
        breadcrumbItem.addEventListener('click', () => {
          this.navigateToBreadcrumbLevel(index);
        });
      }
      
      breadcrumbNav.appendChild(breadcrumbItem);
    });
    
    // Update back button visibility
    const isMainView = this.currentView.type === 'main';
    backBtn.style.display = isMainView ? 'none' : 'inline-block';
    
    // Update parts tray context filtering
    this.updatePartsTrayContext();
  }

  updatePartsTrayContext() {
    // Update parts tray to show appropriate components for current context
    const powerCoreItem = document.getElementById('power-core-item') as HTMLElement;
    const moduleIcItem = document.getElementById('module-ic-item') as HTMLElement;
    const taskResistorItem = document.getElementById('task-resistor-item') as HTMLElement;

    if (!powerCoreItem || !moduleIcItem || !taskResistorItem) return;

    const isMainView = this.currentView.type === 'main';
    const currentDepth = this.viewStack.size() + (this.currentView.type === 'schematic' ? 1 : 0);

    if (isMainView) {
      // Main board: All components available
      powerCoreItem.classList.remove('disabled');
      moduleIcItem.classList.remove('disabled');
      taskResistorItem.classList.remove('disabled');
      
      powerCoreItem.querySelector('.context-hint')!.textContent = 'Energy sources';
      moduleIcItem.querySelector('.context-hint')!.textContent = 'Features & Systems';
      taskResistorItem.querySelector('.context-hint')!.textContent = 'Not typical on main board';
    } else {
      // Schematic view: No Power Cores allowed
      powerCoreItem.classList.add('disabled');
      moduleIcItem.classList.remove('disabled');
      taskResistorItem.classList.remove('disabled');
      
      powerCoreItem.querySelector('.context-hint')!.textContent = 'Main board only';
      moduleIcItem.querySelector('.context-hint')!.textContent = `Sub-systems (Level ${currentDepth + 1})`;
      taskResistorItem.querySelector('.context-hint')!.textContent = 'Individual tasks';
    }
  }

  buildBreadcrumbPath() {
    const path = [];
    
    // Always start with main board
    path.push({
      name: 'Project: Motherboard',
      icon: '⚡',
      isCurrent: this.currentView.type === 'main',
      viewIndex: 0
    });
    
    // Add each level from view stack
    const stack = this.viewStack.serialize();
    stack.forEach((view: any, index: number) => {
      if (view.type === 'schematic' && view.component) {
        const depth = index + 1;
        const depthIcons = ['⚡', '🔲', '🔳', '🔵', '🟢', '🟡', '🟠', '🔴', '🟣', '⚫', '⚪', '🔘'];
        const icon = depth < depthIcons.length ? depthIcons[depth] : `🔹${depth}`;
        
        path.push({
          name: view.component.title || `Module ${depth}`,
          icon: icon,
          isCurrent: false,
          viewIndex: depth
        });
      }
    });
    
    // Mark current schematic view
    if (this.currentView.type === 'schematic') {
      const currentDepth = stack.length + 1;
      const depthIcons = ['⚡', '🔲', '🔳', '🔵', '🟢', '🟡', '🟠', '🔴', '🟣', '⚫', '⚪', '🔘'];
      const icon = currentDepth < depthIcons.length ? depthIcons[currentDepth] : `🔹${currentDepth}`;
      
      path.push({
        name: this.currentView.component?.title || `Module ${currentDepth}`,
        icon: icon,
        isCurrent: true,
        viewIndex: currentDepth
      });
    }
    
    return path;
  }

  navigateToBreadcrumbLevel(targetIndex: number) {
    // Navigate directly to a specific breadcrumb level
    if (this.isTransitioning) return;
    
    const currentDepth = this.viewStack.size() + (this.currentView.type === 'schematic' ? 1 : 0);
    
    if (targetIndex === 0) {
      // Navigate to main board
      this.exitToMainBoard();
    } else if (targetIndex < currentDepth) {
      // Navigate to intermediate level by popping the right number of views
      const levelsToExit = currentDepth - targetIndex;
      for (let i = 0; i < levelsToExit; i++) {
        this.exitSchematicView();
      }
    }
  }

  exitToMainBoard() {
    // Exit all the way to main board
    this.isTransitioning = true;
    
    const startTime = performance.now();
    const startCamera = { ...this.camera };
    const mainCamera = { x: 0, y: 0, zoom: 1 };
    
    // Calculate dynamic duration based on camera movement distance
    const duration = this.calculateTransitionDuration(startCamera, mainCamera);
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.transitionConfig.easingFunction(progress);
      
      // Interpolate camera position
      this.viewportManager.setCamera(this.interpolateCamera(startCamera, mainCamera, easedProgress));
      
      if (progress >= 1) {
        // Transition complete
        this.viewStack.clear();
        this.currentView = {
          type: 'main',
          component: null,
          camera: { ...mainCamera },
          components: this.components,
          connections: this.connections,
        };
        this.viewportManager.setCamera({ ...mainCamera });
        this.isTransitioning = false;
        this.updateBreadcrumbs();
      } else {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }

  // Keyboard Shortcuts System
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcut(event);
    });
  }

  handleKeyboardShortcut(event: KeyboardEvent) {
    // Ignore keyboard shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    // Prevent default behavior for our shortcuts
    const shortcutKeys = ['Escape', 'Tab', ' ', 'F1'];
    if (shortcutKeys.includes(event.key)) {
      event.preventDefault();
    }

    switch (event.key) {
      case 'Escape':
        this.handleEscapeKey();
        break;
      case 'Tab':
        this.handleTabKey(event.shiftKey);
        break;
      case ' ': // Space key
        this.handleSpaceKey();
        break;
      case 'F1':
        this.handleHelpKey();
        break;
      case '?':
        if (event.shiftKey) { // Shift + ? = ?
          this.handleHelpKey();
        }
        break;
    }
  }

  handleEscapeKey() {
    // ESC key: Exit current context or close modals
    
    // Priority 1: Close help overlay if open
    const helpOverlay = document.getElementById('help-overlay') as HTMLElement;
    if (helpOverlay && helpOverlay.classList.contains('active')) {
      helpOverlay.classList.remove('active');
      return;
    }

    // Priority 2: Exit connection mode if active
    if (this.connectionManager.getConnectionState().isConnecting) {
      this.connectionManager.cancelConnection();
      const connectionModeIndicator = document.getElementById('connection-mode') as HTMLElement;
      if (connectionModeIndicator) {
        connectionModeIndicator.style.display = 'none';
      }
      return;
    }

    // Priority 3: Clear component selection
    if (this.selectedComponent) {
      this.selectedComponent = null;
      hideDatasheetUI();
      return;
    }

    // Priority 4: Exit schematic view if in one
    if (this.currentView.type === 'schematic') {
      this.exitSchematicView();
      return;
    }
  }

  handleTabKey(shiftPressed: boolean) {
    // TAB key: Cycle between views (Shift+TAB for reverse)
    if (this.isTransitioning) return;

    const viewStackSize = this.viewStack.size();
    
    if (viewStackSize === 0) {
      // No views to cycle through
      return;
    }

    if (shiftPressed) {
      // Shift+Tab: Go back one level
      if (this.currentView.type === 'schematic') {
        this.exitSchematicView();
      }
    } else {
      // Tab: Navigate deeper or cycle through Module ICs
      if (this.currentView.type === 'main') {
        // Find first Module IC and enter it
        const moduleICs = this.components.filter(c => c.type === 'module-ic');
        if (moduleICs.length > 0) {
          this.enterSchematicView(moduleICs[0] as ModuleComponent);
        }
      } else {
        // In schematic view - find next Module IC or exit to main
        const currentComponents = this.getCurrentViewComponents();
        const moduleICs = currentComponents.filter(c => c.type === 'module-ic');
        if (moduleICs.length > 0) {
          this.enterSchematicView(moduleICs[0] as ModuleComponent);
        } else {
          this.exitSchematicView();
        }
      }
    }
  }

  handleSpaceKey() {
    // SPACE key: Toggle status of selected component
    if (this.selectedComponent && this.selectedComponent.type !== 'power-core') {
      this.toggleComponentStatus(this.selectedComponent);
      
      // Update datasheet if open
      if (document.getElementById('datasheet-panel')?.classList.contains('active')) {
        showDatasheetUI(this, this.selectedComponent);
      }
    } else if (!this.selectedComponent) {
      // No component selected - show status hint
      this.showTemporaryMessage('Select a component first, then press SPACE to toggle its status');
    }
  }

  handleHelpKey() {
    // F1 or Shift+?: Toggle help overlay
    const helpOverlay = document.getElementById('help-overlay') as HTMLElement;
    if (helpOverlay) {
      if (helpOverlay.classList.contains('active')) {
        helpOverlay.classList.remove('active');
      } else {
        helpOverlay.classList.add('active');
      }
    }
  }

  showTemporaryMessage(message: string, duration: number = 2000) {
    // Show a temporary message to the user
    let messageEl = document.getElementById('temp-message') as HTMLElement;
    
    if (!messageEl) {
      messageEl = document.createElement('div');
      messageEl.id = 'temp-message';
      messageEl.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #00ff88;
        border-radius: 8px;
        padding: 15px 25px;
        color: #00ff88;
        font-family: 'Courier New', monospace;
        z-index: 3000;
        text-align: center;
        max-width: 400px;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
      `;
      document.body.appendChild(messageEl);
    }
    
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    // Clear any existing timeout
    if (messageEl.dataset.timeoutId) {
      clearTimeout(parseInt(messageEl.dataset.timeoutId));
    }
    
    // Set new timeout
    const timeoutId = setTimeout(() => {
      messageEl.style.display = 'none';
    }, duration);
    
    messageEl.dataset.timeoutId = timeoutId.toString();
  }

  updateFPS(currentTime: number) {
    if (this.lastTime) {
      const delta = currentTime - this.lastTime;
      this.fps = Math.round(1000 / delta);
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `FPS: ${this.fps}`;
    }
    this.lastTime = currentTime;
  }

  animate(currentTime?: number) {
    this.updateFPS(currentTime || performance.now());
    this.render();
    requestAnimationFrame(this.animate.bind(this));
  }

  // Pin mapping and dynamic pin management
  showPinMappingUI(moduleComponent: ModuleComponent) {
    // Delegate to the extracted pinMapping module to keep main.ts small.
    void import('./ui/pinMapping')
      .then(mod => {
        if (mod && typeof mod.showPinMappingUI === 'function') {
          mod.showPinMappingUI(this, moduleComponent);
        }
      })
      .catch(() => {
        // noop
      });
  }

  private setupPinMappingHandlers(moduleComponent: ModuleComponent) {
    // Delegate setup to the extracted pinMapping module
    void import('./ui/pinMapping')
      .then(mod => {
        if (mod && typeof mod.setupPinMappingHandlers === 'function') {
          mod.setupPinMappingHandlers(this, moduleComponent);
        }
      })
      .catch(() => {
        // noop
      });
  }

  private addPinToUI(pinType: 'input' | 'output', moduleComponent: ModuleComponent) {
    void import('./ui/pinMapping')
      .then(mod => {
        if (mod && typeof mod.addPinToUI === 'function') {
          mod.addPinToUI(pinType, moduleComponent);
        }
      })
      .catch(() => {
        // noop
      });
  }

  private applyPinConfiguration(moduleComponent: ModuleComponent) {
    void import('./ui/pinMapping')
      .then(mod => {
        if (mod && typeof mod.applyPinConfiguration === 'function') {
          mod.applyPinConfiguration(this, moduleComponent);
        }
      })
      .catch(() => {
        // noop
      });
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new MotherboardApp();
  // Make app globally accessible for debugging
  (window as any).app = app;
  // Removed initialization logs to avoid console spam
});

export default MotherboardApp;

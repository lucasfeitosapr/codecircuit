import { ViewStack } from './viewStack';
import { eventBus } from './events/EventBus';
import { Events } from './events/eventTypes';
import { stateManager } from './state/StateManager';
import { hexToRgb as _hexToRgb, getPointOnPath as _getPointOnPath } from './utils';
import {
  drawGrid as rendererDrawGrid,
  drawSchematicBackground as rendererDrawSchematicBackground,
  drawOrthogonalTrace as rendererDrawOrthogonalTrace,
} from './renderer';
import { setupInputListeners } from './inputHandler';
import { showDatasheet as showDatasheetUI, hideDatasheet as hideDatasheetUI } from './datasheet';
import type {
  ViewState,
  Camera,
  ComponentBase,
  Connection,
  PinHit,
  ModuleComponent,
  PinDef,
} from './types';

/* src/main.ts
   Migrated from main.js - minimal TypeScript annotations to start the refactor.
   Further modularization and stricter typing will follow in subsequent steps.
*/

export class MotherboardApp {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  components: ComponentBase[];
  connections: Connection[];
  selectedComponent: ComponentBase | null;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  camera: Camera;
  isPanning: boolean;
  panStart: { x: number; y: number };
  lastTime: number;
  fps: number;
  isConnecting: boolean;
  connectionStart: PinHit | null;
  mousePos: { x: number; y: number };
  viewStack: ViewStack;
  currentView: ViewState;
  isTransitioning: boolean;
  componentTypes: Record<string, Partial<ComponentBase>>;
  categories: Record<string, { name: string; color: string }>;

  constructor() {
    this.canvas = document.getElementById('circuit-board') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')! as CanvasRenderingContext2D;
    this.components = [];
    this.connections = [];
    this.selectedComponent = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.lastTime = 0;
    this.fps = 0;
    this.isConnecting = false;
    this.connectionStart = null;
    this.mousePos = { x: 0, y: 0 };

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

    this.componentTypes = {
      'power-core': {
        name: 'Power Core',
        icon: '✨',
        color: '#ffaa00',
        width: 80,
        height: 40,
        pins: { output: [{ x: 80, y: 20, type: 'energy' }] },
      },
      'module-ic': {
        name: 'Module IC',
        icon: '⬛',
        color: '#4444ff',
        width: 100,
        height: 60,
        pins: {
          input: [{ x: 0, y: 30, type: 'energy' }],
          output: [{ x: 100, y: 30, type: 'energy' }],
        },
      },
      'task-resistor': {
        name: 'Task Resistor',
        icon: '▬▬',
        color: '#ff4444',
        width: 60,
        height: 20,
        pins: {
          input: [{ x: 0, y: 10, type: 'energy' }],
          output: [{ x: 60, y: 10, type: 'energy' }],
        },
      },
    };

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

    this.init();
    this.initializeMainView();

    try {
      // initialize state manager snapshot from current app state (Phase-1)
      stateManager.setSnapshot({ components: this.components, connections: this.connections, view: this.currentView });
    } catch (err) {
      // avoid affecting runtime if snapshotting fails
      // eslint-disable-next-line no-console
      console.error('Failed to initialize stateManager snapshot', err);
    }
  }

  initializeMainView() {
    // Set up the main board view
    this.currentView = {
      type: 'main',
      component: null,
      camera: { x: 0, y: 0, zoom: 1 },
      components: this.components,
      connections: this.connections,
    };
    this.updateBreadcrumbs();
  }

  init() {
    this.setupCanvas();
    // wire input listeners via the inputHandler module
    setupInputListeners(this);
    this.setupKeyboardShortcuts();
    this.setupImportHandler();
    this.setupUI();
    this.animate();
  }

  setupCanvas() {
    const resizeCanvas = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
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
        this.exportProject();
      });
    }
  }

  onMouseDown(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
    const mouseY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

    if (e.button === 2) {
      // Right click - panning
      this.isPanning = true;
      this.panStart = { x: e.clientX - this.camera.x, y: e.clientY - this.camera.y };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Check if clicking on a pin first
    const pinHit = this.getPinAt(mouseX, mouseY);
    if (pinHit) {
      if (this.isConnecting && this.connectionStart) {
        // End connection
        this.createConnection(this.connectionStart, pinHit);
        this.isConnecting = false;
        this.connectionStart = null;
        this.canvas.style.cursor = 'grab';
        this.updateConnectionModeUI();
      } else {
        // Start connection
        this.isConnecting = true;
        this.connectionStart = pinHit;
        this.canvas.style.cursor = 'crosshair';
        this.updateConnectionModeUI();
      }
      return;
    }

    // Check if clicking on a component
    const clickedComponent = this.getComponentAt(mouseX, mouseY);

    if (clickedComponent) {
      if (e.detail === 2) {
        // Double click
        if (clickedComponent.type === 'module-ic') {
          // Enter schematic view
          this.enterSchematicView(clickedComponent);
        } else {
          // Toggle status for other components
          this.toggleComponentStatus(clickedComponent);
        }
      } else {
        // Single click - select
        this.selectedComponent = clickedComponent;
        this.showDatasheet(clickedComponent);
        this.isDragging = true;
        this.dragOffset = {
          x: mouseX - clickedComponent.x,
          y: mouseY - clickedComponent.y,
        };
      }
    } else {
      this.selectedComponent = null;
      this.hideDatasheet();
      // Cancel connection if clicking on empty space
      if (this.isConnecting) {
        this.isConnecting = false;
        this.connectionStart = null;
        this.canvas.style.cursor = 'grab';
        this.updateConnectionModeUI();
      }
    }
  }

  onMouseMove(e: MouseEvent) {
    if (this.isPanning) {
      this.camera.x = e.clientX - this.panStart.x;
      this.camera.y = e.clientY - this.panStart.y;
      return;
    }

    if (this.isDragging && this.selectedComponent) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
      const mouseY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

      this.selectedComponent.x = mouseX - this.dragOffset.x;
      this.selectedComponent.y = mouseY - this.dragOffset.y;
    }
  }

  onMouseUp() {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'grab';
    }
    this.isDragging = false;
  }

  onWheel(e: WheelEvent) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - this.camera.x) / this.camera.zoom;
    const worldY = (mouseY - this.camera.y) / this.camera.zoom;

    this.camera.zoom = Math.max(0.1, Math.min(3, this.camera.zoom * zoomFactor));

    this.camera.x = mouseX - worldX * this.camera.zoom;
    this.camera.y = mouseY - worldY * this.camera.zoom;
  }

  addComponent(type: string, x: number, y: number) {
    const template = this.componentTypes[type];
    if (!template) return;

    // In schematic view, allow Task Resistors and Module ICs (for nesting), but not Power Cores
    if (this.currentView.type === 'schematic' && type === 'power-core') {
      console.log('Power Cores only allowed on main board');
      return;
    }

    const components = this.getCurrentViewComponents();
    // Ensure required numeric fields exist (template may be Partial<ComponentBase>)
    const width = template.width ?? 60;
    const height = template.height ?? 20;
    const pins = template.pins ?? { input: [], output: [] };
    const component: ComponentBase = {
      id: this.generateId(),
      type,
      x,
      y,
      width,
      height,
      pins,
      name: template.name,
      icon: template.icon,
      color: template.color,
      status: 'defined', // default to defined instead of 'todo'
      title: `${template.name ?? type} ${components.length + 1}`,
      description: '',
      category: 'frontend', // Default category
      createdAt: new Date(),
    };

    // Add internal components and connections for Module ICs
    if (type === 'module-ic') {
      component.internalComponents = [];
      component.internalConnections = [];
    }

    components.push(component);
    this.selectedComponent = component;
    this.showDatasheet(component);
    try {
      eventBus.emit(Events.ComponentCreated, { id: component.id, type: component.type, model: component, source: 'legacy' });
    } catch (err) {
      // swallow to avoid changing behavior
      // eslint-disable-next-line no-console
      console.error('Failed to emit ComponentCreated from main.addComponent', err);
    }
  }

  getComponentAt(x: number, y: number) {
    const components = this.getCurrentViewComponents();
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      if (x >= comp.x && x <= comp.x + comp.width && y >= comp.y && y <= comp.y + comp.height) {
        return comp;
      }
    }
    return null;
  }

  getPinAt(x: number, y: number): PinHit | null {
    const pinRadius = 8; // Hit detection radius
    const components = this.getCurrentViewComponents();

    for (const component of components) {
      // Check input pins
      if (component.pins.input) {
        for (let i = 0; i < component.pins.input.length; i++) {
          const pin = component.pins.input[i];
          const pinX = component.x + pin.x;
          const pinY = component.y + pin.y;
          const distance = Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2);

          if (distance < pinRadius) {
            return {
              component: component,
              pinType: 'input',
              pinIndex: i,
              x: pinX,
              y: pinY,
              category: component.category || 'frontend',
            };
          }
        }
      }

      // Check output pins
      if (component.pins.output) {
        for (let i = 0; i < component.pins.output.length; i++) {
          const pin = component.pins.output[i];
          const pinX = component.x + pin.x;
          const pinY = component.y + pin.y;
          const distance = Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2);

          if (distance < pinRadius) {
            return {
              component: component,
              pinType: 'output',
              pinIndex: i,
              x: pinX,
              y: pinY,
              category: component.category || 'frontend',
            };
          }
        }
      }
    }
    return null;
  }

  getCurrentViewComponents() {
    return this.currentView.components;
  }

  getCurrentViewConnections() {
    return this.currentView.connections;
  }

  createConnection(startPin: PinHit, endPin: PinHit) {
    // Prevent connecting to the same component
    if (startPin.component === endPin.component) return;

    // Prevent output to output or input to input connections
    if (startPin.pinType === endPin.pinType) return;

    // Ensure we're connecting output to input
    let outputPin: PinHit, inputPin: PinHit;
    if (startPin.pinType === 'output') {
      outputPin = startPin;
      inputPin = endPin;
    } else {
      outputPin = endPin;
      inputPin = startPin;
    }

    // Use the current view's connections array
    const connections = this.getCurrentViewConnections();

    // Check for existing connection (same endpoints)
    const existingConnection = connections.find(
      (conn: Connection) =>
        conn.from.component === outputPin.component &&
        conn.from.pinIndex === outputPin.pinIndex &&
        conn.to.component === inputPin.component &&
        conn.to.pinIndex === inputPin.pinIndex
    );

    if (existingConnection) return;

    // Create new connection
    const connection: Connection = {
      id: this.generateId(),
      from: outputPin,
      to: inputPin,
      category: outputPin.category ?? 'frontend', // Connection inherits category from output
      createdAt: new Date(),
    };

    // Push into the view-specific connections
    connections.push(connection);

    // Ensure the global top-level connections array is updated when on main view
    if (this.currentView.type === 'main') {
      if (this.connections !== connections) {
        this.connections.push(connection);
      }
    } else if (this.currentView.type === 'schematic' && this.currentView.component) {
      // persist into module internalConnections as well (keep consistency)
      if (!this.currentView.component.internalConnections) {
        this.currentView.component.internalConnections = [];
      }
      if (this.currentView.component.internalConnections !== connections) {
        this.currentView.component.internalConnections.push(connection);
      }
    }
      try {
        eventBus.emit(Events.ConnectionCreated, { id: connection.id, from: connection.from, to: connection.to, type: connection.category, metadata: {}, source: 'legacy' });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to emit ConnectionCreated from main.createConnection', err);
      }
  }

  toggleComponentStatus(component: ComponentBase) {
    const statusCycle = ['defined', 'todo', 'in-progress', 'done'];
    const currentIndex = statusCycle.indexOf(component.status ?? 'defined');
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    component.status = statusCycle[nextIndex];

    if (this.selectedComponent === component) {
      this.showDatasheet(component);
    }
    try {
      eventBus.emit(Events.ComponentUpdated, { id: component.id, changes: { status: component.status }, source: 'legacy' });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to emit ComponentUpdated from toggleComponentStatus', err);
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
      components: this.serializeComponents(this.components),
      connections: this.serializeConnections(this.connections),
      version: '1.0.0',
    };

    return projectData;
  }

  // Serialize components including internal structures
  private serializeComponents(components: ComponentBase[]): any[] {
    return components.map(component => {
      const serialized: any = {
        id: component.id,
        type: component.type,
        x: component.x,
        y: component.y,
        width: component.width,
        height: component.height,
        name: component.name,
        title: component.title,
        icon: component.icon,
        color: component.color,
        pins: component.pins,
        status: component.status,
        category: component.category,
        description: component.description,
        createdAt: component.createdAt,
      };

      // Handle Module IC internal structures
      if (component.type === 'module-ic') {
        const moduleComponent = component as ModuleComponent;
        if (moduleComponent.internalComponents) {
          serialized.internalComponents = this.serializeComponents(
            moduleComponent.internalComponents
          );
        }
        if (moduleComponent.internalConnections) {
          serialized.internalConnections = this.serializeConnections(
            moduleComponent.internalConnections
          );
        }
        if (moduleComponent.pinMap) {
          serialized.pinMap = moduleComponent.pinMap;
        }
      }

      return serialized;
    });
  }

  // Serialize connections with component references
  private serializeConnections(connections: Connection[]): any[] {
    return connections.map(connection => ({
      id: connection.id,
      from: {
        componentId: connection.from.component.id,
        pinType: connection.from.pinType,
        pinIndex: connection.from.pinIndex,
        x: connection.from.x,
        y: connection.from.y,
        category: connection.from.category,
      },
      to: {
        componentId: connection.to.component.id,
        pinType: connection.to.pinType,
        pinIndex: connection.to.pinIndex,
        x: connection.to.x,
        y: connection.to.y,
        category: connection.to.category,
      },
      category: connection.category,
      createdAt: connection.createdAt,
    }));
  }

  // Import project data
  importProjectData(projectData: any) {
    try {
      // Clear current state
      this.components = [];
      this.connections = [];
      this.selectedComponent = null;
      this.hideDatasheet();

      // Deserialize components
      if (projectData.components) {
        this.components = this.deserializeComponents(projectData.components);
      }

      // Deserialize connections
      if (projectData.connections) {
        this.connections = this.deserializeConnections(projectData.connections, this.components);
      }

      // Reset view to main
      this.initializeMainView();

      console.log('✅ Project imported successfully');
    } catch (error) {
      console.error('❌ Failed to import project:', error);
      throw error;
    }
  }

  // Deserialize components and rebuild internal structures
  private deserializeComponents(componentsData: any[]): ComponentBase[] {
    return componentsData.map(data => {
      const component: ComponentBase = {
        id: data.id,
        type: data.type,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        name: data.name,
        title: data.title,
        icon: data.icon,
        color: data.color,
        pins: data.pins,
        status: data.status || 'defined',
        category: data.category || 'frontend',
        description: data.description || '',
        createdAt: data.createdAt || new Date(),
      };

      // Handle Module IC internal structures
      if (data.type === 'module-ic') {
        const moduleComponent = component as ModuleComponent;

        if (data.internalComponents) {
          moduleComponent.internalComponents = this.deserializeComponents(data.internalComponents);
        }

        if (data.internalConnections) {
          moduleComponent.internalConnections = this.deserializeConnections(
            data.internalConnections,
            moduleComponent.internalComponents || []
          );
        }

        if (data.pinMap) {
          moduleComponent.pinMap = data.pinMap;
        }
      }

      return component;
    });
  }

  // Deserialize connections and rebuild component references
  private deserializeConnections(
    connectionsData: any[],
    components: ComponentBase[]
  ): Connection[] {
    return connectionsData
      .map(data => {
        const fromComponent = this.findComponentById(data.from.componentId, components);
        const toComponent = this.findComponentById(data.to.componentId, components);

        if (!fromComponent || !toComponent) {
          console.warn('Warning: Could not find component for connection', data.id);
          return null;
        }

        return {
          id: data.id,
          from: {
            component: fromComponent,
            pinType: data.from.pinType,
            pinIndex: data.from.pinIndex,
            x: data.from.x,
            y: data.from.y,
            category: data.from.category,
          },
          to: {
            component: toComponent,
            pinType: data.to.pinType,
            pinIndex: data.to.pinIndex,
            x: data.to.x,
            y: data.to.y,
            category: data.to.category,
          },
          category: data.category,
          createdAt: data.createdAt,
        };
      })
      .filter(conn => conn !== null) as Connection[];
  }

  // Helper to find component by ID recursively
  private findComponentById(id: string, components: ComponentBase[]): ComponentBase | null {
    for (const component of components) {
      if (component.id === id) {
        return component;
      }

      // Search in internal components for Module ICs
      if (component.type === 'module-ic') {
        const moduleComponent = component as ModuleComponent;
        if (moduleComponent.internalComponents) {
          const found = this.findComponentById(id, moduleComponent.internalComponents);
          if (found) return found;
        }
      }
    }
    return null;
  }

  // Add file input handler for importing
  setupImportHandler() {
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', e => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = event => {
              try {
                const projectData = JSON.parse(event.target?.result as string);
                this.importProjectData(projectData);
              } catch (error) {
                alert('Error reading project file: ' + error);
              }
            };
            reader.readAsText(file);
          }
        });
        input.click();
      });
    }
  }

  drawGrid() {
    // delegate to renderer helper
    rendererDrawGrid(this.ctx, this.camera, this.canvas);
  }

  drawSchematicBackground() {
    // delegate to renderer helper
    rendererDrawSchematicBackground(this.ctx, this.camera, this.canvas);
  }

  drawTransitionOverlay() {
    // Simple overlay during transitions
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(
      0,
      0,
      this.canvas.width / window.devicePixelRatio,
      this.canvas.height / window.devicePixelRatio
    );
  }

  drawComponent(component: ComponentBase) {
    const screenX = component.x * this.camera.zoom + this.camera.x;
    const screenY = component.y * this.camera.zoom + this.camera.y;
    const screenWidth = component.width * this.camera.zoom;
    const screenHeight = component.height * this.camera.zoom;

    // Component body
    // Default body (may be overridden for certain states)
    if (component.status === 'defined') {
      // Transparent body for DEFINED (wireframe)
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      this.ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
    } else {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
    }

    // Component border based on status
    let borderColor = component.color ?? '#000000';
    let glowIntensity = 0;

    switch (component.status) {
      case 'defined':
        borderColor = '#00ffff'; // cyan outline for defined
        glowIntensity = 0;
        break;
      case 'todo':
        borderColor = component.color + '66'; // Semi-transparent
        break;
      case 'in-progress':
        borderColor = '#ff00ff';
        glowIntensity = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
        break;
      case 'done':
        borderColor = '#00ff88';
        glowIntensity = 0.8;
        break;
    }

    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;

    if (glowIntensity > 0) {
      this.ctx.shadowColor = borderColor;
      this.ctx.shadowBlur = 15 * glowIntensity;
    }

    if (component.status === 'defined') {
      // Dashed outline for defined
      this.ctx.setLineDash([6, 6]);
      this.ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
      this.ctx.setLineDash([]);
    } else {
      this.ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
    }
    this.ctx.shadowBlur = 0;

    // Selection highlight
    if (this.selectedComponent === component) {
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(screenX - 2, screenY - 2, screenWidth + 4, screenHeight + 4);
      this.ctx.setLineDash([]);
    }

    // Component icon and text
    // Muted italic text for DEFINED
    if (component.status === 'defined') {
      this.ctx.fillStyle = 'rgba(200, 255, 255, 0.85)';
      this.ctx.font = `${16 * this.camera.zoom}px monospace italic`;
      this.ctx.globalAlpha = 0.85;
    } else {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `${16 * this.camera.zoom}px monospace`;
    }
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const centerX = screenX + screenWidth / 2;
    const centerY = screenY + screenHeight / 2;

    this.ctx.fillText(component.icon ?? '', centerX, centerY - 5 * this.camera.zoom);

    // Component title (if there's space)
    if (screenHeight > 40) {
      if (component.status === 'defined') {
        this.ctx.font = `${10 * this.camera.zoom}px monospace italic`;
        this.ctx.fillStyle = 'rgba(200, 255, 255, 0.7)';
      } else {
        this.ctx.font = `${10 * this.camera.zoom}px monospace`;
        this.ctx.fillStyle = '#ffffff';
      }
      this.ctx.fillText(component.title ?? '', centerX, centerY + 15 * this.camera.zoom);
    }

    // Draw pins
    this.drawPins(component, screenX, screenY);

    // Energy particles for in-progress components
    if (component.status === 'in-progress') {
      this.drawEnergyParticles(component, screenX, screenY, screenWidth, screenHeight);
    }
  }

  drawPins(component: ComponentBase, screenX: number, screenY: number) {
    const pinSize = 4 * this.camera.zoom;
    const categoryColor = this.categories[component.category ?? 'frontend']?.color || '#ffaa00';
    const isActive = component.status === 'in-progress' || component.status === 'done';

    this.ctx.fillStyle = categoryColor;

    // Enhanced glow effect for active components
    if (isActive) {
      this.ctx.shadowColor = categoryColor;
      this.ctx.shadowBlur =
        component.status === 'done' ? 10 * this.camera.zoom : 6 * this.camera.zoom;
    } else {
      this.ctx.shadowBlur = 3 * this.camera.zoom;
      this.ctx.shadowColor = categoryColor;
    }

    // Draw input pins
    if (component.pins.input) {
      component.pins.input.forEach((pin: PinDef, index: number) => {
        const pinX = screenX + pin.x * this.camera.zoom;
        const pinY = screenY + pin.y * this.camera.zoom;

        // Check if this pin has incoming active connections
        const connections = this.getCurrentViewConnections();
        const hasActiveInput = connections.some(
          (conn: Connection) =>
            conn.to.component === component &&
            conn.to.pinIndex === index &&
            (conn.from.component.status === 'in-progress' || conn.from.component.status === 'done')
        );

        if (hasActiveInput) {
          // Draw pulsing effect for pins receiving data (smoother pulse)
          const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.004);
          this.ctx.shadowBlur = 10 * this.camera.zoom * pulseIntensity;

          // Draw larger glowing pin
          this.ctx.fillRect(
            pinX - pinSize * 0.6,
            pinY - pinSize * 0.6,
            pinSize * 1.2,
            pinSize * 1.2
          );
        } else {
          this.ctx.fillRect(pinX - pinSize / 2, pinY - pinSize / 2, pinSize, pinSize);
        }
      });
    }

    // Draw output pins
    if (component.pins.output) {
      component.pins.output.forEach((pin: PinDef, index: number) => {
        const pinX = screenX + pin.x * this.camera.zoom;
        const pinY = screenY + pin.y * this.camera.zoom;

        // Check if this pin has outgoing active connections
        const connections = this.getCurrentViewConnections();
        const hasActiveOutput =
          connections.some(
            (conn: Connection) => conn.from.component === component && conn.from.pinIndex === index
          ) && isActive;

        if (hasActiveOutput) {
          // Draw enhanced effect for pins sending data (smoother pulse)
          const pulseIntensity =
            component.status === 'done' ? 1.0 : 0.6 + 0.4 * Math.sin(Date.now() * 0.003);
          this.ctx.shadowBlur = 12 * this.camera.zoom * pulseIntensity;

          // Draw larger glowing pin with gentler pulse effect
          const size = pinSize * (1.1 + 0.05 * Math.sin(Date.now() * 0.005));
          this.ctx.fillRect(pinX - size / 2, pinY - size / 2, size, size);
        } else {
          this.ctx.fillRect(pinX - pinSize / 2, pinY - pinSize / 2, pinSize, pinSize);
        }
      });
    }

    this.ctx.shadowBlur = 0;
  }

  drawEnergyParticles(
    component: ComponentBase,
    screenX: number,
    screenY: number,
    screenWidth: number,
    screenHeight: number
  ) {
    const time = Date.now() * 0.0008; // Slower internal particle movement
    const particleCount = 3;
    const categoryColor = this.categories[component.category ?? 'frontend']?.color || '#ff00ff';

    for (let i = 0; i < particleCount; i++) {
      const phase = (time + i * 0.6) % 2; // More spaced out timing
      let x: number, y: number, alpha: number;

      if (phase < 1.2) {
        // Particles flowing horizontally with smooth motion
        const progress = phase / 1.2;
        const smoothProgress = progress * progress * (3 - 2 * progress); // Smooth curve
        x = screenX + screenWidth * smoothProgress;
        y = screenY + screenHeight / 2 + Math.sin(time * 2 + i) * 2; // Gentler wave
        alpha = 0.8 - progress * 0.2;
      } else {
        // Particles fading out more gradually
        const fadePhase = (phase - 1.2) / 0.8;
        x = screenX + screenWidth;
        y = screenY + screenHeight / 2;
        alpha = 0.6 * (1 - fadePhase);
      }

      this.ctx.fillStyle = `rgba(${this.hexToRgb(categoryColor)}, ${alpha})`;
      this.ctx.shadowColor = categoryColor;
      this.ctx.shadowBlur = 4 * this.camera.zoom * alpha;

      const size = (2 + Math.sin(time * 3 + i) * 0.3) * this.camera.zoom;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.shadowBlur = 0;
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(
      0,
      0,
      this.canvas.width / window.devicePixelRatio,
      this.canvas.height / window.devicePixelRatio
    );

    // Draw different background for schematic view
    if (this.currentView.type === 'schematic') {
      this.drawSchematicBackground();
    } else {
      this.drawGrid();
    }

    // Draw connections
    this.drawConnections();

    // Draw temporary connection line
    if (this.isConnecting && this.connectionStart) {
      this.drawTempConnection();
    }

    // Draw components from current view
    const components = this.getCurrentViewComponents();
    components.forEach((component: ComponentBase) => {
      this.drawComponent(component);
    });

    // Draw transition overlay if transitioning
    if (this.isTransitioning) {
      this.drawTransitionOverlay();
    }
  }

  drawConnections() {
    const connections = this.getCurrentViewConnections();
    connections.forEach((connection: Connection) => {
      // Dynamically calculate pin positions based on current component positions
      const fromPin = connection.from;
      const toPin = connection.to;

      // Get current pin positions
      const fromComponent = fromPin.component;
      const toComponent = toPin.component;

      // Guard: pin arrays may be undefined (defensive)
      if (!fromComponent.pins?.output || !toComponent.pins?.input) return;

      const fromPinDef = fromComponent.pins.output[fromPin.pinIndex];
      const toPinDef = toComponent.pins.input[toPin.pinIndex];

      const fromX = (fromComponent.x + fromPinDef.x) * this.camera.zoom + this.camera.x;
      const fromY = (fromComponent.y + fromPinDef.y) * this.camera.zoom + this.camera.y;
      const toX = (toComponent.x + toPinDef.x) * this.camera.zoom + this.camera.x;
      const toY = (toComponent.y + toPinDef.y) * this.camera.zoom + this.camera.y;

      const categoryColor = this.categories[connection.category ?? 'frontend']?.color || '#00ff88';

      // Check statuses
      const fromStatus = connection.from.component.status;
      const toStatus = connection.to.component.status;
      const isActive = fromStatus === 'in-progress' || fromStatus === 'done';
      const isPowered = fromStatus === 'done';

      // If both ends are DEFINED, render intention (dashed) trace and skip particles
      if (fromStatus === 'defined' && toStatus === 'defined') {
        this.drawIntentionTrace(fromX, fromY, toX, toY, categoryColor);
        return;
      }

      // If source is DEFINED and not active yet, render intention trace
      if (fromStatus === 'defined' && !isActive) {
        this.drawIntentionTrace(fromX, fromY, toX, toY, categoryColor);
        return;
      }

      // Otherwise render normal background and active traces
      this.drawTraceBackground(fromX, fromY, toX, toY, categoryColor, isActive);

      if (isActive) {
        // Draw glowing active trace
        this.drawActiveTrace(fromX, fromY, toX, toY, categoryColor, isPowered);

        // Draw data flow particles
        this.drawDataFlow(connection, fromX, fromY, toX, toY, categoryColor, isPowered);
      }
    });
  }

  // Intention (dashed) trace rendering for DEFINED components
  drawIntentionTrace(fromX: number, fromY: number, toX: number, toY: number, color: string) {
    // Use cyan tint for intention traces while falling back to provided category color
    const intentionColor = '#00ffff';
    this.ctx.strokeStyle = intentionColor + '66';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);
    this.drawOrthogonalTrace(fromX, fromY, toX, toY);
    this.ctx.setLineDash([]);
    this.ctx.shadowBlur = 0;
  }

  drawTempConnection() {
    // Guard: connectionStart may be null
    if (!this.connectionStart) return;
    const fromX = this.connectionStart.x * this.camera.zoom + this.camera.x;
    const fromY = this.connectionStart.y * this.camera.zoom + this.camera.y;
    const toX = this.mousePos.x * this.camera.zoom + this.camera.x;
    const toY = this.mousePos.y * this.camera.zoom + this.camera.y;

    const cat = this.connectionStart.category ?? 'frontend';
    const categoryColor = this.categories[cat]?.color || '#00ff88';

    this.ctx.strokeStyle = categoryColor + '80'; // Semi-transparent
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.drawOrthogonalTrace(fromX, fromY, toX, toY);

    this.ctx.setLineDash([]);
  }

  drawOrthogonalTrace(fromX: number, fromY: number, toX: number, toY: number) {
    // delegate to renderer helper
    rendererDrawOrthogonalTrace(this.ctx, fromX, fromY, toX, toY);
  }

  drawTraceBackground(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isActive: boolean
  ) {
    // Draw the background trace
    this.ctx.strokeStyle = isActive ? color + '40' : color + '20'; // More transparent when inactive
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 0;

    this.drawOrthogonalTrace(fromX, fromY, toX, toY);
  }

  drawActiveTrace(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isPowered: boolean
  ) {
    // Draw the glowing active trace with smoother pulsing
    const glowIntensity = isPowered ? 1.0 : 0.6;
    const pulseEffect = isPowered ? 1.0 : 0.7 + 0.3 * Math.sin(Date.now() * 0.003); // Slower pulse

    // Multiple glow layers for better effect
    for (let i = 0; i < 3; i++) {
      // fallback: ensure valid hex processing happens elsewhere during stricter typing
      const alphaHex = Math.floor((70 - i * 15) * glowIntensity * pulseEffect)
        .toString(16)
        .padStart(2, '0');
      this.ctx.strokeStyle = color + alphaHex;
      this.ctx.lineWidth = (3 - i * 0.5) * this.camera.zoom; // Gentler width variation
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = (12 - i * 3) * glowIntensity * pulseEffect; // Softer glow

      this.drawOrthogonalTrace(fromX, fromY, toX, toY);
    }

    this.ctx.shadowBlur = 0;
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
    const time = Date.now() * 0.0015; // Slower base speed
    const speed = isPowered ? 0.6 : 0.3; // Much slower flow rates
    const particleCount = isPowered ? 4 : 3; // Fewer particles for cleaner look
    const particleSize = isPowered ? 2.5 : 2;

    // Calculate path points (same as orthogonal trace)
    const midX = fromX + (toX - fromX) * 0.7;
    const pathPoints = [
      { x: fromX, y: fromY },
      { x: midX, y: fromY },
      { x: midX, y: toY },
      { x: toX, y: toY },
    ];

    // Draw flowing data packets with smoother spacing
    for (let i = 0; i < particleCount; i++) {
      const offset = (time * speed + i * 0.35) % 1; // More spaced out
      const pos = this.getPointOnPath(pathPoints, offset);

      // Smooth alpha transition
      const alpha = 0.9 * (1 - Math.pow(offset, 1.5)); // Smoother fade
      this.ctx.fillStyle = `rgba(${this.hexToRgb(color)}, ${alpha})`;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 6 * this.camera.zoom * alpha;

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, particleSize * this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();

      // Smoother trailing effect
      for (let j = 1; j <= 2; j++) {
        // Fewer trail particles
        const trailOffset = Math.max(0, offset - j * 0.08); // More spaced trails
        if (trailOffset > 0) {
          const trailPos = this.getPointOnPath(pathPoints, trailOffset);
          const trailAlpha = alpha * (0.5 - j * 0.2);
          const trailSize = particleSize * (0.8 - j * 0.2);

          this.ctx.fillStyle = `rgba(${this.hexToRgb(color)}, ${trailAlpha})`;
          this.ctx.shadowBlur = 3 * this.camera.zoom * trailAlpha;

          this.ctx.beginPath();
          this.ctx.arc(trailPos.x, trailPos.y, trailSize * this.camera.zoom, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    // Less frequent data bursts for smoother look
    if (isPowered && Math.random() < 0.03) {
      // Reduced from 0.1 to 0.03
      const burstOffset = Math.random();
      const burstPos = this.getPointOnPath(pathPoints, burstOffset);

      this.ctx.fillStyle = `rgba(${this.hexToRgb(color)}, 0.6)`;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 12 * this.camera.zoom;

      this.ctx.beginPath();
      this.ctx.arc(burstPos.x, burstPos.y, 4 * this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.shadowBlur = 0;
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
    if (this.isConnecting) {
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }

  // Schematic View Navigation Methods
  enterSchematicView(moduleComponent: ModuleComponent) {
    if (this.isTransitioning) return;

    // Save current view state
    const currentViewState = {
      type: this.currentView.type,
      component: this.currentView.component,
      camera: { ...this.camera },
      selectedComponent: this.selectedComponent,
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
        components: moduleComponent.internalComponents ?? [],
        connections: moduleComponent.internalConnections ?? [],
      };

      // Update camera to schematic view
      this.camera = { ...this.currentView.camera };
      this.isTransitioning = false;
      this.updateBreadcrumbs();
    });
  }

  exitSchematicView() {
    if (this.isTransitioning || this.viewStack.size() === 0) return;

    // Save current schematic state
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
      this.currentView = {
        type: previousView.type,
        component: previousView.component,
        camera: { ...previousView.camera },
        components:
          previousView.type === 'main'
            ? this.components
            : previousView.component?.internalComponents ?? [],
        connections:
          previousView.type === 'main'
            ? this.connections
            : previousView.component?.internalConnections ?? [],
      };

      this.camera = { ...previousView.camera };
      this.selectedComponent = previousView.selectedComponent;
      this.isTransitioning = false;
      this.updateBreadcrumbs();
    });
  }

  // Camera utility methods for smooth transitions
  private interpolateCamera(start: Camera, end: Camera, progress: number): Camera {
    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
      zoom: start.zoom + (end.zoom - start.zoom) * progress,
    };
  }

  private getCameraDistance(cam1: Camera, cam2: Camera): number {
    const dx = cam1.x - cam2.x;
    const dy = cam1.y - cam2.y;
    const dz = Math.abs(cam1.zoom - cam2.zoom) * 100; // Scale zoom difference
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Get center position for a component (useful for focusing camera)
  private getComponentCenter(component: ComponentBase): { x: number; y: number } {
    return {
      x: component.x + component.width / 2,
      y: component.y + component.height / 2,
    };
  }

  // Calculate optimal camera position to focus on a component
  private getFocusCameraPosition(component: ComponentBase, zoom: number = 1): Camera {
    const center = this.getComponentCenter(component);
    return {
      x: this.canvas.width / 2 - center.x * zoom,
      y: this.canvas.height / 2 - center.y * zoom,
      zoom: zoom,
    };
  }

  // Enhanced transition configuration with dynamic duration based on distance
  private calculateTransitionDuration(start: Camera, end: Camera): number {
    const distance = this.getCameraDistance(start, end);
    const baseDuration = this.transitionConfig.duration;
    const maxDuration = baseDuration * 1.5;
    const minDuration = baseDuration * 0.5;

    // Scale duration based on distance, but keep within reasonable bounds
    const scaleFactor = Math.min(distance / 500, 2);
    return Math.max(minDuration, Math.min(maxDuration, baseDuration * scaleFactor));
  }

  // Easing functions for smooth animations
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
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
        
        this.camera = this.interpolateCamera(startCamera, midCamera, phaseEased);
      } else {
        // Phase 2: Zoom into target with final positioning
        const phaseProgress = (progress - 0.5) * 2;
        const phaseEased = this.easeInOutQuart(phaseProgress);
        
        // Transition from mid position to focus, then to final schematic position
        const focusPhase = Math.min(phaseProgress * 1.5, 1);
        const finalPhase = Math.max((phaseProgress - 0.6) / 0.4, 0);
        
        if (finalPhase === 0) {
          this.camera = this.interpolateCamera(midCamera, focusCamera, focusPhase);
        } else {
          this.camera = this.interpolateCamera(focusCamera, finalCamera, this.easeInOutCubic(finalPhase));
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final position is exact
        this.camera = { ...finalCamera };
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
      this.camera = this.interpolateCamera(startCamera, targetCamera, easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Ensure final position is exact
        this.camera = { ...targetCamera };
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
      this.camera = this.interpolateCamera(startCamera, mainCamera, easedProgress);
      
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
        this.camera = { ...mainCamera };
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
    if (this.isConnecting) {
      this.isConnecting = false;
      this.connectionStart = null;
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
    const panel = document.getElementById('datasheet-panel') as HTMLElement | null;
    const titleEl = document.getElementById('datasheet-title') as HTMLElement | null;
    const content = document.getElementById('datasheet-content') as HTMLElement | null;

    if (!panel || !titleEl || !content) return;

    titleEl.textContent = `🔌 Pin Mapping: ${moduleComponent.title || moduleComponent.name}`;

    // Initialize pinMap if it doesn't exist
    if (!moduleComponent.pinMap) {
      moduleComponent.pinMap = {};
    }

    const inputPins = moduleComponent.pins.input || [];
    const outputPins = moduleComponent.pins.output || [];
    const internalComponents = moduleComponent.internalComponents || [];

    content.innerHTML = `
      <div class="pin-mapping-container">
        <div class="pin-section">
          <h4>🔵 Input Pins</h4>
          <div id="input-pins">
            ${inputPins
              .map(
                (pin, index) => `
              <div class="pin-config" data-pin-type="input" data-pin-index="${index}">
                <div class="pin-header">
                  <span>Input ${index + 1}</span>
                  <button class="pin-remove-btn" onclick="this.closest('.pin-config').remove()">×</button>
                </div>
                <label>Label:</label>
                <input type="text" class="pin-label" value="${
                  pin.label || ''
                }" placeholder="Pin label">
                <label>Type:</label>
                <select class="pin-type">
                  <option value="energy" ${pin.type === 'energy' ? 'selected' : ''}>Energy</option>
                  <option value="data" ${pin.type === 'data' ? 'selected' : ''}>Data</option>
                  <option value="control" ${
                    pin.type === 'control' ? 'selected' : ''
                  }>Control</option>
                </select>
                <label>Connect to internal:</label>
                <select class="pin-mapping">
                  <option value="">-- Not connected --</option>
                  ${internalComponents
                    .map(
                      comp =>
                        comp.pins.input
                          ?.map(
                            (internalPin, internalIndex) =>
                              `<option value="${comp.id}:input:${internalIndex}">${
                                comp.title || comp.name
                              } Input ${internalIndex + 1}</option>`
                          )
                          .join('') || ''
                    )
                    .join('')}
                </select>
              </div>
            `
              )
              .join('')}
          </div>
          <button class="control-btn add-pin-btn" id="add-input-pin">+ Add Input Pin</button>
        </div>

        <div class="pin-section">
          <h4>🔴 Output Pins</h4>
          <div id="output-pins">
            ${outputPins
              .map(
                (pin, index) => `
              <div class="pin-config" data-pin-type="output" data-pin-index="${index}">
                <div class="pin-header">
                  <span>Output ${index + 1}</span>
                  <button class="pin-remove-btn" onclick="this.closest('.pin-config').remove()">×</button>
                </div>
                <label>Label:</label>
                <input type="text" class="pin-label" value="${
                  pin.label || ''
                }" placeholder="Pin label">
                <label>Type:</label>
                <select class="pin-type">
                  <option value="energy" ${pin.type === 'energy' ? 'selected' : ''}>Energy</option>
                  <option value="data" ${pin.type === 'data' ? 'selected' : ''}>Data</option>
                  <option value="control" ${
                    pin.type === 'control' ? 'selected' : ''
                  }>Control</option>
                </select>
                <label>Connect from internal:</label>
                <select class="pin-mapping">
                  <option value="">-- Not connected --</option>
                  ${internalComponents
                    .map(
                      comp =>
                        comp.pins.output
                          ?.map(
                            (internalPin, internalIndex) =>
                              `<option value="${comp.id}:output:${internalIndex}">${
                                comp.title || comp.name
                              } Output ${internalIndex + 1}</option>`
                          )
                          .join('') || ''
                    )
                    .join('')}
                </select>
              </div>
            `
              )
              .join('')}
          </div>
          <button class="control-btn add-pin-btn" id="add-output-pin">+ Add Output Pin</button>
        </div>

        <div class="pin-actions">
          <button class="control-btn" id="apply-pin-config">Apply Changes</button>
          <button class="control-btn" id="cancel-pin-config">Cancel</button>
        </div>
      </div>

      <style>
        .pin-mapping-container {
          max-height: 70vh;
          overflow-y: auto;
        }
        .pin-section {
          margin-bottom: 20px;
          padding: 15px;
          background: rgba(0, 255, 136, 0.05);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 8px;
        }
        .pin-section h4 {
          margin-bottom: 10px;
          color: #00ff88;
        }
        .pin-config {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 10px;
        }
        .pin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-weight: bold;
        }
        .pin-remove-btn {
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid #ff4444;
          color: #ff4444;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
        }
        .pin-config label {
          display: block;
          margin: 8px 0 4px 0;
          font-size: 12px;
          opacity: 0.8;
        }
        .pin-config input, .pin-config select {
          width: 100%;
          padding: 6px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.3);
          color: #00ff88;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .add-pin-btn {
          width: 100%;
          margin-top: 10px;
          background: rgba(0, 255, 136, 0.1);
          border-color: #00ff88;
        }
        .pin-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .pin-actions button {
          flex: 1;
        }
      </style>
    `;

    // Set up event listeners
    this.setupPinMappingHandlers(moduleComponent);

    panel.classList.add('active');
  }

  private setupPinMappingHandlers(moduleComponent: ModuleComponent) {
    // Add input pin handler
    const addInputBtn = document.getElementById('add-input-pin');
    if (addInputBtn) {
      addInputBtn.addEventListener('click', () => {
        this.addPinToUI('input', moduleComponent);
      });
    }

    // Add output pin handler
    const addOutputBtn = document.getElementById('add-output-pin');
    if (addOutputBtn) {
      addOutputBtn.addEventListener('click', () => {
        this.addPinToUI('output', moduleComponent);
      });
    }

    // Apply changes handler
    const applyBtn = document.getElementById('apply-pin-config');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applyPinConfiguration(moduleComponent);
      });
    }

    // Cancel handler
    const cancelBtn = document.getElementById('cancel-pin-config');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideDatasheet();
      });
    }
  }

  private addPinToUI(pinType: 'input' | 'output', moduleComponent: ModuleComponent) {
    const container = document.getElementById(`${pinType}-pins`);
    if (!container) return;

    const pinIndex = container.children.length;
    const internalComponents = moduleComponent.internalComponents || [];

    const pinElement = document.createElement('div');
    pinElement.className = 'pin-config';
    pinElement.setAttribute('data-pin-type', pinType);
    pinElement.setAttribute('data-pin-index', pinIndex.toString());

    const oppositeType = pinType === 'input' ? 'output' : 'input';
    const oppositeLabel = pinType === 'input' ? 'from internal' : 'to internal';

    pinElement.innerHTML = `
      <div class="pin-header">
        <span>${pinType.charAt(0).toUpperCase() + pinType.slice(1)} ${pinIndex + 1}</span>
        <button class="pin-remove-btn" onclick="this.closest('.pin-config').remove()">×</button>
      </div>
      <label>Label:</label>
      <input type="text" class="pin-label" placeholder="Pin label">
      <label>Type:</label>
      <select class="pin-type">
        <option value="energy">Energy</option>
        <option value="data">Data</option>
        <option value="control">Control</option>
      </select>
      <label>Connect ${oppositeLabel}:</label>
      <select class="pin-mapping">
        <option value="">-- Not connected --</option>
        ${internalComponents
          .map(
            comp =>
              comp.pins[oppositeType]
                ?.map(
                  (internalPin, internalIndex) =>
                    `<option value="${comp.id}:${oppositeType}:${internalIndex}">${
                      comp.title || comp.name
                    } ${oppositeType.charAt(0).toUpperCase() + oppositeType.slice(1)} ${
                      internalIndex + 1
                    }</option>`
                )
                .join('') || ''
          )
          .join('')}
      </select>
    `;

    container.appendChild(pinElement);
  }

  private applyPinConfiguration(moduleComponent: ModuleComponent) {
    try {
      // Collect input pin configurations
      const inputConfigs = Array.from(document.querySelectorAll('[data-pin-type="input"]'));
      const outputConfigs = Array.from(document.querySelectorAll('[data-pin-type="output"]'));

      // Update input pins
      const newInputPins = inputConfigs.map((config, index) => {
        const labelInput = config.querySelector('.pin-label') as HTMLInputElement;
        const typeSelect = config.querySelector('.pin-type') as HTMLSelectElement;

        return {
          x: 0,
          y: (index + 1) * (moduleComponent.height / (inputConfigs.length + 1)),
          type: typeSelect.value,
          label: labelInput.value || `Input ${index + 1}`,
        };
      });

      // Update output pins
      const newOutputPins = outputConfigs.map((config, index) => {
        const labelInput = config.querySelector('.pin-label') as HTMLInputElement;
        const typeSelect = config.querySelector('.pin-type') as HTMLSelectElement;

        return {
          x: moduleComponent.width,
          y: (index + 1) * (moduleComponent.height / (outputConfigs.length + 1)),
          type: typeSelect.value,
          label: labelInput.value || `Output ${index + 1}`,
        };
      });

      // Update the component's pins
      moduleComponent.pins = {
        input: newInputPins,
        output: newOutputPins,
      };

      // Update pin mappings
      moduleComponent.pinMap = {};

      inputConfigs.forEach((config, index) => {
        const mappingSelect = config.querySelector('.pin-mapping') as HTMLSelectElement;
        if (mappingSelect.value) {
          moduleComponent.pinMap![`input:${index}`] = mappingSelect.value;
        }
      });

      outputConfigs.forEach((config, index) => {
        const mappingSelect = config.querySelector('.pin-mapping') as HTMLSelectElement;
        if (mappingSelect.value) {
          moduleComponent.pinMap![`output:${index}`] = mappingSelect.value;
        }
      });

      console.log('✅ Pin configuration updated successfully');
      this.hideDatasheet();

      // Refresh the component display
      if (this.selectedComponent === moduleComponent) {
        this.showDatasheet(moduleComponent);
      }
    } catch (error) {
      console.error('❌ Failed to apply pin configuration:', error);
      alert('Failed to apply pin configuration: ' + error);
    }
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  new MotherboardApp();
  console.log('🚀 Project: Motherboard MVP initialized');
  console.log('💡 Drag components from the Parts Tray to get started!');
});

export default MotherboardApp;

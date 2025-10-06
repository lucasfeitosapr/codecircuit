import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, ModuleComponent, PinHit, Camera } from '../types';
import { hideDatasheet as hideDatasheetUI, showDatasheet as showDatasheetUI } from '../datasheet';
import { isFeatureEnabled } from './FeatureFlagManager';

/**
 * Phase 6B: Input Event Coordinator
 *
 * This class coordinates all input handling for the application, including:
 * - Mouse events (click, drag, scroll)
 * - Keyboard shortcuts
 * - UI button interactions
 * - File import handling
 *
 * Extracted from main.ts to create a cleaner separation of concerns.
 * The main application now delegates all input handling to this coordinator.
 */

export interface InputEventCoordinatorDependencies {
  // Canvas and viewport
  canvas: HTMLCanvasElement;
  viewportManager: any; // ViewportManager type

  // Component management
  getComponentAt: (x: number, y: number) => ComponentBase | null;
  getPinAt: (x: number, y: number) => PinHit | null;
  getCurrentViewComponents: () => ComponentBase[];
  getCurrentViewConnections: () => any[];

  // Component operations
  addComponent: (type: string, x: number, y: number) => void;
  toggleComponentStatus: (component: ComponentBase) => void;

  // UI operations
  showDatasheet: (component: ComponentBase) => void;
  hideDatasheet: () => void;
  showTemporaryMessage: (message: string, duration?: number) => void;

  // View management
  currentView: any; // View type from main.ts
  enterSchematicView: (component: ModuleComponent) => void;
  exitSchematicView: () => void;
  viewStack: any; // ViewStack type
  isTransitioning: boolean;

  // Selection and interaction state
  selectedComponent: ComponentBase | null;
  setSelectedComponent: (component: ComponentBase | null) => void;

  // Connection management
  connectionManager: any; // ConnectionManager type
  updateConnectionModeUI: () => void;

  // Component lifecycle management
  componentLifecycleManager: any; // ComponentLifecycleManager type

  // Rendering layers
  uiLayer: any; // UILayer type
  runtimeLayer: any; // RuntimeLayer type

  // Component types and state
  components: ComponentBase[];
  connections: any[];
}

export class InputEventCoordinator {
  private dependencies: InputEventCoordinatorDependencies;

  // Mouse interaction state
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private panStart: { x: number; y: number } = { x: 0, y: 0 };
  private draggedComponent: ComponentBase | null = null; // Store dragged component locally
  // RAF coalescing for high-frequency emits
  private rafScheduled: number | null = null;
  private pendingDragPayload: { componentId: string; x: number; y: number; timestamp: number } | null = null;
  private pendingConnectionDrawing: { startPin: any; currentPos: { x: number; y: number }; isValid: boolean; timestamp: number } | null = null;

  // Event listeners for cleanup
  private eventListeners: Array<{ element: EventTarget; event: string; handler: EventListener }> =
    [];

  constructor(dependencies: InputEventCoordinatorDependencies) {
    this.dependencies = dependencies;
    this.setupEventListeners();
  }

  /**
   * Initialize all input event listeners
   */
  private setupEventListeners(): void {
    this.setupCanvasInputListeners();
    this.setupKeyboardShortcuts();
    this.setupUIEventHandlers();
    this.setupImportHandler();
    this.setupExportImportEventHandlers();
  }

  /**
   * Setup canvas mouse and wheel event listeners via inputHandler.ts
   */
  private setupCanvasInputListeners(): void {
    // Skip canvas setup if canvas is not available (e.g., in tests)
    if (!this.dependencies.canvas) {
      console.warn('InputEventCoordinator: Canvas not available, skipping canvas event listeners');
      return;
    }

    // Delegate to existing inputHandler.ts which sets up mouse events
    // This maintains backward compatibility with the existing input system
    const appCompat = {
      canvas: this.dependencies.canvas,
      camera: this.dependencies.viewportManager.camera,
      onMouseDown: this.handleMouseDown.bind(this),
      onMouseMove: this.handleMouseMove.bind(this),
      onMouseUp: this.handleMouseUp.bind(this),
      onWheel: this.handleWheel.bind(this),
      addComponent: (type: string, x: number, y: number) => {
        // Delegate to ComponentLifecycleManager
        return this.dependencies.componentLifecycleManager.createComponent(
          type,
          x,
          y,
          this.dependencies.currentView
        );
      },
    };

    // TODO: Temporarily disabled to fix hanging issue
    // setupInputListeners(appCompat);
  }

  /**
   * Setup keyboard shortcut listeners
   */
  private setupKeyboardShortcuts(): void {
    const keydownHandler = (event: KeyboardEvent) => {
      this.handleKeyboardShortcut(event);
    };

    document.addEventListener('keydown', keydownHandler);
    this.eventListeners.push({
      element: document,
      event: 'keydown',
      handler: keydownHandler as EventListener,
    });
  }

  /**
   * Setup UI button event handlers
   */
  private setupUIEventHandlers(): void {
    // Help overlay click handling
    const helpOverlay = document.getElementById('help-overlay');
    if (helpOverlay) {
      const helpClickHandler = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (target?.id === 'help-overlay') {
          target.classList.remove('active');
        }
      };
      helpOverlay.addEventListener('click', helpClickHandler);
      this.eventListeners.push({
        element: helpOverlay,
        event: 'click',
        handler: helpClickHandler,
      });
    }

    // Back button handled by UIController - removed duplicate handler

    // Help button handled by UIController - removed duplicate handler

    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      const resetHandler = () => {
        if (confirm('Reset the entire board? This cannot be undone.')) {
          this.dependencies.components.length = 0;
          this.dependencies.connections.length = 0;
          this.dependencies.setSelectedComponent(null);
          this.dependencies.hideDatasheet();
        }
      };
      resetBtn.addEventListener('click', resetHandler);
      this.eventListeners.push({
        element: resetBtn,
        event: 'click',
        handler: resetHandler,
      });
    }

    // Export button
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      const exportHandler = () => {
        eventBus.emit(Events.PROJECT_EXPORT_REQUESTED, {
          timestamp: Date.now(),
        });
      };
      exportBtn.addEventListener('click', exportHandler);
      this.eventListeners.push({
        element: exportBtn,
        event: 'click',
        handler: exportHandler,
      });
    }
  }

  /**
   * Setup file import handler
   */
  private setupImportHandler(): void {
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      const importHandler = () => {
        eventBus.emit(Events.PROJECT_IMPORT_REQUESTED, {
          timestamp: Date.now(),
        });
      };
      importBtn.addEventListener('click', importHandler);
      this.eventListeners.push({
        element: importBtn,
        event: 'click',
        handler: importHandler,
      });
    }
  }

  /**
   * Setup event handlers for ExportImportManager integration
   */
  private setupExportImportEventHandlers(): void {
    // Handle requests for current project state
    eventBus.on(
      Events.PROJECT_STATE_REQUEST,
      (payload: {
        callback: (components: any[], connections: any[]) => void;
        timestamp: number;
      }) => {
        payload.callback(this.dependencies.components, this.dependencies.connections);
      }
    );

    // Note: PROJECT_IMPORTED event handling moved to main.ts setupExportImportEventHandlers()
    // which properly uses AppStateManager.setComponents() and setConnections()
    // Duplicate handler removed to avoid state management conflicts

    // Handle import errors
    eventBus.on(
      Events.PROJECT_IMPORT_ERROR,
      (payload: { error: string; filename?: string; projectData?: any; timestamp: number }) => {
        console.error('❌ Import error:', payload.error);
        alert(`Import Error: ${payload.error}`);
      }
    );

    // Handle export completion
    eventBus.on(
      Events.PROJECT_EXPORTED,
      (payload: {
        projectData: any;
        componentCount: number;
        connectionCount: number;
        timestamp: number;
      }) => {
        console.log(
          `✅ Project exported: ${payload.componentCount} components, ${payload.connectionCount} connections`
        );
      }
    );
  }

  /**
   * Handle mouse down events
   */
  public handleMouseDown(e: MouseEvent): void {
    const rect = this.dependencies.canvas.getBoundingClientRect();
    const worldCoord = this.dependencies.viewportManager.screenToWorld({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    const mouseX = worldCoord.x;
    const mouseY = worldCoord.y;

    if (e.button === 2) {
      // Right click - panning
      this.isPanning = true;
      // ViewportManager exposes the current camera via the `camera` property
      const cameraForPan = (this.dependencies.viewportManager as any).camera;
      this.panStart = { x: e.clientX - cameraForPan.x, y: e.clientY - cameraForPan.y };
      this.dependencies.canvas.style.cursor = 'grabbing';
      return;
    }

    // Check if clicking on a pin first
    const pinHit = this.dependencies.getPinAt(mouseX, mouseY);
    if (pinHit) {
      const connectionState = this.dependencies.connectionManager.getConnectionState();
      if (connectionState.isConnecting && connectionState.connectionStart) {
        // End connection
        this.dependencies.connectionManager.endConnection(pinHit);
        this.dependencies.canvas.style.cursor = 'grab';
        this.dependencies.updateConnectionModeUI();
        this.dependencies.uiLayer.clearConnectionIntents();
      } else {
        // Start connection
        this.dependencies.connectionManager.startConnection(pinHit);
        this.dependencies.canvas.style.cursor = 'crosshair';
        this.dependencies.updateConnectionModeUI();

        // Add connection intent
        this.dependencies.uiLayer.clearConnectionIntents();
        this.dependencies.uiLayer.addConnectionIntent({
          startPin: pinHit,
          isValid: true,
          category: pinHit.category ?? 'frontend',
        });
      }
      return;
    }

    // Check if clicking on a component
    const clickedComponent = this.dependencies.getComponentAt(mouseX, mouseY);

    if (clickedComponent) {
      if (e.detail === 2) {
        // Double click
        if (clickedComponent.type === 'module-ic') {
          // Enter schematic view
          this.dependencies.enterSchematicView(clickedComponent as ModuleComponent);
        } else {
          // Toggle status for other components
          this.dependencies.toggleComponentStatus(clickedComponent);
        }
      } else {
        // Single click - select
        this.dependencies.setSelectedComponent(clickedComponent);
        this.dependencies.showDatasheet(clickedComponent);
        this.isDragging = true;
        this.draggedComponent = clickedComponent; // Store locally for dragging
        this.dragOffset = {
          x: mouseX - clickedComponent.x,
          y: mouseY - clickedComponent.y,
        };

        // Add selection box and alignment guides (if features are enabled)
        if (isFeatureEnabled('ENABLE_SELECTION_HANDLES')) {
          this.dependencies.uiLayer.clearSelectionBoxes();
          this.dependencies.uiLayer.addSelectionBox(clickedComponent, 'single');
        }

        if (isFeatureEnabled('ENABLE_ALIGNMENT_GUIDES')) {
          this.dependencies.uiLayer.clearGuideLines();
          this.dependencies.uiLayer.addAlignmentGuides(
            clickedComponent,
            this.dependencies.getCurrentViewComponents()
          );
        }
      }
    } else {
      this.dependencies.setSelectedComponent(null);
      this.dependencies.hideDatasheet();
      this.dependencies.uiLayer.clearSelectionBoxes();
      this.dependencies.uiLayer.clearGuideLines();

      // Cancel connection if clicking on empty space
      if (this.dependencies.connectionManager.getConnectionState().isConnecting) {
        this.dependencies.connectionManager.cancelConnection();
        this.dependencies.canvas.style.cursor = 'grab';
        this.dependencies.updateConnectionModeUI();
      }
    }
  }

  /**
   * Handle mouse move events
   */
  public handleMouseMove(e: MouseEvent): void {
    const rect = this.dependencies.canvas.getBoundingClientRect();
    const worldCoord = this.dependencies.viewportManager.screenToWorld({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    const mouseX = worldCoord.x;
    const mouseY = worldCoord.y;
    // Update mouse position for connection intents
    this.mousePos = { x: mouseX, y: mouseY };

    if (this.isPanning) {
      // Access current camera from viewportManager.camera
      const camera = (this.dependencies.viewportManager as any).camera;
      const newCameraX = e.clientX - this.panStart.x;
      const newCameraY = e.clientY - this.panStart.y;
      this.dependencies.viewportManager.setCamera({
        x: newCameraX,
        y: newCameraY,
        zoom: camera.zoom,
      });
      return;
    }

    // Use locally stored dragged component instead of dependencies.selectedComponent
    if (this.isDragging && this.draggedComponent) {
      this.draggedComponent.x = mouseX - this.dragOffset.x;
      this.draggedComponent.y = mouseY - this.dragOffset.y;

      // Coalesce drag update via RAF
      this.pendingDragPayload = {
        componentId: this.draggedComponent.id,
        x: this.draggedComponent.x,
        y: this.draggedComponent.y,
        timestamp: Date.now(),
      };
      this.scheduleRafEmit();

      // Update selection box position (if features are enabled)
      if (isFeatureEnabled('ENABLE_SELECTION_HANDLES')) {
        this.dependencies.uiLayer.clearSelectionBoxes();
        this.dependencies.uiLayer.addSelectionBox(this.draggedComponent, 'single');
      }

      if (isFeatureEnabled('ENABLE_ALIGNMENT_GUIDES')) {
        this.dependencies.uiLayer.addAlignmentGuides(
          this.draggedComponent,
          this.dependencies.getCurrentViewComponents()
        );
      }
    }

    // Update connection intent if connecting
    const connectionState = this.dependencies.connectionManager.getConnectionState();
    if (connectionState.isConnecting && connectionState.connectionStart) {
      const pinHit = this.dependencies.getPinAt(mouseX, mouseY);
      const isValid =
        pinHit &&
        this.dependencies.connectionManager.validateConnection(
          connectionState.connectionStart,
          pinHit
        ).isValid;

      this.dependencies.uiLayer.clearConnectionIntents();
      this.dependencies.uiLayer.addConnectionIntent({
        startPin: connectionState.connectionStart,
        endPin: pinHit,
        isValid: isValid || false,
        category: connectionState.connectionStart.category ?? 'frontend',
      });

      // Coalesce connection preview emit via RAF
      this.pendingConnectionDrawing = {
        startPin: connectionState.connectionStart,
        currentPos: { x: mouseX, y: mouseY },
        isValid: isValid || false,
        timestamp: Date.now(),
      } as any;
      this.scheduleRafEmit();
    }
  }

  /**
   * Handle mouse up events
   */
  public handleMouseUp(): void {
    if (this.isPanning) {
      this.isPanning = false;
      this.dependencies.canvas.style.cursor = 'grab';
    }

    // Emit drag completed event if we were dragging
    if (this.isDragging && this.draggedComponent) {
      eventBus.emit(Events.COMPONENT_DRAG_COMPLETED, {
        componentId: this.draggedComponent.id,
        x: this.draggedComponent.x,
        y: this.draggedComponent.y,
        timestamp: Date.now(),
      });
    }

    this.isDragging = false;
    this.draggedComponent = null; // Clear local drag state
  }

  /**
   * Handle wheel events for zooming
   */
  private handleWheel(e: WheelEvent): void {
    this.dependencies.viewportManager.handleWheelEvent(e);
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyboardShortcut(event: KeyboardEvent): void {
    // Ignore keyboard shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
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
        if (event.shiftKey) {
          // Shift + ? = ?
          this.handleHelpKey();
        }
        break;
    }
  }

  /**
   * Handle Escape key - exit contexts and close modals
   */
  private handleEscapeKey(): void {
    // Priority 1: Close help overlay if open
    const helpOverlay = document.getElementById('help-overlay') as HTMLElement;
    if (helpOverlay && helpOverlay.classList.contains('active')) {
      helpOverlay.classList.remove('active');
      return;
    }

    // Priority 2: Exit connection mode if active
    if (this.dependencies.connectionManager.getConnectionState().isConnecting) {
      this.dependencies.connectionManager.cancelConnection();
      const connectionModeIndicator = document.getElementById('connection-mode') as HTMLElement;
      if (connectionModeIndicator) {
        connectionModeIndicator.style.display = 'none';
      }
      return;
    }

    // Priority 3: Clear component selection
    if (this.dependencies.selectedComponent) {
      this.dependencies.setSelectedComponent(null);
      hideDatasheetUI();
      return;
    }

    // Priority 4: Exit schematic view if in one
    if (this.dependencies.currentView.type === 'schematic') {
      this.dependencies.exitSchematicView();
      return;
    }
  }

  /**
   * Handle Tab key - cycle between views
   */
  private handleTabKey(shiftPressed: boolean): void {
    if (this.dependencies.isTransitioning) return;

    const viewStackSize = this.dependencies.viewStack.size();

    if (viewStackSize === 0) {
      return;
    }

    if (shiftPressed) {
      // Shift+Tab: Go back one level
      if (this.dependencies.currentView.type === 'schematic') {
        this.dependencies.exitSchematicView();
      }
    } else {
      // Tab: Navigate deeper or cycle through Module ICs
      if (this.dependencies.currentView.type === 'main') {
        // Find first Module IC and enter it
        const moduleICs = this.dependencies.components.filter(c => c.type === 'module-ic');
        if (moduleICs.length > 0) {
          this.dependencies.enterSchematicView(moduleICs[0] as ModuleComponent);
        }
      } else {
        // In schematic view - find next Module IC or exit to main
        const currentComponents = this.dependencies.getCurrentViewComponents();
        const moduleICs = currentComponents.filter(c => c.type === 'module-ic');
        if (moduleICs.length > 0) {
          this.dependencies.enterSchematicView(moduleICs[0] as ModuleComponent);
        } else {
          this.dependencies.exitSchematicView();
        }
      }
    }
  }

  /**
   * Handle Space key - toggle component status
   */
  private handleSpaceKey(): void {
    const selectedComponent = this.dependencies.selectedComponent;
    if (selectedComponent && selectedComponent.type !== 'power-core') {
      this.dependencies.toggleComponentStatus(selectedComponent);

      // Update datasheet if open
      if (document.getElementById('datasheet-panel')?.classList.contains('active')) {
        showDatasheetUI(this.dependencies as any, selectedComponent);
      }
    } else if (!selectedComponent) {
      // No component selected - show status hint
      this.dependencies.showTemporaryMessage(
        'Select a component first, then press SPACE to toggle its status'
      );
    }
  }

  /**
   * Handle F1 key - toggle help overlay
   */
  private handleHelpKey(): void {
    const helpOverlay = document.getElementById('help-overlay') as HTMLElement;
    if (helpOverlay) {
      if (helpOverlay.classList.contains('active')) {
        helpOverlay.classList.remove('active');
      } else {
        helpOverlay.classList.add('active');
      }
    }
  }

  /**
   * Get current mouse position
   */
  public getMousePosition(): { x: number; y: number } {
    return { ...this.mousePos };
  }

  /**
   * Get interaction state
   */
  public getInteractionState(): { isDragging: boolean; isPanning: boolean } {
    return {
      isDragging: this.isDragging,
      isPanning: this.isPanning,
    };
  }

  /**
   * Cleanup all event listeners
   */
  public destroy(): void {
    // Remove all event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners.length = 0;

    // Remove EventBus listeners would need specific handler references
    // For now, just log cleanup (proper cleanup would require storing handler refs)
    console.log('InputEventCoordinator: Event listeners cleaned up');
  }

  /**
   * Schedule a single RAF to emit the latest high-frequency interaction events
   */
  private scheduleRafEmit(): void {
    if (this.rafScheduled != null) return;
    this.rafScheduled = requestAnimationFrame(() => {
      this.rafScheduled = null;
      if (this.pendingDragPayload) {
        eventBus.emit(Events.COMPONENT_DRAG_UPDATED, this.pendingDragPayload);
        this.pendingDragPayload = null;
      }
      if (this.pendingConnectionDrawing) {
        eventBus.emit('connection.drawing', this.pendingConnectionDrawing);
        this.pendingConnectionDrawing = null;
      }
    });
  }
}

/**
 * Factory function to create InputEventCoordinator
 */
export function createInputEventCoordinator(
  dependencies: InputEventCoordinatorDependencies
): InputEventCoordinator {
  return new InputEventCoordinator(dependencies);
}

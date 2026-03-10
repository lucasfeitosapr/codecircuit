import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { Camera, ComponentBase, PinHit } from '../types';

/**
 * InputHandler - Phase 5 Legacy Code Extraction
 *
 * Handles all mouse, keyboard, and touch interactions for the Living Blueprint system.
 * Extracted from the monolithic MotherboardApp as part of Phase 5 modularization.
 *
 * Responsibilities:
 * - Mouse event handling (click, drag, wheel, context menu)
 * - Keyboard shortcuts and navigation
 * - Touch support for mobile devices
 * - Coordinate transformation between screen and world space
 * - Interaction state management (dragging, panning, connecting)
 *
 * Event-driven: Emits interaction events through the global EventBus
 * instead of directly manipulating application state.
 */
export class InputHandler {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private isPanning: boolean = false;
  private panStart: { x: number; y: number } = { x: 0, y: 0 };
  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private isConnecting: boolean = false;
  private connectionStart: PinHit | null = null;
  private mousePos: { x: number; y: number } = { x: 0, y: 0 };
  private selectedComponent: ComponentBase | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.setupEventListeners();
  }

  /**
   * Setup all input event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Drag and drop for component creation
    this.setupDragAndDrop();

    // Keyboard shortcuts
    this.setupKeyboardListeners();

    // UI controls
    this.setupUIControls();
  }

  /**
   * Setup drag and drop for component creation from the sidebar
   */
  private setupDragAndDrop(): void {
    // Make component items draggable
    document.querySelectorAll('.component-item').forEach((item: any) => {
      item.addEventListener('dragstart', (e: any) => {
        e.dataTransfer.setData('text/plain', item.dataset.component);
      });
      item.setAttribute('draggable', 'true');
    });

    // Canvas drop zone
    this.canvas.addEventListener('dragover', (e: any) => {
      e.preventDefault();
    });

    this.canvas.addEventListener('drop', (e: any) => {
      e.preventDefault();
      const componentType = e.dataTransfer.getData('text/plain');
      const worldPos = this.screenToWorld(e.clientX, e.clientY);

      // Emit component creation event
      eventBus.emit(Events.COMPONENT_CREATE_REQUESTED, {
        type: componentType,
        position: worldPos,
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Setup keyboard event listeners
   */
  private setupKeyboardListeners(): void {
    this.keydownHandler = (e: KeyboardEvent) => {
      // Escape key - cancel current operation
      if (e.key === 'Escape') {
        this.cancelCurrentOperation();
      }

      // Delete key - delete selected component
      if (e.key === 'Delete' && this.selectedComponent) {
        eventBus.emit(Events.COMPONENT_DELETE_REQUESTED, {
          componentId: this.selectedComponent.id,
          timestamp: Date.now(),
        });
      }

      // Space key - reset camera view
      if (e.key === ' ') {
        e.preventDefault();
        eventBus.emit(Events.CAMERA_RESET_REQUESTED, {
          timestamp: Date.now(),
        });
      }

      // Ctrl+Z - Undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        eventBus.emit(Events.UNDO_REQUESTED, {
          timestamp: Date.now(),
        });
      }

      // Ctrl+Y - Redo
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        eventBus.emit(Events.REDO_REQUESTED, {
          timestamp: Date.now(),
        });
      }
    };
    document.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Setup UI control event listeners
   */
  private setupUIControls(): void {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        eventBus.emit(Events.VIEW_EXIT_SCHEMATIC_REQUESTED, {
          timestamp: Date.now(),
        });
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
        eventBus.emit(Events.PROJECT_RESET_REQUESTED, {
          timestamp: Date.now(),
        });
      });
    }
  }

  /**
   * Handle mouse down events
   */
  private onMouseDown(e: MouseEvent): void {
    const worldPos = this.screenToWorld(e.clientX, e.clientY);

    if (e.button === 2) {
      // Right click - start panning
      this.startPanning(e);
      return;
    }

    // Check for pin interaction first
    eventBus.emit(Events.PIN_HIT_TEST_REQUESTED, {
      position: worldPos,
      callback: (pinHit: PinHit | null) => {
        if (pinHit) {
          this.handlePinInteraction(pinHit);
        } else {
          // Check for component interaction
          this.handleComponentInteraction(worldPos, e);
        }
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle mouse move events
   */
  private onMouseMove(e: MouseEvent): void {
    const worldPos = this.screenToWorld(e.clientX, e.clientY);
    this.mousePos = worldPos;

    // Update mouse position for connection drawing
    eventBus.emit(Events.MOUSE_POSITION_UPDATED, {
      position: worldPos,
      screenPosition: { x: e.clientX, y: e.clientY },
      timestamp: Date.now(),
    });

    if (this.isPanning) {
      this.handlePanning(e);
    } else if (this.isDragging && this.selectedComponent) {
      this.handleDragging(worldPos);
    }

    // Update cursor based on what's under the mouse
    this.updateCursor(worldPos);
  }

  /**
   * Handle mouse up events
   */
  private onMouseUp(): void {
    if (this.isPanning) {
      this.stopPanning();
    } else if (this.isDragging) {
      this.stopDragging();
    }
  }

  /**
   * Handle wheel events for zooming
   */
  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const worldPos = this.screenToWorld(e.clientX, e.clientY);
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

    eventBus.emit(Events.CAMERA_ZOOM_REQUESTED, {
      factor: zoomFactor,
      center: worldPos,
      timestamp: Date.now(),
    });
  }

  /**
   * Start panning operation
   */
  private startPanning(e: MouseEvent): void {
    this.isPanning = true;
    this.panStart = {
      x: e.clientX - this.camera.x,
      y: e.clientY - this.camera.y,
    };
    this.canvas.style.cursor = 'grabbing';
  }

  /**
   * Handle panning during mouse move
   */
  private handlePanning(e: MouseEvent): void {
    const newCamera = {
      x: e.clientX - this.panStart.x,
      y: e.clientY - this.panStart.y,
      zoom: this.camera.zoom,
    };

    eventBus.emit(Events.CAMERA_PAN_UPDATED, {
      camera: newCamera,
      timestamp: Date.now(),
    });
  }

  /**
   * Stop panning operation
   */
  private stopPanning(): void {
    this.isPanning = false;
    this.canvas.style.cursor = 'grab';
  }

  /**
   * Handle component dragging
   */
  private handleDragging(worldPos: { x: number; y: number }): void {
    if (!this.selectedComponent) return;

    const newPosition = {
      x: worldPos.x - this.dragOffset.x,
      y: worldPos.y - this.dragOffset.y,
    };

    eventBus.emit(Events.COMPONENT_DRAG_UPDATED, {
      componentId: this.selectedComponent.id,
      position: newPosition,
      timestamp: Date.now(),
    });
  }

  /**
   * Stop dragging operation
   */
  private stopDragging(): void {
    if (this.isDragging && this.selectedComponent) {
      eventBus.emit(Events.COMPONENT_DRAG_COMPLETED, {
        componentId: this.selectedComponent.id,
        timestamp: Date.now(),
      });
    }
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  /**
   * Handle pin interactions (connection creation)
   */
  private handlePinInteraction(pinHit: PinHit): void {
    if (this.isConnecting && this.connectionStart) {
      // Basic validation: must connect output→input or input→output (not same type)
      const startIsInput = this.connectionStart.isInputPin || this.connectionStart.pinType === 'input';
      const endIsInput = pinHit.isInputPin || pinHit.pinType === 'input';

      if (startIsInput === endIsInput) {
        // Invalid: connecting input→input or output→output
        this.cancelConnectionMode();
        return;
      }

      // Complete connection
      eventBus.emit(Events.CONNECTION_CREATE_REQUESTED, {
        startPin: this.connectionStart,
        endPin: pinHit,
        timestamp: Date.now(),
      });
      this.cancelConnectionMode();
    } else {
      // Start connection
      this.startConnectionMode(pinHit);
    }
  }

  /**
   * Handle component interactions (selection, double-click)
   */
  private handleComponentInteraction(worldPos: { x: number; y: number }, e: MouseEvent): void {
    eventBus.emit(Events.COMPONENT_HIT_TEST_REQUESTED, {
      position: worldPos,
      callback: (component: ComponentBase | null) => {
        if (component) {
          if (e.detail === 2) {
            // Double click
            this.handleDoubleClick(component);
          } else {
            // Single click - select and start dragging
            this.selectComponent(component, worldPos);
          }
        } else {
          // Click on empty space
          this.clearSelection();
        }
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle double-click on component
   */
  private handleDoubleClick(component: ComponentBase): void {
    if (component.type === 'module-ic') {
      // Enter schematic view
      eventBus.emit(Events.VIEW_ENTER_SCHEMATIC_REQUESTED, {
        component,
        timestamp: Date.now(),
      });
    } else {
      // Toggle status
      eventBus.emit(Events.COMPONENT_STATUS_TOGGLE_REQUESTED, {
        componentId: component.id,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Select a component and prepare for dragging
   */
  private selectComponent(component: ComponentBase, worldPos: { x: number; y: number }): void {
    this.selectedComponent = component;
    this.isDragging = true;
    this.dragOffset = {
      x: worldPos.x - component.x,
      y: worldPos.y - component.y,
    };

    eventBus.emit(Events.COMPONENT_SELECTED, {
      component,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear component selection
   */
  private clearSelection(): void {
    if (this.selectedComponent) {
      eventBus.emit(Events.COMPONENT_DESELECTED, {
        componentId: this.selectedComponent.id,
        timestamp: Date.now(),
      });
    }
    this.selectedComponent = null;
  }

  /**
   * Start connection mode
   */
  private startConnectionMode(pinHit: PinHit): void {
    this.isConnecting = true;
    this.connectionStart = pinHit;
    this.canvas.style.cursor = 'crosshair';

    eventBus.emit(Events.CONNECTION_MODE_STARTED, {
      startPin: pinHit,
      timestamp: Date.now(),
    });
  }

  /**
   * Cancel connection mode
   */
  private cancelConnectionMode(): void {
    this.isConnecting = false;
    this.connectionStart = null;
    this.canvas.style.cursor = 'grab';

    eventBus.emit(Events.CONNECTION_MODE_CANCELLED, {
      timestamp: Date.now(),
    });
  }

  /**
   * Cancel current operation (escape key)
   */
  private cancelCurrentOperation(): void {
    if (this.isConnecting) {
      this.cancelConnectionMode();
    } else if (this.isDragging) {
      this.stopDragging();
    } else if (this.isPanning) {
      this.stopPanning();
    }
  }

  /**
   * Update cursor based on what's under the mouse
   */
  private updateCursor(worldPos: { x: number; y: number }): void {
    if (this.isConnecting) {
      this.canvas.style.cursor = 'crosshair';
      return;
    }

    // Check for pin hover
    eventBus.emit(Events.PIN_HIT_TEST_REQUESTED, {
      position: worldPos,
      callback: (pinHit: PinHit | null) => {
        if (pinHit) {
          this.canvas.style.cursor = 'pointer';
        } else {
          // Check for component hover
          eventBus.emit(Events.COMPONENT_HIT_TEST_REQUESTED, {
            position: worldPos,
            callback: (component: ComponentBase | null) => {
              this.canvas.style.cursor = component ? 'grab' : 'default';
            },
            timestamp: Date.now(),
          });
        }
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.camera.x) / this.camera.zoom,
      y: (screenY - rect.top - this.camera.y) / this.camera.zoom,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX * this.camera.zoom + this.camera.x,
      y: worldY * this.camera.zoom + this.camera.y,
    };
  }

  /**
   * Get current mouse position in world coordinates
   */
  public getMousePosition(): { x: number; y: number } {
    return { ...this.mousePos };
  }

  /**
   * Update camera reference (called when camera changes externally)
   */
  public updateCamera(camera: Camera): void {
    this.camera = camera;
  }

  /**
   * Update selected component reference (called when selection changes externally)
   */
  public updateSelectedComponent(component: ComponentBase | null): void {
    this.selectedComponent = component;
  }

  /**
   * Cleanup event listeners
   */
  public destroy(): void {
    // Remove all event listeners
    this.canvas.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.removeEventListener('wheel', this.onWheel.bind(this));

    // Remove keyboard listeners (use stored reference)
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }

    // Clear UI control listeners
    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.removeEventListener('click', () => {});

    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) helpBtn.removeEventListener('click', () => {});

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.removeEventListener('click', () => {});
  }
}

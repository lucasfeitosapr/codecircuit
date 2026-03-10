import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import { layeredRenderer } from '../rendering/LayeredRenderer';
import { renderComponent } from '../rendering/ImplementationHelpers';
import { isNewRendererEnabled } from '../config/FeatureFlagAdapter';
import {
  drawGrid as rendererDrawGrid,
  drawSchematicBackground as rendererDrawSchematicBackground,
  drawOrthogonalTrace as rendererDrawOrthogonalTrace,
} from '../renderer';
import type { ComponentBase, Connection, Camera } from '../types';

/**
 * RendererIntegrationManager
 *
 * Coordinates between the legacy renderer and the new LayeredRenderer system.
 * Handles the main render loop, animation timing, and feature flag switching.
 *
 * Phase 6A Extraction: ~500-600 lines from MotherboardApp
 */
export class RendererIntegrationManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private isAnimating: boolean = false;

  // Store current render context for use in helper methods
  private currentCategories: any = {};
  private currentSelectedComponentId: string | null = null;
  private currentConnections: Connection[] = [];

  // Store listener functions for proper cleanup
  private listeners = {
    requestRender: () => this.requestRender(),
  };

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, categories: any = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.currentCategories = categories;

    this.setupEventListeners();
  }

  /**
   * Set categories for component rendering
   */
  setCategories(categories: any): void {
    this.currentCategories = categories;
  }

  private setupEventListeners(): void {
    // Listen for events that require re-rendering
    eventBus.on(Events.ComponentCreated, this.listeners.requestRender);
    eventBus.on(Events.ComponentUpdated, this.listeners.requestRender);
    eventBus.on(Events.ComponentDeleted, this.listeners.requestRender);
    eventBus.on(Events.ConnectionCreated, this.listeners.requestRender);
    eventBus.on(Events.ConnectionUpdated, this.listeners.requestRender);
    eventBus.on(Events.VIEWPORT_CAMERA_UPDATED, this.listeners.requestRender);

    eventBus.on(Events.COMPONENT_DRAG_UPDATED, this.listeners.requestRender);
    eventBus.on(Events.COMPONENT_DRAG_COMPLETED, this.listeners.requestRender);
  }

  /**
   * Start the animation loop
   */
  startAnimation(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  }

  /**
   * Stop the animation loop
   */
  stopAnimation(): void {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Request a single render frame
   */
  requestRender(): void {
    if (!this.isAnimating && !this.animationId) {
      this.animationId = requestAnimationFrame(() => {
        this.render();
        this.animationId = null;
      });
    }
  }

  /**
   * Main animation loop
   */
  private animate(): void {
    if (!this.isAnimating) return;

    this.render();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  /**
   * Main render method - coordinates between new and legacy renderers
   */
  render(
    components: ComponentBase[] = [],
    connections: Connection[] = [],
    camera: Camera = { x: 0, y: 0, zoom: 1 },
    selectedComponent: ComponentBase | null = null,
    isDragging: boolean = false,
    dragOffset: { x: number; y: number } = { x: 0, y: 0 }
  ): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Use LayeredRenderer (feature-flagged) or fallback to legacy drawing
    if (isNewRendererEnabled()) {
      try {
        // Prepare render state for LayeredRenderer
        const renderState = {
          timestamp: performance.now(),
          camera,
          components,
          connections,
          selectedComponent,
          isDragging,
          dragOffset,
          canvas: this.canvas,
          // Additional state for layers
          particles: [], // TODO: Extract particle system
          pulses: [], // TODO: Extract pulse system
          ui: {
            showGrid: true,
            showPins: true,
            showLabels: true,
          },
        };

        layeredRenderer.render(this.ctx, renderState);

        // Emit render completion event
        eventBus.emit(Events.RENDER_FRAME_COMPLETE, {
          renderer: 'layered',
          timestamp: performance.now(),
          componentsRendered: components.length,
          connectionsRendered: connections.length,
        });
      } catch (error) {
        console.error('LayeredRenderer error, falling back to legacy:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown render error';
        eventBus.emit(Events.RENDER_ERROR, { error: errorMessage, renderer: 'layered' });
        this.renderLegacy(
          components,
          connections,
          camera,
          selectedComponent,
          isDragging,
          dragOffset
        );
      }
    } else {
      this.renderLegacy(components, connections, camera, selectedComponent, isDragging, dragOffset);
    }
  }

  /**
   * Legacy render path for backward compatibility
   */
  private renderLegacy(
    components: ComponentBase[],
    connections: Connection[],
    camera: Camera,
    selectedComponent: ComponentBase | null,
    isDragging: boolean,
    dragOffset: { x: number; y: number }
  ): void {
    // Store render context for use in helper methods
    this.currentConnections = connections;
    this.currentSelectedComponentId = selectedComponent?.id || null;

    // Background and grid
    this.drawSchematicBackground(camera);
    this.drawGrid(camera);

    // Components
    for (const component of components) {
      this.drawComponent(component, camera);
    }

    // Connections
    this.drawConnections(connections, camera);

    // Selection and UI overlays
    if (selectedComponent) {
      this.drawSelectionBox(selectedComponent, camera);
    }

    // Emit render completion event
    eventBus.emit(Events.RENDER_FRAME_COMPLETE, {
      renderer: 'legacy',
      timestamp: performance.now(),
      componentsRendered: components.length,
      connectionsRendered: connections.length,
    });
  }

  /**
   * Draw the schematic background
   */
  private drawSchematicBackground(camera: Camera): void {
    rendererDrawSchematicBackground(this.ctx, camera, this.canvas);
  }

  /**
   * Draw the grid
   */
  private drawGrid(camera: Camera): void {
    rendererDrawGrid(this.ctx, camera, this.canvas);
  }

  /**
   * Draw a single component
   */
  private drawComponent(component: ComponentBase, camera: Camera): void {
    try {
      renderComponent(this.ctx, { timestamp: performance.now(), camera }, component, {
        camera,
        categories: this.currentCategories,
        selectedComponentId: this.currentSelectedComponentId,
        connections: this.currentConnections,
      });
    } catch (error) {
      console.error('Error rendering component:', component.id, error);
      // Draw error placeholder
      this.drawErrorPlaceholder(component, camera);
    }
  }

  /**
   * Draw all connections
   */
  private drawConnections(connections: Connection[], camera: Camera): void {
    for (const connection of connections) {
      if (!connection || !connection.from || !connection.to) {
        console.warn('Invalid connection detected:', connection);
        continue;
      }

      try {
        this.drawConnection(connection, camera);
      } catch (error) {
        console.error('Error rendering connection:', connection.id, error);
      }
    }
  }

  /**
   * Draw a single connection
   */
  private drawConnection(connection: Connection, camera: Camera): void {
    // TODO: Extract to ConnectionRenderer or use LayeredRenderer
    // For now, draw a simple line between connection points
    if (!connection.from || !connection.to) return;

    this.ctx.strokeStyle = '#00ff41';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const fromX = (connection.from.x - camera.x) * camera.zoom;
    const fromY = (connection.from.y - camera.y) * camera.zoom;
    const toX = (connection.to.x - camera.x) * camera.zoom;
    const toY = (connection.to.y - camera.y) * camera.zoom;

    rendererDrawOrthogonalTrace(this.ctx, fromX, fromY, toX, toY);
  }

  /**
   * Draw selection box around selected component
   */
  private drawSelectionBox(component: ComponentBase, camera: Camera): void {
    this.ctx.save();
    this.ctx.strokeStyle = '#00ff41';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    const x = (component.x - camera.x) * camera.zoom;
    const y = (component.y - camera.y) * camera.zoom;
    const width = component.width * camera.zoom;
    const height = component.height * camera.zoom;

    this.ctx.strokeRect(x - 5, y - 5, width + 10, height + 10);
    this.ctx.restore();
  }

  /**
   * Draw error placeholder for failed component renders
   */
  private drawErrorPlaceholder(component: ComponentBase, camera: Camera): void {
    this.ctx.save();
    this.ctx.fillStyle = '#ff4444';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;

    const x = (component.x - camera.x) * camera.zoom;
    const y = (component.y - camera.y) * camera.zoom;
    const width = component.width * camera.zoom;
    const height = component.height * camera.zoom;

    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);

    // Draw X
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.moveTo(x + 5, y + 5);
    this.ctx.lineTo(x + width - 5, y + height - 5);
    this.ctx.moveTo(x + width - 5, y + 5);
    this.ctx.lineTo(x + 5, y + height - 5);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Draw transition overlay for view changes
   */
  drawTransitionOverlay(progress: number): void {
    this.ctx.save();
    this.ctx.fillStyle = `rgba(0, 0, 0, ${0.7 * (1 - progress)})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  /**
   * Get canvas dimensions
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    this.stopAnimation();
    // Remove event listeners
    eventBus.off(Events.ComponentCreated, this.listeners.requestRender);
    eventBus.off(Events.ComponentUpdated, this.listeners.requestRender);
    eventBus.off(Events.ComponentDeleted, this.listeners.requestRender);
    eventBus.off(Events.ConnectionCreated, this.listeners.requestRender);
    eventBus.off(Events.ConnectionUpdated, this.listeners.requestRender);
    eventBus.off(Events.VIEWPORT_CAMERA_UPDATED, this.listeners.requestRender);
  }
}

/**
 * Factory function to create and initialize RendererIntegrationManager
 */
export function createRendererIntegrationManager(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  categories: any = {}
): RendererIntegrationManager {
  return new RendererIntegrationManager(canvas, ctx, categories);
}

/**
 * Global instance for backward compatibility
 * TODO: Remove once main.ts is fully refactored
 */
let globalRendererManager: RendererIntegrationManager | null = null;

export function getRendererIntegrationManager(): RendererIntegrationManager | null {
  return globalRendererManager;
}

export function setRendererIntegrationManager(manager: RendererIntegrationManager): void {
  globalRendererManager = manager;
}

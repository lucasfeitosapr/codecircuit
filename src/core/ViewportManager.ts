/**
 * ViewportManager - Professional Viewport and Camera Management
 *
 * Extracted from MotherboardApp as part of Phase 5 Legacy Code Decomposition.
 * Handles canvas setup, camera transformations, zoom/pan operations, and
 * coordinate conversions with full event-driven integration.
 *
 * Features:
 * - Canvas initialization and responsive resizing
 * - Camera zoom, pan, and position management
 * - Screen-to-world and world-to-screen coordinate transformations
 * - Viewport bounds calculations for efficient rendering
 * - Mouse wheel zoom with proper zoom-to-cursor behavior
 * - Event-driven architecture integration via EventBus
 *
 * @version 1.0.0
 * @author Elena Rodriguez - Senior Software Architect
 */

import { EventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type {
  ViewportCameraUpdatedPayload,
  ViewportResizedPayload,
  ViewportZoomRequestedPayload,
  ViewportPanRequestedPayload,
  ViewportCanvasSetupCompletedPayload,
} from '../events/eventTypes';
import { Camera } from '../types';

export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ScreenCoordinate {
  x: number;
  y: number;
}

export interface WorldCoordinate {
  x: number;
  y: number;
}

export interface ViewportManager {
  // Core properties
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;

  // Initialization
  initialize(): void;
  setupCanvas(): void;

  // Camera operations
  setCamera(camera: Camera): void;
  updateCamera(deltaX: number, deltaY: number, zoom?: number): void;
  zoomToPoint(zoomFactor: number, screenX: number, screenY: number): void;
  panCamera(deltaX: number, deltaY: number): void;

  // Coordinate transformations
  screenToWorld(screenCoord: ScreenCoordinate): WorldCoordinate;
  worldToScreen(worldCoord: WorldCoordinate): ScreenCoordinate;

  // Viewport utilities
  getViewportBounds(): ViewportBounds;
  isPointInViewport(worldX: number, worldY: number): boolean;
  fitToViewport(bounds: { x: number; y: number; width: number; height: number }): void;

  // Event handlers
  handleWheelEvent(event: WheelEvent): void;

  // Cleanup
  destroy(): void;
}

export class ViewportManagerImpl implements ViewportManager {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public camera: Camera;

  private eventBus: EventBus;
  private resizeObserver: ResizeObserver | null = null;
  private isDestroyed: boolean = false;

  // Configuration constants
  private static readonly MIN_ZOOM = 0.1;
  private static readonly MAX_ZOOM = 3.0;
  private static readonly ZOOM_FACTOR = 0.1; // 10% zoom increment
  private static readonly DEFAULT_ZOOM = 1.0;

  constructor(canvasId: string, eventBus: EventBus) {
    // Initialize canvas and context
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.eventBus = eventBus;

    // Initialize camera with default values
    this.camera = {
      x: 0,
      y: 0,
      zoom: ViewportManagerImpl.DEFAULT_ZOOM,
    };

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Initialize the viewport manager and setup canvas
   */
  public initialize(): void {
    if (this.isDestroyed) {
      throw new Error('ViewportManager has been destroyed');
    }

    this.setupCanvas();
    this.eventBus.emit(Events.VIEWPORT_CANVAS_SETUP_COMPLETED, {
      canvasId: this.canvas.id,
      width: this.canvas.getBoundingClientRect().width,
      height: this.canvas.getBoundingClientRect().height,
      timestamp: Date.now(),
    } as ViewportCanvasSetupCompletedPayload);
  }

  /**
   * Setup canvas with proper sizing and device pixel ratio handling
   */
  public setupCanvas(): void {
    const resizeCanvas = () => {
      if (this.isDestroyed) return;

      const rect = this.canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const pixelRatio = window.devicePixelRatio || 1;

      // Set actual canvas size in memory (scaled for high DPI)
      this.canvas.width = width * pixelRatio;
      this.canvas.height = height * pixelRatio;

      // Set display size (CSS pixels)
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';

      // Scale the drawing context so everything draws at the correct size
      this.ctx.scale(pixelRatio, pixelRatio);

      // Emit resize event
      this.eventBus.emit(Events.VIEWPORT_RESIZED, {
        width,
        height,
        pixelRatio,
        timestamp: Date.now(),
      } as ViewportResizedPayload);
    };

    // Initial setup
    resizeCanvas();

    // Setup ResizeObserver for efficient resize handling
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(resizeCanvas);
      this.resizeObserver.observe(this.canvas);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', resizeCanvas);
    }
  }

  /**
   * Set camera position and zoom
   */
  public setCamera(camera: Camera): void {
    const oldCamera = { ...this.camera };

    this.camera = {
      x: camera.x,
      y: camera.y,
      zoom: Math.max(
        ViewportManagerImpl.MIN_ZOOM,
        Math.min(ViewportManagerImpl.MAX_ZOOM, camera.zoom)
      ),
    };

    // Emit camera update event
    this.eventBus.emit(Events.VIEWPORT_CAMERA_UPDATED, {
      camera: { ...this.camera },
      previousCamera: oldCamera,
      timestamp: Date.now(),
    } as ViewportCameraUpdatedPayload);
  }

  /**
   * Update camera with relative deltas
   */
  public updateCamera(deltaX: number, deltaY: number, zoom?: number): void {
    const newCamera = {
      x: this.camera.x + deltaX,
      y: this.camera.y + deltaY,
      zoom: zoom !== undefined ? zoom : this.camera.zoom,
    };

    this.setCamera(newCamera);
  }

  /**
   * Zoom to a specific point with proper zoom-to-cursor behavior
   */
  public zoomToPoint(zoomFactor: number, screenX: number, screenY: number): void {
    const oldZoom = this.camera.zoom;
    const newZoom = Math.max(
      ViewportManagerImpl.MIN_ZOOM,
      Math.min(ViewportManagerImpl.MAX_ZOOM, oldZoom * zoomFactor)
    );

    // If zoom didn't actually change, no need to update
    if (Math.abs(newZoom - oldZoom) < 0.001) {
      return;
    }

    // Convert screen coordinates to world coordinates at current zoom
    const worldX = (screenX - this.camera.x) / oldZoom;
    const worldY = (screenY - this.camera.y) / oldZoom;

    // Calculate new camera position to keep the cursor point stationary
    const newCameraX = screenX - worldX * newZoom;
    const newCameraY = screenY - worldY * newZoom;

    this.setCamera({
      x: newCameraX,
      y: newCameraY,
      zoom: newZoom,
    });
  }

  /**
   * Pan the camera by delta amounts
   */
  public panCamera(deltaX: number, deltaY: number): void {
    this.updateCamera(deltaX, deltaY);
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  public screenToWorld(screenCoord: ScreenCoordinate): WorldCoordinate {
    return {
      x: (screenCoord.x - this.camera.x) / this.camera.zoom,
      y: (screenCoord.y - this.camera.y) / this.camera.zoom,
    };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  public worldToScreen(worldCoord: WorldCoordinate): ScreenCoordinate {
    return {
      x: worldCoord.x * this.camera.zoom + this.camera.x,
      y: worldCoord.y * this.camera.zoom + this.camera.y,
    };
  }

  /**
   * Get the current viewport bounds in world coordinates
   */
  public getViewportBounds(): ViewportBounds {
    const rect = this.canvas.getBoundingClientRect();
    const topLeft = this.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.screenToWorld({ x: rect.width, y: rect.height });

    return {
      left: topLeft.x,
      top: topLeft.y,
      right: bottomRight.x,
      bottom: bottomRight.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
    };
  }

  /**
   * Check if a world coordinate point is visible in the current viewport
   */
  public isPointInViewport(worldX: number, worldY: number): boolean {
    const bounds = this.getViewportBounds();
    return (
      worldX >= bounds.left &&
      worldX <= bounds.right &&
      worldY >= bounds.top &&
      worldY <= bounds.bottom
    );
  }

  /**
   * Fit the camera to show the specified bounds
   */
  public fitToViewport(bounds: { x: number; y: number; width: number; height: number }): void {
    const rect = this.canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    // Calculate zoom to fit the bounds with some padding
    const padding = 50; // pixels of padding
    const zoomX = (canvasWidth - padding * 2) / bounds.width;
    const zoomY = (canvasHeight - padding * 2) / bounds.height;
    const zoom = Math.min(zoomX, zoomY, ViewportManagerImpl.MAX_ZOOM);

    // Center the bounds in the viewport
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const cameraX = canvasWidth / 2 - centerX * zoom;
    const cameraY = canvasHeight / 2 - centerY * zoom;

    this.setCamera({
      x: cameraX,
      y: cameraY,
      zoom: Math.max(ViewportManagerImpl.MIN_ZOOM, zoom),
    });
  }

  /**
   * Handle mouse wheel events for zooming
   */
  public handleWheelEvent(event: WheelEvent): void {
    event.preventDefault();

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Determine zoom direction and factor
    const zoomFactor =
      event.deltaY > 0 ? 1 - ViewportManagerImpl.ZOOM_FACTOR : 1 + ViewportManagerImpl.ZOOM_FACTOR;

    // Emit zoom request event
    this.eventBus.emit(Events.VIEWPORT_ZOOM_REQUESTED, {
      zoomFactor,
      screenX: mouseX,
      screenY: mouseY,
      wheelDelta: event.deltaY,
      timestamp: Date.now(),
    } as ViewportZoomRequestedPayload);

    // Apply the zoom
    this.zoomToPoint(zoomFactor, mouseX, mouseY);
  }

  /**
   * Setup event listeners for viewport events
   */
  private setupEventListeners(): void {
    // Listen for pan requests
    this.eventBus.on(Events.VIEWPORT_PAN_REQUESTED, (payload: ViewportPanRequestedPayload) => {
      this.panCamera(payload.deltaX, payload.deltaY);
    });

    // Listen for zoom requests
    this.eventBus.on(Events.VIEWPORT_ZOOM_REQUESTED, (payload: ViewportZoomRequestedPayload) => {
      this.zoomToPoint(payload.zoomFactor, payload.screenX, payload.screenY);
    });
  }

  /**
   * Clean up resources and event listeners
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove fallback resize listener if it was added
    window.removeEventListener('resize', this.setupCanvas);

    // Clean up event subscriptions would go here if we stored handler references
    // For now, the EventBus doesn't provide a way to remove specific handlers
    // without the exact handler reference, so we'll leave this for future improvement
  }
}

// Export singleton factory function for easy integration
let viewportManagerInstance: ViewportManager | null = null;

export function createViewportManager(canvasId: string, eventBus: EventBus): ViewportManager {
  if (viewportManagerInstance) {
    throw new Error(
      'ViewportManager instance already exists. Use getViewportManager() to access it.'
    );
  }

  viewportManagerInstance = new ViewportManagerImpl(canvasId, eventBus);
  return viewportManagerInstance;
}

export function getViewportManager(): ViewportManager {
  if (!viewportManagerInstance) {
    throw new Error('ViewportManager not initialized. Call createViewportManager() first.');
  }

  return viewportManagerInstance;
}

export function destroyViewportManager(): void {
  if (viewportManagerInstance) {
    viewportManagerInstance.destroy();
    viewportManagerInstance = null;
  }
}

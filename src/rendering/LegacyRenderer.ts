/**
 * Legacy Renderer Module
 *
 * Extracted from main.ts - contains all legacy rendering methods
 * that were previously inline in the MotherboardApp class.
 *
 * This module handles:
 * - Canvas drawing operations (grid, backgrounds, overlays)
 * - Trace rendering (orthogonal, intention, temp connections)
 * - Component and connection rendering delegation
 * - Legacy render loop (when LayeredRenderer is disabled)
 *
 * Created: 2025-09-22 (Phase 2A Extended - Main.ts Migration)
 */

import {
  drawGrid as rendererDrawGrid,
  drawSchematicBackground as rendererDrawSchematicBackground,
  drawOrthogonalTrace as rendererDrawOrthogonalTrace,
} from '../renderer';
import * as rendererHelpers from '../ui/rendererHelpers';
import { renderComponentWrapper } from '../ui/componentRenderer';
import { layeredRenderer } from './LayeredRenderer';
import { isNewRendererEnabled } from '../config/featureFlags';
import { BatchedComponentRenderer } from './BatchedComponentRenderer';
import { PerformanceConfig } from '../config/performanceConfig';
import { RenderProfiler } from './RenderProfiler';
import { logger } from '../utils/Logger';
import type { ComponentBase, Connection, Camera } from '../types';

export interface LegacyRendererContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  camera: Camera;
  categories: Record<string, { name: string; color: string }>;
  selectedComponent: ComponentBase | null;
  currentView: {
    type: string;
    connections: Connection[];
  };
  connectionManager: {
    getConnectionState(): {
      isConnecting: boolean;
      connectionStart: any;
    };
  };
  inputEventCoordinator: {
    getMousePosition(): { x: number; y: number };
    getInteractionState(): { isDragging: boolean };
  };
  isTransitioning: boolean;
  getCurrentViewComponents(): ComponentBase[];
  getCurrentViewConnections(): Connection[];
}

export class LegacyRenderer {
  // Shared batched renderer instance for optimal performance
  private static batchedRenderer = new BatchedComponentRenderer();
  /**
   * Main legacy render method - handles the complete render cycle
   * when LayeredRenderer is disabled or fails
   */
  static render(context: LegacyRendererContext): void {
    // Start frame profiling if enabled
    RenderProfiler.beginFrame();
    // Debug: Check if render is being called during component drag
    if (context.inputEventCoordinator.getInteractionState().isDragging) {
      if (PerformanceConfig.LOGGING?.LOG_RENDER_FRAMES) {
        logger.debug('render', 'Legacy render() called during drag');
      }
    }

    // Try LayeredRenderer first (feature-flagged)
    if (isNewRendererEnabled()) {
      try {
        const visibleModels = context.getCurrentViewComponents();
        // precompute simple connection pin positions for ConnectionsLayer
        const visibleConnections = context
          .getCurrentViewConnections()
          .map((connection: Connection) => {
            const fromPinDef = connection.from.component.pins?.output?.[connection.from.pinIndex];
            const toPinDef = connection.to.component.pins?.input?.[connection.to.pinIndex];
            const fromX = connection.from.component.x + (fromPinDef?.x ?? 0);
            const fromY = connection.from.component.y + (fromPinDef?.y ?? 0);
            const toX = connection.to.component.x + (toPinDef?.x ?? 0);
            const toY = connection.to.component.y + (toPinDef?.y ?? 0);
            return {
              ...connection,
              from: {
                ...connection.from,
                x: fromX,
                y: fromY,
                component: connection.from.component,
              },
              to: { ...connection.to, x: toX, y: toY, component: connection.to.component },
            };
          });

        // Begin frame when using layered path as well
        RenderProfiler.beginFrame();
        layeredRenderer.render(context.ctx, {
          timestamp: performance.now(),
          camera: context.camera,
          payload: {
            models: visibleModels,
            connections: visibleConnections,
            categories: context.categories,
            selectedComponentId: context.selectedComponent?.id ?? null,
            viewType: context.currentView.type,
            isConnecting: context.connectionManager.getConnectionState().isConnecting,
            connectionStart: context.connectionManager.getConnectionState().connectionStart,
            mousePos: context.inputEventCoordinator.getMousePosition(),
          },
        });
        // End frame with counts when layered path succeeds
        RenderProfiler.endFrame({
          componentsRendered: visibleModels?.length ?? 0,
          connectionsRendered: visibleConnections?.length ?? 0,
        });
        return;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('LayeredRenderer render failed, falling back to legacy renderer', e);
      }
    }

    // Legacy render path (unchanged behaviour)
    LegacyRenderer.renderLegacyPath(context);

    // End frame profiling with rough counts
    try {
      const componentsRendered = context.getCurrentViewComponents()?.length ?? 0;
      const connectionsRendered = context.getCurrentViewConnections()?.length ?? 0;
      RenderProfiler.endFrame({ componentsRendered, connectionsRendered });
    } catch (_) {
      RenderProfiler.endFrame({ componentsRendered: 0, connectionsRendered: 0 });
    }
  }

  /**
   * Legacy render path - the original rendering logic
   */
  private static renderLegacyPath(context: LegacyRendererContext): void {
    // Clear canvas
    context.ctx.clearRect(
      0,
      0,
      context.canvas.width / window.devicePixelRatio,
      context.canvas.height / window.devicePixelRatio
    );

    // Draw different background for schematic view
    if (context.currentView.type === 'schematic') {
      RenderProfiler.measureSection('grid', () => LegacyRenderer.drawSchematicBackground(context));
    } else {
      RenderProfiler.measureSection('grid', () => LegacyRenderer.drawGrid(context));
    }

    // Draw connections
  RenderProfiler.measureSection('connections', () => LegacyRenderer.drawConnections(context));

    // Draw temporary connection line
    const connectionState = context.connectionManager.getConnectionState();
    if (connectionState.isConnecting && connectionState.connectionStart) {
      LegacyRenderer.drawTempConnection(context);
    }

    // Draw components from current view
    const components = context.getCurrentViewComponents();

    // Phase 2C: Batched component rendering with viewport culling
    const camera = context.camera;
    const canvas = context.canvas;
    const viewportX = -camera.x / camera.zoom;
    const viewportY = -camera.y / camera.zoom;
    const viewportWidth = canvas.width / camera.zoom;
    const viewportHeight = canvas.height / camera.zoom;
    const margin = 100 / camera.zoom; // 100px margin in world space

    // Filter visible components first (viewport culling)
    const visibleComponents = components.filter((component: ComponentBase) => {
      return !(
        component.x + component.width < viewportX - margin ||
        component.x > viewportX + viewportWidth + margin ||
        component.y + component.height < viewportY - margin ||
        component.y > viewportY + viewportHeight + margin
      );
    });

    const culledComponents = components.length - visibleComponents.length;

    // Use batched rendering for better performance
    if (PerformanceConfig.ENABLE_BATCH_RENDERING && visibleComponents.length > 0) {
      RenderProfiler.measureSection('components', () =>
        LegacyRenderer.drawComponentsBatched(context, visibleComponents)
      );
    } else {
      // Fallback to individual rendering
      RenderProfiler.measureSection('components', () => {
        visibleComponents.forEach((component: ComponentBase) => {
          LegacyRenderer.drawComponent(context, component);
        });
      });
    }

    // Log culling stats occasionally for performance monitoring (gated)
    if (
      PerformanceConfig.LOGGING?.LOG_RENDER_FRAMES &&
      components.length > 10 &&
      Math.random() < 0.01 // ~1% of frames
    ) {
      logger.debug(
        'performance',
        `Viewport culling: ${culledComponents}/${components.length} components culled (${(
          (culledComponents / components.length) * 100
        ).toFixed(1)}%)`
      );
    }

    // Draw transition overlay if transitioning
    if (context.isTransitioning) {
      RenderProfiler.measureSection('ui', () => LegacyRenderer.drawTransitionOverlay(context));
    }
  }

  /**
   * Draw grid background
   */
  static drawGrid(context: LegacyRendererContext): void {
    rendererDrawGrid(context.ctx, context.camera, context.canvas);
  }

  /**
   * Draw schematic background
   */
  static drawSchematicBackground(context: LegacyRendererContext): void {
    rendererDrawSchematicBackground(context.ctx, context.camera, context.canvas);
  }

  /**
   * Draw transition overlay
   */
  static drawTransitionOverlay(context: LegacyRendererContext): void {
    // Simple overlay during transitions
    context.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    context.ctx.fillRect(
      0,
      0,
      context.canvas.width / window.devicePixelRatio,
      context.canvas.height / window.devicePixelRatio
    );
  }

  /**
   * Draw components using batched rendering for optimal performance
   */
  static drawComponentsBatched(context: LegacyRendererContext, components: ComponentBase[]): void {
    // Prepare connections once for all components (major optimization)
    const connections = context.getCurrentViewConnections();

    // Use the batched renderer with optimized context
    LegacyRenderer.batchedRenderer.renderComponents(context.ctx, components, {
      camera: context.camera,
      timestamp: performance.now(),
      categories: context.categories,
      selectedComponentId: context.selectedComponent?.id ?? null,
      connections,
    });
  }

  /**
   * Draw a single component (legacy method, kept for fallback)
   */
  static drawComponent(context: LegacyRendererContext, component: ComponentBase): void {
    // Create minimal app context for component renderer
    const appContext = {
      getCurrentViewConnections: context.getCurrentViewConnections,
      categories: context.categories,
      selectedComponent: context.selectedComponent,
    };
    renderComponentWrapper(context.ctx, context.camera, appContext, component);
  }

  /**
   * Draw all connections in current view
   */
  static drawConnections(context: LegacyRendererContext): void {
    const connections = context.getCurrentViewConnections();
    // Create minimal app context for renderer helpers
    const appContext = {
      ctx: context.ctx,
      camera: context.camera,
      categories: context.categories,
      connectionManager: context.connectionManager,
      inputEventCoordinator: context.inputEventCoordinator,
    };
    rendererHelpers.drawConnections(appContext, connections);
  }

  /**
   * Draw intention (dashed) trace for DEFINED components
   */
  static drawIntentionTrace(
    context: LegacyRendererContext,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    const appContext = {
      ctx: context.ctx,
      camera: context.camera,
      categories: context.categories,
    };
    rendererHelpers.drawIntentionTrace(appContext, fromX, fromY, toX, toY);
  }

  /**
   * Draw temporary connection line during connection creation
   */
  static drawTempConnection(context: LegacyRendererContext): void {
    const appContext = {
      ctx: context.ctx,
      camera: context.camera,
      categories: context.categories,
      connectionManager: context.connectionManager,
      inputEventCoordinator: context.inputEventCoordinator,
    };
    rendererHelpers.drawTempConnection(appContext);
  }

  /**
   * Draw orthogonal trace between two points
   */
  static drawOrthogonalTrace(
    context: LegacyRendererContext,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): void {
    rendererDrawOrthogonalTrace(context.ctx, fromX, fromY, toX, toY);
  }

  /**
   * Draw trace background
   */
  static drawTraceBackground(
    context: LegacyRendererContext,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isActive: boolean
  ): void {
    const appContext = {
      ctx: context.ctx,
      camera: context.camera,
      categories: context.categories,
    };
    rendererHelpers.drawTraceBackground(appContext, fromX, fromY, toX, toY, color, isActive);
  }

  /**
   * Draw active trace with power indication
   */
  static drawActiveTrace(
    context: LegacyRendererContext,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isPowered: boolean
  ): void {
    const appContext = {
      ctx: context.ctx,
      camera: context.camera,
      categories: context.categories,
    };
    rendererHelpers.drawActiveTrace(appContext, fromX, fromY, toX, toY, color, isPowered);
  }

  /**
   * Draw data flow animation
   */
  static drawDataFlow(
    context: LegacyRendererContext,
    connection: Connection,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
    isPowered: boolean
  ): void {
    const appContext = {
      ctx: context.ctx,
      camera: context.camera,
      categories: context.categories,
    };
    rendererHelpers.drawDataFlow(appContext, connection, fromX, fromY, toX, toY, color, isPowered);
  }

  /**
   * Get batched rendering performance statistics
   */
  static getBatchingStats(): any {
    return {
      enabled: PerformanceConfig.ENABLE_BATCH_RENDERING,
      ...LegacyRenderer.batchedRenderer.getStats(),
      performanceGain: LegacyRenderer.batchedRenderer.getPerformanceGain(),
    };
  }

  /**
   * Reset batching statistics
   */
  static resetBatchingStats(): void {
    LegacyRenderer.batchedRenderer.resetStats();
  }
}

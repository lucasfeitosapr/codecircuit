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
import type { ComponentBase, Connection, Camera, ModuleComponent } from '../types';

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
  /**
   * Main legacy render method - handles the complete render cycle
   * when LayeredRenderer is disabled or fails
   */
  static render(context: LegacyRendererContext): void {
    // Debug: Check if render is being called during component drag
    if (context.inputEventCoordinator.getInteractionState().isDragging) {
      console.log('🖼️ Legacy render() called during drag');
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
        return;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('LayeredRenderer render failed, falling back to legacy renderer', e);
      }
    }

    // Legacy render path (unchanged behaviour)
    LegacyRenderer.renderLegacyPath(context);
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
      LegacyRenderer.drawSchematicBackground(context);
    } else {
      LegacyRenderer.drawGrid(context);
    }

    // Draw connections
    LegacyRenderer.drawConnections(context);

    // Draw temporary connection line
    const connectionState = context.connectionManager.getConnectionState();
    if (connectionState.isConnecting && connectionState.connectionStart) {
      LegacyRenderer.drawTempConnection(context);
    }

    // Draw components from current view
    const components = context.getCurrentViewComponents();
    
    // Phase 2B: Add component viewport culling (similar to connection culling)
    const camera = context.camera;
    const canvas = context.canvas;
    const viewportX = -camera.x / camera.zoom;
    const viewportY = -camera.y / camera.zoom;
    const viewportWidth = canvas.width / camera.zoom;
    const viewportHeight = canvas.height / camera.zoom;
    const margin = 100 / camera.zoom; // 100px margin in world space
    
    let culledComponents = 0;
    
    components.forEach((component: ComponentBase) => {
      // Check if component is in viewport
      const isVisible = !(
        component.x + component.width < viewportX - margin ||
        component.x > viewportX + viewportWidth + margin ||
        component.y + component.height < viewportY - margin ||
        component.y > viewportY + viewportHeight + margin
      );
      
      if (isVisible) {
        LegacyRenderer.drawComponent(context, component);
      } else {
        culledComponents++;
      }
    });

    // Draw transition overlay if transitioning
    if (context.isTransitioning) {
      LegacyRenderer.drawTransitionOverlay(context);
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
   * Draw a single component
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
}

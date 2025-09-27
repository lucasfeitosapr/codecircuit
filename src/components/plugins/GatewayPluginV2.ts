// GatewayPluginV2.ts - Pentagon-shaped external integration component
// Phase 2B: Extended Component Architecture

import { BaseComponentPlugin } from './BaseComponentPlugin';
import { ComponentBase } from '../../types';
import { PluginMetadata } from '../../events/eventTypes';

export interface GatewayComponent extends ComponentBase {
  type: 'gateway';
  healthState: 'healthy' | 'degraded' | 'failed' | 'unknown';
  externalSystem: string; // Database, API, File System, etc.
  connectionUrl?: string; // Optional endpoint URL
  timeout?: number; // Connection timeout in ms
  retryCount?: number; // Number of retry attempts
  lastHealthCheck?: number; // Timestamp of last health check
}

/**
 * Creates a Gateway component with pentagon shape
 * Represents external system integration points
 */
export function createGateway(config: {
  x: number;
  y: number;
  id?: string;
  externalSystem?: string;
  connectionUrl?: string;
  timeout?: number;
}): GatewayComponent {
  const size = 60; // Pentagon size

  return {
    id: config.id || `gateway_${Date.now()}`,
    type: 'gateway',
    x: config.x,
    y: config.y,
    width: size,
    height: size,
    title: config.externalSystem || 'Gateway',
    externalSystem: config.externalSystem || 'External System',
    connectionUrl: config.connectionUrl,
    timeout: config.timeout || 5000,
    retryCount: 3,
    healthState: 'unknown',
    color: '#9B59B6', // Purple color for gateways
    status: 'defined',
    lastHealthCheck: undefined,

    // Pin configuration: 1 input, 1 output (bidirectional gateway)
    pins: {
      input: [
        {
          x: 15, // Left side input
          y: 30,
          type: 'input',
          label: 'request',
        },
      ],
      output: [
        {
          x: 45, // Right side output
          y: 30,
          type: 'output',
          label: 'response',
        },
      ],
    },
  };
}

/**
 * Renders a pentagon-shaped gateway with health state indicators
 */
export function renderGateway(
  ctx: CanvasRenderingContext2D | WebGLRenderingContext,
  frame: any,
  component?: GatewayComponent
): void {
  if (!component) {
    return;
  }

  // Check if we're in a test environment or have a valid canvas context
  const isCanvas =
    ctx &&
    ((typeof CanvasRenderingContext2D !== 'undefined' && ctx instanceof CanvasRenderingContext2D) ||
      ctx.constructor?.name === 'CanvasRenderingContext2D' ||
      'fillRect' in ctx); // Duck typing for test mocks

  if (!isCanvas) {
    return; // Skip WebGL or invalid context
  }

  // Cast to 2D context after validation
  const canvasCtx = ctx as CanvasRenderingContext2D;
  const { x, y, width, height, title, healthState, color, status } = component;
  const size = Math.min(width, height);

  // Apply camera transformation - EXACTLY follow DecisionPoint pattern
  const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
  const screenX = x * camera.zoom + camera.x;
  const screenY = y * camera.zoom + camera.y;
  const screenSize = size * camera.zoom;

  canvasCtx.save();
  canvasCtx.translate(screenX + screenSize / 2, screenY + screenSize / 2);

  // Pentagon shape path
  canvasCtx.beginPath();
  const radius = screenSize * 0.4; // Consistent sizing with DecisionPoint

  // Pentagon vertices (5 points) - ensure proper pentagon geometry
  const points = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2; // Start from top point
    const px = radius * Math.cos(angle);
    const py = radius * Math.sin(angle);
    points.push({ x: px, y: py });
  }

  // Draw the pentagon path
  canvasCtx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    canvasCtx.lineTo(points[i].x, points[i].y);
  }
  canvasCtx.closePath();

  // Fill with component color based on status - FOLLOW DecisionPoint pattern
  const fillColor = color || '#9B59B6';
  if (status === 'defined') {
    canvasCtx.fillStyle = 'rgba(155, 89, 182, 0.3)'; // Semi-transparent for defined
  } else {
    canvasCtx.fillStyle = fillColor;
  }
  canvasCtx.fill();

  // Border with status-based coloring - EXACTLY follow DecisionPoint pattern
  canvasCtx.lineWidth = 2;
  let borderColor = '#34495E'; // Default dark border
  let glowIntensity = 0;

  switch (status) {
    case 'defined':
      borderColor = '#00ffff';
      break;
    case 'todo':
      borderColor = fillColor + '66'; // Semi-transparent
      break;
    case 'in-progress':
      borderColor = '#ff00ff';
      glowIntensity = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
      break;
    case 'done':
      borderColor = '#00ff88';
      glowIntensity = 0.8;
      break;
    default:
      // Use health state for border when no specific status
      const healthColors = {
        healthy: '#27AE60', // Green
        degraded: '#F39C12', // Orange
        failed: '#E74C3C', // Red
        unknown: '#95A5A6', // Gray
      };
      borderColor = healthColors[healthState] || borderColor;
  }

  if (glowIntensity > 0) {
    canvasCtx.shadowColor = borderColor;
    canvasCtx.shadowBlur = 15 * glowIntensity * camera.zoom;
  }

  canvasCtx.strokeStyle = borderColor;
  canvasCtx.stroke();
  canvasCtx.shadowBlur = 0;

  // Gateway symbol (pentagon with ⬟ character) - follow DecisionPoint pattern
  canvasCtx.fillStyle = '#2C3E50';
  canvasCtx.font = `bold ${16 * camera.zoom}px Arial`;
  canvasCtx.textAlign = 'center';
  canvasCtx.textBaseline = 'middle';
  canvasCtx.fillText('⬟', 0, 0);

  // Title above pentagon - follow DecisionPoint pattern
  if (title && screenSize > 30) {
    canvasCtx.fillStyle = '#2C3E50';
    canvasCtx.font = `${12 * camera.zoom}px Arial`;
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'bottom';
    canvasCtx.fillText(title, 0, -screenSize / 2 - 8 * camera.zoom);
  }

  // Health state indicator (small circle in top-right) - only if there's space
  if (screenSize > 40) {
    const healthColors = {
      healthy: '#27AE60', // Green
      degraded: '#F39C12', // Orange
      failed: '#E74C3C', // Red
      unknown: '#95A5A6', // Gray
    };

    canvasCtx.beginPath();
    canvasCtx.arc(radius * 0.6, -radius * 0.6, 4 * camera.zoom, 0, Math.PI * 2);
    canvasCtx.fillStyle = healthColors[healthState];
    canvasCtx.fill();
    canvasCtx.strokeStyle = '#FFFFFF';
    canvasCtx.lineWidth = 1 * camera.zoom;
    canvasCtx.stroke();
  }

  // Status indicator at bottom of pentagon - EXACTLY follow DecisionPoint pattern
  if (status) {
    const statusColors: Record<string, string> = {
      defined: '#95A5A6', // Gray
      todo: '#3498DB', // Blue
      'in-progress': '#F39C12', // Orange
      done: '#2ECC71', // Green
    };

    canvasCtx.fillStyle = statusColors[status] || '#95A5A6';
    canvasCtx.beginPath();
    canvasCtx.arc(0, screenSize / 2 + 8 * camera.zoom, 4 * camera.zoom, 0, Math.PI * 2);
    canvasCtx.fill();
  }

  canvasCtx.restore();
}

/**
 * Evaluates gateway health and updates component state
 */
export function evaluateGateway(
  component: GatewayComponent,
  emit?: (event: string, payload: any) => void
): void {
  // Simulate health check (in real implementation, this would make actual calls)
  const now = Date.now();
  component.lastHealthCheck = now;

  // Simple health simulation (in real system, would ping external service)
  const healthRandom = Math.random();
  if (healthRandom > 0.8) {
    component.healthState = 'failed';
  } else if (healthRandom > 0.6) {
    component.healthState = 'degraded';
  } else {
    component.healthState = 'healthy';
  }

  // Emit health state change event
  if (emit) {
    emit('gateway:health_changed', {
      componentId: component.id,
      healthState: component.healthState,
      timestamp: now,
    });
  }
}

/**
 * GatewayPlugin - Event-driven architecture version
 * Follows the proven V2 plugin pattern established by DecisionPoint
 */
export class GatewayPluginV2 extends BaseComponentPlugin {
  type = 'gateway';
  metadata: PluginMetadata = {
    displayName: 'Gateway ⬟',
    icon: '⬟',
    color: '#9B59B6',
    category: 'integration',
    width: 60,
    height: 60,
    pins: {
      input: [
        {
          x: 15,
          y: 30,
          type: 'input',
          label: 'request',
        },
      ],
      output: [
        {
          x: 45,
          y: 30,
          type: 'output',
          label: 'response',
        },
      ],
    },
  };

  /**
   * Component factory - creates new Gateway components
   */
  createComponent(config: any): GatewayComponent {
    return createGateway(config);
  }

  /**
   * Render method - delegates to renderGateway function
   */
  renderComponent(ctx: CanvasRenderingContext2D, frame: any, component: ComponentBase): void {
    renderGateway(ctx, frame, component as GatewayComponent);
  }

  /**
   * Evaluation method - handles health checks and state updates
   */
  evaluateComponent(component: ComponentBase, emit?: (event: string, payload: any) => void): void {
    evaluateGateway(component as GatewayComponent, emit);
  }

  /**
   * Serialization - preserve all gateway data
   */
  serialize(component: ComponentBase): any {
    const gateway = component as GatewayComponent;
    return {
      ...component,
      healthState: gateway.healthState,
      externalSystem: gateway.externalSystem,
      connectionUrl: gateway.connectionUrl,
      timeout: gateway.timeout,
      retryCount: gateway.retryCount,
      lastHealthCheck: gateway.lastHealthCheck,
    };
  }

  /**
   * Deserialization - restore gateway from saved data
   */
  deserialize(data: any): GatewayComponent {
    return {
      ...data,
      type: 'gateway' as const,
      healthState: data.healthState || 'unknown',
      externalSystem: data.externalSystem || 'External System',
      timeout: data.timeout || 5000,
      retryCount: data.retryCount || 3,
    };
  }
}

/**
 * Legacy descriptor for plugin system compatibility
 * Required for the ImplementationHelpers.renderComponent to find our render method
 */
export const GatewayPluginLegacy = {
  id: 'gateway',
  displayName: 'Gateway ⬟',
  render: (ctx: any, frame: any, model: any) => {
    const plugin = new GatewayPluginV2();
    plugin.renderComponent(ctx, frame, model);
  },
  serialize: (model: any) => model,
  deserialize: (data: any) => data,
};

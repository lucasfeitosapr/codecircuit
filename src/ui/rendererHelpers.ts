import { drawOrthogonalTrace as rendererDrawOrthogonalTrace } from '../renderer';
import { hexToRgb as _hexToRgb, getPointOnPath as _getPointOnPath } from '../utils';
import type { Camera, Connection, ComponentBase, PinRef } from '../types';
import { ConnectionRenderer } from '../rendering/ConnectionRenderer';
import { PerformanceConfig } from '../config/FeatureFlagAdapter';
import { logger } from '../utils/Logger';

// Minimal app context used by these helpers. Keep it intentionally small so
// we don't accidentally couple to the entire application surface while
// still allowing the compiler to check the important fields.
interface AppContext {
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  categories: Record<string, { name: string; color: string }>;
  connectionManager?: {
    getConnectionState: () => { connectionStart?: PinRef | null | undefined };
  };
  inputEventCoordinator?: { getMousePosition: () => { x: number; y: number } };
}

// Optimized connection renderer instance (Phase 2B Performance)
const connectionRenderer = new ConnectionRenderer();

// Export for integration with component lifecycle
export { connectionRenderer };

// Performance monitoring - log culling stats periodically
let frameCount = 0;
const STATS_LOG_INTERVAL = 300; // Log every 5 seconds at 60fps

export function drawConnections(app: AppContext, connections: Connection[] | undefined) {
  if (!connections) return;

  if (PerformanceConfig.ENABLE_CONNECTION_CULLING) {
    try {
      // Get canvas for viewport calculations
      const canvas = app.ctx.canvas;

      connectionRenderer.renderConnections(
        app.ctx,
        connections,
        app.camera,
        canvas,
        app.categories
      );

      // Periodic performance logging
      frameCount++;
      if (frameCount >= STATS_LOG_INTERVAL) {
        const stats = connectionRenderer.getStats();
        logger.debug('render',
          `Connection culling: ${stats.culled}/${stats.total} ` +
          `(${stats.total > 0 ? ((stats.culled / stats.total) * 100).toFixed(1) : '0'}%) - ` +
          `Zoom: ${app.camera.zoom.toFixed(2)}x`
        );
        frameCount = 0;
      }

      // Overlay animation passes (match profiling visuals)
      try {
        const enableDashOverlay = !!PerformanceConfig.ENABLE_CONNECTION_DASH_OVERLAY;
        const enablePulse = !!PerformanceConfig.ENABLE_CONNECTION_PULSE;
        const enableMicro = !!PerformanceConfig.ENABLE_CONNECTION_MICRO_PACKETS;
        const enableParticles = !!PerformanceConfig.ENABLE_CONNECTION_PARTICLES;
        const dashOnly = !!PerformanceConfig.ENABLE_CONNECTION_DASH_ONLY;

        const minAnimZoom = (PerformanceConfig.MIN_ANIMATION_ZOOM as number) ?? 0;
        const pulseMinZoom = (PerformanceConfig.PULSE_MIN_ZOOM as number) ?? minAnimZoom;
        const microMinZoom = (PerformanceConfig.MICRO_PACKETS_MIN_ZOOM as number) ?? 0.95;
        const maxAnimated = (PerformanceConfig.MAX_ANIMATED_CONNECTIONS as number) ?? Number.POSITIVE_INFINITY;
        const maxWithPulse = (PerformanceConfig.MAX_ACTIVE_WITH_PULSE as number) ?? maxAnimated;
        const pulseRate = (PerformanceConfig.PULSE_RATE as number) ?? 0.006;
        const pulseAmp = (PerformanceConfig.PULSE_AMPLITUDE as number) ?? 0.2;
        const microDash = (PerformanceConfig.MICRO_PACKETS_DASH as number[]) ?? [3, 12];
        const microWidth = (PerformanceConfig.MICRO_PACKETS_LINE_WIDTH as number) ?? 1.4;
        const microAlpha = (PerformanceConfig.MICRO_PACKETS_ALPHA as number) ?? 0.6;
        const microSpeed = (PerformanceConfig.MICRO_PACKETS_SPEED as number) ?? 0.06;

        // Active density budget
        let visibleActiveCount = 0;
        for (const conn of connections) {
          const fromComp = conn.from?.component as ComponentBase | undefined;
          if (!fromComp) continue;
          const isActive = fromComp.status === 'in-progress' || fromComp.status === 'done';
          if (isActive) { visibleActiveCount++; if (visibleActiveCount > maxAnimated) break; }
        }

        const animationsBudgetOK = visibleActiveCount <= maxAnimated;
        const animationsZoomOK = app.camera.zoom >= minAnimZoom;
        const pulseOK = enablePulse && app.camera.zoom >= pulseMinZoom && visibleActiveCount <= maxWithPulse;
        const microOK = enableMicro && app.camera.zoom >= microMinZoom && animationsBudgetOK;

        if ((enableDashOverlay || dashOnly || pulseOK || microOK) && animationsBudgetOK && animationsZoomOK) {
          const c = app.ctx;
          const vw = c.canvas.width;
          const vh = c.canvas.height;
          const cullMargin = (PerformanceConfig.CONNECTION_CULLING_MARGIN as number) ?? 0;

          for (const conn of connections) {
            const fromComp = conn.from?.component as ComponentBase | undefined;
            const toComp = conn.to?.component as ComponentBase | undefined;
            if (!fromComp || !toComp || !fromComp.pins?.output || !toComp.pins?.input) continue;
            const fromPinDef = fromComp.pins.output[conn.from!.pinIndex];
            const toPinDef = toComp.pins.input[conn.to!.pinIndex];
            if (!fromPinDef || !toPinDef) continue;

            const fromX = (fromComp.x + fromPinDef.x) * app.camera.zoom + app.camera.x;
            const fromY = (fromComp.y + fromPinDef.y) * app.camera.zoom + app.camera.y;
            const toX = (toComp.x + toPinDef.x) * app.camera.zoom + app.camera.x;
            const toY = (toComp.y + toPinDef.y) * app.camera.zoom + app.camera.y;

            // quick screen-space culling like profiling path
            const midX = fromX + (toX - fromX) * 0.7;
            const minX = Math.min(fromX, midX, toX) - cullMargin;
            const maxX = Math.max(fromX, midX, toX) + cullMargin;
            const minY = Math.min(fromY, toY) - cullMargin;
            const maxY = Math.max(fromY, toY) + cullMargin;
            if (maxX < 0 || maxY < 0 || minX > vw || minY > vh) continue;

            const categoryColor = app.categories[conn.category ?? 'frontend']?.color || '#00ff88';
            const fromStatus = fromComp.status;
            const isActive = fromStatus === 'in-progress' || fromStatus === 'done';
            const isPowered = fromStatus === 'done';
            if (!isActive) continue;

            // Pulse overlay (skip when dash-only)
            if (!dashOnly && pulseOK) {
              const baseIntensity = isPowered ? 0.8 : 0.55;
              const p = 1.0 + pulseAmp * Math.sin(Date.now() * pulseRate);
              c.save();
              c.strokeStyle = categoryColor + '66';
              c.lineWidth = isPowered ? 2.4 : 2.0;
              c.shadowColor = categoryColor;
              c.shadowBlur = 7 * baseIntensity * p;
              rendererDrawOrthogonalTrace(c, fromX, fromY, toX, toY);
              c.restore();
            }

            // Animated dash overlay (or dash-only)
            if ((enableDashOverlay || dashOnly) && animationsZoomOK) {
              c.save();
              const dashLen = 14;
              const gapLen = 10;
              c.setLineDash([dashLen, gapLen]);
              const t = Date.now() * (isPowered ? 0.08 : 0.05);
              c.lineDashOffset = -(t % (dashLen + gapLen));
              c.lineWidth = isPowered ? 2.0 : 1.8;
              c.strokeStyle = `rgba(${_hexToRgb(categoryColor)}, ${isPowered ? 0.7 : 0.55})`;
              c.shadowColor = categoryColor;
              c.shadowBlur = isPowered ? 4 : 2;
              rendererDrawOrthogonalTrace(c, fromX, fromY, toX, toY);
              c.restore();
            }

            // Micro packets
            if (microOK) {
              c.save();
              c.setLineDash(microDash);
              const t2 = Date.now() * microSpeed * (isPowered ? 1.2 : 1);
              const period = microDash.reduce((a, b) => a + b, 0);
              c.lineDashOffset = -(t2 % period);
              c.lineWidth = microWidth;
              c.strokeStyle = `rgba(${_hexToRgb(categoryColor)}, ${microAlpha})`;
              c.shadowBlur = 0;
              rendererDrawOrthogonalTrace(c, fromX, fromY, toX, toY);
              c.restore();
            }

            // Data flow particles (animated orbs with comet tails)
            if (enableParticles && animationsBudgetOK && animationsZoomOK) {
              drawDataFlow(app, conn, fromX, fromY, toX, toY, categoryColor, isPowered);
            }
          }
        }
      } catch (e) {
        // overlay is best-effort; ignore
      }

      return; // Early return - optimized path complete
    } catch (error) {
      logger.error('error', 'ConnectionRenderer failed, falling back to legacy', error);
      // Fall through to legacy rendering
    }
  }

  logger.once('render', 'Using LEGACY connection rendering (not optimized)');
  
  // Legacy rendering path (fallback if optimization disabled)
  connections.forEach(connection => {
    if (!connection || !connection.from || !connection.to) {
      // Keep same warning behaviour
      // eslint-disable-next-line no-console
      console.warn('Skipping invalid connection:', connection);
      return;
    }

    const fromPin = connection.from;
    const toPin = connection.to;

    const fromComponent = fromPin.component as ComponentBase;
    const toComponent = toPin.component as ComponentBase;

    if (!fromComponent?.pins?.output || !toComponent?.pins?.input) return;

    const fromPinDef = fromComponent.pins.output![fromPin.pinIndex];
    const toPinDef = toComponent.pins.input![toPin.pinIndex];

    const fromX = (fromComponent.x + fromPinDef.x) * app.camera.zoom + app.camera.x;
    const fromY = (fromComponent.y + fromPinDef.y) * app.camera.zoom + app.camera.y;
    const toX = (toComponent.x + toPinDef.x) * app.camera.zoom + app.camera.x;
    const toY = (toComponent.y + toPinDef.y) * app.camera.zoom + app.camera.y;

    const categoryColor = app.categories[connection.category ?? 'frontend']?.color || '#00ff88';

    const fromStatus = connection.from.component.status;
    const toStatus = connection.to.component.status;
    const isActive = fromStatus === 'in-progress' || fromStatus === 'done';
    const isPowered = fromStatus === 'done';

    if (fromStatus === 'defined' && toStatus === 'defined') {
      drawIntentionTrace(app, fromX, fromY, toX, toY);
      return;
    }

    if (fromStatus === 'defined' && !isActive) {
      drawIntentionTrace(app, fromX, fromY, toX, toY);
      return;
    }

    drawTraceBackground(app, fromX, fromY, toX, toY, categoryColor, isActive);

    if (isActive) {
      drawActiveTrace(app, fromX, fromY, toX, toY, categoryColor, isPowered);
      drawDataFlow(app, connection, fromX, fromY, toX, toY, categoryColor, isPowered);
    }
  });
}

export function drawIntentionTrace(
  app: AppContext,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const ctx = app.ctx;
  const intentionColor = '#00ffff';
  ctx.strokeStyle = intentionColor + '66';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  rendererDrawOrthogonalTrace(ctx, fromX, fromY, toX, toY);
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
}

export function drawTempConnection(app: AppContext) {
  const connectionState = app.connectionManager?.getConnectionState();
  if (!connectionState || !connectionState.connectionStart) return;

  const connectionStart = connectionState.connectionStart;
  const fromX = connectionStart.x * app.camera.zoom + app.camera.x;
  const fromY = connectionStart.y * app.camera.zoom + app.camera.y;
  if (!app.inputEventCoordinator) return;
  const mousePos = app.inputEventCoordinator.getMousePosition();
  const toX = mousePos.x * app.camera.zoom + app.camera.x;
  const toY = mousePos.y * app.camera.zoom + app.camera.y;

  const cat = connectionStart.category ?? 'frontend';
  const categoryColor = app.categories[cat]?.color || '#00ff88';

  const ctx = app.ctx;
  ctx.strokeStyle = categoryColor + '80';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  rendererDrawOrthogonalTrace(ctx, fromX, fromY, toX, toY);
  ctx.setLineDash([]);
}

export function drawTraceBackground(
  app: AppContext,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  isActive: boolean
) {
  const ctx = app.ctx;
  ctx.strokeStyle = isActive ? color + '40' : color + '20';
  ctx.lineWidth = 2;
  ctx.shadowBlur = 0;
  rendererDrawOrthogonalTrace(ctx, fromX, fromY, toX, toY);
}

export function drawActiveTrace(
  app: AppContext,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  isPowered: boolean
) {
  const ctx = app.ctx;
  const glowIntensity = isPowered ? 1.0 : 0.6;
  const pulseEffect = isPowered ? 1.0 : 0.7 + 0.3 * Math.sin(Date.now() * 0.003);

  for (let i = 0; i < 3; i++) {
    const alphaHex = Math.floor((70 - i * 15) * glowIntensity * pulseEffect)
      .toString(16)
      .padStart(2, '0');
    ctx.strokeStyle = color + alphaHex;
    ctx.lineWidth = (3 - i * 0.5) * app.camera.zoom;
    ctx.shadowColor = color;
    ctx.shadowBlur = (12 - i * 3) * glowIntensity * pulseEffect;
    rendererDrawOrthogonalTrace(ctx, fromX, fromY, toX, toY);
  }

  ctx.shadowBlur = 0;
}

export function drawDataFlow(
  app: AppContext,
  connection: Connection,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  isPowered: boolean
) {
  const time = Date.now() * 0.0015;
  const speed = isPowered ? 0.6 : 0.3;
  const particleCount = isPowered ? 4 : 3;
  const particleSize = isPowered ? 2.5 : 2;

  const midX = fromX + (toX - fromX) * 0.7;
  const pathPoints = [
    { x: fromX, y: fromY },
    { x: midX, y: fromY },
    { x: midX, y: toY },
    { x: toX, y: toY },
  ];

  const ctx = app.ctx;

  for (let i = 0; i < particleCount; i++) {
    const offset = (time * speed + i * 0.35) % 1;
    const pos = _getPointOnPath(pathPoints, offset);
    const alpha = 0.9 * (1 - Math.pow(offset, 1.5));
    ctx.fillStyle = `rgba(${_hexToRgb(color)}, ${alpha})`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6 * app.camera.zoom * alpha;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, particleSize * app.camera.zoom, 0, Math.PI * 2);
    ctx.fill();

    for (let j = 1; j <= 2; j++) {
      const trailOffset = Math.max(0, offset - j * 0.08);
      if (trailOffset > 0) {
        const trailPos = _getPointOnPath(pathPoints, trailOffset);
        const trailAlpha = alpha * (0.5 - j * 0.2);
        const trailSize = particleSize * (0.8 - j * 0.2);

        ctx.fillStyle = `rgba(${_hexToRgb(color)}, ${trailAlpha})`;
        ctx.shadowBlur = 3 * app.camera.zoom * trailAlpha;

        ctx.beginPath();
        ctx.arc(trailPos.x, trailPos.y, trailSize * app.camera.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (isPowered && Math.random() < 0.03) {
    const burstOffset = Math.random();
    const burstPos = _getPointOnPath(pathPoints, burstOffset);
    ctx.fillStyle = `rgba(${_hexToRgb(color)}, 0.6)`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * app.camera.zoom;
    ctx.beginPath();
    ctx.arc(burstPos.x, burstPos.y, 4 * app.camera.zoom, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}

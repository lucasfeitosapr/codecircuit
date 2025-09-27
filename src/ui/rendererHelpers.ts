import { drawOrthogonalTrace as rendererDrawOrthogonalTrace } from '../renderer';
import { hexToRgb as _hexToRgb, getPointOnPath as _getPointOnPath } from '../utils';
import type { Camera, Connection, ComponentBase, PinRef } from '../types';

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

export function drawConnections(app: AppContext, connections: Connection[] | undefined) {
  if (!connections) return;
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

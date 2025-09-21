import type { RenderFrame } from '../LayeredRenderer';
import type { Connection } from '../../types';
import { hexToRgb, getPointOnPath } from '../../utils';

export const ConnectionsLayer = {
  name: 'connections',
  render(ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: RenderFrame) {
    try {
      const connections: Connection[] = frame?.payload?.connections ?? [];
      const camera = frame?.camera ?? { x: 0, y: 0, zoom: 1 };
      const c = ctx as CanvasRenderingContext2D;

      // Handle temporary connection (dashed line while creating connections)
      const isConnecting = (frame as any)?.payload?.isConnecting ?? false;
      const connectionStart = (frame as any)?.payload?.connectionStart;
      const mousePos = (frame as any)?.payload?.mousePos;
      const categories = (frame as any)?.payload?.categories ?? {};

      if (isConnecting && connectionStart && mousePos) {
        drawTempConnection(c, connectionStart, mousePos, camera, categories);
      }

      for (const connection of connections) {
        const from = connection.from;
        const to = connection.to;
        if (!from || !to) continue;

        const fromX = (from.x) * camera.zoom + camera.x;
        const fromY = (from.y) * camera.zoom + camera.y;
        const toX = (to.x) * camera.zoom + camera.x;
        const toY = (to.y) * camera.zoom + camera.y;

        const categoryColor = (connection.category && (connection as any)._categoryColor) || '#00ff88';

        // For now determine statuses based on available component status fields (best-effort)
        const fromStatus = from.component?.status ?? 'defined';
        const toStatus = to.component?.status ?? 'defined';
        const isActive = fromStatus === 'in-progress' || fromStatus === 'done';
        const isPowered = fromStatus === 'done';

        // Intention (dashed) traces for DEFINED
        if (fromStatus === 'defined' && toStatus === 'defined') {
          c.strokeStyle = '#00ffff66';
          c.lineWidth = 2;
          c.setLineDash([6, 6]);
          drawOrthogonal(c, fromX, fromY, toX, toY);
          c.setLineDash([]);
          c.shadowBlur = 0;
          continue;
        }

        if (fromStatus === 'defined' && !isActive) {
          c.strokeStyle = '#00ffff66';
          c.lineWidth = 2;
          c.setLineDash([6, 6]);
          drawOrthogonal(c, fromX, fromY, toX, toY);
          c.setLineDash([]);
          c.shadowBlur = 0;
          continue;
        }

        // Background trace
        c.strokeStyle = (isActive ? categoryColor + '40' : categoryColor + '20');
        c.lineWidth = 2;
        c.shadowBlur = 0;
        drawOrthogonal(c, fromX, fromY, toX, toY);

        if (isActive) {
          // Active glow layers
          for (let i = 0; i < 3; i++) {
            const glowIntensity = isPowered ? 1.0 : 0.6;
            const pulseEffect = isPowered ? 1.0 : 0.7 + 0.3 * Math.sin(Date.now() * 0.003);
            const alphaHex = Math.floor((70 - i * 15) * glowIntensity * pulseEffect)
              .toString(16)
              .padStart(2, '0');
            c.strokeStyle = categoryColor + alphaHex;
            c.lineWidth = (3 - i * 0.5) * camera.zoom;
            c.shadowColor = categoryColor;
            c.shadowBlur = (12 - i * 3) * glowIntensity * pulseEffect;
            drawOrthogonal(c, fromX, fromY, toX, toY);
          }
          c.shadowBlur = 0;

          // Data flow particles
          drawDataFlow(c, connection as any, fromX, fromY, toX, toY, categoryColor, isPowered, camera);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ConnectionsLayer render failed', e);
    }
  },
};

function drawOrthogonal(c: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
  const midX = fromX + (toX - fromX) * 0.7;
  c.beginPath();
  c.moveTo(fromX, fromY);
  c.lineTo(midX, fromY);
  c.lineTo(midX, toY);
  c.lineTo(toX, toY);
  c.stroke();
}

function drawDataFlow(
  c: CanvasRenderingContext2D,
  connection: any,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  isPowered: boolean,
  camera: any
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

  for (let i = 0; i < particleCount; i++) {
    const offset = (time * speed + i * 0.35) % 1;
    const pos = getPointOnPath(pathPoints, offset);

    const alpha = 0.9 * (1 - Math.pow(offset, 1.5));
    c.fillStyle = `rgba(${hexToRgb(color)}, ${alpha})`;
    c.shadowColor = color;
    c.shadowBlur = 6 * camera.zoom * alpha;

    c.beginPath();
    c.arc(pos.x, pos.y, particleSize * camera.zoom, 0, Math.PI * 2);
    c.fill();

    for (let j = 1; j <= 2; j++) {
      const trailOffset = Math.max(0, offset - j * 0.08);
      if (trailOffset > 0) {
        const trailPos = getPointOnPath(pathPoints, trailOffset);
        const trailAlpha = alpha * (0.5 - j * 0.2);
        const trailSize = particleSize * (0.8 - j * 0.2);

        c.fillStyle = `rgba(${hexToRgb(color)}, ${trailAlpha})`;
        c.shadowBlur = 3 * camera.zoom * trailAlpha;

        c.beginPath();
        c.arc(trailPos.x, trailPos.y, trailSize * camera.zoom, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  if (isPowered && Math.random() < 0.03) {
    const burstOffset = Math.random();
    const burstPos = getPointOnPath(pathPoints, burstOffset);

    c.fillStyle = `rgba(${hexToRgb(color)}, 0.6)`;
    c.shadowColor = color;
    c.shadowBlur = 12 * camera.zoom;

    c.beginPath();
    c.arc(burstPos.x, burstPos.y, 3 * camera.zoom, 0, Math.PI * 2);
    c.fill();
  }
}

function drawTempConnection(
  c: CanvasRenderingContext2D,
  connectionStart: any,
  mousePos: any,
  camera: any,
  categories: any
) {
  const fromX = connectionStart.x * camera.zoom + camera.x;
  const fromY = connectionStart.y * camera.zoom + camera.y;
  const toX = mousePos.x * camera.zoom + camera.x;
  const toY = mousePos.y * camera.zoom + camera.y;

  const cat = connectionStart.category ?? 'frontend';
  const categoryColor = categories[cat]?.color || '#00ff88';

  c.strokeStyle = categoryColor + '80'; // Semi-transparent
  c.lineWidth = 2;
  c.setLineDash([5, 5]);

  drawOrthogonal(c, fromX, fromY, toX, toY);

  c.setLineDash([]);
}

export default ConnectionsLayer;

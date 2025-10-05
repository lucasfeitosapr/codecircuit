import type { RenderFrame } from '../LayeredRenderer';
import type { Connection } from '../../types';
import { hexToRgb, getPointOnPath } from '../../utils';

export const ConnectionsLayer = {
  name: 'connections',
  render(ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: RenderFrame) {
    try {
      // Accept connections from payload or from top-level frame (RendererIntegrationManager passes top-level)
      const connections: Connection[] =
        (frame as any)?.payload?.connections ?? ((frame as any)?.connections ?? []);
      const camera = frame?.camera ?? { x: 0, y: 0, zoom: 1 };
      const c = ctx as CanvasRenderingContext2D;
      const viewType: string | undefined = (frame as any)?.payload?.viewType ?? (frame as any)?.viewType;

      // Removed debug logging to avoid console spam

      // Handle temporary connection (dashed line while creating connections)
      const isConnecting = (frame as any)?.payload?.isConnecting ?? false;
      const connectionStart = (frame as any)?.payload?.connectionStart;
      const mousePos = (frame as any)?.payload?.mousePos;
      const categories = (frame as any)?.payload?.categories ?? {};

      if (isConnecting && connectionStart && mousePos) {
        drawTempConnection(c, connectionStart, mousePos, camera, categories);
      }

      for (const connection of connections) {
        const from: any = (connection as any).from;
        const to: any = (connection as any).to;
        if (!from || !to) continue;

        // If connections are specified by id strings, skip the advanced path.
        // The simple fallback below renders using models.
        const hasCoords =
          typeof from === 'object' &&
          typeof to === 'object' &&
          from.x != null &&
          from.y != null &&
          to.x != null &&
          to.y != null;
        if (!hasCoords) {
          continue;
        }

        const fromX = from.x * camera.zoom + camera.x;
        const fromY = from.y * camera.zoom + camera.y;
        const toX = to.x * camera.zoom + camera.x;
        const toY = to.y * camera.zoom + camera.y;

        const categoryColor =
          (connection.category && (connection as any)._categoryColor) || '#00ff88';

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

  // Background trace (soft base, reduced intensity)
  c.strokeStyle = isActive ? categoryColor + '2a' : categoryColor + '17';
  c.lineWidth = 3.5;
        c.shadowBlur = 0;
        drawOrthogonal(c, fromX, fromY, toX, toY);

  // In schematic view, avoid heavy continuous animations unless powered
  const allowAnimatedOverlay = viewType !== 'schematic' || isPowered;
  if (isActive) {
          // Glow pass (subtle, less expensive than multiple stacked strokes)
          const glowIntensity = isPowered ? 0.8 : 0.55;
          const pulse = isPowered ? 0.95 : 0.85 + 0.1 * Math.sin(Date.now() * 0.006);
          c.strokeStyle = categoryColor + '66';
          c.lineWidth = 2.2;
          c.shadowColor = categoryColor;
          c.shadowBlur = 7 * glowIntensity * pulse;
          drawOrthogonal(c, fromX, fromY, toX, toY);
          c.shadowBlur = 0;

          // Core gradient stroke per segment for that "energy core" look
          strokeOrthogonalGradient(c, fromX, fromY, toX, toY, categoryColor, isPowered ? 2.4 : 1.8);

          if (allowAnimatedOverlay) {
            // Animated flow overlay (dashed, moves along the path)
            c.save();
            const dashLen = 14;
            const gapLen = 10;
            c.setLineDash([dashLen, gapLen]);
            const t = Date.now() * (isPowered ? 0.08 : 0.05);
            c.lineDashOffset = -(t % (dashLen + gapLen));
            c.lineWidth = isPowered ? 2.0 : 1.8;
            c.strokeStyle = `rgba(${hexToRgb(categoryColor)}, ${isPowered ? 0.7 : 0.55})`;
            c.shadowColor = categoryColor;
            c.shadowBlur = isPowered ? 4 : 2;
            strokeOrthogonalSimple(c, fromX, fromY, toX, toY);
            c.restore();
          }

          // Data flow particles (upgraded visuals)
          if (allowAnimatedOverlay) {
            drawDataFlow(
              c,
              connection as any,
              fromX,
              fromY,
              toX,
              toY,
              categoryColor,
              isPowered,
              camera
            );
          }
        }
      }

      // Fallback: Simple connection rendering if no connections were drawn
      if (connections.length > 0) {
        // Accept models list from payload or use top-level components as models
        const models = (frame as any)?.payload?.models ?? ((frame as any)?.components ?? []);
        connections.forEach(connection => {
          const fromComp = models.find((m: any) => m.id === connection.from);
          const toComp = models.find((m: any) => m.id === connection.to);

          if (fromComp && toComp) {
            // Approximate pin positions (fallback)
            const fromX = (fromComp.x ?? 0) + (fromComp.width ?? 60);
            const fromY = (fromComp.y ?? 0) + Math.max(10, Math.floor((fromComp.height ?? 40) / 2));
            const toX = toComp.x ?? 0; // left side
            const toY = (toComp.y ?? 0) + Math.max(10, Math.floor((toComp.height ?? 40) / 2));

            // Determine status and color
            const fromStatus = fromComp.status ?? 'defined';
            const toStatus = toComp.status ?? 'defined';
            const isActive = fromStatus === 'in-progress' || fromStatus === 'done';
            const isPowered = fromStatus === 'done';
            const categoryColor = (connection as any)._categoryColor || '#00ff88';

            // Intention (dashed) traces for DEFINED
            if (fromStatus === 'defined' && toStatus === 'defined') {
              c.strokeStyle = '#00ffff66';
              c.lineWidth = 2;
              c.setLineDash([6, 6]);
              drawOrthogonal(c, fromX, fromY, toX, toY);
              c.setLineDash([]);
              c.shadowBlur = 0;
              return;
            }
            if (fromStatus === 'defined' && !isActive) {
              c.strokeStyle = '#00ffff66';
              c.lineWidth = 2;
              c.setLineDash([6, 6]);
              drawOrthogonal(c, fromX, fromY, toX, toY);
              c.setLineDash([]);
              c.shadowBlur = 0;
              return;
            }

            // Background trace
            c.strokeStyle = isActive ? categoryColor + '33' : categoryColor + '1f';
            c.lineWidth = 4;
            c.shadowBlur = 0;
            drawOrthogonal(c, fromX, fromY, toX, toY);

            if (isActive) {
              const allowAnimatedOverlay = viewType !== 'schematic' || isPowered;
              // Glow pass
              const glowIntensity = isPowered ? 1.0 : 0.7;
              const pulse = isPowered ? 1.0 : 0.85 + 0.15 * Math.sin(Date.now() * 0.006);
              c.strokeStyle = categoryColor + '80';
              c.lineWidth = 2.5;
              c.shadowColor = categoryColor;
              c.shadowBlur = 10 * glowIntensity * pulse;
              drawOrthogonal(c, fromX, fromY, toX, toY);
              c.shadowBlur = 0;

              // Core gradient stroke per segment
              strokeOrthogonalGradient(c, fromX, fromY, toX, toY, categoryColor, isPowered ? 3 : 2);

              if (allowAnimatedOverlay) {
                // Animated flow overlay
                c.save();
                const dashLen = 14;
                const gapLen = 10;
                c.setLineDash([dashLen, gapLen]);
                const t = Date.now() * (isPowered ? 0.08 : 0.05);
                c.lineDashOffset = -(t % (dashLen + gapLen));
                c.lineWidth = isPowered ? 2.2 : 2;
                c.strokeStyle = `rgba(${hexToRgb(categoryColor)}, ${isPowered ? 0.95 : 0.8})`;
                c.shadowColor = categoryColor;
                c.shadowBlur = isPowered ? 6 : 3;
                strokeOrthogonalSimple(c, fromX, fromY, toX, toY);
                c.restore();
              }

              // Data flow particles (upgraded visuals)
              if (allowAnimatedOverlay) {
                drawDataFlow(
                  c,
                  connection as any,
                  fromX,
                  fromY,
                  toX,
                  toY,
                  categoryColor,
                  isPowered,
                  camera
                );
              }
            }
          }
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('ConnectionsLayer render failed', e);
    }
  },
};

function drawOrthogonal(
  c: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  const midX = fromX + (toX - fromX) * 0.7;
  c.beginPath();
  c.moveTo(fromX, fromY);
  c.lineTo(midX, fromY);
  c.lineTo(midX, toY);
  c.lineTo(toX, toY);
  c.stroke();
}

// Helper: stroke orthogonal with gradient per each 90° segment
function strokeOrthogonalGradient(
  c: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number
) {
  const midX = fromX + (toX - fromX) * 0.7;
  const segments = [
    { x1: fromX, y1: fromY, x2: midX, y2: fromY }, // horizontal 1
    { x1: midX, y1: fromY, x2: midX, y2: toY },   // vertical
    { x1: midX, y1: toY, x2: toX, y2: toY },      // horizontal 2
  ];

  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.lineWidth = lineWidth;

  for (const s of segments) {
    const grad = c.createLinearGradient(s.x1, s.y1, s.x2, s.y2);
    grad.addColorStop(0, `rgba(${hexToRgb(color)}, 0.6)`);
    grad.addColorStop(0.5, `rgba(${hexToRgb(color)}, 1)`);
    grad.addColorStop(1, `rgba(${hexToRgb(color)}, 0.6)`);

    c.strokeStyle = grad as unknown as string;
    c.beginPath();
    c.moveTo(s.x1, s.y1);
    c.lineTo(s.x2, s.y2);
    c.stroke();
  }
  c.restore();
}

// Helper: stroke orthogonal path without gradients (used for dashed flow overlay)
function strokeOrthogonalSimple(
  c: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
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
  const speed = isPowered ? 0.7 : 0.45;
  const particleCount = isPowered ? 4 : 3;
  const baseSize = isPowered ? 2.2 : 1.8;

  const midX = fromX + (toX - fromX) * 0.7;
  const pathPoints = [
    { x: fromX, y: fromY },
    { x: midX, y: fromY },
    { x: midX, y: toY },
    { x: toX, y: toY },
  ];

  for (let i = 0; i < particleCount; i++) {
    const offset = (time * speed + i * 0.28) % 1;
    const pos = getPointOnPath(pathPoints, offset);
    const size = baseSize * (1.0 + 0.15 * Math.sin((time + i) * 2.3));
    const alpha = 0.95 * (1 - Math.pow(offset, 1.4));

    // Radial gradient orb
  const g = c.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 2.0);
  g.addColorStop(0, `rgba(${hexToRgb(color)}, ${Math.min(0.85, alpha)})`);
  g.addColorStop(0.4, `rgba(${hexToRgb(color)}, ${0.5 * alpha})`);
    g.addColorStop(1, `rgba(${hexToRgb(color)}, 0)`);
    c.fillStyle = g as unknown as string;
    c.shadowColor = color;
  c.shadowBlur = 7 * alpha;
    c.beginPath();
    c.arc(pos.x, pos.y, size * 1.5, 0, Math.PI * 2);
    c.fill();

    // Comet tail (two trailing sparks)
    for (let j = 1; j <= 3; j++) {
      const trailOffset = Math.max(0, offset - j * 0.065);
      if (trailOffset > 0) {
        const trailPos = getPointOnPath(pathPoints, trailOffset);
        const trailAlpha = alpha * (0.35 - j * 0.09);
        const trailSize = size * (0.9 - j * 0.2);
        c.fillStyle = `rgba(${hexToRgb(color)}, ${Math.max(0, trailAlpha)})`;
        c.shadowBlur = 4 * trailAlpha;
        c.beginPath();
        c.arc(trailPos.x, trailPos.y, Math.max(0.8, trailSize), 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  // Occasional sparkle burst
  if (isPowered && Math.random() < 0.02) {
    const burstOffset = Math.random();
    const burstPos = getPointOnPath(pathPoints, burstOffset);
    const burstRadius = 3.0;

    const g = c.createRadialGradient(
      burstPos.x,
      burstPos.y,
      0,
      burstPos.x,
      burstPos.y,
      burstRadius * 2
    );
    g.addColorStop(0, `rgba(${hexToRgb(color)}, 0.55)`);
    g.addColorStop(0.5, `rgba(${hexToRgb(color)}, 0.28)`);
    g.addColorStop(1, `rgba(${hexToRgb(color)}, 0)`);
    c.fillStyle = g as unknown as string;
    c.shadowColor = color;
    c.shadowBlur = 9;
    c.beginPath();
    c.arc(burstPos.x, burstPos.y, burstRadius, 0, Math.PI * 2);
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

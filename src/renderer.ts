// src/renderer.ts
// Canvas drawing helpers extracted for future refactor
// Phase 2B: Integrated optimized GridRenderer

import { GridRenderer } from './rendering/GridRenderer';
import { PerformanceConfig } from './config/FeatureFlagAdapter';

export { hexToRgb, getPointOnPath } from './utils';

// Optimized grid renderer instance (Phase 2B Performance)
const gridRenderer = new GridRenderer();

export function drawOrthogonalTrace(
  ctx: any,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
) {
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  const midX = fromX + (toX - fromX) * 0.7;
  ctx.lineTo(midX, fromY);
  ctx.lineTo(midX, toY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
}

export function drawGrid(ctx: any, camera: any, canvas: any) {
  // Phase 2B: Use optimized GridRenderer with caching
  if (PerformanceConfig.ENABLE_GRID_CACHING) {
    try {
      gridRenderer.renderGrid(ctx, camera, canvas);
      return; // Early return - optimized path complete
    } catch (error) {
      console.error('GridRenderer failed, falling back to legacy:', error);
      // Fall through to legacy rendering
    }
  }
  
  // Legacy grid rendering (fallback if optimization disabled)
  const gridSize = 50 * camera.zoom;
  const startX = -camera.x % gridSize;
  const startY = -camera.y % gridSize;
  ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
  ctx.lineWidth = 1;
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  for (let x = startX; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = startY; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

export function drawSchematicBackground(ctx: any, camera: any, canvas: any) {
  // Phase 2B: Use optimized GridRenderer for schematic background
  if (PerformanceConfig.ENABLE_GRID_CACHING) {
    try {
      gridRenderer.renderSchematicBackground(ctx, camera, canvas);
      return; // Early return - optimized path complete
    } catch (error) {
      console.error('GridRenderer (schematic) failed, falling back to legacy:', error);
      // Fall through to legacy rendering
    }
  }
  
  // Legacy schematic background rendering
  const gridSize = 40 * camera.zoom;
  const startX = -camera.x % gridSize;
  const startY = -camera.y % gridSize;
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)';
  ctx.lineWidth = 1;
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  for (let x = startX; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = startY; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(50, 100, 150, 0.02)';
  ctx.fillRect(0, 0, w, h);
}

// Legacy single entrypoint used by the LayeredRenderer adapter while migrating.
export function render(ctx: any, frame: any) {
  try {
    const canvas = (ctx && (ctx.canvas || ctx)) as any;
    const camera = frame?.camera ?? { x: 0, y: 0, zoom: 1 };
    // Keep the legacy behaviour minimal: draw schematic background and grid if available
    drawSchematicBackground(ctx, camera, canvas);
    try {
      drawGrid(ctx, camera, canvas);
    } catch (e) {
      // ignore
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('renderer.render failed', e);
  }
}

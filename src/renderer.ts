// src/renderer.ts
// Canvas drawing helpers extracted for future refactor

export { hexToRgb, getPointOnPath } from './utils';

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

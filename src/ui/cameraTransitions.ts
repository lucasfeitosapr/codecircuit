import type { Camera, ComponentBase } from '../types';

export function interpolateCamera(start: Camera, end: Camera, progress: number): Camera {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
    zoom: start.zoom + (end.zoom - start.zoom) * progress,
  };
}

export function getCameraDistance(a: Camera, b: Camera): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = Math.abs(a.zoom - b.zoom) * 100;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function getComponentCenter(component: ComponentBase) {
  return { x: component.x + component.width / 2, y: component.y + component.height / 2 };
}

export function getFocusCameraPosition(component: ComponentBase, t: number = 1): Camera {
  const center = getComponentCenter(component);
  // keep same behaviour: center component in canvas coordinates
  const canvasWidth = (globalThis as any).app?.canvas?.width;
  const canvasHeight = (globalThis as any).app?.canvas?.height;
  const x = typeof canvasWidth === 'number' ? canvasWidth / 2 - center.x * t : -center.x * t;
  const y = typeof canvasHeight === 'number' ? canvasHeight / 2 - center.y * t : -center.y * t;
  return { x, y, zoom: t } as Camera;
}

export function calculateTransitionDuration(start: Camera, end: Camera, baseDuration: number = 800): number {
  const dist = getCameraDistance(start, end);
  const maxDuration = baseDuration * 1.5;
  const minDuration = baseDuration * 0.5;
  const scale = Math.min(dist / 500, 2);
  return Math.max(minDuration, Math.min(maxDuration, baseDuration * scale));
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

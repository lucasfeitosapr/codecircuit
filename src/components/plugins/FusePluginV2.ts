// FusePluginV2.ts - S-013 (Lucas, 18/nov): a root cause (debt-map origin) is a Fuse.
// Intact (done) lets power through; any other status means the fuse is blown, so the
// requirement's power can't reach what is behind it.

import { TaskResistorPluginV2 } from './TaskResistorPluginV2';
import type { RenderFrame } from '../../rendering/LayeredRenderer';
import type { PluginMetadata } from '../../events/eventTypes';

const WIDTH = 60;
const HEIGHT = 20;

/** The fuse wire, from x0 to x1: one piece when intact (done), two with a gap when blown. */
export function fuseWireSegments(status: string | undefined, x0: number, x1: number): Array<[number, number]> {
  if (status === 'done') return [[x0, x1]];
  const mid = (x0 + x1) / 2;
  const gap = (x1 - x0) * 0.12;
  return [
    [x0, mid - gap],
    [mid + gap, x1],
  ];
}

export class FusePluginV2 extends TaskResistorPluginV2 {
  type = 'fuse';
  metadata: PluginMetadata = {
    displayName: 'Fuse',
    icon: '─╳─',
    color: '#ffaa00',
    category: 'protection',
    width: WIDTH,
    height: HEIGHT,
    pins: {
      input: [{ x: 0, y: HEIGHT / 2, type: 'energy', label: 'input' }],
      output: [{ x: WIDTH, y: HEIGHT / 2, type: 'energy', label: 'output' }],
    },
  };

  createComponent(config: { x: number; y: number; id?: string; title?: string }): any {
    return {
      id: config.id || `fuse_${Date.now()}`,
      type: 'fuse',
      x: config.x,
      y: config.y,
      width: WIDTH,
      height: HEIGHT,
      title: config.title || 'Fuse',
      color: '#ffaa00',
      status: 'defined',
      pins: {
        input: [{ x: 0, y: HEIGHT / 2, type: 'energy' }],
        output: [{ x: WIDTH, y: HEIGHT / 2, type: 'energy' }],
      },
    };
  }

  renderComponent(ctx: CanvasRenderingContext2D, frame: RenderFrame, component: any): void {
    super.renderComponent(ctx, frame, component);
    try {
      if (!ctx || typeof ctx.moveTo !== 'function' || !component) return;
      const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
      const x = component.x * camera.zoom + camera.x;
      const y = (component.y + (component.height || HEIGHT) / 2 - 5) * camera.zoom + camera.y; // icon centre
      const half = 10 * camera.zoom; // across the cartridge
      const prev = { stroke: ctx.strokeStyle, width: ctx.lineWidth };
      const cx = x + ((component.width || WIDTH) * camera.zoom) / 2;
      ctx.beginPath();
      for (const [a, b] of fuseWireSegments(component.status, cx - half, cx + half)) {
        ctx.moveTo(a, y);
        ctx.lineTo(b, y);
      }
      ctx.lineWidth = Math.max(1, 1.5 * camera.zoom);
      ctx.strokeStyle = component.status === 'done' ? '#00ff88' : '#ff5555';
      ctx.stroke();
      ctx.strokeStyle = prev.stroke;
      ctx.lineWidth = prev.width;
      ctx.beginPath();
    } catch (e) {
      console.error('FusePluginV2.render failed', e);
    }
  }

  deserialize(data: any): any {
    return { ...data, type: 'fuse' };
  }
}

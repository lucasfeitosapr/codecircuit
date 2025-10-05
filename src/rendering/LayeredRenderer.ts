import { isNewRendererEnabled } from '../config/featureFlags';
import * as legacyRenderer from '../renderer';

// Cache bust: 2024-01-20 - Removed all console logs

export type RenderFrame = {
  timestamp: number;
  camera?: any;
  // optional arbitrary payload (e.g., models list) passed by the caller
  payload?: any;
};

export type Layer = {
  name: string;
  render: (ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: RenderFrame) => void;
};

export class LayeredRenderer {
  private layers: Map<string, Layer> = new Map();

  registerLayer(name: string, layer: Layer) {
    if (this.layers.has(name)) throw new Error(`Layer ${name} already registered`);
    this.layers.set(name, layer);
  }

  unregisterLayer(name: string) {
    this.layers.delete(name);
  }

  getRegisteredLayers(): string[] {
    return Array.from(this.layers.keys());
  }

  render(ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: RenderFrame) {
    // If feature flag is off, delegate to legacy renderer to keep behavior identical
    if (!isNewRendererEnabled()) {
      try {
        // legacyRenderer may expect different args; call the existing entrypoint
        legacyRenderer.render(ctx as any, frame as any);
        return;
      } catch (e) {
        // swallow to avoid breaking host app
        // eslint-disable-next-line no-console
        console.error('LayeredRenderer: legacy renderer delegation failed', e);
      }
    }

    // New layered rendering path
    // Ensure canvas is available to layers to allow proper clearing
    const c = ctx as CanvasRenderingContext2D;
    const enrichedFrame = {
      ...frame,
      // @ts-ignore
      canvas: (c && (c as any).canvas) || (frame as any)?.canvas,
    } as RenderFrame & { canvas?: HTMLCanvasElement };

    for (const layer of this.layers.values()) {
      try {
        // Prevent state leakage between layers (dash, shadow, transforms)
        (ctx as CanvasRenderingContext2D).save?.();
        layer.render(ctx, enrichedFrame);
        (ctx as CanvasRenderingContext2D).restore?.();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`LayeredRenderer: layer ${layer.name} failed`, e);
      }
    }
  }
}

export const layeredRenderer = new LayeredRenderer();

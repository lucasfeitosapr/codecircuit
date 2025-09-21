import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { layeredRenderer } from './LayeredRenderer';
import * as featureFlags from '../config/featureFlags';
import BlueprintLayer from './layers/BlueprintLayer';
import * as legacyRenderer from '../renderer';

describe('LayeredRenderer', () => {
  let ctx: any;

  beforeEach(() => {
    // Minimal canvas context stub
    ctx = { fillRect: vi.fn(), canvas: { width: 100, height: 100 } } as any;
    // clear layers
    try {
      // @ts-ignore
      layeredRenderer['layers'].clear();
    } catch (e) {}
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      // @ts-ignore
      layeredRenderer['layers'].clear();
    } catch (e) {}
  });

  it('delegates to legacy renderer when feature flag is off', () => {
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(false);
  const legacyRenderSpy = vi.spyOn(legacyRenderer, 'render');
    layeredRenderer.render(ctx, { timestamp: Date.now() });
    expect(legacyRenderSpy).toHaveBeenCalled();
  });

  it('calls registered layer render when feature flag is on', () => {
    vi.spyOn(featureFlags, 'isNewRendererEnabled').mockReturnValue(true);
    const layerSpy = vi.spyOn(BlueprintLayer, 'render');
    layeredRenderer.registerLayer(BlueprintLayer.name, BlueprintLayer as any);
    layeredRenderer.render(ctx, { timestamp: Date.now() });
    expect(layerSpy).toHaveBeenCalled();
  });
});

/**
 * DOMBootstrap - Extracted DOM initialization logic from main.ts DOMContentLoaded block.
 *
 * Phase 3 (CC-15): Consolidates FX panel setup, profiler API wiring, and connection
 * cache invalidation event listeners into a dedicated bootstrap module.
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import { connectionRenderer } from '../ui/rendererHelpers';
import { RenderProfiler } from '../rendering/RenderProfiler';
import { createFeatureTogglePanel } from '../ui/FeatureTogglePanel';
import type { AppContext } from './AppContext';

/**
 * Bootstrap DOM-dependent features after app initialization.
 * Call this from DOMContentLoaded after MotherboardApp is constructed.
 */
export function bootstrapDOM(ctx: Partial<AppContext>): void {
  // B-012: the FX button is owned by FeatureTogglePanel alone. A second click handler
  // (old setupFeaturePanel) toggled it back closed on every click.
  setupConnectionCacheInvalidation();
  setupProfilerAPI(ctx);
  setupFeatureTogglePanel(ctx);
}

/**
 * Wire EventBus listeners to invalidate optimized connection cache on mutations.
 */
function setupConnectionCacheInvalidation(): void {
  eventBus.on(Events.ConnectionCreated, (payload: any) => {
    try { if (payload?.connection) connectionRenderer.invalidateConnection(payload.connection); } catch {}
  });
  eventBus.on(Events.ConnectionDeleted, (payload: any) => {
    try { if (payload?.connection) connectionRenderer.invalidateConnection(payload.connection); } catch {}
  });
  eventBus.on('connections.component_updated', (payload: any) => {
    try { if (payload?.componentId) connectionRenderer.markComponentMoved(payload.componentId); } catch {}
  });
}

/**
 * Expose profiling API for profiling.html integration and wire scheduler hooks.
 */
function setupProfilerAPI(ctx: Partial<AppContext>): void {
  // Expose profiling API for profiling.html integration
  (window as any).renderProfiler = RenderProfiler.publicAPI();

  // While profiling is active, keep the scheduler ticking so FPS updates
  try {
    const rp: any = (window as any).renderProfiler;
    if (rp && !rp.__wrappedForScheduler) {
      const originalStart = rp.startRecording?.bind(rp);
      const originalStop = rp.stopRecording?.bind(rp);

      let rafId: number | null = null;
      const tick = () => {
        // Mark dirty to force a render frame and profiler sample
        ctx.renderScheduler?.markDirty?.();
        rafId = requestAnimationFrame(tick);
      };

      rp.startRecording = () => {
        originalStart?.();
        // Kick the scheduler once immediately
        ctx.renderScheduler?.markDirty?.();
        if (rafId == null) rafId = requestAnimationFrame(tick);
      };

      rp.stopRecording = () => {
        const result = originalStop?.();
        if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        // One last render to flush final stats
        ctx.renderScheduler?.markDirty?.();
        return result;
      };

      rp.__wrappedForScheduler = true;
    }
  } catch (e) {
    // non-fatal; profiling wrapper is best-effort
    console.warn('Profiler scheduler wrapper failed', e);
  }
}

/**
 * Initialize Feature Toggle Panel for main board.
 */
function setupFeatureTogglePanel(ctx: Partial<AppContext>): void {
  try {
    createFeatureTogglePanel({
      containerId: 'fx-panel',
      toggleButtonId: 'fx-btn',
      storageKey: 'mb_main_performance_flags',
      panelOpenKey: 'mb_main_panel_open',
      onApply: () => {
        try {
          ctx.renderScheduler?.markDirty?.();
        } catch {}
      },
    });
  } catch (e) {
    console.warn('FeatureTogglePanel initialization failed:', e);
  }
}

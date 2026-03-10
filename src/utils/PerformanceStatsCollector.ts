/**
 * PerformanceStatsCollector - Unified performance monitoring
 *
 * Phase 2B+: Collect performance stats from all optimization systems
 * - Spatial Index efficiency
 * - Connection Cache hit rates
 * - EventBus statistics
 * - Overall system performance
 */

import { renderProfiler } from './RenderProfiler';
import { eventBus } from '../events/EventBus';
import { PerformanceConfig } from '../config/FeatureFlagAdapter';
import { LegacyRenderer } from '../rendering/LegacyRenderer';

export interface SystemPerformanceStats {
  timestamp: number;
  renderProfiler: {
    enabled: boolean;
    frames: number;
    avgFPS: number;
    avgFrameTime: number;
    breakdown?: any;
  };
  spatialIndex: {
    enabled: boolean;
    nodes?: number;
    components?: number;
    maxDepth?: number;
  };
  connectionCache: {
    enabled: boolean;
    size?: number;
    hitRate?: number;
  };
  eventBus: {
    handlers: number;
    batchedEvents: number;
    batchingEnabled: boolean;
  };
  renderScheduler: {
    enabled: boolean;
    fps?: number;
  };
  batchedRendering: {
    enabled: boolean;
    stateChangeReduction?: number;
    timePerComponent?: number;
    efficiency?: string;
    batchCount?: number;
  };
}

export class PerformanceStatsCollector {
  private componentLifecycleManager: any = null;
  private connectionRenderer: any = null;
  private renderScheduler: any = null;

  /**
   * Register managers for stats collection
   */
  registerManagers(managers: {
    componentLifecycleManager?: any;
    connectionRenderer?: any;
    renderScheduler?: any;
  }): void {
    this.componentLifecycleManager = managers.componentLifecycleManager;
    this.connectionRenderer = managers.connectionRenderer;
    this.renderScheduler = managers.renderScheduler;
  }

  /**
   * Collect comprehensive performance statistics
   */
  collectStats(): SystemPerformanceStats {
    const stats: SystemPerformanceStats = {
      timestamp: performance.now(),
      renderProfiler: this.getRenderProfilerStats(),
      spatialIndex: this.getSpatialIndexStats(),
      connectionCache: this.getConnectionCacheStats(),
      eventBus: this.getEventBusStats(),
      renderScheduler: this.getRenderSchedulerStats(),
      batchedRendering: this.getBatchedRenderingStats(),
    };

    return stats;
  }

  /**
   * Get performance summary as formatted string
   */
  getPerformanceSummary(): string {
    const stats = this.collectStats();

    return `
╔════════════════════════════════════════════════════════════╗
║              System Performance Summary                     ║
╚════════════════════════════════════════════════════════════╝

🎯 Rendering Performance
   • Average FPS: ${stats.renderProfiler.avgFPS}
   • Frame Time: ${stats.renderProfiler.avgFrameTime.toFixed(2)}ms
   • Frames Recorded: ${stats.renderProfiler.frames}

🗂️ Spatial Index (Hit Testing)
   • Enabled: ${stats.spatialIndex.enabled ? 'YES' : 'NO'}
   ${stats.spatialIndex.enabled ? `• Nodes: ${stats.spatialIndex.nodes}
   • Components: ${stats.spatialIndex.components}
   • Max Depth: ${stats.spatialIndex.maxDepth}` : ''}

🔗 Connection Cache
   • Enabled: ${stats.connectionCache.enabled ? 'YES' : 'NO'}
   ${stats.connectionCache.enabled ? `• Cache Size: ${stats.connectionCache.size}
   • Hit Rate: ${(stats.connectionCache.hitRate * 100).toFixed(1)}%` : ''}

📡 Event System
   • Total Handlers: ${stats.eventBus.handlers}
   • Batching: ${stats.eventBus.batchingEnabled ? 'ENABLED' : 'DISABLED'}
   • Batched Events: ${stats.eventBus.batchedEvents}

⚡ Render Scheduler
   • Enabled: ${stats.renderScheduler.enabled ? 'YES' : 'NO'}
   ${stats.renderScheduler.enabled ? `• Current FPS: ${stats.renderScheduler.fps}` : ''}

🎨 Batched Rendering
   • Enabled: ${stats.batchedRendering.enabled ? 'YES' : 'NO'}
   ${stats.batchedRendering.enabled ? `• State Change Reduction: ${(stats.batchedRendering.stateChangeReduction * 100).toFixed(1)}%
   • Time per Component: ${stats.batchedRendering.timePerComponent?.toFixed(3)}ms
   • Efficiency: ${stats.batchedRendering.efficiency}
   • Batches per Frame: ${stats.batchedRendering.batchCount}` : ''}

💡 Performance Optimizations:
   ✅ Dirty Flag Rendering: ${PerformanceConfig.ENABLE_DIRTY_FLAG_RENDERING ? 'ON' : 'OFF'}
   ✅ Connection Culling: ${PerformanceConfig.ENABLE_CONNECTION_CULLING ? 'ON' : 'OFF'}
   ✅ Grid Caching: ${PerformanceConfig.ENABLE_GRID_CACHING ? 'ON' : 'OFF'}
   ✅ Spatial Indexing: ${PerformanceConfig.ENABLE_SPATIAL_INDEXING ? 'ON' : 'OFF'}
   ✅ Connection Caching: ${PerformanceConfig.ENABLE_CONNECTION_CACHING ? 'ON' : 'OFF'}
   ✅ Event Batching: ${PerformanceConfig.ENABLE_EVENT_BATCHING ? 'ON' : 'OFF'}
   ✅ Batch Rendering: ${PerformanceConfig.ENABLE_BATCH_RENDERING ? 'ON' : 'OFF'}
`;
  }

  /**
   * Export performance data as JSON
   */
  exportStats(): string {
    const stats = this.collectStats();
    return JSON.stringify(stats, null, 2);
  }

  /**
   * Log performance summary to console
   */
  logPerformanceSummary(): void {
    console.log(this.getPerformanceSummary());
  }

  private getRenderProfilerStats(): SystemPerformanceStats['renderProfiler'] {
    if (!renderProfiler.isRecording) {
      return {
        enabled: false,
        frames: 0,
        avgFPS: 0,
        avgFrameTime: 0,
      };
    }

    const report = renderProfiler.stopRecording();
    renderProfiler.startRecording(); // Resume recording

    return {
      enabled: true,
      frames: report.frames.length,
      avgFPS: report.timings.avgFPS,
      avgFrameTime: report.timings.avgFrameTime,
      breakdown: report.breakdown,
    };
  }

  private getSpatialIndexStats(): SystemPerformanceStats['spatialIndex'] {
    if (!PerformanceConfig.ENABLE_SPATIAL_INDEXING || !this.componentLifecycleManager) {
      return { enabled: false };
    }

    try {
      const stats = this.componentLifecycleManager.getSpatialIndexStats();
      return {
        enabled: stats.enabled || false,
        nodes: stats.nodes,
        components: stats.components,
        maxDepth: stats.maxDepth,
      };
    } catch (err) {
      return { enabled: false };
    }
  }

  private getConnectionCacheStats(): SystemPerformanceStats['connectionCache'] {
    if (!PerformanceConfig.ENABLE_CONNECTION_CACHING || !this.connectionRenderer) {
      return { enabled: false };
    }

    try {
      const stats = this.connectionRenderer.getCacheStats();
      return {
        enabled: stats.enabled || false,
        size: stats.size,
        hitRate: stats.hitRate,
      };
    } catch (err) {
      return { enabled: false };
    }
  }

  private getEventBusStats(): SystemPerformanceStats['eventBus'] {
    try {
      const stats = eventBus.getStats();
      return {
        handlers: stats.handlers,
        batchedEvents: stats.batchedEvents,
        batchingEnabled: PerformanceConfig.ENABLE_EVENT_BATCHING,
      };
    } catch (err) {
      return {
        handlers: 0,
        batchedEvents: 0,
        batchingEnabled: false,
      };
    }
  }

  private getRenderSchedulerStats(): SystemPerformanceStats['renderScheduler'] {
    if (!this.renderScheduler) {
      return { enabled: false };
    }

    try {
      return {
        enabled: true,
        fps: this.renderScheduler.getFPS(),
      };
    } catch (err) {
      return { enabled: false };
    }
  }

  private getBatchedRenderingStats(): SystemPerformanceStats['batchedRendering'] {
    if (!PerformanceConfig.ENABLE_BATCH_RENDERING) {
      return { enabled: false };
    }

    try {
      const stats = LegacyRenderer.getBatchingStats();
      return {
        enabled: stats.enabled,
        stateChangeReduction: stats.performanceGain?.stateChangeReduction || 0,
        timePerComponent: stats.performanceGain?.timePerComponent || 0,
        efficiency: stats.performanceGain?.efficiency || 'Unknown',
        batchCount: stats.batchCount || 0,
      };
    } catch (err) {
      return { enabled: false };
    }
  }
}

// Global stats collector instance
export const performanceStatsCollector = new PerformanceStatsCollector();

// Auto-register connection renderer
import { connectionRenderer } from '../ui/rendererHelpers';
performanceStatsCollector.registerManagers({ connectionRenderer });

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).performanceStats = performanceStatsCollector;
}
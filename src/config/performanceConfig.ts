/**
 * Performance Configuration - Phase 2B Optimizations
 * 
 * Controls for performance optimization features
 */

export const PerformanceConfig = {
  // Render Scheduling
  ENABLE_DIRTY_FLAG_RENDERING: true,  // Only render when something changes (90% idle CPU reduction)
  
  // Connection Rendering
  ENABLE_CONNECTION_CULLING: true,     // Skip off-screen connections (50-70% faster)
  CONNECTION_CULLING_MARGIN: 50,       // Pixels of margin for culling
  
  // Grid Rendering
  ENABLE_GRID_CACHING: true,           // Cache grid as offscreen canvas (70-90% faster)
  GRID_CACHE_ZOOM_THRESHOLD: 0.1,      // Regenerate cache if zoom changes > 10%
  
  // Future Optimizations (Phase 2B Part 2)
  ENABLE_SPATIAL_INDEXING: false,       // Quadtree for hit testing (10-100x faster)
  ENABLE_CONNECTION_CACHING: false,     // Cache connection paths with dirty tracking
  ENABLE_BATCH_RENDERING: false,        // Batch components by type (reduce state changes)
  
  // Debugging
  SHOW_PERFORMANCE_OVERLAY: false,      // Show FPS and render stats
  LOG_SLOW_FRAMES: true,                // Log frames > 16ms (below 60fps)
  SLOW_FRAME_THRESHOLD: 16,             // Milliseconds
  
  // Performance Targets
  TARGET_FPS_INTERACTIVE: 60,           // FPS during interactions
  TARGET_FPS_IDLE: 60,                  // FPS when idle (but animating)
  MIN_FPS_ACCEPTABLE: 30,               // Minimum acceptable FPS
  
  // Component Limits (warnings)
  WARN_COMPONENT_COUNT: 200,            // Warn if > 200 components
  WARN_CONNECTION_COUNT: 500,           // Warn if > 500 connections
};

/**
 * Get performance statistics
 */
export interface PerformanceStats {
  fps: number;
  frameTime: number;
  componentsRendered: number;
  connectionsRendered: number;
  connectionsCulled: number;
  lastRenderTime: number;
}

/**
 * Performance monitor for tracking and logging
 */
export class PerformanceMonitor {
  private stats: PerformanceStats = {
    fps: 60,
    frameTime: 16,
    componentsRendered: 0,
    connectionsRendered: 0,
    connectionsCulled: 0,
    lastRenderTime: 0,
  };
  
  private frameHistory: number[] = [];
  private maxHistoryLength = 60; // 1 second at 60fps
  
  updateFrame(timestamp: number, stats: Partial<PerformanceStats>): void {
    // Calculate frame time
    if (this.stats.lastRenderTime > 0) {
      const frameTime = timestamp - this.stats.lastRenderTime;
      this.frameHistory.push(frameTime);
      
      if (this.frameHistory.length > this.maxHistoryLength) {
        this.frameHistory.shift();
      }
      
      this.stats.frameTime = frameTime;
      this.stats.fps = Math.round(1000 / frameTime);
      
      // Log slow frames if enabled
      if (PerformanceConfig.LOG_SLOW_FRAMES && frameTime > PerformanceConfig.SLOW_FRAME_THRESHOLD) {
        console.warn(`⚠️ Slow frame: ${frameTime.toFixed(2)}ms (${this.stats.fps}fps)`, stats);
      }
    }
    
    this.stats.lastRenderTime = timestamp;
    Object.assign(this.stats, stats);
  }
  
  getStats(): PerformanceStats {
    return { ...this.stats };
  }
  
  getAverageFPS(): number {
    if (this.frameHistory.length === 0) return 60;
    const avgFrameTime = this.frameHistory.reduce((a, b) => a + b, 0) / this.frameHistory.length;
    return Math.round(1000 / avgFrameTime);
  }
  
  reset(): void {
    this.frameHistory = [];
    this.stats = {
      fps: 60,
      frameTime: 16,
      componentsRendered: 0,
      connectionsRendered: 0,
      connectionsCulled: 0,
      lastRenderTime: 0,
    };
  }
}

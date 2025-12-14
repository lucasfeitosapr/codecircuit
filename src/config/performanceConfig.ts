/**
 * Performance Configuration - Phase 2B Optimizations
 * 
 * Controls for performance optimization features
 */

export const PerformanceConfig = {
  // Render Scheduling
  ENABLE_DIRTY_FLAG_RENDERING: true,  // Only render when something changes (90% idle CPU reduction)
  
  // Connection Rendering
  ENABLE_OPTIMIZED_CONNECTION_RENDERER: true, // Use optimized connection renderer by default (culling+batching+caching)
  ENABLE_CONNECTION_CULLING: true,     // Skip off-screen connections (50-70% faster)
  CONNECTION_CULLING_MARGIN: 50,       // Pixels of margin for culling
  ENABLE_CONNECTION_ANIMATIONS: false, // Animated dashed overlay along traces (off by default for perf)
  ENABLE_CONNECTION_PARTICLES: false,  // Particle/comet effects along traces
  ENABLE_CONNECTION_GRADIENTS: false,  // Per-segment gradient strokes (heavier than solid)
  ENABLE_CONNECTION_DASH_OVERLAY: false, // Animated dashed overlay along traces (separate from pulse)
  // When enabled, skip rendering the main solid/core stroke and background, leaving only the animated overlays
  ENABLE_CONNECTION_DASH_ONLY: false,
  ENABLE_CONNECTION_PULSE: true,       // Lightweight pulsing glow effect for active traces
  // Adaptive animation guards
  MIN_ANIMATION_ZOOM: 0.9,             // Require at least this zoom level to allow animations
  MAX_ANIMATED_CONNECTIONS: 60,        // If visible active connections exceed this, disable animations
  // Pulse animation tuning (lightweight)
  PULSE_MIN_ZOOM: 0.9,                 // Only pulse when sufficiently zoomed in
  MAX_ACTIVE_WITH_PULSE: 300,          // Disable pulsing if too many active connections are visible
  PULSE_RATE: 0.006,                   // Speed of pulsing (radians/ms multiplier)
  // Tone down pulse so packets remain visible
  PULSE_AMPLITUDE: 0.05,               // 0..1 additional blur multiplier

  // Micro-packets overlay (very light, animated dashes for packet impression)
  ENABLE_CONNECTION_MICRO_PACKETS: true,
  MICRO_PACKETS_MIN_ZOOM: 0.95,
  MICRO_PACKETS_MAX_ACTIVE: 300,
  MICRO_PACKETS_DASH: [3, 12] as [number, number],
  // Make packets a bit more readable
  MICRO_PACKETS_LINE_WIDTH: 1.6,
  MICRO_PACKETS_ALPHA: 0.8,
  MICRO_PACKETS_SPEED: 0.06, // dash offset speed

  // Optimized renderer visual tuning
  ENABLE_CONNECTION_GLOW_OPTIMIZED: true,      // Allow glow in optimized path (lighter than layered)
  OPTIMIZED_GLOW_MIN_ZOOM: 1.0,                // Only glow when sufficiently zoomed in
  OPTIMIZED_MAX_ACTIVE_CONNECTIONS_WITH_GLOW: 50, // Disable glow if too many active connections are visible
  // Soften connection glow/widths (neon -> soft)
  OPTIMIZED_BACKGROUND_LINE_WIDTH_ACTIVE: 3,   // Background stroke width for active connections
  OPTIMIZED_BACKGROUND_LINE_WIDTH_INACTIVE: 2, // Background stroke width for inactive/defined
  OPTIMIZED_ACTIVE_LINE_WIDTH_POWERED: 2.0,    // Foreground stroke width when powered
  OPTIMIZED_ACTIVE_LINE_WIDTH: 1.6,            // Foreground stroke width when active
  OPTIMIZED_GLOW_BLUR_POWERED: 3,              // Shadow blur for powered connections
  OPTIMIZED_GLOW_BLUR_ACTIVE: 1.5,             // Shadow blur for active (not powered)

  // Temp connection (rubber-band) styling
  TEMP_CONNECTION_DASH: [8, 6] as [number, number], // Dash pattern for preview line
  TEMP_CONNECTION_LINE_WIDTH: 2,               // Line width in pixels
  TEMP_CONNECTION_ALPHA: 0.75,                 // Opacity 0..1
  TEMP_CONNECTION_USE_CATEGORY_COLOR: true,    // Use category color when available
  TEMP_CONNECTION_COLOR: null as string | null, // Optional override color (hex), takes precedence if set
  TEMP_CONNECTION_LINE_CAP: 'round' as CanvasLineCap, // Visual style for dashed ends

  // Component rendering tuning
  ENABLE_COMPONENT_GLOW_OPTIMIZED: true,        // Allow component glow (reduced cost)
  COMPONENT_GLOW_MIN_ZOOM: 1.0,                 // Only glow when zoomed in
  COMPONENT_MAX_ACTIVE_WITH_GLOW: 120,          // Disable glow if too many active components
  COMPONENT_BORDER_GLOW_BLUR_DONE: 8,           // Blur for done components
  COMPONENT_BORDER_GLOW_BLUR_ACTIVE: 5,         // Blur for in-progress components
  PIN_GLOW_MIN_ZOOM: 1.0,                       // Pin glow allowed min zoom
  COMPONENT_LABEL_MIN_ZOOM: 0.95,               // Hide labels below this zoom
  ENABLE_COMPONENT_PARTICLES: false,            // Disable expensive internal particles by default
  COMPONENT_PARTICLES_MIN_ZOOM: 1.1,            // Only show particles when zoomed in
  COMPONENT_PARTICLES_MAX_PER_COMPONENT: 2,     // Cap particles per component
  
  // Grid Rendering
  ENABLE_GRID_CACHING: true,           // Cache grid as offscreen canvas (70-90% faster)
  GRID_CACHE_ZOOM_THRESHOLD: 0.1,      // Regenerate cache if zoom changes > 10%
  
  // Advanced Optimizations (Phase 2B+)
  ENABLE_SPATIAL_INDEXING: true,        // Quadtree for hit testing (10-100x faster)
  ENABLE_CONNECTION_CACHING: true,      // Cache connection paths with dirty tracking
  ENABLE_EVENT_BATCHING: true,          // Batch high-frequency events (reduce GC)
  ENABLE_BATCH_RENDERING: true,         // Batch components by type (reduce state changes)
  
  // Debugging
  SHOW_PERFORMANCE_OVERLAY: false,      // Show FPS and render stats
  LOG_SLOW_FRAMES: true,                // Log frames > 16ms (below 60fps)
  SLOW_FRAME_THRESHOLD: 16,             // Milliseconds

  // Logging Configuration (Phase 2B+)
  LOGGING: {
    LOG_LEVEL: 'INFO',                  // DEBUG, INFO, WARN, ERROR, NONE
    ENABLED_CATEGORIES: ['init', 'error', 'warn', 'performance', 'import-export'],
    THROTTLE_RATE_LIMIT: 1,             // Max logs per second for throttled messages
    LOG_RENDER_FRAMES: false,           // Enable frame-by-frame render logging
  },
  
  // Performance Targets
  TARGET_FPS_INTERACTIVE: 60,           // FPS during interactions
  TARGET_FPS_IDLE: 60,                  // FPS when idle (but animating)
  MIN_FPS_ACCEPTABLE: 30,               // Minimum acceptable FPS
  
  // Component Limits (warnings)
  WARN_COMPONENT_COUNT: 200,            // Warn if > 200 components
  WARN_CONNECTION_COUNT: 500,           // Warn if > 500 connections

  // Spatial Indexing
  SPATIAL_INDEX_MAX_COMPONENTS: 10,     // Max components per quadtree node
  SPATIAL_INDEX_MAX_DEPTH: 6,          // Max quadtree depth

  // Connection Caching
  CONNECTION_CACHE_SIZE: 1000,          // Max cached connections
  CONNECTION_CACHE_TTL: 60000,          // Cache TTL in ms (1 minute)
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

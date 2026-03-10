/**
 * Unified Feature Configuration System
 *
 * Single source of truth for all feature flags and performance settings.
 * Replaces the old dual system (featureFlags.ts + performanceConfig.ts).
 *
 * Design decisions:
 * - camelCase naming (modern, TypeScript-friendly)
 * - Categorized by domain (performance, ui, system, debug)
 * - Separate toggles from numeric tuning parameters
 * - Type-safe with full IDE autocomplete support
 */

// ============================================================================
// CONFIGURATION INTERFACE
// ============================================================================

export interface UnifiedFeatureConfig {
  // === PERFORMANCE OPTIMIZATIONS ===
  performance: {
    // Renderer selection
    useLayeredRenderer: boolean;      // Use LayeredRenderer (vs legacy fallback)

    // Rendering optimizations
    dirtyFlagRendering: boolean;      // Only render when something changes (90% idle CPU reduction)
    batchRendering: boolean;          // Batch components by type (reduce state changes)
    smartRendering: boolean;          // Render-on-demand optimization

    // Grid & Spatial
    gridCaching: boolean;             // Cache grid as offscreen canvas (70-90% faster)
    spatialIndexing: boolean;         // Quadtree for hit testing (10-100x faster)

    // Connection rendering - Core
    optimizedConnectionRenderer: boolean; // Use optimized renderer with culling+batching+caching
    connectionCulling: boolean;       // Skip off-screen connections (50-70% faster)
    connectionCaching: boolean;       // Cache connection paths with dirty tracking

    // Connection rendering - Visual effects
    connectionAnimations: boolean;    // Animated dashed overlay along traces
    connectionParticles: boolean;     // Particle/comet effects along traces
    connectionGradients: boolean;     // Per-segment gradient strokes
    connectionDashOverlay: boolean;   // Animated dashed overlay (separate from pulse)
    connectionDashOnly: boolean;      // Skip main stroke, only show overlays
    connectionPulse: boolean;         // Lightweight pulsing glow effect
    connectionMicroPackets: boolean;  // Animated dashes for packet impression
    connectionGlowOptimized: boolean; // Allow glow in optimized path

    // Component rendering
    componentGlowOptimized: boolean;  // Allow component glow (reduced cost)
    componentParticles: boolean;      // Enable expensive internal particles

    // System optimizations
    eventBatching: boolean;           // Batch high-frequency events (reduce GC) ✨ UNIFIED!
  };

  // === UI FEATURES ===
  ui: {
    alignmentGuides: boolean;         // Smart alignment guides during component drag
    selectionHandles: boolean;        // Resize handles on selected components
    componentAnimations: boolean;     // Pulse/glow effects on component creation
    energyFlowParticles: boolean;     // Energy flow particle animations
    connectionIntents: boolean;       // Preview connection animations
    componentTooltips: boolean;       // Hover tooltips for components
  };

  // === SYSTEM FEATURES ===
  system: {
    autoSave: boolean;                // Automatic project saving to localStorage
  };

  // === DEBUG FEATURES ===
  debug: {
    debugMode: boolean;               // Show debug overlays and verbose logs
    showFpsCounter: boolean;          // Display FPS counter
    showPerformanceStats: boolean;    // Show detailed performance metrics panel
    showPerformanceOverlay: boolean;  // Show FPS and render stats overlay
    logSlowFrames: boolean;           // Log frames > 16ms (below 60fps)
  };

  // === TUNING PARAMETERS (numeric configs, not toggles) ===
  tuning: {
    // Connection culling
    connectionCullingMargin: number;  // Pixels of margin for culling

    // Connection animations
    minAnimationZoom: number;         // Require at least this zoom level to allow animations
    maxAnimatedConnections: number;   // If visible connections exceed this, disable animations

    // Pulse animation
    pulseMinZoom: number;             // Only pulse when sufficiently zoomed in
    maxActiveWithPulse: number;       // Disable pulsing if too many active connections visible
    pulseRate: number;                // Speed of pulsing (radians/ms multiplier)
    pulseAmplitude: number;           // 0..1 additional blur multiplier

    // Micro-packets
    microPacketsMinZoom: number;      // Min zoom for micro-packets
    microPacketsMaxActive: number;    // Max active connections with micro-packets
    microPacketsDash: [number, number]; // Dash pattern [dash, gap]
    microPacketsLineWidth: number;    // Line width for packets
    microPacketsAlpha: number;        // Opacity 0..1
    microPacketsSpeed: number;        // Dash offset speed

    // Optimized renderer glow
    optimizedGlowMinZoom: number;     // Only glow when sufficiently zoomed in
    optimizedMaxActiveWithGlow: number; // Disable glow if too many active
    optimizedBackgroundLineWidthActive: number;   // Background stroke width for active
    optimizedBackgroundLineWidthInactive: number; // Background stroke width for inactive
    optimizedActiveLineWidthPowered: number;      // Foreground stroke width when powered
    optimizedActiveLineWidth: number;             // Foreground stroke width when active
    optimizedGlowBlurPowered: number;             // Shadow blur for powered connections
    optimizedGlowBlurActive: number;              // Shadow blur for active (not powered)

    // Temp connection (rubber-band) styling
    tempConnectionDash: [number, number];         // Dash pattern for preview line
    tempConnectionLineWidth: number;              // Line width in pixels
    tempConnectionAlpha: number;                  // Opacity 0..1
    tempConnectionUseCategoryColor: boolean;      // Use category color when available
    tempConnectionColor: string | null;           // Optional override color (hex)
    tempConnectionLineCap: CanvasLineCap;         // Visual style for dashed ends

    // Component rendering
    componentGlowMinZoom: number;                 // Only glow when zoomed in
    componentMaxActiveWithGlow: number;           // Disable glow if too many active
    componentBorderGlowBlurDone: number;          // Blur for done components
    componentBorderGlowBlurActive: number;        // Blur for in-progress components
    pinGlowMinZoom: number;                       // Pin glow allowed min zoom
    componentLabelMinZoom: number;                // Hide labels below this zoom
    componentParticlesMinZoom: number;            // Only show particles when zoomed in
    componentParticlesMaxPerComponent: number;    // Cap particles per component

    // Grid rendering
    gridCacheZoomThreshold: number;               // Regenerate cache if zoom changes > this

    // Spatial indexing (quadtree)
    spatialIndexMaxComponents: number;            // Max components per quadtree node
    spatialIndexMaxDepth: number;                 // Max quadtree depth

    // Connection caching
    connectionCacheSize: number;                  // Max cached connections
    connectionCacheTTL: number;                   // Cache TTL in ms

    // Performance targets
    targetFpsInteractive: number;                 // FPS during interactions
    targetFpsIdle: number;                        // FPS when idle (but animating)
    minFpsAcceptable: number;                     // Minimum acceptable FPS
    slowFrameThreshold: number;                   // Milliseconds for slow frame warning

    // Component limits (warnings)
    warnComponentCount: number;                   // Warn if > N components
    warnConnectionCount: number;                  // Warn if > N connections
  };
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

export const DEFAULT_UNIFIED_CONFIG: UnifiedFeatureConfig = {
  // === PERFORMANCE ===
  performance: {
    // Renderer selection - ON by default (stable, production-ready)
    useLayeredRenderer: true,

    // Rendering optimizations - ON by default (stable, major wins)
    dirtyFlagRendering: true,
    batchRendering: true,
    smartRendering: true,

    // Grid & Spatial - ON by default (huge performance gains)
    gridCaching: true,
    spatialIndexing: true,

    // Connection rendering - Core optimizations ON
    optimizedConnectionRenderer: true,
    connectionCulling: true,
    connectionCaching: true,

    // Connection rendering - Visual effects mostly OFF (expensive)
    connectionAnimations: false,      // OFF: Heavy animation overlay
    connectionParticles: false,       // OFF: Expensive particle system
    connectionGradients: false,       // OFF: Heavier than solid colors
    connectionDashOverlay: false,     // OFF: Additional overlay pass
    connectionDashOnly: false,        // OFF: Experimental mode

    // Connection rendering - Lightweight effects ON
    connectionPulse: true,            // ON: Lightweight pulsing glow
    connectionMicroPackets: true,     // ON: Light animated dashes
    connectionGlowOptimized: true,    // ON: Optimized glow rendering

    // Component rendering - Optimized glow ON, particles OFF
    componentGlowOptimized: true,
    componentParticles: false,        // OFF: Expensive

    // System optimizations
    eventBatching: true,              // ✨ UNIFIED! Single source of truth
  },

  // === UI ===
  ui: {
    // Most UI enhancements OFF by default (experimental)
    alignmentGuides: false,
    selectionHandles: false,
    componentAnimations: false,
    connectionIntents: false,
    componentTooltips: false,

    // Energy flow particles ON (stable, working well)
    energyFlowParticles: true,
  },

  // === SYSTEM ===
  system: {
    autoSave: false,                  // OFF: User controls save manually for now
  },

  // === DEBUG ===
  debug: {
    debugMode: false,                 // OFF: Production mode
    showFpsCounter: true,             // ON: Useful for monitoring
    showPerformanceStats: false,      // OFF: Only when debugging
    showPerformanceOverlay: false,    // OFF: Only when profiling
    logSlowFrames: true,              // ON: Good for catching issues
  },

  // === TUNING ===
  tuning: {
    // Connection culling
    connectionCullingMargin: 50,

    // Connection animations
    minAnimationZoom: 0.9,
    maxAnimatedConnections: 60,

    // Pulse animation
    pulseMinZoom: 0.9,
    maxActiveWithPulse: 300,
    pulseRate: 0.006,
    pulseAmplitude: 0.05,

    // Micro-packets
    microPacketsMinZoom: 0.95,
    microPacketsMaxActive: 300,
    microPacketsDash: [3, 12],
    microPacketsLineWidth: 1.6,
    microPacketsAlpha: 0.8,
    microPacketsSpeed: 0.06,

    // Optimized renderer glow
    optimizedGlowMinZoom: 1.0,
    optimizedMaxActiveWithGlow: 50,
    optimizedBackgroundLineWidthActive: 3,
    optimizedBackgroundLineWidthInactive: 2,
    optimizedActiveLineWidthPowered: 2.0,
    optimizedActiveLineWidth: 1.6,
    optimizedGlowBlurPowered: 3,
    optimizedGlowBlurActive: 1.5,

    // Temp connection styling
    tempConnectionDash: [8, 6],
    tempConnectionLineWidth: 2,
    tempConnectionAlpha: 0.75,
    tempConnectionUseCategoryColor: true,
    tempConnectionColor: null,
    tempConnectionLineCap: 'round',

    // Component rendering
    componentGlowMinZoom: 1.0,
    componentMaxActiveWithGlow: 120,
    componentBorderGlowBlurDone: 8,
    componentBorderGlowBlurActive: 5,
    pinGlowMinZoom: 1.0,
    componentLabelMinZoom: 0.95,
    componentParticlesMinZoom: 1.1,
    componentParticlesMaxPerComponent: 2,

    // Grid rendering
    gridCacheZoomThreshold: 0.1,

    // Spatial indexing
    spatialIndexMaxComponents: 10,
    spatialIndexMaxDepth: 6,

    // Connection caching
    connectionCacheSize: 1000,
    connectionCacheTTL: 60000,

    // Performance targets
    targetFpsInteractive: 60,
    targetFpsIdle: 60,
    minFpsAcceptable: 30,
    slowFrameThreshold: 16,

    // Component limits
    warnComponentCount: 200,
    warnConnectionCount: 500,
  },
};

// ============================================================================
// METADATA FOR UI DISPLAY
// ============================================================================

export interface FlagMetadata {
  name: string;
  description: string;
  category: 'Performance' | 'UI' | 'System' | 'Debug';
  impact: 'low' | 'medium' | 'high';
  experimental: boolean;
}

// Type-safe keys for each category
type PerformanceFlags = keyof UnifiedFeatureConfig['performance'];
type UIFlags = keyof UnifiedFeatureConfig['ui'];
type SystemFlags = keyof UnifiedFeatureConfig['system'];
type DebugFlags = keyof UnifiedFeatureConfig['debug'];

export const PERFORMANCE_FLAG_METADATA: Record<PerformanceFlags, FlagMetadata> = {
  useLayeredRenderer: {
    name: 'Layered Renderer',
    description: 'Use modern LayeredRenderer instead of legacy renderer',
    category: 'Performance',
    impact: 'high',
    experimental: false,
  },
  dirtyFlagRendering: {
    name: 'Dirty Flag Rendering',
    description: 'Only render when something changes (90% idle CPU reduction)',
    category: 'Performance',
    impact: 'high',
    experimental: false,
  },
  batchRendering: {
    name: 'Batch Rendering',
    description: 'Batch components by type to reduce state changes',
    category: 'Performance',
    impact: 'medium',
    experimental: false,
  },
  smartRendering: {
    name: 'Smart Rendering',
    description: 'Render-on-demand optimization',
    category: 'Performance',
    impact: 'high',
    experimental: false,
  },
  gridCaching: {
    name: 'Grid Caching',
    description: 'Cache grid as offscreen canvas (70-90% faster)',
    category: 'Performance',
    impact: 'high',
    experimental: false,
  },
  spatialIndexing: {
    name: 'Spatial Indexing',
    description: 'Quadtree for hit testing (10-100x faster)',
    category: 'Performance',
    impact: 'high',
    experimental: false,
  },
  optimizedConnectionRenderer: {
    name: 'Optimized Connection Renderer',
    description: 'Use optimized renderer with culling, batching, and caching',
    category: 'Performance',
    impact: 'high',
    experimental: false,
  },
  connectionCulling: {
    name: 'Connection Culling',
    description: 'Skip off-screen connections (50-70% faster)',
    category: 'Performance',
    impact: 'high',
    experimental: false,
  },
  connectionCaching: {
    name: 'Connection Caching',
    description: 'Cache connection paths with dirty tracking',
    category: 'Performance',
    impact: 'medium',
    experimental: false,
  },
  connectionAnimations: {
    name: 'Connection Animations',
    description: 'Animated dashed overlay along traces',
    category: 'Performance',
    impact: 'medium',
    experimental: true,
  },
  connectionParticles: {
    name: 'Connection Particles',
    description: 'Particle/comet effects along traces',
    category: 'Performance',
    impact: 'high',
    experimental: true,
  },
  connectionGradients: {
    name: 'Connection Gradients',
    description: 'Per-segment gradient strokes',
    category: 'Performance',
    impact: 'medium',
    experimental: true,
  },
  connectionDashOverlay: {
    name: 'Connection Dash Overlay',
    description: 'Animated dashed overlay (separate from pulse)',
    category: 'Performance',
    impact: 'medium',
    experimental: true,
  },
  connectionDashOnly: {
    name: 'Connection Dash Only',
    description: 'Skip main stroke, only show overlays (experimental)',
    category: 'Performance',
    impact: 'low',
    experimental: true,
  },
  connectionPulse: {
    name: 'Connection Pulse',
    description: 'Lightweight pulsing glow effect',
    category: 'Performance',
    impact: 'low',
    experimental: false,
  },
  connectionMicroPackets: {
    name: 'Connection Micro-Packets',
    description: 'Animated dashes for packet impression',
    category: 'Performance',
    impact: 'low',
    experimental: false,
  },
  connectionGlowOptimized: {
    name: 'Connection Glow (Optimized)',
    description: 'Allow glow in optimized rendering path',
    category: 'Performance',
    impact: 'low',
    experimental: false,
  },
  componentGlowOptimized: {
    name: 'Component Glow (Optimized)',
    description: 'Allow component glow with reduced cost',
    category: 'Performance',
    impact: 'low',
    experimental: false,
  },
  componentParticles: {
    name: 'Component Particles',
    description: 'Enable expensive internal particle effects',
    category: 'Performance',
    impact: 'high',
    experimental: true,
  },
  eventBatching: {
    name: 'Event Batching',
    description: 'Batch high-frequency events to reduce garbage collection',
    category: 'Performance',
    impact: 'medium',
    experimental: false,
  },
};

export const UI_FLAG_METADATA: Record<UIFlags, FlagMetadata> = {
  alignmentGuides: {
    name: 'Alignment Guides',
    description: 'Smart alignment guides during component drag',
    category: 'UI',
    impact: 'low',
    experimental: true,
  },
  selectionHandles: {
    name: 'Resize Handles',
    description: 'Resize handles on selected components',
    category: 'UI',
    impact: 'low',
    experimental: true,
  },
  componentAnimations: {
    name: 'Component Animations',
    description: 'Pulse and glow effects on component creation',
    category: 'UI',
    impact: 'medium',
    experimental: true,
  },
  energyFlowParticles: {
    name: 'Energy Flow Particles',
    description: 'Animated particles flowing through connections',
    category: 'UI',
    impact: 'medium',
    experimental: false,
  },
  connectionIntents: {
    name: 'Connection Preview',
    description: 'Animated preview when creating connections',
    category: 'UI',
    impact: 'low',
    experimental: true,
  },
  componentTooltips: {
    name: 'Component Tooltips',
    description: 'Show tooltips when hovering over components',
    category: 'UI',
    impact: 'low',
    experimental: true,
  },
};

export const SYSTEM_FLAG_METADATA: Record<SystemFlags, FlagMetadata> = {
  autoSave: {
    name: 'Auto-Save',
    description: 'Automatically save project to browser storage',
    category: 'System',
    impact: 'low',
    experimental: true,
  },
};

export const DEBUG_FLAG_METADATA: Record<DebugFlags, FlagMetadata> = {
  debugMode: {
    name: 'Debug Mode',
    description: 'Enable verbose logging and debug overlays',
    category: 'Debug',
    impact: 'low',
    experimental: false,
  },
  showFpsCounter: {
    name: 'FPS Counter',
    description: 'Display frames per second counter',
    category: 'Debug',
    impact: 'low',
    experimental: false,
  },
  showPerformanceStats: {
    name: 'Performance Stats',
    description: 'Show detailed performance metrics panel',
    category: 'Debug',
    impact: 'low',
    experimental: false,
  },
  showPerformanceOverlay: {
    name: 'Performance Overlay',
    description: 'Show FPS and render stats overlay',
    category: 'Debug',
    impact: 'low',
    experimental: false,
  },
  logSlowFrames: {
    name: 'Log Slow Frames',
    description: 'Log frames exceeding 16ms (below 60fps)',
    category: 'Debug',
    impact: 'low',
    experimental: false,
  },
};

// Combined metadata for easy access
export const ALL_FLAG_METADATA = {
  performance: PERFORMANCE_FLAG_METADATA,
  ui: UI_FLAG_METADATA,
  system: SYSTEM_FLAG_METADATA,
  debug: DEBUG_FLAG_METADATA,
};

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export type PresetName = 'baseline' | 'performanceMax' | 'visualRich';

export const PRESETS: Record<PresetName, Partial<UnifiedFeatureConfig>> = {
  // Baseline: Conservative defaults
  baseline: DEFAULT_UNIFIED_CONFIG,

  // Performance Max: Speed over visuals
  performanceMax: {
    performance: {
      useLayeredRenderer: true,
      dirtyFlagRendering: true,
      batchRendering: true,
      smartRendering: true,
      gridCaching: true,
      spatialIndexing: true,
      optimizedConnectionRenderer: true,
      connectionCulling: true,
      connectionCaching: true,
      connectionAnimations: false,      // Disable for speed
      connectionParticles: false,       // Disable for speed
      connectionGradients: false,       // Disable for speed
      connectionDashOverlay: false,     // Disable for speed
      connectionDashOnly: false,
      connectionPulse: true,            // Keep lightweight effect
      connectionMicroPackets: true,     // Keep lightweight effect
      connectionGlowOptimized: true,
      componentGlowOptimized: true,
      componentParticles: false,        // Disable for speed
      eventBatching: true,
    },
    ui: {
      alignmentGuides: false,
      selectionHandles: false,
      componentAnimations: false,       // Disable for speed
      energyFlowParticles: false,       // Disable for speed
      connectionIntents: false,
      componentTooltips: false,
    },
    debug: {
      debugMode: false,
      showFpsCounter: true,
      showPerformanceStats: false,
      showPerformanceOverlay: false,
      logSlowFrames: false,             // Reduce console spam
    },
  },

  // Visual Rich: Eye-candy over speed
  visualRich: {
    performance: {
      useLayeredRenderer: true,         // Use modern renderer
      dirtyFlagRendering: true,         // Keep optimizations ON
      batchRendering: true,
      smartRendering: true,
      gridCaching: true,
      spatialIndexing: true,
      optimizedConnectionRenderer: true,
      connectionCulling: true,
      connectionCaching: true,
      connectionAnimations: true,       // Enable visuals
      connectionParticles: true,        // Enable visuals
      connectionGradients: true,        // Enable visuals
      connectionDashOverlay: true,      // Enable visuals
      connectionDashOnly: false,
      connectionPulse: true,
      connectionMicroPackets: true,
      connectionGlowOptimized: true,
      componentGlowOptimized: true,
      componentParticles: true,         // Enable visuals
      eventBatching: true,
    },
    ui: {
      alignmentGuides: true,            // Enable UI features
      selectionHandles: true,
      componentAnimations: true,
      energyFlowParticles: true,
      connectionIntents: true,
      componentTooltips: true,
    },
    debug: {
      debugMode: false,
      showFpsCounter: true,
      showPerformanceStats: false,
      showPerformanceOverlay: true,     // Show performance overlay
      logSlowFrames: true,
    },
  },
};

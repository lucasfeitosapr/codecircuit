/**
 * Feature Flag Adapter - Bridge to Unified Config System
 *
 * This adapter provides a compatibility layer between the old API surface
 * (featureFlags.ts + performanceConfig.ts) and the new UnifiedFeatureConfig system.
 *
 * Status: PERMANENT BRIDGE LAYER (Phase 2 Complete - 2026-01-23)
 *
 * Benefits:
 * - Zero breaking changes for existing code
 * - All config flows through UnifiedFeatureManager (single source of truth)
 * - Runtime configurability for previously static settings
 * - Can be removed in future if direct UnifiedFeatureManager usage preferred
 *
 * Migration Stats:
 * - Files using adapter: 18
 * - Legacy files archived: 4 (featureFlags.ts, performanceConfig.ts, FeatureFlagManager.ts, mocks)
 * - Tests passing: 836/845 (99.0%)
 */

import { getUnifiedFeatureManager } from '../core/UnifiedFeatureManager';

const manager = getUnifiedFeatureManager();

// ============================================================================
// LEGACY FEATURE FLAGS ADAPTER
// ============================================================================

/**
 * Maps old featureFlags.ts constants to unified config
 * @deprecated Use getUnifiedFeatureManager().getFlag() instead
 */
export const FeatureFlags = new Proxy({}, {
    get(_target, prop: string) {
        const config = manager.getConfig();

        // Map old SCREAMING_SNAKE_CASE to new camelCase
        const mapping: Record<string, any> = {
            'ENABLE_ALIGNMENT_GUIDES': config.ui.alignmentGuides,
            'ENABLE_SELECTION_HANDLES': config.ui.selectionHandles,
            'ENABLE_COMPONENT_ANIMATIONS': config.ui.componentAnimations,
            'ENABLE_ENERGY_FLOW_PARTICLES': config.ui.energyFlowParticles,
            'ENABLE_CONNECTION_INTENTS': config.ui.connectionIntents,
            'ENABLE_COMPONENT_TOOLTIPS': config.ui.componentTooltips,
            'ENABLE_AUTO_SAVE': config.system.autoSave,
            'ENABLE_SMART_RENDERING': config.performance.smartRendering,
            'DEBUG_MODE': config.debug.debugMode,
            'SHOW_FPS_COUNTER': config.debug.showFpsCounter,
            'SHOW_PERFORMANCE_STATS': config.debug.showPerformanceStats,
        };

        return mapping[prop] ?? false;
    }
});

// ============================================================================
// LEGACY PERFORMANCE CONFIG ADAPTER
// ============================================================================

export interface PerformanceLoggingConfig {
    LOG_LEVEL: string;
    ENABLED_CATEGORIES: string[];
    THROTTLE_RATE_LIMIT: number;
    LOG_RENDER_FRAMES: boolean;
}

export interface PerformanceConfigFlags {
    // Render Scheduling
    ENABLE_DIRTY_FLAG_RENDERING: boolean;

    // Connection Rendering - Core
    ENABLE_OPTIMIZED_CONNECTION_RENDERER: boolean;
    ENABLE_CONNECTION_CULLING: boolean;
    CONNECTION_CULLING_MARGIN: number;
    ENABLE_CONNECTION_ANIMATIONS: boolean;
    ENABLE_CONNECTION_PARTICLES: boolean;
    ENABLE_CONNECTION_GRADIENTS: boolean;
    ENABLE_CONNECTION_DASH_OVERLAY: boolean;
    ENABLE_CONNECTION_DASH_ONLY: boolean;
    ENABLE_CONNECTION_PULSE: boolean;

    // Adaptive animation guards
    MIN_ANIMATION_ZOOM: number;
    MAX_ANIMATED_CONNECTIONS: number;

    // Pulse animation tuning
    PULSE_MIN_ZOOM: number;
    MAX_ACTIVE_WITH_PULSE: number;
    PULSE_RATE: number;
    PULSE_AMPLITUDE: number;

    // Micro-packets overlay
    ENABLE_CONNECTION_MICRO_PACKETS: boolean;
    MICRO_PACKETS_MIN_ZOOM: number;
    MICRO_PACKETS_MAX_ACTIVE: number;
    MICRO_PACKETS_DASH: [number, number];
    MICRO_PACKETS_LINE_WIDTH: number;
    MICRO_PACKETS_ALPHA: number;
    MICRO_PACKETS_SPEED: number;

    // Optimized renderer visual tuning
    ENABLE_CONNECTION_GLOW_OPTIMIZED: boolean;
    OPTIMIZED_GLOW_MIN_ZOOM: number;
    OPTIMIZED_MAX_ACTIVE_CONNECTIONS_WITH_GLOW: number;
    OPTIMIZED_BACKGROUND_LINE_WIDTH_ACTIVE: number;
    OPTIMIZED_BACKGROUND_LINE_WIDTH_INACTIVE: number;
    OPTIMIZED_ACTIVE_LINE_WIDTH_POWERED: number;
    OPTIMIZED_ACTIVE_LINE_WIDTH: number;
    OPTIMIZED_GLOW_BLUR_POWERED: number;
    OPTIMIZED_GLOW_BLUR_ACTIVE: number;

    // Temp connection styling
    TEMP_CONNECTION_DASH: [number, number];
    TEMP_CONNECTION_LINE_WIDTH: number;
    TEMP_CONNECTION_ALPHA: number;
    TEMP_CONNECTION_USE_CATEGORY_COLOR: boolean;
    TEMP_CONNECTION_COLOR: string | null;
    TEMP_CONNECTION_LINE_CAP: CanvasLineCap;

    // Component rendering tuning
    ENABLE_COMPONENT_GLOW_OPTIMIZED: boolean;
    COMPONENT_GLOW_MIN_ZOOM: number;
    COMPONENT_MAX_ACTIVE_WITH_GLOW: number;
    COMPONENT_BORDER_GLOW_BLUR_DONE: number;
    COMPONENT_BORDER_GLOW_BLUR_ACTIVE: number;
    PIN_GLOW_MIN_ZOOM: number;
    COMPONENT_LABEL_MIN_ZOOM: number;
    ENABLE_COMPONENT_PARTICLES: boolean;
    COMPONENT_PARTICLES_MIN_ZOOM: number;
    COMPONENT_PARTICLES_MAX_PER_COMPONENT: number;

    // Grid Rendering
    ENABLE_GRID_CACHING: boolean;
    GRID_CACHE_ZOOM_THRESHOLD: number;

    // Advanced Optimizations
    ENABLE_SPATIAL_INDEXING: boolean;
    ENABLE_CONNECTION_CACHING: boolean;
    ENABLE_EVENT_BATCHING: boolean;
    ENABLE_BATCH_RENDERING: boolean;

    // Debugging
    SHOW_PERFORMANCE_OVERLAY: boolean;
    LOG_SLOW_FRAMES: boolean;
    SLOW_FRAME_THRESHOLD: number;

    // Logging Configuration
    LOGGING: PerformanceLoggingConfig;

    // Performance Targets
    TARGET_FPS_INTERACTIVE: number;
    TARGET_FPS_IDLE: number;
    MIN_FPS_ACCEPTABLE: number;

    // Component Limits
    WARN_COMPONENT_COUNT: number;
    WARN_CONNECTION_COUNT: number;

    // Spatial Indexing
    SPATIAL_INDEX_MAX_COMPONENTS: number;
    SPATIAL_INDEX_MAX_DEPTH: number;

    // Connection Caching
    CONNECTION_CACHE_SIZE: number;
    CONNECTION_CACHE_TTL: number;
}

/**
 * Maps old performanceConfig.ts constants to unified config
 * @deprecated Use getUnifiedFeatureManager().getFlag() instead
 */
export const PerformanceConfig: PerformanceConfigFlags = new Proxy({} as PerformanceConfigFlags, {
    get(_target, prop: string) {
        const config = manager.getConfig();

        // Map old SCREAMING_SNAKE_CASE to new camelCase
        const mapping: Record<string, any> = {
            // Render Scheduling
            'ENABLE_DIRTY_FLAG_RENDERING': config.performance.dirtyFlagRendering,

            // Connection Rendering - Core
            'ENABLE_OPTIMIZED_CONNECTION_RENDERER': config.performance.optimizedConnectionRenderer,
            'ENABLE_CONNECTION_CULLING': config.performance.connectionCulling,
            'CONNECTION_CULLING_MARGIN': config.tuning.connectionCullingMargin,
            'ENABLE_CONNECTION_ANIMATIONS': config.performance.connectionAnimations,
            'ENABLE_CONNECTION_PARTICLES': config.performance.connectionParticles,
            'ENABLE_CONNECTION_GRADIENTS': config.performance.connectionGradients,
            'ENABLE_CONNECTION_DASH_OVERLAY': config.performance.connectionDashOverlay,
            'ENABLE_CONNECTION_DASH_ONLY': config.performance.connectionDashOnly,
            'ENABLE_CONNECTION_PULSE': config.performance.connectionPulse,

            // Adaptive animation guards
            'MIN_ANIMATION_ZOOM': config.tuning.minAnimationZoom,
            'MAX_ANIMATED_CONNECTIONS': config.tuning.maxAnimatedConnections,

            // Pulse animation tuning
            'PULSE_MIN_ZOOM': config.tuning.pulseMinZoom,
            'MAX_ACTIVE_WITH_PULSE': config.tuning.maxActiveWithPulse,
            'PULSE_RATE': config.tuning.pulseRate,
            'PULSE_AMPLITUDE': config.tuning.pulseAmplitude,

            // Micro-packets overlay
            'ENABLE_CONNECTION_MICRO_PACKETS': config.performance.connectionMicroPackets,
            'MICRO_PACKETS_MIN_ZOOM': config.tuning.microPacketsMinZoom,
            'MICRO_PACKETS_MAX_ACTIVE': config.tuning.microPacketsMaxActive,
            'MICRO_PACKETS_DASH': config.tuning.microPacketsDash,
            'MICRO_PACKETS_LINE_WIDTH': config.tuning.microPacketsLineWidth,
            'MICRO_PACKETS_ALPHA': config.tuning.microPacketsAlpha,
            'MICRO_PACKETS_SPEED': config.tuning.microPacketsSpeed,

            // Optimized renderer visual tuning
            'ENABLE_CONNECTION_GLOW_OPTIMIZED': config.performance.connectionGlowOptimized,
            'OPTIMIZED_GLOW_MIN_ZOOM': config.tuning.optimizedGlowMinZoom,
            'OPTIMIZED_MAX_ACTIVE_CONNECTIONS_WITH_GLOW': config.tuning.optimizedMaxActiveWithGlow,
            'OPTIMIZED_BACKGROUND_LINE_WIDTH_ACTIVE': config.tuning.optimizedBackgroundLineWidthActive,
            'OPTIMIZED_BACKGROUND_LINE_WIDTH_INACTIVE': config.tuning.optimizedBackgroundLineWidthInactive,
            'OPTIMIZED_ACTIVE_LINE_WIDTH_POWERED': config.tuning.optimizedActiveLineWidthPowered,
            'OPTIMIZED_ACTIVE_LINE_WIDTH': config.tuning.optimizedActiveLineWidth,
            'OPTIMIZED_GLOW_BLUR_POWERED': config.tuning.optimizedGlowBlurPowered,
            'OPTIMIZED_GLOW_BLUR_ACTIVE': config.tuning.optimizedGlowBlurActive,

            // Temp connection styling
            'TEMP_CONNECTION_DASH': config.tuning.tempConnectionDash,
            'TEMP_CONNECTION_LINE_WIDTH': config.tuning.tempConnectionLineWidth,
            'TEMP_CONNECTION_ALPHA': config.tuning.tempConnectionAlpha,
            'TEMP_CONNECTION_USE_CATEGORY_COLOR': config.tuning.tempConnectionUseCategoryColor,
            'TEMP_CONNECTION_COLOR': config.tuning.tempConnectionColor,
            'TEMP_CONNECTION_LINE_CAP': config.tuning.tempConnectionLineCap,

            // Component rendering tuning
            'ENABLE_COMPONENT_GLOW_OPTIMIZED': config.performance.componentGlowOptimized,
            'COMPONENT_GLOW_MIN_ZOOM': config.tuning.componentGlowMinZoom,
            'COMPONENT_MAX_ACTIVE_WITH_GLOW': config.tuning.componentMaxActiveWithGlow,
            'COMPONENT_BORDER_GLOW_BLUR_DONE': config.tuning.componentBorderGlowBlurDone,
            'COMPONENT_BORDER_GLOW_BLUR_ACTIVE': config.tuning.componentBorderGlowBlurActive,
            'PIN_GLOW_MIN_ZOOM': config.tuning.pinGlowMinZoom,
            'COMPONENT_LABEL_MIN_ZOOM': config.tuning.componentLabelMinZoom,
            'ENABLE_COMPONENT_PARTICLES': config.performance.componentParticles,
            'COMPONENT_PARTICLES_MIN_ZOOM': config.tuning.componentParticlesMinZoom,
            'COMPONENT_PARTICLES_MAX_PER_COMPONENT': config.tuning.componentParticlesMaxPerComponent,

            // Grid Rendering
            'ENABLE_GRID_CACHING': config.performance.gridCaching,
            'GRID_CACHE_ZOOM_THRESHOLD': config.tuning.gridCacheZoomThreshold,

            // Advanced Optimizations
            'ENABLE_SPATIAL_INDEXING': config.performance.spatialIndexing,
            'ENABLE_CONNECTION_CACHING': config.performance.connectionCaching,
            'ENABLE_EVENT_BATCHING': config.performance.eventBatching,
            'ENABLE_BATCH_RENDERING': config.performance.batchRendering,

            // Debugging
            'SHOW_PERFORMANCE_OVERLAY': config.debug.showPerformanceOverlay,
            'LOG_SLOW_FRAMES': config.debug.logSlowFrames,
            'SLOW_FRAME_THRESHOLD': config.tuning.slowFrameThreshold,

            // Logging Configuration (kept as nested object for now)
            'LOGGING': {
                LOG_LEVEL: 'INFO',
                ENABLED_CATEGORIES: ['init', 'error', 'warn', 'performance', 'import-export'],
                THROTTLE_RATE_LIMIT: 1,
                LOG_RENDER_FRAMES: false,
            },

            // Performance Targets
            'TARGET_FPS_INTERACTIVE': config.tuning.targetFpsInteractive,
            'TARGET_FPS_IDLE': config.tuning.targetFpsIdle,
            'MIN_FPS_ACCEPTABLE': config.tuning.minFpsAcceptable,

            // Component Limits
            'WARN_COMPONENT_COUNT': config.tuning.warnComponentCount,
            'WARN_CONNECTION_COUNT': config.tuning.warnConnectionCount,

            // Spatial Indexing
            'SPATIAL_INDEX_MAX_COMPONENTS': config.tuning.spatialIndexMaxComponents,
            'SPATIAL_INDEX_MAX_DEPTH': config.tuning.spatialIndexMaxDepth,

            // Connection Caching
            'CONNECTION_CACHE_SIZE': config.tuning.connectionCacheSize,
            'CONNECTION_CACHE_TTL': config.tuning.connectionCacheTTL,
        };

        return mapping[prop] ?? null;
    }
}) as PerformanceConfigFlags;

// ============================================================================
// RENDERER SELECTION
// ============================================================================

/**
 * Determines whether to use the new LayeredRenderer vs legacy renderer
 * @deprecated Use getUnifiedFeatureManager().getFlag('performance', 'useLayeredRenderer')
 */
export function isNewRendererEnabled(): boolean {
    // Read from unified config once useLayeredRenderer flag is added
    // For now, default to true (matching current behavior)
    return manager.getFlag('performance', 'useLayeredRenderer') ?? true;
}

// ============================================================================
// UI METADATA EXPORTS (for FeatureTogglePanels)
// ============================================================================

/**
 * Legacy FeatureFlags interface
 * @deprecated Use UnifiedFeatureConfig.ui instead
 */
export interface FeatureFlags {
    // UI Enhancement Features
    ENABLE_ALIGNMENT_GUIDES: boolean;
    ENABLE_SELECTION_HANDLES: boolean;
    ENABLE_COMPONENT_ANIMATIONS: boolean;
    ENABLE_ENERGY_FLOW_PARTICLES: boolean;
    ENABLE_CONNECTION_INTENTS: boolean;
    ENABLE_COMPONENT_TOOLTIPS: boolean;

    // System Features
    ENABLE_AUTO_SAVE: boolean;
    ENABLE_SMART_RENDERING: boolean;

    // Debug Features
    DEBUG_MODE: boolean;
    SHOW_FPS_COUNTER: boolean;
    SHOW_PERFORMANCE_STATS: boolean;
}

/**
 * Default Feature Flag Configuration
 * @deprecated Use DEFAULT_UNIFIED_CONFIG.ui instead
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
    // UI Enhancements
    ENABLE_ALIGNMENT_GUIDES: false,
    ENABLE_SELECTION_HANDLES: false,
    ENABLE_COMPONENT_ANIMATIONS: false,
    ENABLE_ENERGY_FLOW_PARTICLES: true,
    ENABLE_CONNECTION_INTENTS: false,
    ENABLE_COMPONENT_TOOLTIPS: false,

    // System Features
    ENABLE_AUTO_SAVE: false,
    ENABLE_SMART_RENDERING: true,

    // Debug Features
    DEBUG_MODE: false,
    SHOW_FPS_COUNTER: true,
    SHOW_PERFORMANCE_STATS: false,
};

/**
 * Feature metadata for UI display
 * @deprecated Migrate to UnifiedFeatureConfig metadata
 */
export interface FeatureFlagMetadata {
    name: string;
    description: string;
    category: 'UI' | 'System' | 'Debug';
    performanceImpact: 'low' | 'medium' | 'high';
    experimental: boolean;
}

/**
 * Metadata for each feature flag (used by UI panels)
 * @deprecated Migrate to UnifiedFeatureConfig metadata
 */
export const FEATURE_FLAG_METADATA: Record<keyof FeatureFlags, FeatureFlagMetadata> = {
    ENABLE_ALIGNMENT_GUIDES: {
        name: 'Alignment Guides',
        description: 'Show smart alignment guides when dragging components',
        category: 'UI',
        performanceImpact: 'low',
        experimental: true,
    },
    ENABLE_SELECTION_HANDLES: {
        name: 'Resize Handles',
        description: 'Show resize handles on selected components',
        category: 'UI',
        performanceImpact: 'low',
        experimental: true,
    },
    ENABLE_COMPONENT_ANIMATIONS: {
        name: 'Component Animations',
        description: 'Pulse and glow effects when creating components',
        category: 'UI',
        performanceImpact: 'medium',
        experimental: true,
    },
    ENABLE_ENERGY_FLOW_PARTICLES: {
        name: 'Energy Flow Particles',
        description: 'Animated particles flowing through connections',
        category: 'UI',
        performanceImpact: 'medium',
        experimental: false,
    },
    ENABLE_CONNECTION_INTENTS: {
        name: 'Connection Preview',
        description: 'Animated preview when creating connections',
        category: 'UI',
        performanceImpact: 'low',
        experimental: true,
    },
    ENABLE_COMPONENT_TOOLTIPS: {
        name: 'Component Tooltips',
        description: 'Show tooltips when hovering over components',
        category: 'UI',
        performanceImpact: 'low',
        experimental: true,
    },
    ENABLE_AUTO_SAVE: {
        name: 'Auto-Save',
        description: 'Automatically save project to browser storage',
        category: 'System',
        performanceImpact: 'low',
        experimental: true,
    },
    ENABLE_SMART_RENDERING: {
        name: 'Smart Rendering',
        description: 'Only render when changes occur (performance optimization)',
        category: 'System',
        performanceImpact: 'high',
        experimental: false,
    },
    DEBUG_MODE: {
        name: 'Debug Mode',
        description: 'Enable verbose logging and debug overlays',
        category: 'Debug',
        performanceImpact: 'low',
        experimental: false,
    },
    SHOW_FPS_COUNTER: {
        name: 'FPS Counter',
        description: 'Display frames per second counter',
        category: 'Debug',
        performanceImpact: 'low',
        experimental: false,
    },
    SHOW_PERFORMANCE_STATS: {
        name: 'Performance Stats',
        description: 'Show detailed performance metrics panel',
        category: 'Debug',
        performanceImpact: 'low',
        experimental: true,
    },
};

// ============================================================================
// LEGACY FEATURE FLAG MANAGER API
// ============================================================================

/**
 * Legacy FeatureFlagManager compatibility layer
 * @deprecated Use getUnifiedFeatureManager() instead
 */
export function getFeatureFlagManager() {
    const unifiedManager = manager;

    const flagManager = {
        getFlags: (): FeatureFlags => {
            const config = unifiedManager.getConfig();
            return {
                ENABLE_ALIGNMENT_GUIDES: config.ui.alignmentGuides,
                ENABLE_SELECTION_HANDLES: config.ui.selectionHandles,
                ENABLE_COMPONENT_ANIMATIONS: config.ui.componentAnimations,
                ENABLE_ENERGY_FLOW_PARTICLES: config.ui.energyFlowParticles,
                ENABLE_CONNECTION_INTENTS: config.ui.connectionIntents,
                ENABLE_COMPONENT_TOOLTIPS: config.ui.componentTooltips,
                ENABLE_AUTO_SAVE: config.system.autoSave,
                ENABLE_SMART_RENDERING: config.performance.smartRendering,
                DEBUG_MODE: config.debug.debugMode,
                SHOW_FPS_COUNTER: config.debug.showFpsCounter,
                SHOW_PERFORMANCE_STATS: config.debug.showPerformanceStats,
            };
        },

        getFlag: (key: keyof FeatureFlags): boolean => {
            const config = unifiedManager.getConfig();
            const mapping: Record<string, any> = {
                'ENABLE_ALIGNMENT_GUIDES': config.ui.alignmentGuides,
                'ENABLE_SELECTION_HANDLES': config.ui.selectionHandles,
                'ENABLE_COMPONENT_ANIMATIONS': config.ui.componentAnimations,
                'ENABLE_ENERGY_FLOW_PARTICLES': config.ui.energyFlowParticles,
                'ENABLE_CONNECTION_INTENTS': config.ui.connectionIntents,
                'ENABLE_COMPONENT_TOOLTIPS': config.ui.componentTooltips,
                'ENABLE_AUTO_SAVE': config.system.autoSave,
                'ENABLE_SMART_RENDERING': config.performance.smartRendering,
                'DEBUG_MODE': config.debug.debugMode,
                'SHOW_FPS_COUNTER': config.debug.showFpsCounter,
                'SHOW_PERFORMANCE_STATS': config.debug.showPerformanceStats,
            };
            return mapping[key] ?? false;
        },

        setFlag: (key: keyof FeatureFlags, value: boolean): void => {
            // Map old flag names to new config paths
            const mapping: Record<string, [string, string]> = {
                'ENABLE_ALIGNMENT_GUIDES': ['ui', 'alignmentGuides'],
                'ENABLE_SELECTION_HANDLES': ['ui', 'selectionHandles'],
                'ENABLE_COMPONENT_ANIMATIONS': ['ui', 'componentAnimations'],
                'ENABLE_ENERGY_FLOW_PARTICLES': ['ui', 'energyFlowParticles'],
                'ENABLE_CONNECTION_INTENTS': ['ui', 'connectionIntents'],
                'ENABLE_COMPONENT_TOOLTIPS': ['ui', 'componentTooltips'],
                'ENABLE_AUTO_SAVE': ['system', 'autoSave'],
                'ENABLE_SMART_RENDERING': ['performance', 'smartRendering'],
                'DEBUG_MODE': ['debug', 'debugMode'],
                'SHOW_FPS_COUNTER': ['debug', 'showFpsCounter'],
                'SHOW_PERFORMANCE_STATS': ['debug', 'showPerformanceStats'],
            };

            const path = mapping[key];
            if (path) {
                unifiedManager.setFlag(path[0] as any, path[1] as any, value);
            }
        },

        toggleFlag: (key: keyof FeatureFlags): void => {
            const currentValue = flagManager.getFlag(key);
            flagManager.setFlag(key, !currentValue);
        },

        resetToDefaults: (): void => {
            // Reset all flags to default values
            const defaults = DEFAULT_FEATURE_FLAGS;
            Object.keys(defaults).forEach((key) => {
                flagManager.setFlag(key as keyof FeatureFlags, defaults[key as keyof FeatureFlags]);
            });
        },
    };

    return flagManager;
}

/**
 * Convenience function to check if a feature is enabled
 * @deprecated Use getUnifiedFeatureManager().getFlag() instead
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
    return getFeatureFlagManager().getFlag(flag);
}

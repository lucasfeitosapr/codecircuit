/**
 * Feature Flags Configuration
 * Controls experimental and optional UI features
 */

export interface FeatureFlags {
  // UI Enhancement Features
  ENABLE_ALIGNMENT_GUIDES: boolean;      // Smart alignment guides during component drag
  ENABLE_SELECTION_HANDLES: boolean;     // Resize handles on selected components
  ENABLE_COMPONENT_ANIMATIONS: boolean;  // Pulse/glow effects on component creation
  ENABLE_ENERGY_FLOW_PARTICLES: boolean; // Energy flow particle animations
  ENABLE_CONNECTION_INTENTS: boolean;    // Preview connection animations
  ENABLE_COMPONENT_TOOLTIPS: boolean;    // Hover tooltips for components

  // System Features
  ENABLE_AUTO_SAVE: boolean;             // Automatic project saving to localStorage
  ENABLE_SMART_RENDERING: boolean;       // Render-on-demand optimization

  // Debug Features
  DEBUG_MODE: boolean;                   // Show debug overlays and verbose logs
  SHOW_FPS_COUNTER: boolean;            // Display FPS counter
  SHOW_PERFORMANCE_STATS: boolean;      // Show detailed performance metrics
}

/**
 * Default Feature Flag Configuration
 * Most experimental features are OFF by default to preserve original behavior
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // UI Enhancements - OFF by default (experimental)
  ENABLE_ALIGNMENT_GUIDES: false,
  ENABLE_SELECTION_HANDLES: false,
  ENABLE_COMPONENT_ANIMATIONS: false,
  ENABLE_ENERGY_FLOW_PARTICLES: true,    // This was working, keep it on
  ENABLE_CONNECTION_INTENTS: false,
  ENABLE_COMPONENT_TOOLTIPS: false,

  // System Features - ON by default (stable)
  ENABLE_AUTO_SAVE: false,
  ENABLE_SMART_RENDERING: true,

  // Debug Features - OFF by default
  DEBUG_MODE: false,
  SHOW_FPS_COUNTER: true,
  SHOW_PERFORMANCE_STATS: false,
};

/**
 * Feature metadata for UI display
 */
export interface FeatureFlagMetadata {
  name: string;
  description: string;
  category: 'UI' | 'System' | 'Debug';
  performanceImpact: 'low' | 'medium' | 'high';
  experimental: boolean;
}

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

// Legacy compatibility
export function isNewRendererEnabled(): boolean {
  return true;
}

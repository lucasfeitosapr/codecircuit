import { vi } from 'vitest';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from '../../config/featureFlags';

// Mock feature flag state - defaults to all enabled for tests
let mockFlags: FeatureFlags = {
  ...DEFAULT_FEATURE_FLAGS,
  // Enable all features for tests by default
  ENABLE_ALIGNMENT_GUIDES: true,
  ENABLE_SELECTION_HANDLES: true,
  ENABLE_COMPONENT_ANIMATIONS: true,
  ENABLE_ENERGY_FLOW_PARTICLES: true,
  ENABLE_CONNECTION_INTENTS: true,
  ENABLE_COMPONENT_TOOLTIPS: true,
};

export const isFeatureEnabled = vi.fn((flag: keyof FeatureFlags) => {
  return mockFlags[flag];
});

export const getFeatureFlagManager = vi.fn(() => ({
  getFlags: () => mockFlags,
  getFlag: (key: keyof FeatureFlags) => mockFlags[key],
  setFlag: (key: keyof FeatureFlags, value: boolean) => {
    mockFlags[key] = value as any;
  },
  toggleFlag: (key: keyof FeatureFlags) => {
    if (typeof mockFlags[key] === 'boolean') {
      mockFlags[key] = !mockFlags[key] as any;
    }
  },
  resetToDefaults: () => {
    mockFlags = { ...DEFAULT_FEATURE_FLAGS };
  },
}));

// Helper to set feature flags in tests
export function setMockFeatureFlag(flag: keyof FeatureFlags, value: boolean) {
  mockFlags[flag] = value as any;
}

// Helper to reset all flags to defaults
export function resetMockFeatureFlags() {
  mockFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    // Re-enable all features for tests
    ENABLE_ALIGNMENT_GUIDES: true,
    ENABLE_SELECTION_HANDLES: true,
    ENABLE_COMPONENT_ANIMATIONS: true,
    ENABLE_ENERGY_FLOW_PARTICLES: true,
    ENABLE_CONNECTION_INTENTS: true,
    ENABLE_COMPONENT_TOOLTIPS: true,
  };
}

/**
 * Vitest Test Setup
 * Mocks and global configuration for all tests
 */

import { vi } from 'vitest';

// Mock FeatureFlagManager for all tests
vi.mock('./core/FeatureFlagManager', () => {
  const { DEFAULT_FEATURE_FLAGS } = require('./config/featureFlags');

  // Enable all features for tests by default
  const mockFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ENABLE_ALIGNMENT_GUIDES: true,
    ENABLE_SELECTION_HANDLES: true,
    ENABLE_COMPONENT_ANIMATIONS: true,
    ENABLE_ENERGY_FLOW_PARTICLES: true,
    ENABLE_CONNECTION_INTENTS: true,
    ENABLE_COMPONENT_TOOLTIPS: true,
  };

  return {
    isFeatureEnabled: vi.fn((flag: string) => mockFlags[flag as keyof typeof mockFlags]),
    getFeatureFlagManager: vi.fn(() => ({
      getFlags: () => mockFlags,
      getFlag: (key: string) => mockFlags[key as keyof typeof mockFlags],
      setFlag: vi.fn(),
      toggleFlag: vi.fn(),
      resetToDefaults: vi.fn(),
    })),
  };
});

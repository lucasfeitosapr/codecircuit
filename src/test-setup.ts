/**
 * Vitest Test Setup
 * Mocks and global configuration for all tests
 */

import { vi } from 'vitest';
import { DEFAULT_FEATURE_FLAGS } from './config/featureFlags';

// Mock FeatureFlagManager for all tests
vi.mock('./core/FeatureFlagManager', () => {
  // Enable all features for tests by default
  const mockFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ENABLE_ALIGNMENT_GUIDES: true,
    ENABLE_SELECTION_HANDLES: true,
    ENABLE_COMPONENT_ANIMATIONS: true,
    ENABLE_ENERGY_FLOW_PARTICLES: true,
    ENABLE_CONNECTION_INTENTS: true,
    ENABLE_COMPONENT_TOOLTIPS: true,
  } as const;

  return {
    isFeatureEnabled: vi.fn((flag: string) => (mockFlags as any)[flag]),
    getFeatureFlagManager: vi.fn(() => ({
      getFlags: () => mockFlags,
      getFlag: (key: string) => (mockFlags as any)[key],
      setFlag: vi.fn(),
      toggleFlag: vi.fn(),
      resetToDefaults: vi.fn(),
    })),
  };
});

/**
 * Vitest Test Setup
 * Mocks and global configuration for all tests
 */

import { vi } from 'vitest';
import { DEFAULT_UNIFIED_CONFIG } from './config/UnifiedFeatureConfig';

// Mock FeatureFlagManager for backward compatibility (will be removed with archived files)
vi.mock('./core/FeatureFlagManager', () => {
  // Enable all UI features for tests by default
  const mockConfig = {
    ...DEFAULT_UNIFIED_CONFIG,
    ui: {
      ...DEFAULT_UNIFIED_CONFIG.ui,
      alignmentGuides: true,
      selectionHandles: true,
      componentAnimations: true,
      energyFlowParticles: true,
      connectionIntents: true,
      componentTooltips: true,
    }
  };

  return {
    isFeatureEnabled: vi.fn(() => true),
    getFeatureFlagManager: vi.fn(() => ({
      getFlags: () => mockConfig.ui,
      getFlag: (key: string) => true,
      setFlag: vi.fn(),
      toggleFlag: vi.fn(),
      resetToDefaults: vi.fn(),
    })),
  };
});

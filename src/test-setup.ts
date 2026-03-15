/**
 * Vitest Test Setup
 * Mocks and global configuration for all tests
 */

import { vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_UNIFIED_CONFIG } from './config/UnifiedFeatureConfig';

// ============================================================================
// localStorage mock for jsdom
// ============================================================================
beforeEach(() => {
  const store = new Map<string, string>();

  const localStorageMock: Storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, String(value)); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    clear: vi.fn(() => { store.clear(); }),
    key: vi.fn((index: number) => [...store.keys()][index] ?? null),
    get length() { return store.size; },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

// Mock FeatureFlagAdapter so UILayer/RuntimeLayer feature checks return true
vi.mock('./config/FeatureFlagAdapter', async (importOriginal) => {
  const original = await importOriginal<typeof import('./config/FeatureFlagAdapter')>();
  return {
    ...original,
    isFeatureEnabled: vi.fn(() => true),
  };
});

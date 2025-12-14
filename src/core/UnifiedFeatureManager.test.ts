/**
 * Unit tests for UnifiedFeatureManager
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  UnifiedFeatureManager,
  getUnifiedFeatureManager,
  resetUnifiedFeatureManagerForTesting,
} from './UnifiedFeatureManager';
import { DEFAULT_UNIFIED_CONFIG } from '../config/UnifiedFeatureConfig';
import { eventBus } from '../events/EventBus';

describe('UnifiedFeatureManager', () => {
  let manager: UnifiedFeatureManager;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset singleton
    resetUnifiedFeatureManagerForTesting();

    // Get fresh instance
    manager = getUnifiedFeatureManager();

    // Spy on eventBus.emit
    vi.spyOn(eventBus, 'emit');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // SINGLETON BEHAVIOR
  // ==========================================================================

  describe('Singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getUnifiedFeatureManager();
      const instance2 = getUnifiedFeatureManager();

      expect(instance1).toBe(instance2);
    });

    it('should allow singleton reset for testing', () => {
      const instance1 = getUnifiedFeatureManager();
      resetUnifiedFeatureManagerForTesting();
      const instance2 = getUnifiedFeatureManager();

      expect(instance1).not.toBe(instance2);
    });
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const config = manager.getConfig();

      expect(config).toEqual(DEFAULT_UNIFIED_CONFIG);
    });

    it('should load from localStorage if available', () => {
      const customConfig = {
        ...DEFAULT_UNIFIED_CONFIG,
        performance: {
          ...DEFAULT_UNIFIED_CONFIG.performance,
          connectionCulling: false, // Changed from default
        },
      };

      localStorage.setItem('unified_feature_config', JSON.stringify(customConfig));

      resetUnifiedFeatureManagerForTesting();
      manager = getUnifiedFeatureManager();

      const loaded = manager.getConfig();
      expect(loaded.performance.connectionCulling).toBe(false);
    });

    it('should handle corrupted localStorage gracefully', () => {
      localStorage.setItem('unified_feature_config', 'invalid json{{{');

      resetUnifiedFeatureManagerForTesting();
      manager = getUnifiedFeatureManager();

      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_UNIFIED_CONFIG); // Fall back to defaults
    });
  });

  // ==========================================================================
  // READ API
  // ==========================================================================

  describe('getConfig', () => {
    it('should return a deep clone (not reference)', () => {
      const config1 = manager.getConfig();
      const config2 = manager.getConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different objects
      expect(config1.performance).not.toBe(config2.performance); // Deep clone
    });
  });

  describe('getFlag', () => {
    it('should get a specific flag value', () => {
      const value = manager.getFlag('performance', 'connectionCulling');

      expect(value).toBe(DEFAULT_UNIFIED_CONFIG.performance.connectionCulling);
    });

    it('should get flag from different categories', () => {
      expect(manager.getFlag('ui', 'alignmentGuides')).toBe(
        DEFAULT_UNIFIED_CONFIG.ui.alignmentGuides
      );
      expect(manager.getFlag('system', 'autoSave')).toBe(
        DEFAULT_UNIFIED_CONFIG.system.autoSave
      );
      expect(manager.getFlag('debug', 'debugMode')).toBe(
        DEFAULT_UNIFIED_CONFIG.debug.debugMode
      );
    });
  });

  describe('getCategory', () => {
    it('should get all flags in a category', () => {
      const perfFlags = manager.getCategory('performance');

      expect(perfFlags).toEqual(DEFAULT_UNIFIED_CONFIG.performance);
    });

    it('should return a deep clone', () => {
      const perfFlags1 = manager.getCategory('performance');
      const perfFlags2 = manager.getCategory('performance');

      expect(perfFlags1).toEqual(perfFlags2);
      expect(perfFlags1).not.toBe(perfFlags2);
    });
  });

  // ==========================================================================
  // WRITE API
  // ==========================================================================

  describe('setFlag', () => {
    it('should set a flag value', () => {
      manager.setFlag('performance', 'connectionCulling', false);

      expect(manager.getFlag('performance', 'connectionCulling')).toBe(false);
    });

    it('should save to localStorage', () => {
      manager.setFlag('performance', 'connectionCulling', false);

      const stored = localStorage.getItem('unified_feature_config');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.performance.connectionCulling).toBe(false);
    });

    it('should emit change events', () => {
      manager.setFlag('performance', 'connectionCulling', false);

      // Should emit 3 events: category-specific, flag-specific, and global
      expect(eventBus.emit).toHaveBeenCalledWith(
        'feature-config:performance:changed',
        expect.objectContaining({
          key: 'connectionCulling',
          newValue: false,
          oldValue: true,
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'feature-config:performance:connectionCulling',
        expect.objectContaining({
          newValue: false,
          oldValue: true,
        })
      );

      expect(eventBus.emit).toHaveBeenCalledWith(
        'feature-config:changed',
        expect.objectContaining({
          category: 'performance',
          key: 'connectionCulling',
          newValue: false,
          oldValue: true,
        })
      );
    });

    it('should not emit events if value unchanged', () => {
      const currentValue = manager.getFlag('performance', 'connectionCulling');

      vi.clearAllMocks();
      manager.setFlag('performance', 'connectionCulling', currentValue);

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('toggleFlag', () => {
    it('should toggle a boolean flag', () => {
      const initialValue = manager.getFlag('performance', 'connectionCulling');

      const newValue = manager.toggleFlag('performance', 'connectionCulling');

      expect(newValue).toBe(!initialValue);
      expect(manager.getFlag('performance', 'connectionCulling')).toBe(!initialValue);
    });

    it('should warn when toggling non-boolean value', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = manager.toggleFlag('tuning', 'connectionCullingMargin' as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot toggle non-boolean flag')
      );
      expect(result).toBe(50); // Returns current value unchanged

      consoleSpy.mockRestore();
    });
  });

  describe('updateCategory', () => {
    it('should update multiple flags at once', () => {
      manager.updateCategory('performance', {
        connectionCulling: false,
        connectionCaching: false,
        connectionPulse: false,
      });

      expect(manager.getFlag('performance', 'connectionCulling')).toBe(false);
      expect(manager.getFlag('performance', 'connectionCaching')).toBe(false);
      expect(manager.getFlag('performance', 'connectionPulse')).toBe(false);
    });

    it('should emit events for each changed flag', () => {
      vi.clearAllMocks();

      manager.updateCategory('performance', {
        connectionCulling: false,
        connectionCaching: false,
      });

      // Should emit events for both changes
      expect(eventBus.emit).toHaveBeenCalledWith(
        'feature-config:performance:connectionCulling',
        expect.anything()
      );
      expect(eventBus.emit).toHaveBeenCalledWith(
        'feature-config:performance:connectionCaching',
        expect.anything()
      );
    });

    it('should not save if no changes', () => {
      const currentPerf = manager.getCategory('performance');

      vi.clearAllMocks();
      manager.updateCategory('performance', currentPerf);

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // PRESETS
  // ==========================================================================

  describe('applyPreset', () => {
    it('should apply baseline preset', () => {
      manager.applyPreset('baseline');

      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_UNIFIED_CONFIG);
    });

    it('should apply performanceMax preset', () => {
      manager.applyPreset('performanceMax');

      // Performance flags should be set for speed
      expect(manager.getFlag('performance', 'connectionAnimations')).toBe(false);
      expect(manager.getFlag('performance', 'connectionParticles')).toBe(false);
      expect(manager.getFlag('performance', 'connectionCulling')).toBe(true);

      // UI features should be minimal
      expect(manager.getFlag('ui', 'energyFlowParticles')).toBe(false);
    });

    it('should apply visualRich preset', () => {
      manager.applyPreset('visualRich');

      // Visual effects should be enabled
      expect(manager.getFlag('performance', 'connectionAnimations')).toBe(true);
      expect(manager.getFlag('performance', 'connectionParticles')).toBe(true);
      expect(manager.getFlag('performance', 'connectionGradients')).toBe(true);

      // UI features should be enabled
      expect(manager.getFlag('ui', 'alignmentGuides')).toBe(true);
      expect(manager.getFlag('ui', 'componentAnimations')).toBe(true);
    });

    it('should emit preset-applied event', () => {
      manager.applyPreset('performanceMax');

      expect(eventBus.emit).toHaveBeenCalledWith(
        'feature-config:preset-applied',
        { preset: 'performanceMax' }
      );
    });

    it('should handle unknown preset gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.applyPreset('unknownPreset' as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown preset')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('resetToDefaults', () => {
    it('should reset to default configuration', () => {
      // Make some changes
      manager.setFlag('performance', 'connectionCulling', false);
      manager.setFlag('ui', 'alignmentGuides', true);

      // Reset
      manager.resetToDefaults();

      const config = manager.getConfig();
      expect(config).toEqual(DEFAULT_UNIFIED_CONFIG);
    });

    it('should emit reset event', () => {
      vi.clearAllMocks();
      manager.resetToDefaults();

      expect(eventBus.emit).toHaveBeenCalledWith('feature-config:reset', {});
    });
  });

  // ==========================================================================
  // IMPORT/EXPORT
  // ==========================================================================

  describe('exportConfig', () => {
    it('should export config as JSON string', () => {
      const json = manager.exportConfig();

      expect(typeof json).toBe('string');

      const parsed = JSON.parse(json);
      expect(parsed).toEqual(DEFAULT_UNIFIED_CONFIG);
    });
  });

  describe('importConfig', () => {
    it('should import valid config', () => {
      const customConfig = {
        ...DEFAULT_UNIFIED_CONFIG,
        performance: {
          ...DEFAULT_UNIFIED_CONFIG.performance,
          connectionCulling: false,
        },
      };

      const json = JSON.stringify(customConfig);
      const success = manager.importConfig(json);

      expect(success).toBe(true);
      expect(manager.getFlag('performance', 'connectionCulling')).toBe(false);
    });

    it('should emit imported event', () => {
      const json = JSON.stringify(DEFAULT_UNIFIED_CONFIG);

      vi.clearAllMocks();
      manager.importConfig(json);

      expect(eventBus.emit).toHaveBeenCalledWith('feature-config:imported', {});
    });

    it('should reject invalid JSON', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const success = manager.importConfig('invalid json{{{');

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should reject invalid config structure', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const invalidConfig = { foo: 'bar' }; // Missing required categories
      const success = manager.importConfig(JSON.stringify(invalidConfig));

      expect(success).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // STORAGE
  // ==========================================================================

  describe('clearStorage', () => {
    it('should clear unified config from localStorage', () => {
      manager.setFlag('performance', 'connectionCulling', false);

      expect(localStorage.getItem('unified_feature_config')).toBeTruthy();

      manager.clearStorage();

      expect(localStorage.getItem('unified_feature_config')).toBeNull();
    });

    it('should also clear old dual-system storage keys', () => {
      localStorage.setItem('motherboard_feature_flags', 'old data');
      localStorage.setItem('mb_performance_flags', 'old data');
      localStorage.setItem('mb_panel_open', '1');

      manager.clearStorage();

      expect(localStorage.getItem('motherboard_feature_flags')).toBeNull();
      expect(localStorage.getItem('mb_performance_flags')).toBeNull();
      expect(localStorage.getItem('mb_panel_open')).toBeNull();
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle localStorage quota exceeded gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Mock localStorage to throw quota exceeded error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      manager.setFlag('performance', 'connectionCulling', false);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain('Failed to save config');

      // Restore
      Storage.prototype.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });

    it('should merge with defaults when loading partial config', () => {
      // First, make sure localStorage is working normally
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = originalSetItem; // Ensure it's restored

      // Save partial config (missing some new flags added in update)
      const partialConfig = {
        performance: {
          connectionCulling: false,
          // Missing other flags - should be filled from defaults
        },
        ui: {},
        system: {},
        debug: {},
        tuning: {},
      };

      localStorage.clear();
      localStorage.setItem('unified_feature_config', JSON.stringify(partialConfig));

      resetUnifiedFeatureManagerForTesting();
      manager = getUnifiedFeatureManager();

      const config = manager.getConfig();

      // Should have the saved value
      expect(config.performance.connectionCulling).toBe(false);

      // But also have defaults for missing flags
      expect(config.performance.connectionCaching).toBe(
        DEFAULT_UNIFIED_CONFIG.performance.connectionCaching
      );
    });
  });
});

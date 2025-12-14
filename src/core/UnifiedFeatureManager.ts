/**
 * Unified Feature Manager
 *
 * Singleton manager for the unified feature flag system.
 * Handles:
 * - Config state management
 * - localStorage persistence
 * - EventBus integration
 * - Preset application
 * - Type-safe flag access
 */

import { eventBus } from '../events/EventBus';
import {
  UnifiedFeatureConfig,
  DEFAULT_UNIFIED_CONFIG,
  PresetName,
  PRESETS,
} from '../config/UnifiedFeatureConfig';

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: UnifiedFeatureManager | null = null;

export function getUnifiedFeatureManager(): UnifiedFeatureManager {
  if (!instance) {
    instance = new UnifiedFeatureManager();
  }
  return instance;
}

// For testing: reset singleton
export function resetUnifiedFeatureManagerForTesting(): void {
  instance = null;
}

// ============================================================================
// MANAGER CLASS
// ============================================================================

export class UnifiedFeatureManager {
  private config: UnifiedFeatureConfig;
  private readonly storageKey = 'unified_feature_config';

  constructor() {
    this.config = this.deepClone(DEFAULT_UNIFIED_CONFIG);
    this.loadFromStorage();
  }

  // ==========================================================================
  // PUBLIC API - Read
  // ==========================================================================

  /**
   * Get the full configuration object
   */
  getConfig(): UnifiedFeatureConfig {
    return this.deepClone(this.config);
  }

  /**
   * Get a specific flag value
   * @example
   * manager.getFlag('performance', 'connectionCulling') // → true
   * manager.getFlag('ui', 'alignmentGuides') // → false
   */
  getFlag<C extends keyof UnifiedFeatureConfig>(
    category: C,
    key: keyof UnifiedFeatureConfig[C]
  ): any {
    return this.config[category][key];
  }

  /**
   * Get all flags in a category
   */
  getCategory<C extends keyof UnifiedFeatureConfig>(
    category: C
  ): UnifiedFeatureConfig[C] {
    return this.deepClone(this.config[category]);
  }

  // ==========================================================================
  // PUBLIC API - Write
  // ==========================================================================

  /**
   * Set a specific flag value
   * @example
   * manager.setFlag('performance', 'connectionCulling', false)
   */
  setFlag<C extends keyof UnifiedFeatureConfig>(
    category: C,
    key: keyof UnifiedFeatureConfig[C],
    value: any
  ): void {
    const oldValue = this.config[category][key];
    if (oldValue === value) return; // No change

    (this.config[category] as any)[key] = value;
    this.saveToStorage();
    this.emitChangeEvent(category, key as string, value, oldValue);
  }

  /**
   * Toggle a boolean flag
   * @example
   * manager.toggleFlag('performance', 'connectionCulling') // true → false
   */
  toggleFlag<C extends keyof UnifiedFeatureConfig>(
    category: C,
    key: keyof UnifiedFeatureConfig[C]
  ): boolean {
    const currentValue = this.config[category][key];
    if (typeof currentValue !== 'boolean') {
      console.warn(`Cannot toggle non-boolean flag: ${String(category)}.${String(key)}`);
      return currentValue;
    }

    const newValue = !currentValue;
    this.setFlag(category, key, newValue);
    return newValue;
  }

  /**
   * Update multiple flags in a category at once
   * @example
   * manager.updateCategory('performance', {
   *   connectionCulling: true,
   *   connectionCaching: true,
   * })
   */
  updateCategory<C extends keyof UnifiedFeatureConfig>(
    category: C,
    updates: Partial<UnifiedFeatureConfig[C]>
  ): void {
    let hasChanges = false;

    for (const [key, value] of Object.entries(updates)) {
      const oldValue = this.config[category][key as keyof UnifiedFeatureConfig[C]];
      if (oldValue !== value) {
        (this.config[category] as any)[key] = value;
        hasChanges = true;
        this.emitChangeEvent(category, key, value, oldValue);
      }
    }

    if (hasChanges) {
      this.saveToStorage();
    }
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.config = this.deepClone(DEFAULT_UNIFIED_CONFIG);
    this.saveToStorage();
    eventBus.emit('feature-config:reset', {});
  }

  /**
   * Apply a preset configuration
   */
  applyPreset(presetName: PresetName): void {
    const preset = PRESETS[presetName];
    if (!preset) {
      console.error(`Unknown preset: ${presetName}`);
      return;
    }

    // Deep merge preset into current config
    this.config = this.deepMerge(this.config, preset);
    this.saveToStorage();
    eventBus.emit('feature-config:preset-applied', { preset: presetName });
  }

  // ==========================================================================
  // PUBLIC API - Import/Export
  // ==========================================================================

  /**
   * Export configuration as JSON string
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON string
   */
  importConfig(json: string): boolean {
    try {
      const imported = JSON.parse(json) as UnifiedFeatureConfig;

      // Basic validation
      if (!this.validateConfig(imported)) {
        console.error('Invalid config structure');
        return false;
      }

      this.config = imported;
      this.saveToStorage();
      eventBus.emit('feature-config:imported', {});
      return true;
    } catch (error) {
      console.error('Failed to import config:', error);
      return false;
    }
  }

  // ==========================================================================
  // PRIVATE - Storage
  // ==========================================================================

  private saveToStorage(): void {
    try {
      const json = JSON.stringify(this.config);
      localStorage.setItem(this.storageKey, json);
    } catch (error) {
      console.warn('Failed to save config to localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const json = localStorage.getItem(this.storageKey);
      if (!json) return;

      const stored = JSON.parse(json) as UnifiedFeatureConfig;

      // Validate and merge with defaults (in case new flags were added)
      if (this.validateConfig(stored)) {
        this.config = this.deepMerge(DEFAULT_UNIFIED_CONFIG, stored);
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error);
    }
  }

  /**
   * Clear localStorage (for fresh start)
   */
  clearStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);

      // Also clear old storage keys from dual system
      localStorage.removeItem('motherboard_feature_flags');
      localStorage.removeItem('mb_performance_flags');
      localStorage.removeItem('mb_panel_open');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  // ==========================================================================
  // PRIVATE - Events
  // ==========================================================================

  private emitChangeEvent(
    category: string,
    key: string,
    newValue: any,
    oldValue: any
  ): void {
    // Emit category-specific event
    eventBus.emit(`feature-config:${category}:changed`, {
      key,
      newValue,
      oldValue,
    });

    // Emit flag-specific event
    eventBus.emit(`feature-config:${category}:${key}`, {
      newValue,
      oldValue,
    });

    // Emit global change event
    eventBus.emit('feature-config:changed', {
      category,
      key,
      newValue,
      oldValue,
    });
  }

  // ==========================================================================
  // PRIVATE - Utilities
  // ==========================================================================

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        const sourceValue = source[key];
        const targetValue = result[key];

        if (
          sourceValue &&
          typeof sourceValue === 'object' &&
          !Array.isArray(sourceValue) &&
          targetValue &&
          typeof targetValue === 'object' &&
          !Array.isArray(targetValue)
        ) {
          // Recursive merge for nested objects
          result[key] = this.deepMerge(targetValue, sourceValue);
        } else {
          // Direct assignment for primitives, arrays, and null
          result[key] = sourceValue as any;
        }
      }
    }

    return result;
  }

  private validateConfig(config: any): boolean {
    if (!config || typeof config !== 'object') return false;

    // Check required categories exist
    const requiredCategories = ['performance', 'ui', 'system', 'debug', 'tuning'];
    for (const category of requiredCategories) {
      if (!config[category] || typeof config[category] !== 'object') {
        return false;
      }
    }

    return true;
  }
}

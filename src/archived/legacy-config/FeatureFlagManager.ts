/**
 * FeatureFlagManager
 *
 * Central manager for runtime feature flag control
 * - Provides type-safe access to feature flags
 * - Persists flags to localStorage
 * - Emits events when flags change
 * - Integrates with EventBus for reactive updates
 *
 * @deprecated This manager is being phased out in favor of UnifiedFeatureManager
 * See: src/core/UnifiedFeatureManager.ts
 * Migration: Use getUnifiedFeatureManager() instead
 * Status: Will be archived after Phase 2 migration completes
 */

import { eventBus } from '../events/EventBus';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlags } from '../config/featureFlags';

const STORAGE_KEY = 'motherboard_feature_flags';

export class FeatureFlagManager {
  private static instance: FeatureFlagManager | null = null;
  private flags: FeatureFlags;

  private constructor() {
    // Load flags from localStorage or use defaults
    this.flags = this.loadFlags();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): FeatureFlagManager {
    if (!FeatureFlagManager.instance) {
      FeatureFlagManager.instance = new FeatureFlagManager();
    }
    return FeatureFlagManager.instance;
  }

  /**
   * Get all feature flags
   */
  public getFlags(): Readonly<FeatureFlags> {
    return { ...this.flags };
  }

  /**
   * Get a specific feature flag value
   */
  public getFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
    return this.flags[key];
  }

  /**
   * Set a specific feature flag
   */
  public setFlag<K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]): void {
    const oldValue = this.flags[key];
    if (oldValue === value) return;

    this.flags[key] = value;
    this.saveFlags();

    // Emit change event
    eventBus.emit('feature-flag.changed', {
      flag: key,
      value,
      oldValue,
      timestamp: Date.now(),
    });

    // Emit specific flag event
    eventBus.emit(`feature-flag.${key}`, {
      value,
      oldValue,
      timestamp: Date.now(),
    });

    console.log(`🎛️ Feature flag changed: ${key} = ${value}`);
  }

  /**
   * Toggle a boolean feature flag
   */
  public toggleFlag(key: keyof FeatureFlags): void {
    const currentValue = this.flags[key];
    if (typeof currentValue === 'boolean') {
      this.setFlag(key, !currentValue as any);
    }
  }

  /**
   * Reset all flags to defaults
   */
  public resetToDefaults(): void {
    this.flags = { ...DEFAULT_FEATURE_FLAGS };
    this.saveFlags();

    eventBus.emit('feature-flags.reset', {
      flags: this.getFlags(),
      timestamp: Date.now(),
    });

    console.log('🎛️ Feature flags reset to defaults');
  }

  /**
   * Update multiple flags at once
   */
  public updateFlags(updates: Partial<FeatureFlags>): void {
    let changed = false;

    for (const [key, value] of Object.entries(updates)) {
      const flagKey = key as keyof FeatureFlags;
      if (this.flags[flagKey] !== value) {
        this.flags[flagKey] = value as any;
        changed = true;
      }
    }

    if (changed) {
      this.saveFlags();
      eventBus.emit('feature-flags.updated', {
        flags: this.getFlags(),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Load flags from localStorage
   */
  private loadFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new flags
        return { ...DEFAULT_FEATURE_FLAGS, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load feature flags from localStorage:', error);
    }
    return { ...DEFAULT_FEATURE_FLAGS };
  }

  /**
   * Save flags to localStorage
   */
  private saveFlags(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.flags));
    } catch (error) {
      console.error('Failed to save feature flags to localStorage:', error);
    }
  }

  /**
   * Export flags for debugging
   */
  public exportFlags(): string {
    return JSON.stringify(this.flags, null, 2);
  }

  /**
   * Import flags from JSON string
   */
  public importFlags(json: string): boolean {
    try {
      const parsed = JSON.parse(json);
      this.updateFlags(parsed);
      return true;
    } catch (error) {
      console.error('Failed to import feature flags:', error);
      return false;
    }
  }
}

/**
 * Factory function to get the singleton instance
 */
export function getFeatureFlagManager(): FeatureFlagManager {
  return FeatureFlagManager.getInstance();
}

/**
 * Convenience function to check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return getFeatureFlagManager().getFlag(flag);
}

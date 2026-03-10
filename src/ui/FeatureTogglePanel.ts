/**
 * FeatureTogglePanel - Reusable feature flag management UI
 *
 * Provides a unified interface for toggling both PerformanceConfig flags
 * and FeatureFlags with preset support and localStorage persistence.
 *
 * Used by both index.html and profiling.html to eliminate duplication.
 */

import {
  PerformanceConfig,
  getFeatureFlagManager,
  FEATURE_FLAG_METADATA,
} from '../config/FeatureFlagAdapter';

export interface FeatureTogglePanelConfig {
  containerId: string;           // ID of the DOM element to mount the panel
  toggleButtonId?: string;       // Optional: ID of button to show/hide panel
  badgeId?: string;              // Optional: ID of element showing active flag count
  storageKey?: string;           // localStorage key for persistence (default: 'mb_performance_flags')
  panelOpenKey?: string;         // localStorage key for panel open/closed state
  onApply?: () => void;          // Optional callback when flags are applied
}

export class FeatureTogglePanel {
  private config: Required<FeatureTogglePanelConfig>;
  private container: HTMLElement | null = null;
  private toggleButton: HTMLElement | null = null;
  private badge: HTMLElement | null = null;
  private featureFlagManager = getFeatureFlagManager();

  constructor(config: FeatureTogglePanelConfig) {
    this.config = {
      toggleButtonId: config.toggleButtonId || '',
      badgeId: config.badgeId || '',
      storageKey: config.storageKey || 'mb_performance_flags',
      panelOpenKey: config.panelOpenKey || 'mb_panel_open',
      onApply: config.onApply || (() => {}),
      ...config,
    };

    this.initialize();
  }

  private initialize(): void {
    this.container = document.getElementById(this.config.containerId);
    if (!this.container) {
      console.warn(`FeatureTogglePanel: Container #${this.config.containerId} not found`);
      return;
    }

    if (this.config.toggleButtonId) {
      this.toggleButton = document.getElementById(this.config.toggleButtonId);
      this.toggleButton?.addEventListener('click', () => this.togglePanel());
    }

    if (this.config.badgeId) {
      this.badge = document.getElementById(this.config.badgeId);
    }

    this.loadFlagsFromStorage();
    this.buildUI();
    this.restorePanelState();
    this.updateBadge();
  }

  private buildUI(): void {
    if (!this.container) return;

    const html = `
      <strong>Feature Toggles</strong>

      <!-- Preset Buttons -->
      <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:8px;">
        <button id="${this.config.containerId}-preset-baseline" class="preset-btn">Preset: Baseline</button>
        <button id="${this.config.containerId}-preset-perf" class="preset-btn">Preset: Perf Max</button>
        <button id="${this.config.containerId}-preset-visual" class="preset-btn">Preset: Visual Rich</button>
      </div>

      <!-- Performance Config Flags -->
      <div style="margin-top:10px;">
        <strong style="display:block; margin-bottom:6px; color:#00aaff;">Performance Optimizations</strong>
        <div id="${this.config.containerId}-perfconfig-group" style="display:grid; grid-template-columns: repeat(2, minmax(250px, 1fr)); gap:8px;"></div>
      </div>

      <hr style="border-color:#003b4d; margin:14px 0; opacity:0.5;"/>

      <!-- Feature Flags -->
      <div>
        <strong style="display:block; margin-bottom:6px; color:#00aaff;">Main Board Features</strong>
        <div id="${this.config.containerId}-featureflags-group" style="display:grid; grid-template-columns: repeat(2, minmax(250px, 1fr)); gap:8px;"></div>
      </div>

      <!-- Action Buttons -->
      <div style="margin-top:12px;">
        <button id="${this.config.containerId}-apply-flags" class="control-btn">Apply</button>
        <button id="${this.config.containerId}-reset-flags" class="control-btn">Reset to Defaults</button>
      </div>

      <small style="display:block; margin-top:8px; color:#888;">Changes apply immediately where possible; some may require interaction to take effect.</small>
    `;

    this.container.innerHTML = html;
    this.buildPerformanceConfigUI();
    this.buildFeatureFlagsUI();
    this.attachEventListeners();
  }

  private buildPerformanceConfigUI(): void {
    const container = document.getElementById(`${this.config.containerId}-perfconfig-group`);
    if (!container) return;

    container.innerHTML = '';

    // Define Performance Config flags to display
    const perfFlags = [
      'ENABLE_DIRTY_FLAG_RENDERING',
      'ENABLE_OPTIMIZED_CONNECTION_RENDERER',
      'ENABLE_CONNECTION_CULLING',
      'ENABLE_CONNECTION_ANIMATIONS',
      'ENABLE_CONNECTION_PARTICLES',
      'ENABLE_CONNECTION_GRADIENTS',
      'ENABLE_CONNECTION_PULSE',
      'ENABLE_CONNECTION_MICRO_PACKETS',
      'ENABLE_CONNECTION_DASH_OVERLAY',
      'ENABLE_CONNECTION_DASH_ONLY',
      'ENABLE_GRID_CACHING',
      'ENABLE_SPATIAL_INDEXING',
      'ENABLE_CONNECTION_CACHING',
      'ENABLE_EVENT_BATCHING',
      'ENABLE_BATCH_RENDERING',
      'SHOW_PERFORMANCE_OVERLAY',
      'LOG_SLOW_FRAMES',
    ];

    for (const key of perfFlags) {
      if (!(key in PerformanceConfig)) continue;

      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset['flag'] = key;
      checkbox.checked = !!(PerformanceConfig as any)[key];
      checkbox.addEventListener('change', () => this.applyFlags());

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + this.formatFlagName(key)));
      container.appendChild(label);
    }
  }

  private buildFeatureFlagsUI(): void {
    const container = document.getElementById(`${this.config.containerId}-featureflags-group`);
    if (!container) return;

    container.innerHTML = '';

    const flags = this.featureFlagManager.getFlags();
    const entries = Object.entries(FEATURE_FLAG_METADATA);

    for (const [key, meta] of entries) {
      const label = document.createElement('label');
      label.title = `${meta.description} • ${meta.category} • impact: ${meta.performanceImpact}${meta.experimental ? ' • experimental' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset['featureFlag'] = key;
      checkbox.checked = !!(flags as any)[key];
      checkbox.addEventListener('change', () => {
        this.featureFlagManager.setFlag(key as any, checkbox.checked);
        this.updateBadge();
        this.config.onApply();
      });

      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + meta.name));
      container.appendChild(label);
    }
  }

  private attachEventListeners(): void {
    // Preset buttons
    document.getElementById(`${this.config.containerId}-preset-baseline`)?.addEventListener('click', () => {
      this.applyPresetBaseline();
    });

    document.getElementById(`${this.config.containerId}-preset-perf`)?.addEventListener('click', () => {
      this.applyPresetPerf();
    });

    document.getElementById(`${this.config.containerId}-preset-visual`)?.addEventListener('click', () => {
      this.applyPresetVisual();
    });

    // Action buttons
    document.getElementById(`${this.config.containerId}-apply-flags`)?.addEventListener('click', () => {
      this.applyFlags();
    });

    document.getElementById(`${this.config.containerId}-reset-flags`)?.addEventListener('click', () => {
      this.syncPanelFromConfig();
      this.applyFlags();
    });
  }

  private formatFlagName(key: string): string {
    return key
      .replace(/^ENABLE_|^SHOW_|^LOG_/g, '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private getAllPerfCheckboxes(): NodeListOf<HTMLInputElement> {
    return this.container?.querySelectorAll('input[type="checkbox"][data-flag]') as NodeListOf<HTMLInputElement> || document.querySelectorAll('input[data-flag="never-match"]') as NodeListOf<HTMLInputElement>;
  }

  private setPerfCheckbox(key: string, value: boolean): void {
    const el = this.container?.querySelector(`input[type="checkbox"][data-flag="${key}"]`) as HTMLInputElement;
    if (el) el.checked = value;
  }

  private syncPanelFromConfig(): void {
    for (const input of this.getAllPerfCheckboxes()) {
      const key = input.getAttribute('data-flag');
      if (!key) continue;
      input.checked = !!((PerformanceConfig as any)[key]);
    }

    // Rebuild feature flags UI to sync
    this.buildFeatureFlagsUI();
  }

  private applyFlags(): void {
    // Apply PerformanceConfig flags
    for (const input of this.getAllPerfCheckboxes()) {
      const key = input.getAttribute('data-flag');
      if (!key) continue;
      (PerformanceConfig as any)[key] = input.checked;
      (window as any).__featureFlags = (window as any).__featureFlags || {};
      (window as any).__featureFlags[key] = input.checked;
    }

    this.saveFlagsToStorage();
    this.updateBadge();
    this.config.onApply();
  }

  private applyPresetBaseline(): void {
    // Reset FeatureFlags to defaults
    this.featureFlagManager.resetToDefaults();

    // Reset PerformanceConfig to current defaults
    this.syncPanelFromConfig();
    this.applyFlags();
    this.buildFeatureFlagsUI();
    this.updateBadge();
  }

  private applyPresetPerf(): void {
    // PerformanceConfig: maximize performance
    const perfOn: Record<string, boolean> = {
      ENABLE_DIRTY_FLAG_RENDERING: true,
      ENABLE_OPTIMIZED_CONNECTION_RENDERER: true,
      ENABLE_CONNECTION_CULLING: true,
      ENABLE_CONNECTION_ANIMATIONS: false,
      ENABLE_CONNECTION_PULSE: true,
      ENABLE_CONNECTION_MICRO_PACKETS: true,
      ENABLE_CONNECTION_DASH_OVERLAY: false,
      ENABLE_CONNECTION_PARTICLES: false,
      ENABLE_CONNECTION_GRADIENTS: false,
      ENABLE_GRID_CACHING: true,
      ENABLE_SPATIAL_INDEXING: true,
      ENABLE_CONNECTION_CACHING: true,
      ENABLE_EVENT_BATCHING: true,
      ENABLE_BATCH_RENDERING: true,
      SHOW_PERFORMANCE_OVERLAY: false,
      LOG_SLOW_FRAMES: false,
    };

    Object.entries(perfOn).forEach(([k, v]) => this.setPerfCheckbox(k, v));

    // FeatureFlags: disable eye-candy, keep optimizations
    this.featureFlagManager.updateFlags({
      ENABLE_ALIGNMENT_GUIDES: false,
      ENABLE_SELECTION_HANDLES: false,
      ENABLE_COMPONENT_ANIMATIONS: false,
      ENABLE_ENERGY_FLOW_PARTICLES: false,
      ENABLE_CONNECTION_INTENTS: false,
      ENABLE_COMPONENT_TOOLTIPS: false,
      ENABLE_AUTO_SAVE: false,
      ENABLE_SMART_RENDERING: true,
      ENABLE_EVENT_BATCHING: true,
      DEBUG_MODE: false,
      SHOW_FPS_COUNTER: true,
      SHOW_PERFORMANCE_STATS: false,
    });

    this.applyFlags();
    this.buildFeatureFlagsUI();
    this.updateBadge();
  }

  private applyPresetVisual(): void {
    // PerformanceConfig: keep performance features on but enable visuals
    const perfVisual: Record<string, boolean> = {
      ENABLE_DIRTY_FLAG_RENDERING: true,
      ENABLE_OPTIMIZED_CONNECTION_RENDERER: true,
      ENABLE_CONNECTION_CULLING: true,
      ENABLE_CONNECTION_ANIMATIONS: true,
      ENABLE_CONNECTION_PULSE: true,
      ENABLE_CONNECTION_MICRO_PACKETS: true,
      ENABLE_CONNECTION_DASH_OVERLAY: true,
      ENABLE_CONNECTION_PARTICLES: true,
      ENABLE_CONNECTION_GRADIENTS: true,
      ENABLE_GRID_CACHING: true,
      ENABLE_SPATIAL_INDEXING: true,
      ENABLE_CONNECTION_CACHING: true,
      ENABLE_EVENT_BATCHING: true,
      ENABLE_BATCH_RENDERING: true,
      SHOW_PERFORMANCE_OVERLAY: true,
      LOG_SLOW_FRAMES: true,
    };

    Object.entries(perfVisual).forEach(([k, v]) => this.setPerfCheckbox(k, v));

    // FeatureFlags: enable visual richness
    this.featureFlagManager.updateFlags({
      ENABLE_ALIGNMENT_GUIDES: true,
      ENABLE_SELECTION_HANDLES: true,
      ENABLE_COMPONENT_ANIMATIONS: true,
      ENABLE_ENERGY_FLOW_PARTICLES: true,
      ENABLE_CONNECTION_INTENTS: true,
      ENABLE_COMPONENT_TOOLTIPS: true,
      ENABLE_AUTO_SAVE: false,
      ENABLE_SMART_RENDERING: true,
      ENABLE_EVENT_BATCHING: true,
      DEBUG_MODE: false,
      SHOW_FPS_COUNTER: true,
      SHOW_PERFORMANCE_STATS: false,
    });

    this.applyFlags();
    this.buildFeatureFlagsUI();
    this.updateBadge();
  }

  private updateBadge(): void {
    if (!this.badge) return;

    try {
      const perfInputs = Array.from(this.getAllPerfCheckboxes());
      const perfActive = perfInputs.filter(i => i.checked).length;

      const ff = this.featureFlagManager.getFlags();
      const ffActive = Object.entries(ff).filter(([_, v]) => !!v).length;
      const totalActive = perfActive + ffActive;

      this.badge.textContent = `Active: ${totalActive}`;

      // Build tooltip
      const perfOn = perfInputs.filter(i => i.checked).map(i => i.getAttribute('data-flag'));
      const ffOn = Object.entries(ff).filter(([_, v]) => !!v).map(([k]) => k);
      const list = [...perfOn, ...ffOn];
      const max = 10;
      const tip = list.length > max
        ? `${list.slice(0, max).join(', ')}, +${list.length - max} more`
        : list.join(', ');
      this.badge.title = tip || 'No active flags';
    } catch (err) {
      console.warn('Badge update failed:', err);
    }
  }

  private saveFlagsToStorage(): void {
    try {
      const toSave: Record<string, boolean> = {};
      for (const input of this.getAllPerfCheckboxes()) {
        const key = input.getAttribute('data-flag');
        if (!key) continue;
        toSave[key] = input.checked;
      }
      localStorage.setItem(this.config.storageKey, JSON.stringify(toSave));
    } catch (err) {
      console.warn('Failed to save flags to localStorage:', err);
    }
  }

  private loadFlagsFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      if (!raw) return;

      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return;

      for (const [k, v] of Object.entries(obj)) {
        if (k in PerformanceConfig) {
          (PerformanceConfig as any)[k] = !!v;
          (window as any).__featureFlags = (window as any).__featureFlags || {};
          (window as any).__featureFlags[k] = !!v;
        }
      }
    } catch (err) {
      console.warn('Failed to load flags from localStorage:', err);
    }
  }

  private togglePanel(): void {
    if (!this.container) return;

    const isHidden = this.container.style.display === 'none';
    this.container.style.display = isHidden ? 'block' : 'none';

    try {
      localStorage.setItem(this.config.panelOpenKey, isHidden ? '1' : '0');
    } catch {}

    if (isHidden) {
      this.syncPanelFromConfig();
      this.buildFeatureFlagsUI();
      this.updateBadge();
    }
  }

  private restorePanelState(): void {
    if (!this.container) return;

    try {
      const open = localStorage.getItem(this.config.panelOpenKey) === '1';
      this.container.style.display = open ? 'block' : 'none';
    } catch {}
  }

  /**
   * Public API for manual refresh
   */
  public refresh(): void {
    this.syncPanelFromConfig();
    this.buildFeatureFlagsUI();
    this.updateBadge();
  }

  /**
   * Destroy the panel and clean up event listeners
   */
  public destroy(): void {
    if (this.toggleButton) {
      this.toggleButton.removeEventListener('click', () => this.togglePanel());
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

/**
 * Factory function for easy instantiation
 */
export function createFeatureTogglePanel(config: FeatureTogglePanelConfig): FeatureTogglePanel {
  return new FeatureTogglePanel(config);
}

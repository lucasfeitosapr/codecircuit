/**
 * Unified Control Panel - React Component
 *
 * Single UI for managing all feature flags and performance settings.
 * Replaces the old dual-panel system (FeatureTogglePanel + FeatureFlagPanel).
 *
 * Features:
 * - Category tabs (Performance, UI, System, Debug)
 * - Grid layout with toggle switches
 * - Preset buttons (Baseline, Performance Max, Visual Rich)
 * - Import/Export configuration
 * - Real-time updates via EventBus
 * - Keyboard shortcut: Ctrl+Shift+F to toggle panel
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getUnifiedFeatureManager } from '../../../core/UnifiedFeatureManager';
import { eventBus } from '../../../events/EventBus';
import {
  UnifiedFeatureConfig,
  ALL_FLAG_METADATA,
  PresetName,
} from '../../../config/UnifiedFeatureConfig';

// ============================================================================
// TYPES
// ============================================================================

type CategoryName = 'performance' | 'ui' | 'system' | 'debug';

interface PanelProps {
  initiallyOpen?: boolean;
  position?: 'bottom' | 'right';
}

// ============================================================================
// COMPONENT
// ============================================================================

export const UnifiedControlPanel: React.FC<PanelProps> = ({
  initiallyOpen = false,
  position = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [activeCategory, setActiveCategory] = useState<CategoryName>('performance');
  const [config, setConfig] = useState<UnifiedFeatureConfig>(() =>
    getUnifiedFeatureManager().getConfig()
  );
  const [activeCount, setActiveCount] = useState(0);

  // ==========================================================================
  // EFFECTS - Setup and Cleanup
  // ==========================================================================

  useEffect(() => {
    const manager = getUnifiedFeatureManager();

    // Subscribe to config changes
    const handleConfigChange = () => {
      setConfig(manager.getConfig());
    };

    eventBus.on('feature-config:changed', handleConfigChange);
    eventBus.on('feature-config:preset-applied', handleConfigChange);
    eventBus.on('feature-config:reset', handleConfigChange);
    eventBus.on('feature-config:imported', handleConfigChange);

    // Keyboard shortcut: Ctrl+Shift+F
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      eventBus.off('feature-config:changed', handleConfigChange);
      eventBus.off('feature-config:preset-applied', handleConfigChange);
      eventBus.off('feature-config:reset', handleConfigChange);
      eventBus.off('feature-config:imported', handleConfigChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Update active count when config changes
  useEffect(() => {
    let count = 0;

    // Count boolean flags that are true
    for (const category of ['performance', 'ui', 'system', 'debug'] as CategoryName[]) {
      const categoryFlags = config[category];
      for (const value of Object.values(categoryFlags)) {
        if (typeof value === 'boolean' && value === true) {
          count++;
        }
      }
    }

    setActiveCount(count);
  }, [config]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleToggleFlag = useCallback((category: CategoryName, key: string) => {
    const manager = getUnifiedFeatureManager();
    manager.toggleFlag(category, key as any);
  }, []);

  const handleApplyPreset = useCallback((preset: PresetName) => {
    const manager = getUnifiedFeatureManager();
    manager.applyPreset(preset);
  }, []);

  const handleReset = useCallback(() => {
    if (confirm('Reset all settings to defaults?')) {
      const manager = getUnifiedFeatureManager();
      manager.resetToDefaults();
    }
  }, []);

  const handleExport = useCallback(() => {
    const manager = getUnifiedFeatureManager();
    const json = manager.exportConfig();

    // Create download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `feature-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        const manager = getUnifiedFeatureManager();

        if (manager.importConfig(json)) {
          alert('Configuration imported successfully!');
        } else {
          alert('Failed to import configuration. Invalid format.');
        }
      };
      reader.readAsText(file);
    };

    input.click();
  }, []);

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  const renderCategoryFlags = (category: CategoryName) => {
    const categoryData = config[category];
    const metadata = ALL_FLAG_METADATA[category];

    return (
      <div className="flag-grid">
        {Object.entries(categoryData).map(([key, value]) => {
          if (typeof value !== 'boolean') return null; // Skip non-boolean values

          const flagMeta = (metadata as any)[key];
          if (!flagMeta) return null;

          return (
            <div
              key={key}
              className={`flag-item ${value ? 'active' : ''} ${flagMeta.experimental ? 'experimental' : ''}`}
              title={`${flagMeta.description}\nImpact: ${flagMeta.impact}${flagMeta.experimental ? '\n⚠️ Experimental' : ''}`}
            >
              <label>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleToggleFlag(category, key)}
                />
                <span className="flag-name">{flagMeta.name}</span>
                {flagMeta.experimental && <span className="badge-experimental">EXP</span>}
                <span className={`badge-impact impact-${flagMeta.impact}`}>
                  {flagMeta.impact}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  if (!isOpen) {
    return (
      <button
        className="unified-panel-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Feature Control Panel (Ctrl+Shift+F)"
      >
        ⚙️ Features ({activeCount})
      </button>
    );
  }

  return (
    <div className={`unified-control-panel position-${position}`}>
      {/* Header */}
      <div className="panel-header">
        <h3>⚙️ Feature Control Panel</h3>
        <div className="header-actions">
          <span className="active-count">{activeCount} active flags</span>
          <button onClick={() => setIsOpen(false)} className="btn-close" title="Close (Ctrl+Shift+F)">
            ✕
          </button>
        </div>
      </div>

      {/* Presets */}
      <div className="preset-section">
        <button
          className="btn-preset"
          onClick={() => handleApplyPreset('baseline')}
          title="Conservative defaults - stable features only"
        >
          🔵 Baseline
        </button>
        <button
          className="btn-preset"
          onClick={() => handleApplyPreset('performanceMax')}
          title="Maximum performance - disable visual effects"
        >
          ⚡ Performance Max
        </button>
        <button
          className="btn-preset"
          onClick={() => handleApplyPreset('visualRich')}
          title="Maximum visual effects - enable all eye-candy"
        >
          ✨ Visual Rich
        </button>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {(['performance', 'ui', 'system', 'debug'] as CategoryName[]).map((category) => {
          const categoryConfig = config[category];
          const activeInCategory = Object.values(categoryConfig).filter(
            (v) => typeof v === 'boolean' && v === true
          ).length;

          return (
            <button
              key={category}
              className={`tab ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
              <span className="tab-badge">{activeInCategory}</span>
            </button>
          );
        })}
      </div>

      {/* Category Content */}
      <div className="category-content">
        {renderCategoryFlags(activeCategory)}
      </div>

      {/* Actions */}
      <div className="panel-actions">
        <button className="btn-action" onClick={handleReset} title="Reset all to defaults">
          🔄 Reset
        </button>
        <button className="btn-action" onClick={handleExport} title="Export config as JSON">
          💾 Export
        </button>
        <button className="btn-action" onClick={handleImport} title="Import config from JSON">
          📂 Import
        </button>
      </div>

      {/* Footer Info */}
      <div className="panel-footer">
        <small>
          Press <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd> to toggle panel
        </small>
      </div>

      {/* Styles */}
      <style>{`
        .unified-panel-toggle {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 20, 30, 0.95);
          border: 2px solid #00ff41;
          color: #00ff41;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          font-weight: bold;
          box-shadow: 0 4px 12px rgba(0, 255, 65, 0.3);
          transition: all 0.2s;
          z-index: 9998;
        }

        .unified-panel-toggle:hover {
          background: rgba(0, 255, 65, 0.1);
          box-shadow: 0 6px 16px rgba(0, 255, 65, 0.5);
          transform: translateY(-2px);
        }

        .unified-control-panel {
          position: fixed;
          background: rgba(0, 20, 30, 0.98);
          border: 2px solid #00ff41;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 255, 65, 0.4);
          font-family: 'Courier New', monospace;
          z-index: 9999;
          backdrop-filter: blur(10px);
        }

        .unified-control-panel.position-bottom {
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 1200px;
          max-height: 70vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .unified-control-panel.position-right {
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 450px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 255, 65, 0.3);
          background: rgba(0, 255, 65, 0.05);
        }

        .panel-header h3 {
          margin: 0;
          color: #00ff41;
          font-size: 18px;
          font-weight: bold;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .active-count {
          color: #00ff41;
          font-size: 14px;
          opacity: 0.8;
        }

        .btn-close {
          background: none;
          border: none;
          color: #00ff41;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: rgba(255, 65, 65, 0.2);
          color: #ff4141;
        }

        .preset-section {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 255, 65, 0.3);
          background: rgba(0, 0, 0, 0.2);
        }

        .btn-preset {
          flex: 1;
          padding: 10px 16px;
          background: rgba(0, 255, 65, 0.1);
          border: 1px solid rgba(0, 255, 65, 0.5);
          color: #00ff41;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: bold;
          transition: all 0.2s;
        }

        .btn-preset:hover {
          background: rgba(0, 255, 65, 0.2);
          border-color: #00ff41;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 65, 0.3);
        }

        .category-tabs {
          display: flex;
          gap: 4px;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(0, 255, 65, 0.3);
          background: rgba(0, 0, 0, 0.3);
        }

        .tab {
          flex: 1;
          padding: 8px 16px;
          background: rgba(0, 255, 65, 0.05);
          border: 1px solid transparent;
          color: #00ff41;
          opacity: 0.6;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: bold;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .tab:hover {
          opacity: 0.8;
          background: rgba(0, 255, 65, 0.1);
        }

        .tab.active {
          opacity: 1;
          background: rgba(0, 255, 65, 0.2);
          border-color: #00ff41;
        }

        .tab-badge {
          background: rgba(0, 255, 65, 0.3);
          color: #00ff41;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
        }

        .category-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .flag-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .flag-item {
          background: rgba(0, 255, 65, 0.05);
          border: 1px solid rgba(0, 255, 65, 0.3);
          border-radius: 6px;
          padding: 12px;
          transition: all 0.2s;
        }

        .flag-item:hover {
          background: rgba(0, 255, 65, 0.1);
          border-color: rgba(0, 255, 65, 0.6);
        }

        .flag-item.active {
          background: rgba(0, 255, 65, 0.15);
          border-color: #00ff41;
        }

        .flag-item.experimental {
          border-style: dashed;
        }

        .flag-item label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          color: #00ff41;
          font-size: 13px;
        }

        .flag-item input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #00ff41;
        }

        .flag-name {
          flex: 1;
          font-weight: 500;
        }

        .badge-experimental {
          background: rgba(255, 193, 7, 0.3);
          color: #ffc107;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
        }

        .badge-impact {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: bold;
        }

        .badge-impact.impact-low {
          background: rgba(76, 175, 80, 0.3);
          color: #4caf50;
        }

        .badge-impact.impact-medium {
          background: rgba(255, 152, 0, 0.3);
          color: #ff9800;
        }

        .badge-impact.impact-high {
          background: rgba(244, 67, 54, 0.3);
          color: #f44336;
        }

        .panel-actions {
          display: flex;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid rgba(0, 255, 65, 0.3);
          background: rgba(0, 0, 0, 0.2);
        }

        .btn-action {
          flex: 1;
          padding: 10px 16px;
          background: rgba(0, 255, 65, 0.1);
          border: 1px solid rgba(0, 255, 65, 0.5);
          color: #00ff41;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: bold;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: rgba(0, 255, 65, 0.2);
          border-color: #00ff41;
          transform: translateY(-2px);
        }

        .panel-footer {
          padding: 12px 20px;
          border-top: 1px solid rgba(0, 255, 65, 0.3);
          background: rgba(0, 255, 65, 0.05);
          text-align: center;
        }

        .panel-footer small {
          color: rgba(0, 255, 65, 0.7);
          font-size: 11px;
        }

        .panel-footer kbd {
          background: rgba(0, 255, 65, 0.2);
          border: 1px solid rgba(0, 255, 65, 0.5);
          border-radius: 3px;
          padding: 2px 6px;
          font-family: inherit;
          font-size: 10px;
          color: #00ff41;
        }

        /* Scrollbar styling */
        .category-content::-webkit-scrollbar {
          width: 8px;
        }

        .category-content::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
        }

        .category-content::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 65, 0.5);
          border-radius: 4px;
        }

        .category-content::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 65, 0.7);
        }
      `}</style>
    </div>
  );
};

export default UnifiedControlPanel;

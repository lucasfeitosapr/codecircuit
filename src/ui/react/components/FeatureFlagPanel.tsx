import React, { useState, useEffect } from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import {
  type FeatureFlags,
  FEATURE_FLAG_METADATA,
  DEFAULT_FEATURE_FLAGS,
  PerformanceConfig,
  getFeatureFlagManager,
} from '../../../config/FeatureFlagAdapter';
import { useEventBus } from '../hooks/useEventBus';

export function FeatureFlagPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlagManager().getFlags());
  const [activeCategory, setActiveCategory] = useState<'UI' | 'System' | 'Debug' | 'Performance' | 'All'>('All');
  const [perfConfigRefresh, setPerfConfigRefresh] = useState(0);

  // Listen for flag changes from other sources
  useEventBus('feature-flags.updated', (payload: any) => {
    setFlags(payload.flags);
  });

  useEventBus('feature-flags.reset', (payload: any) => {
    setFlags(payload.flags);
  });

  // Keyboard shortcut: Ctrl+F to toggle panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggle = (key: keyof FeatureFlags) => {
    getFeatureFlagManager().toggleFlag(key);
    setFlags(getFeatureFlagManager().getFlags());
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all feature flags to defaults?')) {
      getFeatureFlagManager().resetToDefaults();
      setFlags(getFeatureFlagManager().getFlags());
    }
  };

  // Group flags by category
  const categorizedFlags = Object.entries(FEATURE_FLAG_METADATA).reduce(
    (acc, [key, metadata]) => {
      const category = metadata.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({ key: key as keyof FeatureFlags, metadata });
      return acc;
    },
    {} as Record<string, Array<{ key: keyof FeatureFlags; metadata: any }>>
  );

  const handlePerfConfigToggle = (key: string) => {
    (PerformanceConfig as any)[key] = !(PerformanceConfig as any)[key];
    setPerfConfigRefresh(prev => prev + 1); // Trigger re-render
    // Persist to localStorage
    try {
      const raw = localStorage.getItem('mb_performance_flags');
      const obj = raw ? JSON.parse(raw) : {};
      obj[key] = (PerformanceConfig as any)[key];
      localStorage.setItem('mb_performance_flags', JSON.stringify(obj));
    } catch {}
  };

  const renderPerfConfigToggles = () => {
    const perfFlags = [
      { key: 'ENABLE_OPTIMIZED_CONNECTION_RENDERER', label: 'Optimized Connection Renderer', impact: 'high' },
      { key: 'ENABLE_CONNECTION_CULLING', label: 'Connection Culling', impact: 'high' },
      { key: 'ENABLE_CONNECTION_ANIMATIONS', label: 'Connection Animations', impact: 'medium' },
      { key: 'ENABLE_CONNECTION_PARTICLES', label: 'Connection Particles', impact: 'medium' },
      { key: 'ENABLE_CONNECTION_GRADIENTS', label: 'Connection Gradients', impact: 'low' },
      { key: 'ENABLE_CONNECTION_PULSE', label: 'Connection Pulse', impact: 'low' },
      { key: 'ENABLE_CONNECTION_MICRO_PACKETS', label: 'Micro Packets', impact: 'low' },
      { key: 'ENABLE_CONNECTION_DASH_OVERLAY', label: 'Dash Overlay', impact: 'low' },
      { key: 'ENABLE_GRID_CACHING', label: 'Grid Caching', impact: 'high' },
      { key: 'ENABLE_SPATIAL_INDEXING', label: 'Spatial Indexing', impact: 'high' },
      { key: 'ENABLE_CONNECTION_CACHING', label: 'Connection Caching', impact: 'medium' },
      { key: 'ENABLE_EVENT_BATCHING', label: 'Event Batching', impact: 'medium' },
      { key: 'ENABLE_BATCH_RENDERING', label: 'Batch Rendering', impact: 'medium' },
      { key: 'SHOW_PERFORMANCE_OVERLAY', label: 'Performance Overlay', impact: 'none' },
      { key: 'LOG_SLOW_FRAMES', label: 'Log Slow Frames', impact: 'none' },
    ];

    return (
      <div key="performance" style={{ marginBottom: '16px' }}>
        <h4
          style={{
            color: '#00aaff',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
            borderBottom: '1px solid #00aaff',
            paddingBottom: '4px',
          }}
        >
          Performance Optimizations
        </h4>
        {perfFlags.map(({ key, label, impact }) => (
          <ToggleSwitch
            key={key}
            enabled={!!(PerformanceConfig as any)[key]}
            onChange={() => handlePerfConfigToggle(key)}
            label={label}
            description={`Performance impact: ${impact}`}
            performanceImpact={impact}
            experimental={false}
          />
        ))}
      </div>
    );
  };

  const renderFlagToggles = () => {
    const categories = activeCategory === 'All'
      ? ['Performance', 'UI', 'System', 'Debug']
      : activeCategory === 'Performance'
      ? ['Performance']
      : [activeCategory];

    return categories.map((category) => {
      // Handle Performance category separately
      if (category === 'Performance') {
        return renderPerfConfigToggles();
      }

      const categoryFlags = categorizedFlags[category] || [];
      if (categoryFlags.length === 0) return null;

      return (
        <div key={category} style={{ marginBottom: '16px' }}>
          <h4
            style={{
              color: '#00ff88',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
              borderBottom: '1px solid #00ff88',
              paddingBottom: '4px',
            }}
          >
            {category} Features
          </h4>
          {categoryFlags.map(({ key, metadata }) => (
            <ToggleSwitch
              key={key}
              enabled={flags[key]}
              onChange={() => handleToggle(key)}
              label={metadata.name}
              description={metadata.description}
              performanceImpact={metadata.performanceImpact}
              experimental={metadata.experimental}
            />
          ))}
        </div>
      );
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        borderTop: '2px solid #00ff88',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        transition: 'transform 0.3s ease',
        transform: isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 40px))',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          cursor: 'pointer',
          background: 'rgba(0, 255, 136, 0.05)',
          borderBottom: isExpanded ? '1px solid rgba(0, 255, 136, 0.2)' : 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px' }}>{isExpanded ? '▼' : '▲'}</span>
          <span
            style={{
              color: '#00ff88',
              fontSize: '14px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              textShadow: '0 0 8px rgba(0, 255, 136, 0.5)',
            }}
          >
            🎛️ FEATURE FLAGS
          </span>
          {!isExpanded && (
            <span style={{ fontSize: '11px', color: '#666' }}>
              ({Object.values(flags).filter(Boolean).length}/{Object.keys(flags).length} enabled)
            </span>
          )}
        </div>

        <div style={{ fontSize: '10px', color: '#666' }}>
          {isExpanded ? 'Click to collapse' : 'Click to expand'} • Ctrl+F
        </div>
      </div>

      {/* Content Panel */}
      {isExpanded && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
          }}
        >
          {/* Category Filter */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(0, 255, 136, 0.2)',
            }}
          >
            {(['All', 'Performance', 'UI', 'System', 'Debug'] as const).map((category) => (
              <button
                key={category}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveCategory(category);
                }}
                style={{
                  padding: '6px 12px',
                  background:
                    activeCategory === category ? 'rgba(0, 255, 136, 0.2)' : 'rgba(0, 0, 0, 0.5)',
                  border: `1px solid ${activeCategory === category ? '#00ff88' : '#444'}`,
                  borderRadius: '4px',
                  color: activeCategory === category ? '#00ff88' : '#888',
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'monospace',
                }}
              >
                {category}
              </button>
            ))}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetToDefaults();
              }}
              style={{
                padding: '6px 12px',
                background: 'rgba(255, 68, 68, 0.2)',
                border: '1px solid #ff4444',
                borderRadius: '4px',
                color: '#ff4444',
                fontSize: '11px',
                cursor: 'pointer',
                marginLeft: 'auto',
                fontFamily: 'monospace',
              }}
            >
              Reset All
            </button>
          </div>

          {/* Flag Toggles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
            }}
          >
            {renderFlagToggles()}
          </div>

          {/* Info Footer */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(0, 255, 136, 0.2)',
              fontSize: '10px',
              color: '#666',
              textAlign: 'center',
            }}
          >
            Feature flags are saved to browser localStorage • Changes take effect immediately
          </div>
        </div>
      )}
    </div>
  );
}

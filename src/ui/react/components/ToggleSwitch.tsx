import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
  performanceImpact?: 'low' | 'medium' | 'high';
  experimental?: boolean;
}

export function ToggleSwitch({
  enabled,
  onChange,
  label,
  description,
  performanceImpact = 'low',
  experimental = false,
}: ToggleSwitchProps) {
  const impactColors = {
    low: '#00ff88',
    medium: '#ffaa00',
    high: '#ff4444',
  };

  const impactSymbols = {
    low: '⚡',
    medium: '⚡⚡',
    high: '⚡⚡⚡',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: 'rgba(0, 0, 0, 0.6)',
        border: `1px solid ${enabled ? '#00ff88' : '#444'}`,
        borderRadius: '6px',
        marginBottom: '8px',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: enabled ? '0 0 8px rgba(0, 255, 136, 0.3)' : 'none',
      }}
      onClick={() => onChange(!enabled)}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              color: enabled ? '#00ff88' : '#888',
              fontSize: '13px',
              fontWeight: '500',
              fontFamily: 'monospace',
            }}
          >
            {label}
          </span>
          {experimental && (
            <span
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                background: 'rgba(255, 170, 0, 0.2)',
                border: '1px solid #ffaa00',
                borderRadius: '3px',
                color: '#ffaa00',
              }}
            >
              BETA
            </span>
          )}
          <span
            style={{
              fontSize: '10px',
              color: impactColors[performanceImpact],
              marginLeft: 'auto',
            }}
            title={`Performance Impact: ${performanceImpact}`}
          >
            {impactSymbols[performanceImpact]}
          </span>
        </div>
        {description && (
          <div
            style={{
              fontSize: '10px',
              color: '#666',
              marginTop: '4px',
              lineHeight: '1.3',
            }}
          >
            {description}
          </div>
        )}
      </div>

      {/* Toggle Switch */}
      <div
        style={{
          position: 'relative',
          width: '44px',
          height: '24px',
          background: enabled ? '#00ff88' : '#333',
          borderRadius: '12px',
          marginLeft: '12px',
          transition: 'background 0.3s ease',
          boxShadow: enabled ? '0 0 8px rgba(0, 255, 136, 0.5)' : 'inset 0 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: enabled ? '22px' : '2px',
            width: '20px',
            height: '20px',
            background: enabled ? '#000' : '#666',
            borderRadius: '50%',
            transition: 'left 0.3s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </div>
  );
}

// ConnectionProtocolStyles.ts - Protocol-aware visual styling system
// Phase 2C: Connection Intelligence

import { ConnectionProtocol, ConnectionType, HealthState } from './ConnectionV2';

/**
 * Visual style configuration for connection protocols
 */
export interface ProtocolStyle {
  // Primary color for the connection line
  color: string;

  // Line style
  style: 'solid' | 'dashed' | 'dotted';

  // Visual icon/symbol for protocol identification
  icon: string;

  // Default port (for informational purposes)
  defaultPort?: number;

  // Description for tooltips and documentation
  description: string;

  // Alternative colors for different states
  stateColors?: {
    active?: string;
    inactive?: string;
    error?: string;
  };
}

/**
 * Protocol-specific visual styles
 * Colors chosen to integrate with existing Gateway component colors
 */
export const ConnectionProtocolStyles: Record<ConnectionProtocol, ProtocolStyle> = {
  HTTP: {
    color: '#007ACC', // Microsoft Blue - web standard
    style: 'solid',
    icon: '🌐',
    defaultPort: 80,
    description: 'HTTP REST API connection',
    stateColors: {
      active: '#0084FF',
      inactive: '#6C7B7F',
      error: '#FF4444',
    },
  },

  TCP: {
    color: '#28A745', // Bootstrap Success Green
    style: 'solid',
    icon: '🔌',
    description: 'Direct TCP socket connection',
    stateColors: {
      active: '#32CD32',
      inactive: '#6C7B7F',
      error: '#FF4444',
    },
  },

  WebSocket: {
    color: '#FFC107', // Bootstrap Warning Yellow
    style: 'dashed',
    icon: '⚡',
    defaultPort: 80,
    description: 'Real-time WebSocket connection',
    stateColors: {
      active: '#FFD700',
      inactive: '#6C7B7F',
      error: '#FF4444',
    },
  },

  MessageQueue: {
    color: '#DC3545', // Bootstrap Danger Red
    style: 'dotted',
    icon: '📬',
    defaultPort: 5672,
    description: 'Asynchronous message queue',
    stateColors: {
      active: '#FF6B6B',
      inactive: '#6C7B7F',
      error: '#CC0000',
    },
  },

  GraphQL: {
    color: '#E535AB', // GraphQL Pink
    style: 'solid',
    icon: '📊',
    defaultPort: 80,
    description: 'GraphQL API endpoint',
    stateColors: {
      active: '#FF69B4',
      inactive: '#6C7B7F',
      error: '#FF4444',
    },
  },

  gRPC: {
    color: '#4285F4', // Google Blue
    style: 'solid',
    icon: '⚡',
    defaultPort: 443,
    description: 'High-performance gRPC connection',
    stateColors: {
      active: '#4A90E2',
      inactive: '#6C7B7F',
      error: '#FF4444',
    },
  },

  Database: {
    color: '#9B59B6', // Matches Gateway component color
    style: 'solid',
    icon: '🗃️',
    defaultPort: 5432,
    description: 'Database connection via Gateway',
    stateColors: {
      active: '#BB79DB',
      inactive: '#6C7B7F',
      error: '#FF4444',
    },
  },

  Custom: {
    color: '#6C757D', // Bootstrap Secondary Gray
    style: 'solid',
    icon: '🔧',
    description: 'Custom or undefined protocol',
    stateColors: {
      active: '#868E96',
      inactive: '#ADB5BD',
      error: '#FF4444',
    },
  },
};

/**
 * Visual style configuration for connection types
 */
export interface ConnectionTypeStyle {
  // Animation type for data flow visualization
  animation: 'none' | 'flow' | 'pulse' | 'bidirectional';

  // Base line thickness multiplier
  thicknessMultiplier: number;

  // Description for UI
  description: string;

  // Visual indicators
  indicators?: {
    startMarker?: string;
    endMarker?: string;
    flowDirection?: boolean;
  };
}

/**
 * Connection type-specific styling
 */
export const ConnectionTypeStyles: Record<ConnectionType, ConnectionTypeStyle> = {
  sync: {
    animation: 'none',
    thicknessMultiplier: 1.0,
    description: 'Synchronous request-response',
    indicators: {
      startMarker: '→',
      endMarker: '←',
      flowDirection: true,
    },
  },

  async: {
    animation: 'pulse',
    thicknessMultiplier: 1.0,
    description: 'Asynchronous messaging',
    indicators: {
      startMarker: '⟶',
      flowDirection: true,
    },
  },

  stream: {
    animation: 'flow',
    thicknessMultiplier: 1.2,
    description: 'Continuous data stream',
    indicators: {
      startMarker: '≈',
      endMarker: '≈',
      flowDirection: true,
    },
  },

  event: {
    animation: 'pulse',
    thicknessMultiplier: 0.8,
    description: 'Event-driven communication',
    indicators: {
      startMarker: '◊',
      flowDirection: false,
    },
  },
};

/**
 * Health state colors consistent with Gateway component
 */
export const ConnectionHealthColors: Record<HealthState, string> = {
  healthy: '#27AE60', // Green - matches Gateway healthy state
  degraded: '#F39C12', // Orange - matches Gateway degraded state
  'at-risk': '#E67E22', // Orange-red - warning level
  critical: '#E74C3C', // Red - matches Gateway failed state
};

/**
 * Style calculator for connections
 */
export class ConnectionStyleCalculator {
  /**
   * Calculate complete visual properties for a connection
   */
  static calculateConnectionStyle(
    protocol: ConnectionProtocol,
    connectionType: ConnectionType,
    healthState: HealthState,
    dataVolume: 'LIGHT' | 'MODERATE' | 'HEAVY',
    isSelected: boolean = false,
    isHovered: boolean = false
  ): ComputedConnectionStyle {
    const protocolStyle = ConnectionProtocolStyles[protocol];
    const typeStyle = ConnectionTypeStyles[connectionType];

    // Base color from protocol
    let color = protocolStyle.color;

    // Override with health state if not healthy
    if (healthState !== 'healthy') {
      color = ConnectionHealthColors[healthState];
    }

    // Selection and hover states
    if (isSelected) {
      color = '#00FFFF'; // Cyan for selection (matches existing UI)
    } else if (isHovered) {
      color = this.lightenColor(color, 0.2);
    }

    // Calculate thickness based on data volume and type
    const baseThickness = this.getBaseThickness(dataVolume);
    const thickness = baseThickness * typeStyle.thicknessMultiplier;

    return {
      color,
      thickness,
      style: protocolStyle.style,
      animation: typeStyle.animation,
      icon: protocolStyle.icon,
      description: `${protocolStyle.description} (${typeStyle.description})`,
      dashArray: this.getDashArray(protocolStyle.style, thickness),
      opacity: this.getOpacity(healthState, isSelected),
    };
  }

  /**
   * Get base thickness from data volume
   */
  private static getBaseThickness(dataVolume: 'LIGHT' | 'MODERATE' | 'HEAVY'): number {
    const thicknessMap = {
      LIGHT: 1.5,
      MODERATE: 2.5,
      HEAVY: 3.5,
    };
    return thicknessMap[dataVolume];
  }

  /**
   * Get dash array pattern for line styles
   */
  private static getDashArray(style: 'solid' | 'dashed' | 'dotted', thickness: number): number[] {
    switch (style) {
      case 'solid':
        return [];
      case 'dashed':
        return [thickness * 3, thickness * 2];
      case 'dotted':
        return [thickness, thickness];
      default:
        return [];
    }
  }

  /**
   * Get opacity based on health and selection state
   */
  private static getOpacity(healthState: HealthState, isSelected: boolean): number {
    if (isSelected) return 1.0;

    const healthOpacity = {
      healthy: 1.0,
      degraded: 0.9,
      'at-risk': 0.8,
      critical: 0.7,
    };

    return healthOpacity[healthState];
  }

  /**
   * Lighten a color by a percentage (for hover effects)
   */
  private static lightenColor(color: string, percent: number): string {
    // Simple color lightening - convert hex to RGB, lighten, convert back
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const lightenValue = (value: number) =>
      Math.min(255, Math.floor(value + (255 - value) * percent));

    const newR = lightenValue(r).toString(16).padStart(2, '0');
    const newG = lightenValue(g).toString(16).padStart(2, '0');
    const newB = lightenValue(b).toString(16).padStart(2, '0');

    return `#${newR}${newG}${newB}`;
  }

  /**
   * Get protocol style by name
   */
  static getProtocolStyle(protocol: ConnectionProtocol): ProtocolStyle {
    return ConnectionProtocolStyles[protocol];
  }

  /**
   * Get connection type style by name
   */
  static getConnectionTypeStyle(connectionType: ConnectionType): ConnectionTypeStyle {
    return ConnectionTypeStyles[connectionType];
  }

  /**
   * Suggest appropriate protocol based on component types
   */
  static suggestProtocol(
    sourceType: string,
    targetType: string,
    isExternal: boolean = false
  ): ConnectionProtocol {
    // Gateway connections typically use appropriate external protocols
    if (sourceType === 'gateway' || targetType === 'gateway') {
      return isExternal ? 'HTTP' : 'Database';
    }

    // Decision points often use events
    if (sourceType === 'decision-point' || targetType === 'decision-point') {
      return 'MessageQueue';
    }

    // Default to HTTP for most internal connections
    return 'HTTP';
  }

  /**
   * Suggest appropriate connection type based on protocol and components
   */
  static suggestConnectionType(
    protocol: ConnectionProtocol,
    sourceType: string,
    targetType: string
  ): ConnectionType {
    // Protocol-based suggestions
    switch (protocol) {
      case 'WebSocket':
        return 'stream';
      case 'MessageQueue':
        return 'async';
      case 'Database':
        return 'sync';
      case 'gRPC':
        return 'sync';
      default:
        return 'sync';
    }
  }
}

/**
 * Computed style result from calculations
 */
export interface ComputedConnectionStyle {
  color: string;
  thickness: number;
  style: 'solid' | 'dashed' | 'dotted';
  animation: 'none' | 'flow' | 'pulse' | 'bidirectional';
  icon: string;
  description: string;
  dashArray: number[];
  opacity: number;
}

/**
 * Style presets for common connection patterns
 */
export const ConnectionStylePresets = {
  // Microservice communication
  microserviceAPI: {
    protocol: 'HTTP' as ConnectionProtocol,
    connectionType: 'sync' as ConnectionType,
    description: 'Standard microservice API call',
  },

  // Event-driven architecture
  eventStream: {
    protocol: 'MessageQueue' as ConnectionProtocol,
    connectionType: 'async' as ConnectionType,
    description: 'Asynchronous event streaming',
  },

  // Real-time communication
  realTime: {
    protocol: 'WebSocket' as ConnectionProtocol,
    connectionType: 'stream' as ConnectionType,
    description: 'Real-time bidirectional communication',
  },

  // Database access
  databaseAccess: {
    protocol: 'Database' as ConnectionProtocol,
    connectionType: 'sync' as ConnectionType,
    description: 'Database query/transaction',
  },

  // High-performance RPC
  highPerformance: {
    protocol: 'gRPC' as ConnectionProtocol,
    connectionType: 'sync' as ConnectionType,
    description: 'High-performance RPC call',
  },
};

/**
 * Export style constants for use in other modules
 */
export const StyleConstants = {
  // Animation speeds (milliseconds)
  ANIMATION_SPEEDS: {
    slow: 3000,
    medium: 2000,
    fast: 1000,
  },

  // Selection indicators
  SELECTION_GLOW_SIZE: 8,
  HOVER_GLOW_SIZE: 4,

  // Minimum/maximum thickness bounds
  MIN_THICKNESS: 1,
  MAX_THICKNESS: 8,

  // Label positioning
  LABEL_OFFSET: 10,
  LABEL_FONT_SIZE: 12,
} as const;

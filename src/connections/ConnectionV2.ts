// ConnectionV2.ts - Enhanced Connection Interface for Phase 2C
// Design-time intelligence for architectural visualization

import { Connection } from '../types';

/**
 * Enhanced connection interface extending the existing Connection
 * Adds design-time intelligence while maintaining backward compatibility
 */
export interface ConnectionV2 extends Connection {
  // Enhanced type classification for visual distinction
  connectionType: ConnectionType;

  // Protocol awareness for visual styling (design-time, not runtime)
  protocol: ConnectionProtocol;

  // Design-time configuration properties (no runtime implementation)
  designConfig: DesignTimeConfig;

  // Design-time health modeling for architectural planning
  designHealth: DesignTimeHealth;

  // Gateway integration points (references to Gateway components)
  gatewayEndpoints?: GatewayEndpoints;

  // Visual properties for rendering
  visual: VisualProperties;

  // Metadata for export specifications
  exportConfig?: ExportConfiguration;
}

/**
 * Connection types for different communication patterns
 */
export type ConnectionType =
  | 'sync'        // Synchronous request-response
  | 'async'       // Asynchronous messaging
  | 'stream'      // Continuous data stream
  | 'event';      // Event-driven communication

/**
 * Supported protocols for visual styling and validation
 */
export type ConnectionProtocol =
  | 'HTTP'        // REST APIs, web services
  | 'TCP'         // Direct TCP connections
  | 'WebSocket'   // Real-time bidirectional
  | 'MessageQueue'// Async message brokers
  | 'GraphQL'     // GraphQL APIs
  | 'gRPC'        // High-performance RPC
  | 'Database'    // Database connections
  | 'Custom';     // Custom/undefined protocols

/**
 * Design-time configuration for architectural planning
 */
export interface DesignTimeConfig {
  // Expected performance characteristics
  expectedLatency: LatencyLevel;
  dataVolume: DataVolumeLevel;

  // Reliability and security requirements
  reliability: ReliabilityLevel;
  security: SecurityLevel;

  // Additional architectural properties
  description?: string;
  businessCriticality?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complianceRequirements?: string[];
}

export type LatencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type DataVolumeLevel = 'LIGHT' | 'MODERATE' | 'HEAVY';
export type ReliabilityLevel = 'BEST_EFFORT' | 'GUARANTEED' | 'CRITICAL';
export type SecurityLevel = 'PUBLIC' | 'INTERNAL' | 'SECURE' | 'ENCRYPTED';

/**
 * Design-time health modeling for "what-if" scenarios
 */
export interface DesignTimeHealth {
  // Current simulated health state
  simulatedState: HealthState;

  // Risk assessment (0-1 scale)
  bottleneckRisk: number;

  // Potential failure scenarios
  failureScenarios: FailureScenario[];

  // Performance implications
  performanceImpact?: PerformanceImpact;
}

export type HealthState = 'healthy' | 'degraded' | 'at-risk' | 'critical';

export interface FailureScenario {
  id: string;
  description: string;
  probability: number; // 0-1 scale
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigations: string[];
}

export interface PerformanceImpact {
  estimatedThroughput?: string;
  resourceUtilization?: 'LOW' | 'MEDIUM' | 'HIGH';
  scalabilityLimits?: string;
}

/**
 * Gateway integration for external connections
 */
export interface GatewayEndpoints {
  sourceGateway?: string;    // Source Gateway component ID
  targetGateway?: string;    // Target Gateway component ID
  externalSystemName?: string; // Name of external system
}

/**
 * Visual properties for canvas rendering
 */
export interface VisualProperties {
  // Line appearance
  thickness: number;         // Based on data volume
  style: 'solid' | 'dashed' | 'dotted';

  // Animation (for data flow visualization)
  animation?: AnimationType;

  // Color override (normally determined by protocol)
  colorOverride?: string;

  // Label positioning and content
  label?: {
    text: string;
    position: 'start' | 'middle' | 'end';
    visible: boolean;
  };
}

export type AnimationType = 'none' | 'flow' | 'pulse' | 'bidirectional';

/**
 * Export configuration for implementation specifications
 */
export interface ExportConfiguration {
  // Target implementation platform
  targetPlatform?: 'kubernetes' | 'docker-compose' | 'terraform' | 'generic';

  // Additional configuration for actual implementation
  implementationHints?: {
    timeout?: number;
    retryPolicy?: string;
    circuitBreaker?: boolean;
    loadBalancing?: string;
  };

  // Mapping to actual system endpoints
  endpointMapping?: {
    source: string;
    target: string;
  };
}

/**
 * Factory interface for creating ConnectionV2 instances
 */
export interface ConnectionV2Factory {
  createConnection(
    source: any,
    target: any,
    options?: Partial<ConnectionV2>
  ): ConnectionV2;

  upgradeConnection(connection: Connection): ConnectionV2;

  createFromTemplate(
    template: ConnectionTemplate,
    source: any,
    target: any
  ): ConnectionV2;
}

/**
 * Connection templates for common patterns
 */
export interface ConnectionTemplate {
  id: string;
  name: string;
  description: string;

  // Default configuration
  defaultConnectionType: ConnectionType;
  defaultProtocol: ConnectionProtocol;
  defaultDesignConfig: Partial<DesignTimeConfig>;

  // Applicable component types
  applicableSourceTypes?: string[];
  applicableTargetTypes?: string[];
}

/**
 * Validation result for connection compatibility
 */
export interface ConnectionValidationResult {
  valid: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestions?: string[];
}

/**
 * Common connection templates based on architectural patterns
 */
export const ConnectionTemplates: ConnectionTemplate[] = [
  {
    id: 'microservice-api',
    name: 'Microservice API',
    description: 'HTTP REST API connection between microservices',
    defaultConnectionType: 'sync',
    defaultProtocol: 'HTTP',
    defaultDesignConfig: {
      expectedLatency: 'MEDIUM',
      dataVolume: 'MODERATE',
      reliability: 'GUARANTEED',
      security: 'INTERNAL'
    }
  },
  {
    id: 'event-streaming',
    name: 'Event Streaming',
    description: 'Asynchronous event streaming via message queue',
    defaultConnectionType: 'stream',
    defaultProtocol: 'MessageQueue',
    defaultDesignConfig: {
      expectedLatency: 'LOW',
      dataVolume: 'HEAVY',
      reliability: 'GUARANTEED',
      security: 'INTERNAL'
    }
  },
  {
    id: 'database-connection',
    name: 'Database Connection',
    description: 'Connection to database via Gateway',
    defaultConnectionType: 'sync',
    defaultProtocol: 'Database',
    defaultDesignConfig: {
      expectedLatency: 'LOW',
      dataVolume: 'MODERATE',
      reliability: 'CRITICAL',
      security: 'ENCRYPTED'
    },
    applicableTargetTypes: ['gateway']
  },
  {
    id: 'real-time-socket',
    name: 'Real-time Socket',
    description: 'WebSocket connection for real-time communication',
    defaultConnectionType: 'stream',
    defaultProtocol: 'WebSocket',
    defaultDesignConfig: {
      expectedLatency: 'LOW',
      dataVolume: 'LIGHT',
      reliability: 'GUARANTEED',
      security: 'SECURE'
    }
  }
];

/**
 * Utility functions for working with ConnectionV2
 */
export class ConnectionV2Utils {
  /**
   * Check if a connection is a ConnectionV2 instance
   */
  static isConnectionV2(connection: Connection | ConnectionV2): connection is ConnectionV2 {
    return 'connectionType' in connection && 'protocol' in connection;
  }

  /**
   * Get appropriate visual thickness based on data volume
   */
  static getThicknessForDataVolume(dataVolume: DataVolumeLevel): number {
    const thicknessMap: Record<DataVolumeLevel, number> = {
      'LIGHT': 1.5,
      'MODERATE': 2.5,
      'HEAVY': 3.5
    };
    return thicknessMap[dataVolume];
  }

  /**
   * Get appropriate animation based on connection type
   */
  static getAnimationForConnectionType(connectionType: ConnectionType): AnimationType {
    const animationMap: Record<ConnectionType, AnimationType> = {
      'sync': 'none',
      'async': 'pulse',
      'stream': 'flow',
      'event': 'pulse'
    };
    return animationMap[connectionType];
  }

  /**
   * Calculate health score from design health configuration
   */
  static calculateHealthScore(designHealth: DesignTimeHealth): number {
    const stateScores = {
      'healthy': 1.0,
      'degraded': 0.7,
      'at-risk': 0.4,
      'critical': 0.1
    };

    const baseScore = stateScores[designHealth.simulatedState];
    const riskPenalty = designHealth.bottleneckRisk * 0.3;
    const failurePenalty = designHealth.failureScenarios.length * 0.05;

    return Math.max(0, baseScore - riskPenalty - failurePenalty);
  }
}

/**
 * Type guards for connection properties
 */
export class ConnectionV2TypeGuards {
  static isValidConnectionType(type: string): type is ConnectionType {
    return ['sync', 'async', 'stream', 'event'].includes(type);
  }

  static isValidProtocol(protocol: string): protocol is ConnectionProtocol {
    return ['HTTP', 'TCP', 'WebSocket', 'MessageQueue', 'GraphQL', 'gRPC', 'Database', 'Custom'].includes(protocol);
  }

  static isValidLatencyLevel(level: string): level is LatencyLevel {
    return ['LOW', 'MEDIUM', 'HIGH'].includes(level);
  }

  static isValidDataVolumeLevel(level: string): level is DataVolumeLevel {
    return ['LIGHT', 'MODERATE', 'HEAVY'].includes(level);
  }

  static isValidReliabilityLevel(level: string): level is ReliabilityLevel {
    return ['BEST_EFFORT', 'GUARANTEED', 'CRITICAL'].includes(level);
  }

  static isValidSecurityLevel(level: string): level is SecurityLevel {
    return ['PUBLIC', 'INTERNAL', 'SECURE', 'ENCRYPTED'].includes(level);
  }

  static isValidHealthState(state: string): state is HealthState {
    return ['healthy', 'degraded', 'at-risk', 'critical'].includes(state);
  }
}
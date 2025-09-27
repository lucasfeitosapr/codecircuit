// ConnectionV2Factory.ts - Intelligent connection creation with Gateway integration
// Phase 2C: Connection Intelligence

import {
  ConnectionV2,
  ConnectionV2Factory as IConnectionV2Factory,
  ConnectionTemplate,
  ConnectionTemplates,
  ConnectionV2Utils,
} from './ConnectionV2';
import { Connection } from '../types';
import { ConnectionStyleCalculator } from './ConnectionProtocolStyles';
import { connectionValidator } from './ConnectionValidation';
import { connectionHealthSimulator } from './ConnectionHealthSimulator';

/**
 * Factory for creating enhanced ConnectionV2 instances
 * Provides intelligent defaults and Gateway integration
 */
export class ConnectionV2Factory implements IConnectionV2Factory {
  /**
   * Create a new ConnectionV2 with intelligent defaults
   */
  createConnection(source: any, target: any, options?: Partial<ConnectionV2>): ConnectionV2 {
    // Create base connection structure
    const baseConnection = this.createBaseConnection(source, target);

    // Detect Gateway endpoints
    const gatewayEndpoints = this.detectGatewayEndpoints(source, target);

    // Suggest appropriate protocol and connection type
    const suggestedProtocol =
      options?.protocol ||
      this.suggestProtocol(source.component?.type, target.component?.type, !!gatewayEndpoints);

    const suggestedConnectionType =
      options?.connectionType ||
      this.suggestConnectionType(suggestedProtocol, source.component?.type, target.component?.type);

    // Create intelligent design configuration
    const designConfig = {
      expectedLatency: this.suggestLatency(suggestedProtocol, gatewayEndpoints),
      dataVolume: this.suggestDataVolume(suggestedConnectionType),
      reliability: this.suggestReliability(source.component?.type, target.component?.type),
      security: this.suggestSecurity(gatewayEndpoints),
      ...options?.designConfig,
    };

    // Create design-time health model
    const designHealth = {
      simulatedState: this.simulateInitialHealth(suggestedProtocol, designConfig),
      bottleneckRisk: this.calculateInitialBottleneckRisk(suggestedConnectionType, designConfig),
      failureScenarios: this.generateInitialFailureScenarios(suggestedProtocol, designConfig),
      ...options?.designHealth,
    };

    // Create visual properties
    const visual = {
      thickness: ConnectionV2Utils.getThicknessForDataVolume(designConfig.dataVolume),
      style: this.getStyleForProtocol(suggestedProtocol),
      animation: ConnectionV2Utils.getAnimationForConnectionType(suggestedConnectionType),
      ...options?.visual,
    };

    // Create enhanced connection
    const connectionV2: ConnectionV2 = {
      ...baseConnection,
      connectionType: suggestedConnectionType,
      protocol: suggestedProtocol,
      designConfig,
      designHealth,
      gatewayEndpoints,
      visual,
      ...options,
    };

    return connectionV2;
  }

  /**
   * Upgrade existing Connection to ConnectionV2
   */
  upgradeConnection(connection: Connection): ConnectionV2 {
    // Use factory to create enhanced version
    return this.createConnection(connection.from, connection.to, {
      id: connection.id,
      category: connection.category,
      createdAt: connection.createdAt,
    });
  }

  /**
   * Create connection from template
   */
  createFromTemplate(template: ConnectionTemplate, source: any, target: any): ConnectionV2 {
    return this.createConnection(source, target, {
      connectionType: template.defaultConnectionType,
      protocol: template.defaultProtocol,
      designConfig: template.defaultDesignConfig,
    });
  }

  /**
   * Create connection with Gateway health integration
   */
  createWithGatewayIntegration(
    source: any,
    target: any,
    gatewayHealthStates?: { source?: string; target?: string },
    options?: Partial<ConnectionV2>
  ): ConnectionV2 {
    const connection = this.createConnection(source, target, options);

    // Integrate Gateway health states if available
    if (gatewayHealthStates) {
      connection.designHealth.simulatedState = this.mapGatewayHealthToConnectionHealth(
        gatewayHealthStates.source,
        gatewayHealthStates.target
      );

      // Update bottleneck risk based on Gateway health
      if (gatewayHealthStates.source === 'failed' || gatewayHealthStates.target === 'failed') {
        connection.designHealth.bottleneckRisk = Math.max(
          connection.designHealth.bottleneckRisk,
          0.8
        );
      }
    }

    return connection;
  }

  /**
   * Batch create connections with consistency checks
   */
  createConnections(
    connectionSpecs: Array<{ source: any; target: any; options?: Partial<ConnectionV2> }>
  ): ConnectionV2[] {
    const connections = connectionSpecs.map(spec =>
      this.createConnection(spec.source, spec.target, spec.options)
    );

    // Validate connections as a group
    const validationResults = connections.map(conn => connectionValidator.validateConnection(conn));

    // Log any validation issues
    validationResults.forEach((results, index) => {
      if (results.length > 0) {
        console.warn(`Connection ${connections[index].id} validation issues:`, results);
      }
    });

    return connections;
  }

  /**
   * Create base connection structure
   */
  private createBaseConnection(source: any, target: any): Connection {
    return {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: source,
      to: target,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Detect Gateway endpoints in the connection
   */
  private detectGatewayEndpoints(
    source: any,
    target: any
  ):
    | {
        sourceGateway?: string;
        targetGateway?: string;
        externalSystemName?: string;
      }
    | undefined {
    const gatewayEndpoints: any = {};

    // Check if source is a Gateway
    if (source.component?.type === 'gateway') {
      gatewayEndpoints.sourceGateway = source.component.id;
      gatewayEndpoints.externalSystemName = source.component.externalSystem || 'External System';
    }

    // Check if target is a Gateway
    if (target.component?.type === 'gateway') {
      gatewayEndpoints.targetGateway = target.component.id;
      gatewayEndpoints.externalSystemName = target.component.externalSystem || 'External System';
    }

    return Object.keys(gatewayEndpoints).length > 0 ? gatewayEndpoints : undefined;
  }

  /**
   * Suggest appropriate protocol based on component types and context
   */
  private suggestProtocol(
    sourceType?: string,
    targetType?: string,
    hasGateway: boolean = false
  ): any {
    // Gateway-based suggestions
    if (hasGateway) {
      if (sourceType === 'gateway' || targetType === 'gateway') {
        return 'HTTP'; // Most common for external integrations
      }
    }

    // Component-specific suggestions
    if (sourceType === 'decision-point' || targetType === 'decision-point') {
      return 'MessageQueue'; // Decision points often use events
    }

    if (sourceType === 'module-ic' && targetType === 'module-ic') {
      return 'gRPC'; // Service-to-service communication
    }

    if (targetType === 'gateway') {
      return 'Database'; // Internal to Gateway typically database
    }

    // Default to HTTP for most connections
    return 'HTTP';
  }

  /**
   * Suggest connection type based on protocol and components
   */
  private suggestConnectionType(protocol: any, sourceType?: string, targetType?: string): any {
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

  /**
   * Suggest latency level based on protocol and Gateway presence
   */
  private suggestLatency(protocol: any, gatewayEndpoints?: any): any {
    if (gatewayEndpoints) {
      return 'HIGH'; // External systems typically have higher latency
    }

    const latencyMap = {
      gRPC: 'LOW',
      TCP: 'LOW',
      WebSocket: 'LOW',
      HTTP: 'MEDIUM',
      MessageQueue: 'MEDIUM',
      Database: 'MEDIUM',
      Custom: 'HIGH',
    };

    return latencyMap[protocol as keyof typeof latencyMap] || 'MEDIUM';
  }

  /**
   * Suggest data volume based on connection type
   */
  private suggestDataVolume(connectionType: any): any {
    const volumeMap = {
      sync: 'MODERATE',
      async: 'MODERATE',
      stream: 'HEAVY',
      event: 'LIGHT',
    };

    return volumeMap[connectionType as keyof typeof volumeMap] || 'MODERATE';
  }

  /**
   * Suggest reliability level based on component types
   */
  private suggestReliability(sourceType?: string, targetType?: string): any {
    // Gateway connections are typically critical
    if (sourceType === 'gateway' || targetType === 'gateway') {
      return 'CRITICAL';
    }

    // Decision points need guaranteed delivery
    if (sourceType === 'decision-point') {
      return 'GUARANTEED';
    }

    return 'GUARANTEED'; // Default to guaranteed for most architectural connections
  }

  /**
   * Suggest security level based on Gateway presence
   */
  private suggestSecurity(gatewayEndpoints?: any): any {
    if (gatewayEndpoints) {
      return 'SECURE'; // External connections need security
    }

    return 'INTERNAL'; // Internal connections are typically internal security level
  }

  /**
   * Simulate initial health state
   */
  private simulateInitialHealth(protocol: any, designConfig: any): any {
    // Most connections start healthy
    let health: any = 'healthy';

    // Adjust based on configuration
    if (designConfig.expectedLatency === 'HIGH' && protocol !== 'MessageQueue') {
      health = 'degraded';
    }

    if (designConfig.security === 'PUBLIC' && ['TCP', 'Custom'].includes(protocol)) {
      health = 'at-risk';
    }

    return health;
  }

  /**
   * Calculate initial bottleneck risk
   */
  private calculateInitialBottleneckRisk(connectionType: any, designConfig: any): number {
    let risk = 0.1; // Base risk

    if (connectionType === 'sync' && designConfig.expectedLatency === 'HIGH') {
      risk += 0.4;
    }

    if (designConfig.dataVolume === 'HEAVY' && connectionType !== 'stream') {
      risk += 0.3;
    }

    return Math.min(risk, 1.0);
  }

  /**
   * Generate initial failure scenarios
   */
  private generateInitialFailureScenarios(protocol: any, designConfig: any): any[] {
    const scenarios = [];

    // Common network timeout scenario
    scenarios.push({
      id: 'network-timeout',
      description: 'Connection timeout due to network issues',
      probability: designConfig.expectedLatency === 'HIGH' ? 0.1 : 0.03,
      impact: 'MEDIUM',
      mitigations: ['Implement retry logic', 'Set appropriate timeouts'],
    });

    // Protocol-specific scenarios
    if (protocol === 'HTTP') {
      scenarios.push({
        id: 'http-errors',
        description: 'HTTP 5xx server errors',
        probability: 0.05,
        impact: 'MEDIUM',
        mitigations: ['Monitor server health', 'Implement retry for 5xx errors'],
      });
    }

    return scenarios;
  }

  /**
   * Get line style for protocol
   */
  private getStyleForProtocol(protocol: any): 'solid' | 'dashed' | 'dotted' {
    const styleMap = {
      HTTP: 'solid',
      TCP: 'solid',
      WebSocket: 'dashed',
      MessageQueue: 'dotted',
      GraphQL: 'solid',
      gRPC: 'solid',
      Database: 'solid',
      Custom: 'solid',
    };

    return styleMap[protocol as keyof typeof styleMap] || 'solid';
  }

  /**
   * Map Gateway health states to connection health
   */
  private mapGatewayHealthToConnectionHealth(sourceHealth?: string, targetHealth?: string): any {
    // If either Gateway is failed, connection is at-risk
    if (sourceHealth === 'failed' || targetHealth === 'failed') {
      return 'critical';
    }

    // If either is degraded, connection is degraded
    if (sourceHealth === 'degraded' || targetHealth === 'degraded') {
      return 'degraded';
    }

    // If both are healthy or unknown, connection is healthy
    return 'healthy';
  }
}

/**
 * Utility functions for connection creation
 */
export class ConnectionCreationUtils {
  /**
   * Find appropriate template for component pair
   */
  static findTemplateForComponents(
    sourceType: string,
    targetType: string
  ): ConnectionTemplate | null {
    return (
      ConnectionTemplates.find(template => {
        if (
          template.applicableSourceTypes &&
          !template.applicableSourceTypes.includes(sourceType)
        ) {
          return false;
        }
        if (
          template.applicableTargetTypes &&
          !template.applicableTargetTypes.includes(targetType)
        ) {
          return false;
        }
        return true;
      }) || null
    );
  }

  /**
   * Suggest multiple connection options for component pair
   */
  static suggestConnectionOptions(
    sourceType: string,
    targetType: string
  ): Array<{ template: ConnectionTemplate; confidence: number; reason: string }> {
    const suggestions: Array<{ template: ConnectionTemplate; confidence: number; reason: string }> =
      [];

    ConnectionTemplates.forEach(template => {
      let confidence = 0.5; // Base confidence
      let reason = 'General purpose connection';

      // Check component type compatibility
      if (template.applicableSourceTypes?.includes(sourceType)) {
        confidence += 0.3;
        reason = `Designed for ${sourceType} sources`;
      }

      if (template.applicableTargetTypes?.includes(targetType)) {
        confidence += 0.3;
        reason = reason.includes('Designed')
          ? `Designed for ${sourceType} → ${targetType}`
          : `Designed for ${targetType} targets`;
      }

      // Specific patterns
      if (sourceType === 'gateway' || targetType === 'gateway') {
        if (template.id === 'database-connection') {
          confidence = 0.9;
          reason = 'Gateway connections typically access databases';
        }
      }

      if (sourceType === 'decision-point') {
        if (template.id === 'event-streaming') {
          confidence = 0.8;
          reason = 'Decision points often use event-driven patterns';
        }
      }

      if (sourceType === 'module-ic' && targetType === 'module-ic') {
        if (template.id === 'microservice-api') {
          confidence = 0.9;
          reason = 'Module-to-module communication typically uses APIs';
        }
      }

      suggestions.push({ template, confidence, reason });
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Validate connection creation parameters
   */
  static validateCreationParameters(
    source: any,
    target: any,
    options?: Partial<ConnectionV2>
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Basic parameter validation
    if (!source || !source.component) {
      issues.push('Source component is required');
    }

    if (!target || !target.component) {
      issues.push('Target component is required');
    }

    // Prevent self-connections
    if (source?.component?.id === target?.component?.id) {
      issues.push('Cannot connect component to itself');
    }

    // Validate pin types if specified
    if (source?.pinType === 'input' && target?.pinType === 'input') {
      issues.push('Cannot connect input pin to input pin');
    }

    if (source?.pinType === 'output' && target?.pinType === 'output') {
      issues.push('Cannot connect output pin to output pin');
    }

    // Validate options if provided
    if (
      options?.protocol &&
      ![
        'HTTP',
        'TCP',
        'WebSocket',
        'MessageQueue',
        'GraphQL',
        'gRPC',
        'Database',
        'Custom',
      ].includes(options.protocol)
    ) {
      issues.push('Invalid protocol specified');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Export singleton factory instance
export const connectionV2Factory = new ConnectionV2Factory();

// ConnectionValidation.ts - Connection validation framework for Phase 2C
// Design-time validation for architectural compatibility

import { ConnectionV2, ConnectionProtocol, ConnectionType } from './ConnectionV2';
import { ComponentBase } from '../types';

/**
 * Validation result for connection compatibility checks
 */
export interface ValidationResult {
  valid: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestions?: string[];
  ruleId: string;
}

/**
 * Validation rule interface for extensible validation system
 */
export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';

  // Validation function - returns result
  validate: (connection: ConnectionV2, components?: ComponentBase[]) => ValidationResult;

  // Applicability conditions
  appliesTo?: {
    connectionTypes?: ConnectionType[];
    protocols?: ConnectionProtocol[];
    sourceTypes?: string[];
    targetTypes?: string[];
  };
}

/**
 * Component compatibility matrix for architectural validation
 */
export interface ComponentCompatibility {
  sourceType: string;
  targetType: string;

  // Supported connection patterns
  supportedProtocols: ConnectionProtocol[];
  recommendedConnectionTypes: ConnectionType[];

  // Validation rules specific to this component pair
  validationRules: string[]; // Rule IDs

  // Design guidance
  designNotes?: string;
  commonPatterns?: string[];
}

/**
 * Connection validation engine
 */
export class ConnectionValidator {
  private rules: Map<string, ValidationRule> = new Map();
  private compatibilityMatrix: ComponentCompatibility[] = [];

  constructor() {
    this.initializeDefaultRules();
    this.initializeCompatibilityMatrix();
  }

  /**
   * Validate a connection against all applicable rules
   */
  validateConnection(
    connection: ConnectionV2,
    components?: ComponentBase[]
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    // Run all applicable rules
    for (const rule of this.rules.values()) {
      if (this.isRuleApplicable(rule, connection, components)) {
        const result = rule.validate(connection, components);
        results.push(result);
      }
    }

    // Add compatibility matrix validation
    const compatibilityResult = this.validateCompatibility(connection, components);
    if (compatibilityResult) {
      results.push(compatibilityResult);
    }

    return results.filter(r => !r.valid); // Return only issues
  }

  /**
   * Register a custom validation rule
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get all validation rules
   */
  getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Add component compatibility rule
   */
  addCompatibilityRule(compatibility: ComponentCompatibility): void {
    this.compatibilityMatrix.push(compatibility);
  }

  /**
   * Check if a rule applies to the given connection
   */
  private isRuleApplicable(
    rule: ValidationRule,
    connection: ConnectionV2,
    components?: ComponentBase[]
  ): boolean {
    if (!rule.appliesTo) return true;

    const { connectionTypes, protocols, sourceTypes, targetTypes } = rule.appliesTo;

    // Check connection type filter
    if (connectionTypes && !connectionTypes.includes(connection.connectionType)) {
      return false;
    }

    // Check protocol filter
    if (protocols && !protocols.includes(connection.protocol)) {
      return false;
    }

    // Check component type filters
    if (components && (sourceTypes || targetTypes)) {
      const sourceComponent = components.find(c => c.id === connection.from.component.id);
      const targetComponent = components.find(c => c.id === connection.to.component.id);

      if (sourceTypes && sourceComponent && !sourceTypes.includes(sourceComponent.type)) {
        return false;
      }

      if (targetTypes && targetComponent && !targetTypes.includes(targetComponent.type)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate based on component compatibility matrix
   */
  private validateCompatibility(
    connection: ConnectionV2,
    components?: ComponentBase[]
  ): ValidationResult | null {
    if (!components) return null;

    const sourceComponent = components.find(c => c.id === connection.from.component.id);
    const targetComponent = components.find(c => c.id === connection.to.component.id);

    if (!sourceComponent || !targetComponent) return null;

    const compatibility = this.compatibilityMatrix.find(c =>
      c.sourceType === sourceComponent.type && c.targetType === targetComponent.type
    );

    if (!compatibility) {
      return {
        valid: true, // No specific rule means it's allowed
        severity: 'info',
        message: `No specific compatibility rules for ${sourceComponent.type} → ${targetComponent.type}`,
        ruleId: 'compatibility-matrix',
        suggestions: ['Consider adding specific validation rules for this component combination']
      };
    }

    // Check protocol compatibility
    if (!compatibility.supportedProtocols.includes(connection.protocol)) {
      return {
        valid: false,
        severity: 'warning',
        message: `Protocol ${connection.protocol} not recommended for ${sourceComponent.type} → ${targetComponent.type}`,
        ruleId: 'protocol-compatibility',
        suggestions: compatibility.supportedProtocols.map(p => `Consider using ${p} protocol`)
      };
    }

    // Check connection type compatibility
    if (!compatibility.recommendedConnectionTypes.includes(connection.connectionType)) {
      return {
        valid: false,
        severity: 'info',
        message: `Connection type ${connection.connectionType} not typical for ${sourceComponent.type} → ${targetComponent.type}`,
        ruleId: 'connection-type-compatibility',
        suggestions: compatibility.recommendedConnectionTypes.map(t => `Consider using ${t} connection type`)
      };
    }

    return null; // All compatibility checks passed
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Gateway external connection rule
    this.registerRule({
      id: 'gateway-external-connection',
      name: 'Gateway External Connection',
      description: 'Gateway components should primarily connect to external systems',
      severity: 'warning',
      appliesTo: {
        sourceTypes: ['gateway'],
        targetTypes: ['power-core', 'task-resistor', 'module-ic']
      },
      validate: (connection) => ({
        valid: false,
        severity: 'warning',
        message: 'Gateways typically connect to external systems, not internal components',
        ruleId: 'gateway-external-connection',
        suggestions: [
          'Consider if this connection represents an external integration',
          'Gateway → Gateway connections are more typical for external systems'
        ]
      })
    });

    // Synchronous high-latency warning
    this.registerRule({
      id: 'sync-high-latency',
      name: 'Synchronous High Latency',
      description: 'Synchronous connections with high latency may cause performance issues',
      severity: 'warning',
      appliesTo: {
        connectionTypes: ['sync']
      },
      validate: (connection) => {
        if (connection.designConfig.expectedLatency === 'HIGH') {
          return {
            valid: false,
            severity: 'warning',
            message: 'Synchronous connections with high latency can block calling threads',
            ruleId: 'sync-high-latency',
            suggestions: [
              'Consider using async connection type for high-latency operations',
              'Implement timeout and retry mechanisms',
              'Consider circuit breaker pattern'
            ]
          };
        }
        return { valid: true, severity: 'info', message: '', ruleId: 'sync-high-latency' };
      }
    });

    // Heavy data volume stream recommendation
    this.registerRule({
      id: 'heavy-data-stream',
      name: 'Heavy Data Volume Stream',
      description: 'Heavy data volumes should use streaming connections',
      severity: 'info',
      validate: (connection) => {
        if (connection.designConfig.dataVolume === 'HEAVY' &&
            connection.connectionType !== 'stream') {
          return {
            valid: false,
            severity: 'info',
            message: 'Heavy data volumes are typically better handled with streaming connections',
            ruleId: 'heavy-data-stream',
            suggestions: [
              'Consider using stream connection type for heavy data',
              'Evaluate if data can be paginated or chunked'
            ]
          };
        }
        return { valid: true, severity: 'info', message: '', ruleId: 'heavy-data-stream' };
      }
    });

    // Critical reliability validation
    this.registerRule({
      id: 'critical-reliability-protocol',
      name: 'Critical Reliability Protocol',
      description: 'Critical reliability connections should use appropriate protocols',
      severity: 'warning',
      validate: (connection) => {
        if (connection.designConfig.reliability === 'CRITICAL') {
          const unreliableProtocols: ConnectionProtocol[] = ['Custom'];
          if (unreliableProtocols.includes(connection.protocol)) {
            return {
              valid: false,
              severity: 'warning',
              message: 'Critical reliability connections should use well-defined protocols',
              ruleId: 'critical-reliability-protocol',
              suggestions: [
                'Consider using HTTP, TCP, or Database protocols for critical connections',
                'Ensure proper error handling and retry mechanisms'
              ]
            };
          }
        }
        return { valid: true, severity: 'info', message: '', ruleId: 'critical-reliability-protocol' };
      }
    });

    // Security level protocol alignment
    this.registerRule({
      id: 'security-protocol-alignment',
      name: 'Security Protocol Alignment',
      description: 'Security requirements should align with protocol capabilities',
      severity: 'error',
      validate: (connection) => {
        if (connection.designConfig.security === 'ENCRYPTED') {
          const insecureProtocols: ConnectionProtocol[] = ['TCP', 'Custom'];
          if (insecureProtocols.includes(connection.protocol)) {
            return {
              valid: false,
              severity: 'error',
              message: 'Encrypted security level requires protocols with encryption support',
              ruleId: 'security-protocol-alignment',
              suggestions: [
                'Use HTTPS instead of HTTP for encrypted connections',
                'Consider gRPC with TLS for high-performance encrypted connections',
                'Ensure WebSocket connections use WSS (secure WebSockets)'
              ]
            };
          }
        }
        return { valid: true, severity: 'info', message: '', ruleId: 'security-protocol-alignment' };
      }
    });

    // Decision point output connections
    this.registerRule({
      id: 'decision-point-outputs',
      name: 'Decision Point Outputs',
      description: 'Decision points should have multiple output connections',
      severity: 'info',
      appliesTo: {
        sourceTypes: ['decision-point']
      },
      validate: (connection, components) => {
        // This rule would need component connection analysis
        // For now, just provide guidance
        return {
          valid: true,
          severity: 'info',
          message: 'Decision points typically have multiple output paths',
          ruleId: 'decision-point-outputs',
          suggestions: [
            'Ensure decision point has connections for all possible outcomes',
            'Consider using event connection types for conditional branching'
          ]
        };
      }
    });

    // Module IC internal connections
    this.registerRule({
      id: 'module-ic-internal',
      name: 'Module IC Internal Connections',
      description: 'Module IC components should encapsulate internal logic',
      severity: 'info',
      appliesTo: {
        sourceTypes: ['module-ic'],
        targetTypes: ['module-ic']
      },
      validate: (connection) => ({
        valid: true,
        severity: 'info',
        message: 'Module IC to Module IC connections represent service-to-service communication',
        ruleId: 'module-ic-internal',
        suggestions: [
          'Consider if this connection should be internal to one module',
          'Evaluate service boundaries and API contracts'
        ]
      })
    });
  }

  /**
   * Initialize component compatibility matrix
   */
  private initializeCompatibilityMatrix(): void {
    // Power Core → Other Components (Energy Distribution)
    this.addCompatibilityRule({
      sourceType: 'power-core',
      targetType: 'task-resistor',
      supportedProtocols: ['HTTP', 'MessageQueue'],
      recommendedConnectionTypes: ['async', 'stream'],
      validationRules: ['heavy-data-stream'],
      designNotes: 'Power cores provide energy/resources to processing components',
      commonPatterns: ['Resource allocation', 'Load distribution']
    });

    this.addCompatibilityRule({
      sourceType: 'power-core',
      targetType: 'module-ic',
      supportedProtocols: ['HTTP', 'gRPC'],
      recommendedConnectionTypes: ['sync', 'async'],
      validationRules: [],
      designNotes: 'Power cores initialize and configure modules',
      commonPatterns: ['Service startup', 'Configuration management']
    });

    // Gateway → External Systems
    this.addCompatibilityRule({
      sourceType: 'gateway',
      targetType: 'gateway',
      supportedProtocols: ['HTTP', 'gRPC', 'WebSocket', 'Database'],
      recommendedConnectionTypes: ['sync', 'async', 'stream'],
      validationRules: ['critical-reliability-protocol', 'security-protocol-alignment'],
      designNotes: 'Gateway-to-gateway connections represent external integrations',
      commonPatterns: ['API proxying', 'Data synchronization', 'Event forwarding']
    });

    // Decision Point → Multiple Targets (Branching Logic)
    this.addCompatibilityRule({
      sourceType: 'decision-point',
      targetType: 'task-resistor',
      supportedProtocols: ['MessageQueue', 'HTTP'],
      recommendedConnectionTypes: ['event', 'async'],
      validationRules: ['decision-point-outputs'],
      designNotes: 'Decision points route to processing components based on conditions',
      commonPatterns: ['Conditional processing', 'Workflow branching']
    });

    this.addCompatibilityRule({
      sourceType: 'decision-point',
      targetType: 'module-ic',
      supportedProtocols: ['MessageQueue', 'HTTP', 'gRPC'],
      recommendedConnectionTypes: ['event', 'async', 'sync'],
      validationRules: ['decision-point-outputs'],
      designNotes: 'Decision points can trigger different service modules',
      commonPatterns: ['Service orchestration', 'Business rule routing']
    });

    // Task Resistor → Module IC (Processing to Services)
    this.addCompatibilityRule({
      sourceType: 'task-resistor',
      targetType: 'module-ic',
      supportedProtocols: ['HTTP', 'gRPC', 'MessageQueue'],
      recommendedConnectionTypes: ['sync', 'async'],
      validationRules: ['sync-high-latency'],
      designNotes: 'Processing components calling service modules',
      commonPatterns: ['Data processing pipelines', 'Batch job execution']
    });

    // Module IC internal communication
    this.addCompatibilityRule({
      sourceType: 'module-ic',
      targetType: 'module-ic',
      supportedProtocols: ['HTTP', 'gRPC', 'MessageQueue'],
      recommendedConnectionTypes: ['sync', 'async'],
      validationRules: ['module-ic-internal', 'critical-reliability-protocol'],
      designNotes: 'Inter-service communication between modules',
      commonPatterns: ['Microservice communication', 'Service mesh connections']
    });
  }
}

/**
 * Validation utilities and helpers
 */
export class ValidationUtils {
  /**
   * Get severity color for UI display
   */
  static getSeverityColor(severity: 'error' | 'warning' | 'info'): string {
    const colors = {
      error: '#E74C3C',    // Red
      warning: '#F39C12',  // Orange
      info: '#3498DB'      // Blue
    };
    return colors[severity];
  }

  /**
   * Get severity icon for UI display
   */
  static getSeverityIcon(severity: 'error' | 'warning' | 'info'): string {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[severity];
  }

  /**
   * Format validation results for display
   */
  static formatValidationResults(results: ValidationResult[]): string {
    if (results.length === 0) {
      return 'Connection validation passed ✅';
    }

    const errors = results.filter(r => r.severity === 'error');
    const warnings = results.filter(r => r.severity === 'warning');
    const infos = results.filter(r => r.severity === 'info');

    const summary = [];
    if (errors.length > 0) summary.push(`${errors.length} error(s)`);
    if (warnings.length > 0) summary.push(`${warnings.length} warning(s)`);
    if (infos.length > 0) summary.push(`${infos.length} info(s)`);

    return `Connection validation: ${summary.join(', ')}`;
  }

  /**
   * Get the highest severity from validation results
   */
  static getHighestSeverity(results: ValidationResult[]): 'error' | 'warning' | 'info' | null {
    if (results.some(r => r.severity === 'error')) return 'error';
    if (results.some(r => r.severity === 'warning')) return 'warning';
    if (results.some(r => r.severity === 'info')) return 'info';
    return null;
  }

  /**
   * Check if connection has blocking validation issues
   */
  static hasBlockingIssues(results: ValidationResult[]): boolean {
    return results.some(r => r.severity === 'error');
  }
}

// Export singleton validator instance
export const connectionValidator = new ConnectionValidator();
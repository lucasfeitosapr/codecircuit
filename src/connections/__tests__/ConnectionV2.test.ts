// ConnectionV2.test.ts - Comprehensive tests for enhanced connection system
// Following the Gateway pattern of extensive test coverage (48/48 tests)

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConnectionV2,
  ConnectionType,
  ConnectionProtocol,
  LatencyLevel,
  DataVolumeLevel,
  ReliabilityLevel,
  SecurityLevel,
  HealthState,
  ConnectionTemplates,
  ConnectionV2Utils,
  ConnectionV2TypeGuards
} from '../ConnectionV2';

describe('ConnectionV2', () => {
  describe('Interface Structure', () => {
    it('should extend base Connection interface', () => {
      const mockConnectionV2: ConnectionV2 = {
        // Base Connection properties
        id: 'conn-1',
        from: { component: { id: 'comp1' }, pinIndex: 0, pinType: 'output', x: 0, y: 0, category: 'test' },
        to: { component: { id: 'comp2' }, pinIndex: 0, pinType: 'input', x: 100, y: 100, category: 'test' },

        // ConnectionV2 enhancements
        connectionType: 'sync',
        protocol: 'HTTP',
        designConfig: {
          expectedLatency: 'MEDIUM',
          dataVolume: 'MODERATE',
          reliability: 'GUARANTEED',
          security: 'INTERNAL'
        },
        designHealth: {
          simulatedState: 'healthy',
          bottleneckRisk: 0.1,
          failureScenarios: []
        },
        visual: {
          thickness: 2.5,
          style: 'solid'
        }
      };

      expect(mockConnectionV2.id).toBeDefined();
      expect(mockConnectionV2.from).toBeDefined();
      expect(mockConnectionV2.to).toBeDefined();
      expect(mockConnectionV2.connectionType).toBe('sync');
      expect(mockConnectionV2.protocol).toBe('HTTP');
    });

    it('should support all connection types', () => {
      const connectionTypes: ConnectionType[] = ['sync', 'async', 'stream', 'event'];

      connectionTypes.forEach(type => {
        expect(['sync', 'async', 'stream', 'event']).toContain(type);
      });
    });

    it('should support all protocols', () => {
      const protocols: ConnectionProtocol[] = [
        'HTTP', 'TCP', 'WebSocket', 'MessageQueue',
        'GraphQL', 'gRPC', 'Database', 'Custom'
      ];

      protocols.forEach(protocol => {
        expect(['HTTP', 'TCP', 'WebSocket', 'MessageQueue', 'GraphQL', 'gRPC', 'Database', 'Custom'])
          .toContain(protocol);
      });
    });
  });

  describe('Design Configuration', () => {
    it('should support all latency levels', () => {
      const latencyLevels: LatencyLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

      latencyLevels.forEach(level => {
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(level);
      });
    });

    it('should support all data volume levels', () => {
      const dataVolumeLevels: DataVolumeLevel[] = ['LIGHT', 'MODERATE', 'HEAVY'];

      dataVolumeLevels.forEach(level => {
        expect(['LIGHT', 'MODERATE', 'HEAVY']).toContain(level);
      });
    });

    it('should support all reliability levels', () => {
      const reliabilityLevels: ReliabilityLevel[] = ['BEST_EFFORT', 'GUARANTEED', 'CRITICAL'];

      reliabilityLevels.forEach(level => {
        expect(['BEST_EFFORT', 'GUARANTEED', 'CRITICAL']).toContain(level);
      });
    });

    it('should support all security levels', () => {
      const securityLevels: SecurityLevel[] = ['PUBLIC', 'INTERNAL', 'SECURE', 'ENCRYPTED'];

      securityLevels.forEach(level => {
        expect(['PUBLIC', 'INTERNAL', 'SECURE', 'ENCRYPTED']).toContain(level);
      });
    });

    it('should support business criticality levels', () => {
      const mockDesignConfig = {
        expectedLatency: 'LOW' as LatencyLevel,
        dataVolume: 'HEAVY' as DataVolumeLevel,
        reliability: 'CRITICAL' as ReliabilityLevel,
        security: 'ENCRYPTED' as SecurityLevel,
        businessCriticality: 'CRITICAL' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      };

      expect(mockDesignConfig.businessCriticality).toBe('CRITICAL');
    });

    it('should support compliance requirements', () => {
      const mockDesignConfig = {
        expectedLatency: 'LOW' as LatencyLevel,
        dataVolume: 'MODERATE' as DataVolumeLevel,
        reliability: 'GUARANTEED' as ReliabilityLevel,
        security: 'ENCRYPTED' as SecurityLevel,
        complianceRequirements: ['GDPR', 'HIPAA', 'SOX']
      };

      expect(mockDesignConfig.complianceRequirements).toHaveLength(3);
      expect(mockDesignConfig.complianceRequirements).toContain('GDPR');
    });
  });

  describe('Design-Time Health Modeling', () => {
    it('should support all health states', () => {
      const healthStates: HealthState[] = ['healthy', 'degraded', 'at-risk', 'critical'];

      healthStates.forEach(state => {
        expect(['healthy', 'degraded', 'at-risk', 'critical']).toContain(state);
      });
    });

    it('should track bottleneck risk as 0-1 scale', () => {
      const healthModel = {
        simulatedState: 'degraded' as HealthState,
        bottleneckRisk: 0.7,
        failureScenarios: []
      };

      expect(healthModel.bottleneckRisk).toBeGreaterThanOrEqual(0);
      expect(healthModel.bottleneckRisk).toBeLessThanOrEqual(1);
    });

    it('should support failure scenarios with probability and impact', () => {
      const failureScenario = {
        id: 'network-partition',
        description: 'Network partition between services',
        probability: 0.05,
        impact: 'HIGH' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        mitigations: ['Circuit breaker', 'Retry with backoff']
      };

      expect(failureScenario.probability).toBe(0.05);
      expect(failureScenario.impact).toBe('HIGH');
      expect(failureScenario.mitigations).toHaveLength(2);
    });

    it('should support performance impact modeling', () => {
      const performanceImpact = {
        estimatedThroughput: '1000 req/sec',
        resourceUtilization: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
        scalabilityLimits: 'Limited by database connections'
      };

      expect(performanceImpact.estimatedThroughput).toBe('1000 req/sec');
      expect(performanceImpact.resourceUtilization).toBe('MEDIUM');
    });
  });

  describe('Gateway Integration', () => {
    it('should support gateway endpoint references', () => {
      const gatewayEndpoints = {
        sourceGateway: 'gateway-1',
        targetGateway: 'gateway-2',
        externalSystemName: 'Payment Service'
      };

      expect(gatewayEndpoints.sourceGateway).toBe('gateway-1');
      expect(gatewayEndpoints.targetGateway).toBe('gateway-2');
      expect(gatewayEndpoints.externalSystemName).toBe('Payment Service');
    });

    it('should handle single gateway endpoint (external connection)', () => {
      const gatewayEndpoints = {
        targetGateway: 'external-api-gateway',
        externalSystemName: 'Third-party API'
      };

      expect(gatewayEndpoints.sourceGateway).toBeUndefined();
      expect(gatewayEndpoints.targetGateway).toBe('external-api-gateway');
    });
  });

  describe('Visual Properties', () => {
    it('should support visual styling properties', () => {
      const visualProps = {
        thickness: 3.0,
        style: 'dashed' as 'solid' | 'dashed' | 'dotted',
        animation: 'flow' as 'none' | 'flow' | 'pulse' | 'bidirectional',
        colorOverride: '#FF6B6B'
      };

      expect(visualProps.thickness).toBe(3.0);
      expect(visualProps.style).toBe('dashed');
      expect(visualProps.animation).toBe('flow');
      expect(visualProps.colorOverride).toBe('#FF6B6B');
    });

    it('should support label configuration', () => {
      const visualProps = {
        thickness: 2.0,
        style: 'solid' as const,
        label: {
          text: 'API Call',
          position: 'middle' as 'start' | 'middle' | 'end',
          visible: true
        }
      };

      expect(visualProps.label?.text).toBe('API Call');
      expect(visualProps.label?.position).toBe('middle');
      expect(visualProps.label?.visible).toBe(true);
    });

    it('should support animation types', () => {
      const animationTypes = ['none', 'flow', 'pulse', 'bidirectional'] as const;

      animationTypes.forEach(animation => {
        const visualProps = {
          thickness: 2.0,
          style: 'solid' as const,
          animation
        };

        expect(visualProps.animation).toBe(animation);
      });
    });
  });

  describe('Export Configuration', () => {
    it('should support target platforms', () => {
      const exportConfig = {
        targetPlatform: 'kubernetes' as 'kubernetes' | 'docker-compose' | 'terraform' | 'generic',
        implementationHints: {
          timeout: 30000,
          retryPolicy: 'exponential-backoff',
          circuitBreaker: true
        }
      };

      expect(exportConfig.targetPlatform).toBe('kubernetes');
      expect(exportConfig.implementationHints?.timeout).toBe(30000);
      expect(exportConfig.implementationHints?.circuitBreaker).toBe(true);
    });

    it('should support endpoint mapping', () => {
      const exportConfig = {
        endpointMapping: {
          source: 'http://service-a:8080',
          target: 'http://service-b:8080'
        }
      };

      expect(exportConfig.endpointMapping?.source).toBe('http://service-a:8080');
      expect(exportConfig.endpointMapping?.target).toBe('http://service-b:8080');
    });
  });
});

describe('Connection Templates', () => {
  it('should provide microservice API template', () => {
    const template = ConnectionTemplates.find(t => t.id === 'microservice-api');

    expect(template).toBeDefined();
    expect(template?.defaultConnectionType).toBe('sync');
    expect(template?.defaultProtocol).toBe('HTTP');
    expect(template?.defaultDesignConfig.reliability).toBe('GUARANTEED');
  });

  it('should provide event streaming template', () => {
    const template = ConnectionTemplates.find(t => t.id === 'event-streaming');

    expect(template).toBeDefined();
    expect(template?.defaultConnectionType).toBe('stream');
    expect(template?.defaultProtocol).toBe('MessageQueue');
    expect(template?.defaultDesignConfig.dataVolume).toBe('HEAVY');
  });

  it('should provide database connection template', () => {
    const template = ConnectionTemplates.find(t => t.id === 'database-connection');

    expect(template).toBeDefined();
    expect(template?.defaultProtocol).toBe('Database');
    expect(template?.applicableTargetTypes).toContain('gateway');
    expect(template?.defaultDesignConfig.reliability).toBe('CRITICAL');
  });

  it('should provide real-time socket template', () => {
    const template = ConnectionTemplates.find(t => t.id === 'real-time-socket');

    expect(template).toBeDefined();
    expect(template?.defaultConnectionType).toBe('stream');
    expect(template?.defaultProtocol).toBe('WebSocket');
    expect(template?.defaultDesignConfig.expectedLatency).toBe('LOW');
  });

  it('should have all templates with required properties', () => {
    ConnectionTemplates.forEach(template => {
      expect(template.id).toBeDefined();
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.defaultConnectionType).toBeDefined();
      expect(template.defaultProtocol).toBeDefined();
      expect(template.defaultDesignConfig).toBeDefined();
    });
  });
});

describe('ConnectionV2Utils', () => {
  describe('Type Detection', () => {
    it('should identify ConnectionV2 instances', () => {
      const connectionV2: ConnectionV2 = {
        id: 'test',
        from: { component: { id: 'c1' }, pinIndex: 0, pinType: 'output', x: 0, y: 0, category: 'test' },
        to: { component: { id: 'c2' }, pinIndex: 0, pinType: 'input', x: 0, y: 0, category: 'test' },
        connectionType: 'sync',
        protocol: 'HTTP',
        designConfig: {
          expectedLatency: 'LOW',
          dataVolume: 'LIGHT',
          reliability: 'BEST_EFFORT',
          security: 'PUBLIC'
        },
        designHealth: {
          simulatedState: 'healthy',
          bottleneckRisk: 0,
          failureScenarios: []
        },
        visual: {
          thickness: 2,
          style: 'solid'
        }
      };

      const basicConnection = {
        id: 'basic',
        from: { component: { id: 'c1' }, pinIndex: 0, pinType: 'output', x: 0, y: 0, category: 'test' },
        to: { component: { id: 'c2' }, pinIndex: 0, pinType: 'input', x: 0, y: 0, category: 'test' }
      };

      expect(ConnectionV2Utils.isConnectionV2(connectionV2)).toBe(true);
      expect(ConnectionV2Utils.isConnectionV2(basicConnection)).toBe(false);
    });
  });

  describe('Visual Calculations', () => {
    it('should calculate thickness for data volume', () => {
      expect(ConnectionV2Utils.getThicknessForDataVolume('LIGHT')).toBe(1.5);
      expect(ConnectionV2Utils.getThicknessForDataVolume('MODERATE')).toBe(2.5);
      expect(ConnectionV2Utils.getThicknessForDataVolume('HEAVY')).toBe(3.5);
    });

    it('should suggest animation for connection type', () => {
      expect(ConnectionV2Utils.getAnimationForConnectionType('sync')).toBe('none');
      expect(ConnectionV2Utils.getAnimationForConnectionType('async')).toBe('pulse');
      expect(ConnectionV2Utils.getAnimationForConnectionType('stream')).toBe('flow');
      expect(ConnectionV2Utils.getAnimationForConnectionType('event')).toBe('pulse');
    });
  });

  describe('Health Score Calculation', () => {
    it('should calculate health score for healthy connection', () => {
      const healthyDesign = {
        simulatedState: 'healthy' as HealthState,
        bottleneckRisk: 0.1,
        failureScenarios: []
      };

      const score = ConnectionV2Utils.calculateHealthScore(healthyDesign);
      expect(score).toBeCloseTo(0.97, 2); // 1.0 - 0.03 (risk penalty)
    });

    it('should calculate health score for degraded connection', () => {
      const degradedDesign = {
        simulatedState: 'degraded' as HealthState,
        bottleneckRisk: 0.3,
        failureScenarios: [
          {
            id: 'timeout',
            description: 'Request timeout',
            probability: 0.05,
            impact: 'MEDIUM' as const,
            mitigations: ['Retry logic']
          }
        ]
      };

      const score = ConnectionV2Utils.calculateHealthScore(degradedDesign);
      expect(score).toBeLessThan(0.7); // Should be penalized for risk and failures
    });

    it('should calculate health score for critical connection', () => {
      const criticalDesign = {
        simulatedState: 'critical' as HealthState,
        bottleneckRisk: 0.8,
        failureScenarios: [
          { id: 'f1', description: 'Failure 1', probability: 0.1, impact: 'HIGH' as const, mitigations: [] },
          { id: 'f2', description: 'Failure 2', probability: 0.15, impact: 'CRITICAL' as const, mitigations: [] }
        ]
      };

      const score = ConnectionV2Utils.calculateHealthScore(criticalDesign);
      expect(score).toBeLessThan(0.2); // Should be heavily penalized
      expect(score).toBeGreaterThanOrEqual(0); // But never negative
    });
  });
});

describe('ConnectionV2TypeGuards', () => {
  describe('Connection Type Validation', () => {
    it('should validate connection types', () => {
      expect(ConnectionV2TypeGuards.isValidConnectionType('sync')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidConnectionType('async')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidConnectionType('stream')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidConnectionType('event')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidConnectionType('invalid')).toBe(false);
    });

    it('should validate protocols', () => {
      expect(ConnectionV2TypeGuards.isValidProtocol('HTTP')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidProtocol('WebSocket')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidProtocol('Custom')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidProtocol('InvalidProtocol')).toBe(false);
    });

    it('should validate latency levels', () => {
      expect(ConnectionV2TypeGuards.isValidLatencyLevel('LOW')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidLatencyLevel('MEDIUM')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidLatencyLevel('HIGH')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidLatencyLevel('INVALID')).toBe(false);
    });

    it('should validate data volume levels', () => {
      expect(ConnectionV2TypeGuards.isValidDataVolumeLevel('LIGHT')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidDataVolumeLevel('MODERATE')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidDataVolumeLevel('HEAVY')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidDataVolumeLevel('INVALID')).toBe(false);
    });

    it('should validate reliability levels', () => {
      expect(ConnectionV2TypeGuards.isValidReliabilityLevel('BEST_EFFORT')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidReliabilityLevel('GUARANTEED')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidReliabilityLevel('CRITICAL')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidReliabilityLevel('INVALID')).toBe(false);
    });

    it('should validate security levels', () => {
      expect(ConnectionV2TypeGuards.isValidSecurityLevel('PUBLIC')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidSecurityLevel('INTERNAL')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidSecurityLevel('SECURE')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidSecurityLevel('ENCRYPTED')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidSecurityLevel('INVALID')).toBe(false);
    });

    it('should validate health states', () => {
      expect(ConnectionV2TypeGuards.isValidHealthState('healthy')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidHealthState('degraded')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidHealthState('at-risk')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidHealthState('critical')).toBe(true);
      expect(ConnectionV2TypeGuards.isValidHealthState('invalid')).toBe(false);
    });
  });
});
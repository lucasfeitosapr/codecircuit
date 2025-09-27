// gateway-datasheet.test.ts - Test Gateway configuration in datasheet

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GatewayComponent, createGateway } from './GatewayPluginV2';

// Mock DOM for datasheet testing
const mockDOM = () => {
  global.document = {
    getElementById: vi.fn(() => ({
      innerHTML: '',
      textContent: '',
      value: '',
      style: {},
      addEventListener: vi.fn(),
      disabled: false,
    })),
  } as any;

  global.confirm = vi.fn(() => true);
};

describe('Gateway Datasheet Configuration', () => {
  let gatewayComponent: GatewayComponent;

  beforeEach(() => {
    mockDOM();
    gatewayComponent = createGateway({
      x: 100,
      y: 200,
      externalSystem: 'User Database',
      connectionUrl: 'postgresql://localhost:5432/users',
      timeout: 8000,
    });
  });

  describe('Gateway Component Configuration', () => {
    it('should have all required Gateway properties', () => {
      expect(gatewayComponent.type).toBe('gateway');
      expect(gatewayComponent.externalSystem).toBe('User Database');
      expect(gatewayComponent.connectionUrl).toBe('postgresql://localhost:5432/users');
      expect(gatewayComponent.timeout).toBe(8000);
      expect(gatewayComponent.healthState).toBe('unknown');
      expect(gatewayComponent.retryCount).toBe(3);
    });

    it('should support different external system types', () => {
      const systemTypes = [
        'Database',
        'REST API',
        'GraphQL API',
        'File Storage',
        'Message Queue',
        'Cache',
        'External Service',
      ];

      systemTypes.forEach(systemType => {
        const gateway = createGateway({
          x: 0,
          y: 0,
          externalSystem: systemType,
        });

        expect(gateway.externalSystem).toBe(systemType);
        expect(gateway.title).toBe(systemType);
      });
    });

    it('should support different health states', () => {
      const healthStates = ['unknown', 'healthy', 'degraded', 'failed'];

      healthStates.forEach(state => {
        gatewayComponent.healthState = state as any;
        expect(gatewayComponent.healthState).toBe(state);
      });
    });

    it('should handle connection URL validation', () => {
      const validUrls = [
        'postgresql://localhost:5432/db',
        'https://api.example.com/v1',
        'mongodb://localhost:27017/app',
        's3://bucket-name/path',
        'redis://localhost:6379',
        'https://graphql.example.com/graphql',
      ];

      validUrls.forEach(url => {
        gatewayComponent.connectionUrl = url;
        expect(gatewayComponent.connectionUrl).toBe(url);
      });
    });

    it('should handle timeout configuration', () => {
      const timeouts = [1000, 5000, 10000, 30000];

      timeouts.forEach(timeout => {
        gatewayComponent.timeout = timeout;
        expect(gatewayComponent.timeout).toBe(timeout);
      });
    });
  });

  describe('Gateway Health State Management', () => {
    it('should track last health check timestamp', () => {
      const beforeCheck = Date.now();
      gatewayComponent.lastHealthCheck = Date.now();
      const afterCheck = Date.now();

      expect(gatewayComponent.lastHealthCheck).toBeGreaterThanOrEqual(beforeCheck);
      expect(gatewayComponent.lastHealthCheck).toBeLessThanOrEqual(afterCheck);
    });

    it('should support health state transitions', () => {
      // Unknown -> Healthy
      gatewayComponent.healthState = 'healthy';
      expect(gatewayComponent.healthState).toBe('healthy');

      // Healthy -> Degraded
      gatewayComponent.healthState = 'degraded';
      expect(gatewayComponent.healthState).toBe('degraded');

      // Degraded -> Failed
      gatewayComponent.healthState = 'failed';
      expect(gatewayComponent.healthState).toBe('failed');

      // Failed -> Healthy (recovery)
      gatewayComponent.healthState = 'healthy';
      expect(gatewayComponent.healthState).toBe('healthy');
    });
  });

  describe('Gateway Configuration Examples', () => {
    it('should create Database Gateway configuration', () => {
      const dbGateway = createGateway({
        x: 0,
        y: 0,
        externalSystem: 'Database',
        connectionUrl: 'postgresql://localhost:5432/production',
        timeout: 10000,
      });

      expect(dbGateway.externalSystem).toBe('Database');
      expect(dbGateway.connectionUrl).toBe('postgresql://localhost:5432/production');
      expect(dbGateway.timeout).toBe(10000);
    });

    it('should create REST API Gateway configuration', () => {
      const apiGateway = createGateway({
        x: 0,
        y: 0,
        externalSystem: 'REST API',
        connectionUrl: 'https://api.payment.com/v2',
        timeout: 5000,
      });

      expect(apiGateway.externalSystem).toBe('REST API');
      expect(apiGateway.connectionUrl).toBe('https://api.payment.com/v2');
      expect(apiGateway.timeout).toBe(5000);
    });

    it('should create File Storage Gateway configuration', () => {
      const storageGateway = createGateway({
        x: 0,
        y: 0,
        externalSystem: 'File Storage',
        connectionUrl: 's3://production-bucket/uploads',
        timeout: 15000,
      });

      expect(storageGateway.externalSystem).toBe('File Storage');
      expect(storageGateway.connectionUrl).toBe('s3://production-bucket/uploads');
      expect(storageGateway.timeout).toBe(15000);
    });
  });

  describe('Gateway Integration Scenarios', () => {
    it('should support typical microservice architecture', () => {
      // User Authentication Flow
      const userDB = createGateway({
        x: 100,
        y: 100,
        externalSystem: 'Database',
        connectionUrl: 'postgresql://localhost:5432/users',
      });

      const authAPI = createGateway({
        x: 300,
        y: 100,
        externalSystem: 'REST API',
        connectionUrl: 'https://auth.service.com/v1',
      });

      const sessionCache = createGateway({
        x: 500,
        y: 100,
        externalSystem: 'Cache',
        connectionUrl: 'redis://localhost:6379',
      });

      // All should have correct configuration
      expect(userDB.externalSystem).toBe('Database');
      expect(authAPI.externalSystem).toBe('REST API');
      expect(sessionCache.externalSystem).toBe('Cache');

      // All should be Gateway components
      [userDB, authAPI, sessionCache].forEach(gateway => {
        expect(gateway.type).toBe('gateway');
        expect(gateway.healthState).toBe('unknown');
        expect(gateway.pins.input).toHaveLength(1);
        expect(gateway.pins.output).toHaveLength(1);
      });
    });
  });
});

// gateway-integration.test.ts - Integration test for Gateway plugin in the full system

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventBus } from '../../events/EventBus';
import { createComponentRegistry } from '../ComponentRegistry';
import { GatewayPluginV2, GatewayComponent } from './GatewayPluginV2';
import { Events } from '../../events/eventTypes';

describe('Gateway Plugin Integration', () => {
  let registry: any;
  let gatewayPlugin: GatewayPluginV2;

  beforeEach(() => {
    // Create fresh registry
    registry = createComponentRegistry(eventBus);
    gatewayPlugin = new GatewayPluginV2();
  });

  describe('Plugin Registration', () => {
    it('should register Gateway plugin and emit coordination events', () => {
      const eventSpy = vi.fn();
      eventBus.on(Events.PLUGIN_REGISTERED, eventSpy);

      registry.register(gatewayPlugin);

      expect(eventSpy).toHaveBeenCalledWith({
        pluginType: 'gateway',
        metadata: expect.objectContaining({
          displayName: 'Gateway ⬟',
          icon: '⬟',
          color: '#9B59B6',
          category: 'integration',
        }),
        timestamp: expect.any(Number),
      });
    });

    it('should make Gateway available via registry', () => {
      registry.register(gatewayPlugin);

      const registeredPlugin = registry.get('gateway');
      expect(registeredPlugin).toBeDefined();
      expect(registeredPlugin?.type).toBe('gateway');
      expect(registeredPlugin?.metadata.displayName).toBe('Gateway ⬟');
    });

    it('should include Gateway in plugin types list', () => {
      registry.register(gatewayPlugin);

      const pluginTypes = registry.getPluginTypes();
      expect(pluginTypes).toContain('gateway');
    });
  });

  describe('Component Creation via Registry', () => {
    beforeEach(() => {
      registry.register(gatewayPlugin);
    });

    it('should create Gateway component via registry', () => {
      const config = {
        x: 100,
        y: 200,
        externalSystem: 'User Database',
        connectionUrl: 'postgresql://localhost:5432/users',
      };

      const component = registry.createComponent('gateway', config);

      expect(component).toBeDefined();
      expect(component.type).toBe('gateway');
      expect((component as GatewayComponent).externalSystem).toBe('User Database');
      expect((component as GatewayComponent).healthState).toBe('unknown');
    });

    it('should create different types of Gateway components', () => {
      const dbGateway = registry.createComponent('gateway', {
        x: 100,
        y: 100,
        externalSystem: 'Database',
        connectionUrl: 'postgresql://localhost:5432/db',
      });

      const apiGateway = registry.createComponent('gateway', {
        x: 200,
        y: 100,
        externalSystem: 'REST API',
        connectionUrl: 'https://api.example.com',
      });

      const fileGateway = registry.createComponent('gateway', {
        x: 300,
        y: 100,
        externalSystem: 'File Storage',
        connectionUrl: 's3://bucket/files',
      });

      expect((dbGateway as GatewayComponent).externalSystem).toBe('Database');
      expect((apiGateway as GatewayComponent).externalSystem).toBe('REST API');
      expect((fileGateway as GatewayComponent).externalSystem).toBe('File Storage');

      // All should have the same type and proper health state
      [dbGateway, apiGateway, fileGateway].forEach(gateway => {
        expect(gateway.type).toBe('gateway');
        expect((gateway as GatewayComponent).healthState).toBe('unknown');
        expect((gateway as GatewayComponent).color).toBe('#9B59B6');
      });
    });
  });

  describe('Health State Events', () => {
    let gateway: GatewayComponent;

    beforeEach(() => {
      registry.register(gatewayPlugin);
      gateway = registry.createComponent('gateway', {
        x: 0,
        y: 0,
        externalSystem: 'Test System',
      }) as GatewayComponent;
    });

    it('should emit health state change events', () => {
      const healthEventSpy = vi.fn();
      eventBus.on('gateway:health_changed', healthEventSpy);

      gatewayPlugin.evaluateComponent(gateway, (event: string, payload: any) => {
        eventBus.emit(event, payload);
      });

      expect(healthEventSpy).toHaveBeenCalledWith({
        componentId: gateway.id,
        healthState: expect.stringMatching(/^(healthy|degraded|failed)$/),
        timestamp: expect.any(Number),
      });
    });

    it('should update component health state', () => {
      const originalState = gateway.healthState;

      gatewayPlugin.evaluateComponent(gateway);

      expect(gateway.healthState).toMatch(/^(healthy|degraded|failed)$/);
      expect(gateway.lastHealthCheck).toBeDefined();
    });
  });

  describe('Serialization Integration', () => {
    let gateway: GatewayComponent;

    beforeEach(() => {
      registry.register(gatewayPlugin);
      gateway = registry.createComponent('gateway', {
        x: 150,
        y: 250,
        externalSystem: 'Payment API',
        connectionUrl: 'https://api.stripe.com',
        timeout: 8000,
      }) as GatewayComponent;

      // Set some runtime state
      gateway.healthState = 'healthy';
      gateway.lastHealthCheck = Date.now();
    });

    it('should serialize and deserialize Gateway components', () => {
      const serialized = gatewayPlugin.serialize(gateway);
      const deserialized = gatewayPlugin.deserialize(serialized);

      expect(deserialized).toMatchObject({
        id: gateway.id,
        type: 'gateway',
        x: 150,
        y: 250,
        externalSystem: 'Payment API',
        connectionUrl: 'https://api.stripe.com',
        timeout: 8000,
        healthState: 'healthy',
        lastHealthCheck: gateway.lastHealthCheck,
      });
    });
  });

  describe('Multi-Plugin Integration', () => {
    it('should work alongside other plugins', async () => {
      // Import other plugins for integration test
      const { DecisionPointPluginV2 } = await import('./DecisionPointPluginV2');
      const { TaskResistorPluginV2 } = await import('./TaskResistorPluginV2');

      const decisionPlugin = new DecisionPointPluginV2();
      const taskPlugin = new TaskResistorPluginV2();

      // Register all plugins
      registry.register(gatewayPlugin);
      registry.register(decisionPlugin);
      registry.register(taskPlugin);

      // Should have all plugin types
      const pluginTypes = registry.getPluginTypes();
      expect(pluginTypes).toContain('gateway');
      expect(pluginTypes).toContain('decision-point');
      expect(pluginTypes).toContain('task-resistor');

      // Should be able to create components of all types
      const gateway = registry.createComponent('gateway', { x: 0, y: 0 });
      const decision = registry.createComponent('decision-point', { x: 100, y: 0 });
      const task = registry.createComponent('task-resistor', { x: 200, y: 0 });

      expect(gateway.type).toBe('gateway');
      expect(decision.type).toBe('decision-point');
      expect(task.type).toBe('task-resistor');
    });
  });

  describe('Pin Configuration', () => {
    let gateway: GatewayComponent;

    beforeEach(() => {
      registry.register(gatewayPlugin);
      gateway = registry.createComponent('gateway', { x: 0, y: 0 }) as GatewayComponent;
    });

    it('should have correct pin configuration for connections', () => {
      expect(gateway.pins.input).toHaveLength(1);
      expect(gateway.pins.output).toHaveLength(1);

      expect(gateway.pins.input?.[0]).toMatchObject({
        x: 15,
        y: 30,
        type: 'input',
        label: 'request',
      });

      expect(gateway.pins.output?.[0]).toMatchObject({
        x: 45,
        y: 30,
        type: 'output',
        label: 'response',
      });
    });
  });
});

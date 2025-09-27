import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionManager } from './ConnectionManager';
import { EventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import { ComponentBase, PinHit, Connection } from '../types.d';

describe('ConnectionManager', () => {
  let connectionManager: ConnectionManager;
  let eventBus: EventBus;
  let mockCategories: Record<string, { name: string; color: string }>;
  let mockComponents: ComponentBase[];

  beforeEach(() => {
    eventBus = new EventBus();
    mockCategories = {
      frontend: { name: 'Frontend', color: '#00ff88' },
      backend: { name: 'Backend', color: '#4488ff' },
      database: { name: 'Database', color: '#ffaa00' },
    };

    connectionManager = new ConnectionManager(eventBus, mockCategories);

    // Create mock components for testing
    mockComponents = [
      {
        id: 'comp1',
        type: 'power-core',
        x: 100,
        y: 100,
        width: 80,
        height: 40,
        pins: {
          input: [],
          output: [{ x: 80, y: 20, type: 'energy' }],
        },
        name: 'Power Core',
        status: 'done',
        category: 'backend',
        createdAt: new Date(),
      } as ComponentBase,
      {
        id: 'comp2',
        type: 'module-ic',
        x: 200,
        y: 150,
        width: 100,
        height: 60,
        pins: {
          input: [{ x: 0, y: 30, type: 'energy' }],
          output: [{ x: 100, y: 30, type: 'energy' }],
        },
        name: 'Module IC',
        status: 'in-progress',
        category: 'frontend',
        createdAt: new Date(),
      } as ComponentBase,
    ];
  });

  describe('Construction and Setup', () => {
    it('should initialize with empty state', () => {
      expect(connectionManager.getAllConnections()).toHaveLength(0);

      const state = connectionManager.getConnectionState();
      expect(state.isConnecting).toBe(false);
      expect(state.connectionStart).toBeNull();
    });

    it('should setup event handlers', () => {
      const eventSpy = vi.spyOn(eventBus, 'on');
      new ConnectionManager(eventBus, mockCategories);

      expect(eventSpy).toHaveBeenCalledWith(
        Events.CONNECTION_START_REQUESTED,
        expect.any(Function)
      );
      expect(eventSpy).toHaveBeenCalledWith(Events.CONNECTION_END_REQUESTED, expect.any(Function));
      expect(eventSpy).toHaveBeenCalledWith(
        Events.CONNECTION_CANCEL_REQUESTED,
        expect.any(Function)
      );
      expect(eventSpy).toHaveBeenCalledWith(Events.ComponentUpdated, expect.any(Function));
      expect(eventSpy).toHaveBeenCalledWith(Events.ComponentDeleted, expect.any(Function));
    });
  });

  describe('Pin Detection', () => {
    it('should detect pin at coordinates', () => {
      // Test output pin detection
      const outputPin = connectionManager.getPinAt(180, 120, mockComponents); // comp1 output pin
      expect(outputPin).not.toBeNull();
      expect(outputPin?.component.id).toBe('comp1');
      expect(outputPin?.pinType).toBe('energy'); // Now uses actual pin type from component
      expect(outputPin?.pinIndex).toBe(0);
      expect(outputPin?.category).toBe('backend');
    });

    it('should detect input pin at coordinates', () => {
      // Test input pin detection
      const inputPin = connectionManager.getPinAt(200, 180, mockComponents); // comp2 input pin
      expect(inputPin).not.toBeNull();
      expect(inputPin?.component.id).toBe('comp2');
      expect(inputPin?.pinType).toBe('energy'); // Now uses actual pin type from component
      expect(inputPin?.pinIndex).toBe(0);
      expect(inputPin?.category).toBe('frontend');
    });

    it('should return null when no pin at coordinates', () => {
      const noPin = connectionManager.getPinAt(50, 50, mockComponents);
      expect(noPin).toBeNull();
    });

    it('should emit pin interaction events', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');

      connectionManager.getPinAt(180, 120, mockComponents);

      expect(eventSpy).toHaveBeenCalledWith(
        'pin.interaction',
        expect.objectContaining({
          action: 'hover',
          timestamp: expect.any(Number),
        })
      );
    });

    it('should respect pin hit radius', () => {
      // Just outside hit radius (8px)
      const noPin = connectionManager.getPinAt(180 + 10, 120, mockComponents);
      expect(noPin).toBeNull();

      // Just inside hit radius
      const pin = connectionManager.getPinAt(180 + 7, 120, mockComponents);
      expect(pin).not.toBeNull();
    });
  });

  describe('Connection Creation', () => {
    let outputPin: PinHit;
    let inputPin: PinHit;

    beforeEach(() => {
      outputPin = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'backend',
      };

      inputPin = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'frontend',
      };
    });

    it('should create valid connection', () => {
      const connection = connectionManager.createConnection(outputPin, inputPin);

      expect(connection).not.toBeNull();
      expect(connection?.from.component.id).toBe('comp1');
      expect(connection?.to.component.id).toBe('comp2');
      expect(connection?.category).toBe('backend'); // Inherits from output pin
      expect(connection?.id).toBeDefined();
      expect(connection?.createdAt).toBeInstanceOf(Date);
    });

    it('should handle output-to-input pin ordering', () => {
      // Create connection starting from input pin
      const connection = connectionManager.createConnection(inputPin, outputPin);

      expect(connection).not.toBeNull();
      expect(connection?.from.pinType).toBe('output');
      expect(connection?.to.pinType).toBe('input');
    });

    it('should prevent same component connections', () => {
      const sameCompPin: PinHit = {
        component: mockComponents[0],
        pinType: 'input',
        pinIndex: 0,
        x: 100,
        y: 120,
        category: 'backend',
      };

      const connection = connectionManager.createConnection(outputPin, sameCompPin);
      expect(connection).toBeNull();
    });

    it('should prevent same pin type connections', () => {
      const anotherOutputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'output',
        pinIndex: 0,
        x: 300,
        y: 180,
        category: 'frontend',
      };

      const connection = connectionManager.createConnection(outputPin, anotherOutputPin);
      expect(connection).toBeNull();
    });

    it('should prevent duplicate connections', () => {
      // Create first connection
      const connection1 = connectionManager.createConnection(outputPin, inputPin);
      expect(connection1).not.toBeNull();

      // Try to create duplicate
      const connection2 = connectionManager.createConnection(outputPin, inputPin);
      expect(connection2).toBeNull();
    });

    it('should add connection to internal list', () => {
      const initialCount = connectionManager.getAllConnections().length;

      connectionManager.createConnection(outputPin, inputPin);

      expect(connectionManager.getAllConnections()).toHaveLength(initialCount + 1);
    });
  });

  describe('Connection Validation', () => {
    let outputPin: PinHit;
    let inputPin: PinHit;

    beforeEach(() => {
      outputPin = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'backend',
      };

      inputPin = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'frontend',
      };
    });

    it('should validate good connection', () => {
      const validation = connectionManager.validateConnection(outputPin, inputPin);

      expect(validation.isValid).toBe(true);
      expect(validation.reason).toBeUndefined();
      expect(validation.startPin).toBe(outputPin);
      expect(validation.endPin).toBe(inputPin);
      expect(validation.timestamp).toBeDefined();
    });

    it('should reject same component connection', () => {
      const sameCompPin: PinHit = { ...inputPin, component: mockComponents[0] };
      const validation = connectionManager.validateConnection(outputPin, sameCompPin);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Cannot connect to the same component');
    });

    it('should reject same pin type connection', () => {
      const anotherOutputPin: PinHit = { ...outputPin, component: mockComponents[1] };
      const validation = connectionManager.validateConnection(outputPin, anotherOutputPin);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Can only connect output pins to input pins'); // Updated message
    });

    it('should reject duplicate connection', () => {
      // Create existing connection
      connectionManager.createConnection(outputPin, inputPin);

      const validation = connectionManager.validateConnection(outputPin, inputPin);

      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Connection already exists');
    });
  });

  describe('Connection State Management', () => {
    let outputPin: PinHit;

    beforeEach(() => {
      outputPin = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'backend',
      };
    });

    it('should start connection', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');

      connectionManager.startConnection(outputPin);

      const state = connectionManager.getConnectionState();
      expect(state.isConnecting).toBe(true);
      expect(state.connectionStart).toBe(outputPin);

      expect(eventSpy).toHaveBeenCalledWith(
        'pin.interaction',
        expect.objectContaining({
          pin: outputPin,
          action: 'connect',
        })
      );
      expect(eventSpy).toHaveBeenCalledWith(
        'connection.start',
        expect.objectContaining({
          pin: outputPin,
        })
      );
    });

    it('should end connection successfully', () => {
      const inputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'frontend',
      };

      const eventSpy = vi.spyOn(eventBus, 'emit');

      connectionManager.startConnection(outputPin);
      const result = connectionManager.endConnection(inputPin);

      expect(result).toBe(true);

      const state = connectionManager.getConnectionState();
      expect(state.isConnecting).toBe(false);
      expect(state.connectionStart).toBeNull();

      expect(eventSpy).toHaveBeenCalledWith(
        Events.ConnectionCreated,
        expect.objectContaining({
          from: outputPin,
          to: inputPin,
          category: 'backend',
        })
      );
    });

    it('should end connection with validation failure', () => {
      const sameCompPin: PinHit = {
        component: mockComponents[0], // Same component
        pinType: 'input',
        pinIndex: 0,
        x: 100,
        y: 120,
        category: 'backend',
      };

      const eventSpy = vi.spyOn(eventBus, 'emit');

      connectionManager.startConnection(outputPin);
      const result = connectionManager.endConnection(sameCompPin);

      expect(result).toBe(false);

      expect(eventSpy).toHaveBeenCalledWith(
        'connection.validation',
        expect.objectContaining({
          isValid: false,
          reason: 'Cannot connect to the same component',
        })
      );

      expect(eventSpy).toHaveBeenCalledWith('connection.cancelled', expect.any(Object));
    });

    it('should cancel connection', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');

      connectionManager.startConnection(outputPin);
      connectionManager.cancelConnection();

      const state = connectionManager.getConnectionState();
      expect(state.isConnecting).toBe(false);
      expect(state.connectionStart).toBeNull();

      expect(eventSpy).toHaveBeenCalledWith(
        'connection.cancelled',
        expect.objectContaining({
          startPin: outputPin,
        })
      );
    });

    it('should handle end connection when not connecting', () => {
      const inputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'frontend',
      };

      const result = connectionManager.endConnection(inputPin);
      expect(result).toBe(false);
    });
  });

  describe('Connection Management', () => {
    let connection: Connection;

    beforeEach(() => {
      const outputPin: PinHit = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'backend',
      };

      const inputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'frontend',
      };

      connection = connectionManager.createConnection(outputPin, inputPin)!;
    });

    it('should find existing connection', () => {
      const found = connectionManager.findConnection(connection.from, connection.to);
      expect(found).toBe(connection);
    });

    it('should get connections for component', () => {
      const connections = connectionManager.getConnectionsForComponent('comp1');
      expect(connections).toHaveLength(1);
      expect(connections[0]).toBe(connection);

      const connections2 = connectionManager.getConnectionsForComponent('comp2');
      expect(connections2).toHaveLength(1);
      expect(connections2[0]).toBe(connection);
    });

    it('should remove connection by ID', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');

      const result = connectionManager.removeConnection(connection.id);

      expect(result).toBe(true);
      expect(connectionManager.getAllConnections()).toHaveLength(0);

      expect(eventSpy).toHaveBeenCalledWith(
        'connection.deleted',
        expect.objectContaining({
          connectionId: connection.id,
          connection: connection,
        })
      );
    });

    it('should handle remove non-existent connection', () => {
      const result = connectionManager.removeConnection('nonexistent');
      expect(result).toBe(false);
    });

    it('should clear all connections', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');

      connectionManager.clearAllConnections();

      expect(connectionManager.getAllConnections()).toHaveLength(0);

      const state = connectionManager.getConnectionState();
      expect(state.isConnecting).toBe(false);
      expect(state.connectionStart).toBeNull();

      expect(eventSpy).toHaveBeenCalledWith(
        'connections.cleared',
        expect.objectContaining({
          clearedCount: 1,
        })
      );
    });

    it('should set connections for import/restore', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');
      const newConnections = [connection, { ...connection, id: 'conn2' }];

      connectionManager.setConnections(newConnections);

      expect(connectionManager.getAllConnections()).toHaveLength(2);

      expect(eventSpy).toHaveBeenCalledWith(
        'connections.restored',
        expect.objectContaining({
          connectionCount: 2,
        })
      );
    });
  });

  describe('Component Lifecycle Events', () => {
    let connection: Connection;

    beforeEach(() => {
      const outputPin: PinHit = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'backend',
      };

      const inputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'frontend',
      };

      connection = connectionManager.createConnection(outputPin, inputPin)!;
    });

    it('should handle component update', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');

      // Simulate component update event
      eventBus.emit(Events.ComponentUpdated, { id: 'comp1', changes: { status: 'done' } });

      expect(eventSpy).toHaveBeenCalledWith(
        'connections.component_updated',
        expect.objectContaining({
          componentId: 'comp1',
          affectedConnections: [connection.id],
        })
      );
    });

    it('should handle component deletion', () => {
      const eventSpy = vi.spyOn(eventBus, 'emit');

      // Simulate component deletion event
      eventBus.emit(Events.ComponentDeleted, { id: 'comp1' });

      expect(connectionManager.getAllConnections()).toHaveLength(0);

      expect(eventSpy).toHaveBeenCalledWith(
        'connections.cleanup',
        expect.objectContaining({
          componentId: 'comp1',
          removedConnectionIds: [connection.id],
        })
      );
    });
  });

  describe('Rendering State', () => {
    let connection: Connection;

    beforeEach(() => {
      const outputPin: PinHit = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'backend',
      };

      const inputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'frontend',
      };

      connection = connectionManager.createConnection(outputPin, inputPin)!;
    });

    it('should get connection render state', () => {
      const state = connectionManager.getConnectionRenderState(connection);

      expect(state.fromStatus).toBe('done'); // comp1 status
      expect(state.toStatus).toBe('in-progress'); // comp2 status
      expect(state.isActive).toBe(true); // fromStatus is 'done'
      expect(state.isPowered).toBe(true); // fromStatus is 'done'
      expect(state.categoryColor).toBe('#4488ff'); // backend category color
    });

    it('should detect intention traces for defined components', () => {
      // Set both components to 'defined'
      mockComponents[0].status = 'defined';
      mockComponents[1].status = 'defined';

      const shouldShowIntention = connectionManager.shouldRenderAsIntention(connection);
      expect(shouldShowIntention).toBe(true);
    });

    it('should detect intention traces for defined but inactive source', () => {
      // Set source to 'defined' (inactive)
      mockComponents[0].status = 'defined';
      mockComponents[1].status = 'todo';

      const shouldShowIntention = connectionManager.shouldRenderAsIntention(connection);
      expect(shouldShowIntention).toBe(true);
    });

    it('should not show intention for active connections', () => {
      // Keep default statuses (done, in-progress)
      const shouldShowIntention = connectionManager.shouldRenderAsIntention(connection);
      expect(shouldShowIntention).toBe(false);
    });
  });

  describe('View Management', () => {
    let mockView: any;
    let connection: Connection;

    beforeEach(() => {
      mockView = {
        type: 'main',
        components: mockComponents,
        connections: [],
      };

      const outputPin: PinHit = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'backend',
      };

      const inputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'frontend',
      };

      connection = connectionManager.createConnection(outputPin, inputPin)!;
    });

    it('should get connections for view', () => {
      const connections = connectionManager.getConnectionsForView(mockView);
      expect(connections).toBe(mockView.connections);
    });

    it('should set connections for view', () => {
      const newConnections = [connection];
      connectionManager.setConnectionsForView(mockView, newConnections);
      expect(mockView.connections).toBe(newConnections);
    });

    it('should add connection to main view', () => {
      const globalConnections: Connection[] = [];

      connectionManager.addConnectionToView(connection, mockView, globalConnections);

      expect(mockView.connections).toContain(connection);
      expect(globalConnections).toContain(connection);
    });

    it('should add connection to schematic view', () => {
      const schematicView = {
        type: 'schematic',
        component: {
          id: 'module1',
          internalConnections: [],
        } as any,
        camera: { x: 0, y: 0, zoom: 1 },
        components: mockComponents,
        connections: [],
      };

      connectionManager.addConnectionToView(connection, schematicView);

      expect(schematicView.connections).toContain(connection);
      expect(schematicView.component.internalConnections).toContain(connection);
    });
  });

  describe('Category Management', () => {
    it('should update categories', () => {
      const newCategories = {
        testing: { name: 'Testing', color: '#88ff00' },
        security: { name: 'Security', color: '#ff0088' },
      };

      connectionManager.updateCategories(newCategories);

      // Create connection to test new categories
      const outputPin: PinHit = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'testing',
      };

      const inputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'security',
      };

      const connection = connectionManager.createConnection(outputPin, inputPin);
      const state = connectionManager.getConnectionRenderState(connection!);

      expect(state.categoryColor).toBe('#88ff00'); // testing category color
    });

    it('should handle unknown categories gracefully', () => {
      const outputPin: PinHit = {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 180,
        y: 120,
        category: 'unknown',
      };

      const inputPin: PinHit = {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 200,
        y: 180,
        category: 'unknown',
      };

      const connection = connectionManager.createConnection(outputPin, inputPin);
      const state = connectionManager.getConnectionRenderState(connection!);

      expect(state.categoryColor).toBe('#00ff88'); // Default fallback color
    });
  });
});

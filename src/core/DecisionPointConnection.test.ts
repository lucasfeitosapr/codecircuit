// DecisionPointConnection.test.ts - Test Decision Point connections with other component types
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionManager } from './ConnectionManager';
import { EventBus } from '../events/EventBus';
import { ComponentBase, PinHit } from '../types';

describe('Decision Point Connections', () => {
  let connectionManager: ConnectionManager;
  let eventBus: EventBus;
  let decisionPoint: ComponentBase;
  let powerCore: ComponentBase;
  let moduleIC: ComponentBase;
  let taskResistor: ComponentBase;
  let allComponents: ComponentBase[];

  beforeEach(() => {
    eventBus = new EventBus();
    const mockCategories = {
      'flow-control': { name: 'Flow Control', color: '#4ECDC4' },
      'backend': { name: 'Backend', color: '#66cc66' },
      'frontend': { name: 'Frontend', color: '#cc6666' }
    };
    connectionManager = new ConnectionManager(eventBus, mockCategories);

    // Create Decision Point component with custom pin types
    decisionPoint = {
      id: 'decision-1',
      type: 'decision-point',
      x: 100,
      y: 100,
      width: 60,
      height: 60,
      pins: {
        input: [{ x: 30, y: 0, type: 'input', label: 'condition' }],
        output: [
          { x: 60, y: 30, type: 'success', label: 'TRUE' },
          { x: 0, y: 30, type: 'failure', label: 'FALSE' }
        ]
      },
      name: 'Decision Point',
      status: 'defined',
      category: 'flow-control',
      createdAt: new Date()
    } as ComponentBase;

    // Create PowerCore component
    powerCore = {
      id: 'power-1',
      type: 'power-core',
      x: 50,
      y: 200,
      width: 80,
      height: 40,
      pins: {
        input: [],
        output: [{ x: 80, y: 20, type: 'energy', label: 'energy' }]
      },
      name: 'Power Core',
      status: 'done',
      category: 'backend',
      createdAt: new Date()
    } as ComponentBase;

    // Create ModuleIC component
    moduleIC = {
      id: 'module-1',
      type: 'module-ic',
      x: 200,
      y: 200,
      width: 100,
      height: 60,
      pins: {
        input: [{ x: 0, y: 30, type: 'energy', label: 'power' }],
        output: [{ x: 100, y: 30, type: 'data', label: 'output' }]
      },
      name: 'Module IC',
      status: 'in-progress',
      category: 'frontend',
      createdAt: new Date()
    } as ComponentBase;

    // Create TaskResistor component
    taskResistor = {
      id: 'task-1',
      type: 'task-resistor',
      x: 300,
      y: 200,
      width: 60,
      height: 30,
      pins: {
        input: [{ x: 0, y: 15, type: 'input', label: 'input' }],
        output: [{ x: 60, y: 15, type: 'output', label: 'output' }]
      },
      name: 'Task Resistor',
      status: 'todo',
      category: 'frontend',
      createdAt: new Date()
    } as ComponentBase;

    allComponents = [decisionPoint, powerCore, moduleIC, taskResistor];
  });

  describe('Pin Detection for Decision Point', () => {
    it('should detect Decision Point input pin with correct type', () => {
      const inputPin = connectionManager.getPinAt(130, 100, allComponents); // decision input pin
      expect(inputPin).not.toBeNull();
      expect(inputPin?.component.id).toBe('decision-1');
      expect(inputPin?.pinType).toBe('input');
      expect(inputPin?.pinIndex).toBe(0);
    });

    it('should detect Decision Point success pin with correct type', () => {
      const successPin = connectionManager.getPinAt(160, 130, allComponents); // decision success pin
      expect(successPin).not.toBeNull();
      expect(successPin?.component.id).toBe('decision-1');
      expect(successPin?.pinType).toBe('success');
      expect(successPin?.pinIndex).toBe(0);
    });

    it('should detect Decision Point failure pin with correct type', () => {
      const failurePin = connectionManager.getPinAt(100, 130, allComponents); // decision failure pin
      expect(failurePin).not.toBeNull();
      expect(failurePin?.component.id).toBe('decision-1');
      expect(failurePin?.pinType).toBe('failure');
      expect(failurePin?.pinIndex).toBe(1);
    });
  });

  describe('Decision Point Input Connections', () => {
    it('should allow PowerCore energy output to connect to Decision Point input', () => {
      const powerOutput = connectionManager.getPinAt(130, 220, allComponents); // power output
      const decisionInput = connectionManager.getPinAt(130, 100, allComponents); // decision input

      expect(powerOutput).not.toBeNull();
      expect(decisionInput).not.toBeNull();

      const validation = connectionManager.validateConnection(powerOutput!, decisionInput!);
      expect(validation.isValid).toBe(true);

      const connection = connectionManager.createConnection(powerOutput!, decisionInput!);
      expect(connection).not.toBeNull();
      expect(connection?.from.component.id).toBe('power-1');
      expect(connection?.to.component.id).toBe('decision-1');
    });

    it('should allow ModuleIC data output to connect to Decision Point input', () => {
      const moduleOutput = connectionManager.getPinAt(300, 230, allComponents); // module output
      const decisionInput = connectionManager.getPinAt(130, 100, allComponents); // decision input

      expect(moduleOutput).not.toBeNull();
      expect(decisionInput).not.toBeNull();

      const validation = connectionManager.validateConnection(moduleOutput!, decisionInput!);
      expect(validation.isValid).toBe(true);

      const connection = connectionManager.createConnection(moduleOutput!, decisionInput!);
      expect(connection).not.toBeNull();
      expect(connection?.from.component.id).toBe('module-1');
      expect(connection?.to.component.id).toBe('decision-1');
    });

    it('should allow TaskResistor output to connect to Decision Point input', () => {
      const taskOutput = connectionManager.getPinAt(360, 215, allComponents); // task output
      const decisionInput = connectionManager.getPinAt(130, 100, allComponents); // decision input

      expect(taskOutput).not.toBeNull();
      expect(decisionInput).not.toBeNull();

      const validation = connectionManager.validateConnection(taskOutput!, decisionInput!);
      expect(validation.isValid).toBe(true);

      const connection = connectionManager.createConnection(taskOutput!, decisionInput!);
      expect(connection).not.toBeNull();
      expect(connection?.from.component.id).toBe('task-1');
      expect(connection?.to.component.id).toBe('decision-1');
    });
  });

  describe('Decision Point Output Connections', () => {
    it('should allow Decision Point success output to connect to ModuleIC input', () => {
      const decisionSuccess = connectionManager.getPinAt(160, 130, allComponents); // decision success
      const moduleInput = connectionManager.getPinAt(200, 230, allComponents); // module input

      expect(decisionSuccess).not.toBeNull();
      expect(moduleInput).not.toBeNull();

      console.log('Decision Success Pin:', {
        id: decisionSuccess?.component.id,
        type: decisionSuccess?.pinType,
        coords: { x: decisionSuccess?.x, y: decisionSuccess?.y }
      });
      console.log('Module Input Pin:', {
        id: moduleInput?.component.id,
        type: moduleInput?.pinType,
        coords: { x: moduleInput?.x, y: moduleInput?.y }
      });

      const validation = connectionManager.validateConnection(decisionSuccess!, moduleInput!);
      console.log('Validation Result:', validation);
      
      expect(validation.isValid).toBe(true);

      const connection = connectionManager.createConnection(decisionSuccess!, moduleInput!);
      expect(connection).not.toBeNull();
      expect(connection?.from.component.id).toBe('decision-1');
      expect(connection?.to.component.id).toBe('module-1');
    });

    it('should allow Decision Point failure output to connect to TaskResistor input', () => {
      const decisionFailure = connectionManager.getPinAt(100, 130, allComponents); // decision failure
      const taskInput = connectionManager.getPinAt(300, 215, allComponents); // task input

      expect(decisionFailure).not.toBeNull();
      expect(taskInput).not.toBeNull();

      console.log('Decision Failure Pin:', {
        id: decisionFailure?.component.id,
        type: decisionFailure?.pinType,
        coords: { x: decisionFailure?.x, y: decisionFailure?.y }
      });
      console.log('Task Input Pin:', {
        id: taskInput?.component.id,
        type: taskInput?.pinType,
        coords: { x: taskInput?.x, y: taskInput?.y }
      });

      const validation = connectionManager.validateConnection(decisionFailure!, taskInput!);
      console.log('Validation Result:', validation);
      
      expect(validation.isValid).toBe(true);

      const connection = connectionManager.createConnection(decisionFailure!, taskInput!);
      expect(connection).not.toBeNull();
      expect(connection?.from.component.id).toBe('decision-1');
      expect(connection?.to.component.id).toBe('task-1');
    });
  });

  describe('Connection Validation Logic', () => {
    it('should classify Decision Point pins correctly via validation', () => {
      const decisionInput = connectionManager.getPinAt(130, 100, allComponents);
      const decisionSuccess = connectionManager.getPinAt(160, 130, allComponents);
      const decisionFailure = connectionManager.getPinAt(100, 130, allComponents);
      const moduleInput = connectionManager.getPinAt(200, 230, allComponents);

      // Test input pin classification by trying to connect two inputs (should fail)
      const inputToInputValidation = connectionManager.validateConnection(decisionInput!, moduleInput!);
      expect(inputToInputValidation.isValid).toBe(false);
      
      // Test output pin classification by connecting success to input (should work)
      const successToInputValidation = connectionManager.validateConnection(decisionSuccess!, moduleInput!);
      expect(successToInputValidation.isValid).toBe(true);
      
      // Test output pin classification by connecting failure to input (should work)
      const failureToInputValidation = connectionManager.validateConnection(decisionFailure!, moduleInput!);
      expect(failureToInputValidation.isValid).toBe(true);
    });

    it('should reject input-to-input connections', () => {
      const decisionInput = connectionManager.getPinAt(130, 100, allComponents);
      const moduleInput = connectionManager.getPinAt(200, 230, allComponents);

      const validation = connectionManager.validateConnection(decisionInput!, moduleInput!);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Can only connect output pins to input pins');
    });

    it('should reject output-to-output connections', () => {
      const decisionSuccess = connectionManager.getPinAt(160, 130, allComponents);
      const powerOutput = connectionManager.getPinAt(130, 220, allComponents);

      const validation = connectionManager.validateConnection(decisionSuccess!, powerOutput!);
      expect(validation.isValid).toBe(false);
      expect(validation.reason).toBe('Can only connect output pins to input pins');
    });
  });

  describe('Full Flow Integration', () => {
    it('should create a complete decision flow: PowerCore → Decision → ModuleIC/TaskResistor', () => {
      // Step 1: Connect PowerCore to Decision Point input
      const powerOutput = connectionManager.getPinAt(130, 220, allComponents);
      const decisionInput = connectionManager.getPinAt(130, 100, allComponents);
      const conn1 = connectionManager.createConnection(powerOutput!, decisionInput!);
      expect(conn1).not.toBeNull();

      // Step 2: Connect Decision Point success to ModuleIC
      const decisionSuccess = connectionManager.getPinAt(160, 130, allComponents);
      const moduleInput = connectionManager.getPinAt(200, 230, allComponents);
      const conn2 = connectionManager.createConnection(decisionSuccess!, moduleInput!);
      expect(conn2).not.toBeNull();

      // Step 3: Connect Decision Point failure to TaskResistor
      const decisionFailure = connectionManager.getPinAt(100, 130, allComponents);
      const taskInput = connectionManager.getPinAt(300, 215, allComponents);
      const conn3 = connectionManager.createConnection(decisionFailure!, taskInput!);
      expect(conn3).not.toBeNull();

      // Verify all connections exist
      const connections = connectionManager.getAllConnections();
      expect(connections).toHaveLength(3);
      
      const connectionIds = connections.map((c: any) => `${c.from.component.id}->${c.to.component.id}`);
      expect(connectionIds).toContain('power-1->decision-1');
      expect(connectionIds).toContain('decision-1->module-1');
      expect(connectionIds).toContain('decision-1->task-1');
    });
  });
});
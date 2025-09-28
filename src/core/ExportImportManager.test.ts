import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { ExportImportManager } from './ExportImportManager';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, Connection } from '../types';

// Mock DOM APIs
const mockCreateElement = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

// Setup DOM mocks
Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: mockCreateElement,
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild,
    },
  },
});

Object.defineProperty(globalThis, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

Object.defineProperty(globalThis, 'Blob', {
  value: class MockBlob {
    constructor(public content: any[], public options?: any) {}
  },
});

Object.defineProperty(globalThis, 'FileReader', {
  value: class MockFileReader {
    onload: ((event: any) => void) | null = null;
    onerror: (() => void) | null = null;
    result: string | null = null;

    readAsText(file: File) {
      setTimeout(() => {
        if (file.name.includes('error')) {
          this.onerror?.();
        } else {
          this.result = JSON.stringify({
            name: 'Test Project',
            components: [],
            connections: [],
            version: '1.0.0',
          });
          this.onload?.({ target: { result: this.result } });
        }
      }, 0);
    }
  },
});

describe('ExportImportManager', () => {
  let manager: ExportImportManager;
  let mockEventEmit: Mock;
  let mockEventOn: Mock;

  const mockComponents: ComponentBase[] = [
    {
      id: 'comp1',
      type: 'power-core',
      x: 100,
      y: 100,
      width: 120,
      height: 60,
      name: 'Test Power Core',
      title: 'Test Power Core',
      icon: '⚡',
      color: '#ffaa00',
      pins: {
        output: [{ x: 0, y: 0, type: 'energy', label: 'Energy Out' }],
      },
      status: 'done',
      category: 'backend',
      description: 'Test component',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'comp2',
      type: 'task-resistor',
      x: 300,
      y: 150,
      width: 100,
      height: 50,
      name: 'Test Task',
      title: 'Test Task',
      icon: '🔧',
      color: '#00aaff',
      pins: {
        input: [{ x: 0, y: 0, type: 'energy', label: 'Energy In' }],
        output: [{ x: 0, y: 0, type: 'energy', label: 'Energy Out' }],
      },
      status: 'todo',
      category: 'frontend',
      description: 'Test task',
      createdAt: new Date('2024-01-02'),
    },
  ];

  const mockConnections: Connection[] = [
    {
      id: 'conn1',
      from: {
        component: mockComponents[0],
        pinType: 'output',
        pinIndex: 0,
        x: 220,
        y: 130,
        category: 'backend',
      },
      to: {
        component: mockComponents[1],
        pinType: 'input',
        pinIndex: 0,
        x: 300,
        y: 175,
        category: 'frontend',
      },
      category: 'energy',
      createdAt: new Date('2024-01-03'),
    },
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock EventBus methods
    mockEventEmit = vi.fn();
    mockEventOn = vi.fn();
    eventBus.emit = mockEventEmit;
    eventBus.on = mockEventOn;

    // Setup DOM element mocks
    const mockLinkElement = {
      href: '',
      download: '',
      style: { display: '' },
      click: mockClick,
    };

    const mockInputElement = {
      type: '',
      accept: '',
      style: { display: '' },
      files: null,
      addEventListener: vi.fn(),
      click: mockClick,
    };

    mockCreateElement.mockImplementation((tagName: string) => {
      if (tagName === 'a') return mockLinkElement;
      if (tagName === 'input') return mockInputElement;
      return {};
    });

    mockCreateObjectURL.mockReturnValue('blob:mock-url');

    manager = new ExportImportManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Construction and Event Setup', () => {
    it('should construct properly', () => {
      expect(manager).toBeInstanceOf(ExportImportManager);
    });

    it('should setup event listeners during construction', () => {
      expect(mockEventOn).toHaveBeenCalledWith(
        Events.PROJECT_EXPORT_REQUESTED,
        expect.any(Function)
      );
      expect(mockEventOn).toHaveBeenCalledWith(
        Events.PROJECT_IMPORT_REQUESTED,
        expect.any(Function)
      );
      expect(mockEventOn).toHaveBeenCalledWith(
        Events.PROJECT_DATA_EXPORT_REQUESTED,
        expect.any(Function)
      );
      expect(mockEventOn).toHaveBeenCalledWith(
        Events.PROJECT_DATA_IMPORT_REQUESTED,
        expect.any(Function)
      );
    });
  });

  describe('Project Export', () => {
    it('should request project state and create export', () => {
      manager.exportProject('test-project.json');

      expect(mockEventEmit).toHaveBeenCalledWith(Events.PROJECT_STATE_REQUEST, {
        callback: expect.any(Function),
        timestamp: expect.any(Number),
      });
    });

    it('should create project data with correct structure', () => {
      const projectData = manager.exportProjectData(mockComponents, mockConnections);

      expect(projectData).toHaveProperty('name');
      expect(projectData).toHaveProperty('created');
      expect(projectData).toHaveProperty('components');
      expect(projectData).toHaveProperty('connections');
      expect(projectData).toHaveProperty('version');
      expect(projectData).toHaveProperty('metadata');

      expect(projectData.components).toHaveLength(2);
      expect(projectData.connections).toHaveLength(1);
      expect(projectData.metadata.totalComponents).toBe(2);
      expect(projectData.metadata.totalConnections).toBe(1);
    });

    it('should serialize components correctly', () => {
      const projectData = manager.exportProjectData(mockComponents, mockConnections);
      const component = projectData.components[0];

      expect(component).toHaveProperty('id', 'comp1');
      expect(component).toHaveProperty('type', 'power-core');
      expect(component).toHaveProperty('x', 100);
      expect(component).toHaveProperty('y', 100);
      expect(component).toHaveProperty('name', 'Test Power Core');
      expect(component).toHaveProperty('status', 'done');
      expect(component).toHaveProperty('pins');
    });

    it('should serialize connections correctly', () => {
      const projectData = manager.exportProjectData(mockComponents, mockConnections);
      const connection = projectData.connections[0];

      expect(connection).toHaveProperty('id', 'conn1');
      expect(connection).toHaveProperty('from');
      expect(connection).toHaveProperty('to');
      expect(connection.from).toHaveProperty('componentId', 'comp1');
      expect(connection.to).toHaveProperty('componentId', 'comp2');
    });

    it('should emit PROJECT_EXPORTED event', () => {
      manager.exportProjectData(mockComponents, mockConnections);

      expect(mockEventEmit).toHaveBeenCalledWith(Events.PROJECT_EXPORTED, {
        projectData: expect.any(Object),
        componentCount: 2,
        connectionCount: 1,
        timestamp: expect.any(Number),
      });
    });

    it('should handle export errors gracefully', () => {
      // Test with invalid components array type (not an array)
      const invalidComponents = 'not-an-array' as any;

      expect(() => {
        manager.exportProjectData(invalidComponents, []);
      }).toThrow('Components must be an array');

      expect(mockEventEmit).toHaveBeenCalledWith(Events.SystemError, {
        error: expect.any(Error),
        context: 'ExportImportManager.exportProjectData',
        timestamp: expect.any(Number),
      });
    });

    it('should filter out null/invalid components gracefully', () => {
      // This tests the robust behavior of filtering null components
      const componentsWithNulls = [
        mockComponents[0], // valid component
        null as any,      // null component
        undefined as any, // undefined component
        { name: 'missing-id' } as any, // component without id
        mockComponents[1], // another valid component
      ];

      const projectData = manager.exportProjectData(componentsWithNulls, []);

      // Should only export the 2 valid components
      expect(projectData.components).toHaveLength(2);
      expect(projectData.components[0]).toHaveProperty('id', 'comp1');
      expect(projectData.components[1]).toHaveProperty('id', 'comp2');
      expect(projectData.metadata.totalComponents).toBe(2);
    });
  });

  describe('Module IC Serialization', () => {
    it('should serialize Module IC internal structures', () => {
      const moduleComponent = {
        ...mockComponents[0],
        type: 'module-ic',
        internalComponents: [mockComponents[1]],
        internalConnections: mockConnections,
        pinMap: { external: 'internal' },
      };

      const projectData = manager.exportProjectData([moduleComponent], []);
      const serialized = projectData.components[0];

      expect(serialized).toHaveProperty('internalComponents');
      expect(serialized).toHaveProperty('internalConnections');
      expect(serialized).toHaveProperty('pinMap');
      expect(serialized.internalComponents).toHaveLength(1);
      expect(serialized.internalConnections).toHaveLength(1);
    });
  });

  describe('Project Import', () => {
    it('should import project data successfully', () => {
      const projectData = {
        name: 'Imported Project',
        version: '2.0.0',
        components: [
          {
            id: 'imported-comp',
            type: 'power-core',
            x: 50,
            y: 50,
            width: 100,
            height: 50,
            name: 'Imported Component',
            title: 'Imported Component',
            pins: {},
            status: 'defined',
            category: 'backend',
          },
        ],
        connections: [],
      };

      manager.importProjectData(projectData);

      expect(mockEventEmit).toHaveBeenCalledWith(Events.PROJECT_IMPORTED, {
        components: expect.any(Array),
        connections: expect.any(Array),
        projectData,
        componentCount: 1,
        connectionCount: 0,
        timestamp: expect.any(Number),
      });
    });

    it('should validate project data format', () => {
      const invalidData = null;

      expect(() => {
        manager.importProjectData(invalidData);
      }).toThrow('Invalid project data format');
    });

    it('should validate components array', () => {
      const invalidData = { components: 'not-an-array' };

      expect(() => {
        manager.importProjectData(invalidData);
      }).toThrow('Project data must contain components array');
    });

    it('should validate component structure', () => {
      const invalidData = {
        components: [{ name: 'Missing ID and Type' }],
        connections: [],
      };

      expect(() => {
        manager.importProjectData(invalidData);
      }).toThrow('Each component must have id and type');
    });

    it('should handle import errors gracefully', () => {
      const invalidData = { components: null };

      // The importProjectData method throws, so we need to wrap it
      expect(() => manager.importProjectData(invalidData)).toThrow();

      expect(mockEventEmit).toHaveBeenCalledWith(Events.PROJECT_IMPORT_ERROR, {
        error: expect.any(String),
        projectData: invalidData,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Component Deserialization', () => {
    it('should deserialize components with default values', () => {
      const componentsData = [{ id: 'minimal', type: 'power-core' }];

      const projectData = { components: componentsData, connections: [] };
      manager.importProjectData(projectData);

      const importCall = mockEventEmit.mock.calls.find(call => call[0] === Events.PROJECT_IMPORTED);
      const components = importCall[1].components;
      const component = components[0];

      expect(component).toHaveProperty('id', 'minimal');
      expect(component).toHaveProperty('type', 'power-core');
      expect(component).toHaveProperty('x', 0);
      expect(component).toHaveProperty('y', 0);
      expect(component).toHaveProperty('width', 100);
      expect(component).toHaveProperty('height', 50);
      expect(component).toHaveProperty('name', 'Unnamed Component');
      expect(component).toHaveProperty('status', 'defined');
    });

    it('should deserialize Module IC internal structures', () => {
      const moduleData = {
        id: 'module1',
        type: 'module-ic',
        internalComponents: [{ id: 'internal1', type: 'task-resistor' }],
        internalConnections: [],
        pinMap: { ext: 'int' },
      };

      const projectData = { components: [moduleData], connections: [] };
      manager.importProjectData(projectData);

      const importCall = mockEventEmit.mock.calls.find(call => call[0] === Events.PROJECT_IMPORTED);
      const components = importCall[1].components;
      const moduleComponent = components[0];

      expect(moduleComponent).toHaveProperty('internalComponents');
      expect(moduleComponent).toHaveProperty('internalConnections');
      expect(moduleComponent).toHaveProperty('pinMap');
      expect(moduleComponent.internalComponents).toHaveLength(1);
    });
  });

  describe('Connection Deserialization', () => {
    it('should rebuild connection component references', () => {
      const projectData = {
        components: [
          { id: 'comp1', type: 'power-core' },
          { id: 'comp2', type: 'task-resistor' },
        ],
        connections: [
          {
            id: 'conn1',
            from: { componentId: 'comp1', pinType: 'energy', pinIndex: 0 },
            to: { componentId: 'comp2', pinType: 'energy', pinIndex: 0 },
          },
        ],
      };

      manager.importProjectData(projectData);

      const importCall = mockEventEmit.mock.calls.find(call => call[0] === Events.PROJECT_IMPORTED);
      const connections = importCall[1].connections;
      const connection = connections[0];

      expect(connection.from.component).toHaveProperty('id', 'comp1');
      expect(connection.to.component).toHaveProperty('id', 'comp2');
    });

    it('should skip connections with missing components', () => {
      const projectData = {
        components: [{ id: 'comp1', type: 'power-core' }],
        connections: [
          {
            id: 'invalid-conn',
            from: { componentId: 'comp1', pinType: 'energy', pinIndex: 0 },
            to: { componentId: 'missing-comp', pinType: 'energy', pinIndex: 0 },
          },
        ],
      };

      manager.importProjectData(projectData);

      const importCall = mockEventEmit.mock.calls.find(call => call[0] === Events.PROJECT_IMPORTED);
      const connections = importCall[1].connections;

      expect(connections).toHaveLength(0);
    });
  });

  describe('Project Metadata', () => {
    it('should get project info', () => {
      const info = manager.getProjectInfo();

      expect(info).toHaveProperty('name');
      expect(info).toHaveProperty('version');
    });

    it('should set project info', () => {
      manager.setProjectInfo('New Project', '2.0.0');
      const info = manager.getProjectInfo();

      expect(info.name).toBe('New Project');
      expect(info.version).toBe('2.0.0');
    });
  });

  describe('Backup and Restore', () => {
    it('should create backup data', () => {
      const backupData = manager.createBackup(mockComponents, mockConnections);
      const parsed = JSON.parse(backupData);

      expect(parsed).toHaveProperty('backup', true);
      expect(parsed).toHaveProperty('backupCreatedAt');
      expect(parsed).toHaveProperty('components');
      expect(parsed).toHaveProperty('connections');
    });

    it('should restore from backup', () => {
      const backupData = manager.createBackup(mockComponents, mockConnections);

      manager.restoreFromBackup(backupData);

      expect(mockEventEmit).toHaveBeenCalledWith(Events.PROJECT_IMPORTED, {
        components: expect.any(Array),
        connections: expect.any(Array),
        projectData: expect.any(Object),
        componentCount: expect.any(Number),
        connectionCount: expect.any(Number),
        timestamp: expect.any(Number),
      });
    });

    it('should validate backup format', () => {
      const invalidBackup = JSON.stringify({ name: 'Not a backup' });

      expect(() => {
        manager.restoreFromBackup(invalidBackup);
      }).toThrow('Invalid backup format');
    });
  });

  describe('File Operations', () => {
    it('should trigger file input for import', () => {
      manager.importFromFile();

      expect(mockCreateElement).toHaveBeenCalledWith('input');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });

  describe('Event Integration', () => {
    it('should handle PROJECT_EXPORT_REQUESTED event', () => {
      const exportHandler = mockEventOn.mock.calls.find(
        call => call[0] === Events.PROJECT_EXPORT_REQUESTED
      )[1];

      exportHandler({ filename: 'test.json', timestamp: Date.now() });

      expect(mockEventEmit).toHaveBeenCalledWith(Events.PROJECT_STATE_REQUEST, expect.any(Object));
    });

    it('should handle PROJECT_DATA_EXPORT_REQUESTED event', () => {
      const exportHandler = mockEventOn.mock.calls.find(
        call => call[0] === Events.PROJECT_DATA_EXPORT_REQUESTED
      )[1];

      const mockCallback = vi.fn();
      exportHandler({
        components: mockComponents,
        connections: mockConnections,
        callback: mockCallback,
        timestamp: Date.now(),
      });

      expect(mockCallback).toHaveBeenCalledWith(expect.any(Object));
    });

    it('should handle PROJECT_DATA_IMPORT_REQUESTED event', () => {
      const importHandler = mockEventOn.mock.calls.find(
        call => call[0] === Events.PROJECT_DATA_IMPORT_REQUESTED
      )[1];

      const projectData = { components: [], connections: [] };
      importHandler({ projectData, timestamp: Date.now() });

      expect(mockEventEmit).toHaveBeenCalledWith(Events.PROJECT_IMPORTED, expect.any(Object));
    });
  });
});

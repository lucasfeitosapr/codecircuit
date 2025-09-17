import { describe, it, expect, beforeEach } from 'vitest';
import { MotherboardApp } from './main';
import type { ComponentBase, ModuleComponent } from './types';

describe('Export/Import with Internal Components', () => {
  let app: MotherboardApp;

  beforeEach(() => {
    // Setup DOM elements needed by the app
    document.body.innerHTML = `
      <canvas id="circuit-board"></canvas>
      <div id="datasheet-panel"></div>
      <div id="datasheet-title"></div>
      <div id="datasheet-content"></div>
    `;

    // Mock canvas context
    const canvas = document.getElementById('circuit-board') as HTMLCanvasElement;
    const mockContext = {
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      scale: () => {},
      fillText: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      setLineDash: () => {},
      moveTo: () => {},
      lineTo: () => {},
    } as any;

    canvas.getContext = () => mockContext;

    app = new MotherboardApp();
  });

  it('should export and import projects with internal components', () => {
    // Create a module IC with internal components
    const moduleIC: ModuleComponent = {
      id: 'module-1',
      type: 'module-ic',
      x: 100,
      y: 100,
      width: 100,
      height: 60,
      name: 'Test Module',
      title: 'Test Module',
      pins: {
        input: [{ x: 0, y: 30, type: 'energy' }],
        output: [{ x: 100, y: 30, type: 'energy' }],
      },
      internalComponents: [
        {
          id: 'internal-1',
          type: 'task-resistor',
          x: 10,
          y: 10,
          width: 60,
          height: 20,
          name: 'Internal Task',
          title: 'Internal Task 1',
          pins: {
            input: [{ x: 0, y: 10, type: 'energy' }],
            output: [{ x: 60, y: 10, type: 'energy' }],
          },
          status: 'in-progress',
          category: 'frontend',
        },
      ],
      internalConnections: [],
    };

    app.components.push(moduleIC);

    // Export the project
    const exported = app.exportProjectData();

    expect(exported.components).toHaveLength(1);
    expect(exported.components[0].internalComponents).toHaveLength(1);
    expect(exported.components[0].internalComponents![0].title).toBe('Internal Task 1');
  });

  it('should handle nested module ICs correctly', () => {
    // Create a module IC that contains another module IC
    const nestedModule: ModuleComponent = {
      id: 'nested-module',
      type: 'module-ic',
      x: 20,
      y: 20,
      width: 80,
      height: 40,
      name: 'Nested Module',
      title: 'Nested Module',
      pins: {
        input: [{ x: 0, y: 20, type: 'energy' }],
        output: [{ x: 80, y: 20, type: 'energy' }],
      },
      internalComponents: [],
      internalConnections: [],
    };

    const parentModule: ModuleComponent = {
      id: 'parent-module',
      type: 'module-ic',
      x: 100,
      y: 100,
      width: 150,
      height: 100,
      name: 'Parent Module',
      title: 'Parent Module',
      pins: {
        input: [{ x: 0, y: 50, type: 'energy' }],
        output: [{ x: 150, y: 50, type: 'energy' }],
      },
      internalComponents: [nestedModule],
      internalConnections: [],
    };

    app.components.push(parentModule);

    const exported = app.exportProjectData();

    expect(exported.components).toHaveLength(1);
    expect(exported.components[0].internalComponents).toHaveLength(1);
    expect(exported.components[0].internalComponents![0].type).toBe('module-ic');
  });

  it('should preserve internal connections on export/import', () => {
    const task1: ComponentBase = {
      id: 'task-1',
      type: 'task-resistor',
      x: 10,
      y: 10,
      width: 60,
      height: 20,
      name: 'Task 1',
      title: 'Task 1',
      pins: {
        input: [{ x: 0, y: 10, type: 'energy' }],
        output: [{ x: 60, y: 10, type: 'energy' }],
      },
    };

    const task2: ComponentBase = {
      id: 'task-2',
      type: 'task-resistor',
      x: 80,
      y: 10,
      width: 60,
      height: 20,
      name: 'Task 2',
      title: 'Task 2',
      pins: {
        input: [{ x: 0, y: 10, type: 'energy' }],
        output: [{ x: 60, y: 10, type: 'energy' }],
      },
    };

    const connection = {
      id: 'conn-1',
      from: {
        component: task1,
        pinType: 'output' as const,
        pinIndex: 0,
        x: 70,
        y: 20,
        category: 'frontend',
      },
      to: {
        component: task2,
        pinType: 'input' as const,
        pinIndex: 0,
        x: 80,
        y: 20,
        category: 'frontend',
      },
      category: 'frontend',
    };

    const moduleIC: ModuleComponent = {
      id: 'module-1',
      type: 'module-ic',
      x: 100,
      y: 100,
      width: 200,
      height: 60,
      name: 'Connected Module',
      title: 'Connected Module',
      pins: {
        input: [{ x: 0, y: 30, type: 'energy' }],
        output: [{ x: 200, y: 30, type: 'energy' }],
      },
      internalComponents: [task1, task2],
      internalConnections: [connection],
    };

    app.components.push(moduleIC);

    const exported = app.exportProjectData();

    expect(exported.components[0].internalConnections).toHaveLength(1);
    expect(exported.components[0].internalConnections![0].id).toBe('conn-1');
  });

  it('should import project with internal components correctly', () => {
    const projectData = {
      name: 'Test Project',
      created: '2023-01-01T00:00:00.000Z',
      version: '1.0.0',
      components: [
        {
          id: 'module-1',
          type: 'module-ic',
          x: 100,
          y: 100,
          width: 150,
          height: 80,
          name: 'Test Module',
          title: 'Test Module',
          pins: {
            input: [{ x: 0, y: 40, type: 'energy' }],
            output: [{ x: 150, y: 40, type: 'energy' }],
          },
          internalComponents: [
            {
              id: 'internal-task',
              type: 'task-resistor',
              x: 20,
              y: 20,
              width: 60,
              height: 20,
              name: 'Internal Task',
              title: 'Internal Task',
              pins: {
                input: [{ x: 0, y: 10, type: 'energy' }],
                output: [{ x: 60, y: 10, type: 'energy' }],
              },
              status: 'done',
              category: 'backend',
            },
          ],
          internalConnections: [],
        },
      ],
      connections: [],
    };

    app.importProjectData(projectData);

    expect(app.components).toHaveLength(1);
    expect(app.components[0].type).toBe('module-ic');

    const moduleComponent = app.components[0] as ModuleComponent;
    expect(moduleComponent.internalComponents).toHaveLength(1);
    expect(moduleComponent.internalComponents![0].title).toBe('Internal Task');
    expect(moduleComponent.internalComponents![0].status).toBe('done');
    expect(moduleComponent.internalComponents![0].category).toBe('backend');
  });

  it('should preserve internal connections on import', () => {
    const projectData = {
      name: 'Connected Project',
      created: '2023-01-01T00:00:00.000Z',
      version: '1.0.0',
      components: [
        {
          id: 'module-1',
          type: 'module-ic',
          x: 100,
          y: 100,
          width: 200,
          height: 80,
          name: 'Connected Module',
          title: 'Connected Module',
          pins: {
            input: [{ x: 0, y: 40, type: 'energy' }],
            output: [{ x: 200, y: 40, type: 'energy' }],
          },
          internalComponents: [
            {
              id: 'task-1',
              type: 'task-resistor',
              x: 20,
              y: 20,
              width: 60,
              height: 20,
              name: 'Task 1',
              title: 'Task 1',
              pins: {
                input: [{ x: 0, y: 10, type: 'energy' }],
                output: [{ x: 60, y: 10, type: 'energy' }],
              },
            },
            {
              id: 'task-2',
              type: 'task-resistor',
              x: 100,
              y: 20,
              width: 60,
              height: 20,
              name: 'Task 2',
              title: 'Task 2',
              pins: {
                input: [{ x: 0, y: 10, type: 'energy' }],
                output: [{ x: 60, y: 10, type: 'energy' }],
              },
            },
          ],
          internalConnections: [
            {
              id: 'conn-1',
              from: {
                componentId: 'task-1',
                pinType: 'output',
                pinIndex: 0,
                x: 80,
                y: 30,
                category: 'frontend',
              },
              to: {
                componentId: 'task-2',
                pinType: 'input',
                pinIndex: 0,
                x: 100,
                y: 30,
                category: 'frontend',
              },
              category: 'frontend',
            },
          ],
        },
      ],
      connections: [],
    };

    app.importProjectData(projectData);

    const moduleComponent = app.components[0] as ModuleComponent;
    expect(moduleComponent.internalConnections).toHaveLength(1);

    const connection = moduleComponent.internalConnections![0];
    expect(connection.from.component.id).toBe('task-1');
    expect(connection.to.component.id).toBe('task-2');
  });

  it('should handle round-trip export/import correctly', () => {
    // Create a complex project structure
    const task1: ComponentBase = {
      id: 'task-1',
      type: 'task-resistor',
      x: 10,
      y: 10,
      width: 60,
      height: 20,
      name: 'Task 1',
      title: 'Task 1',
      pins: {
        input: [{ x: 0, y: 10, type: 'energy' }],
        output: [{ x: 60, y: 10, type: 'energy' }],
      },
      status: 'done',
      category: 'frontend',
    };

    const moduleIC: ModuleComponent = {
      id: 'module-1',
      type: 'module-ic',
      x: 100,
      y: 100,
      width: 150,
      height: 60,
      name: 'Test Module',
      title: 'Test Module',
      pins: {
        input: [{ x: 0, y: 30, type: 'energy' }],
        output: [{ x: 150, y: 30, type: 'energy' }],
      },
      internalComponents: [task1],
      internalConnections: [],
    };

    app.components.push(moduleIC);

    // Export then import
    const exported = app.exportProjectData();
    app.importProjectData(exported);

    // Verify the structure is preserved
    expect(app.components).toHaveLength(1);
    expect(app.components[0].type).toBe('module-ic');

    const importedModule = app.components[0] as ModuleComponent;
    expect(importedModule.internalComponents).toHaveLength(1);
    expect(importedModule.internalComponents![0].title).toBe('Task 1');
    expect(importedModule.internalComponents![0].status).toBe('done');
    expect(importedModule.internalComponents![0].category).toBe('frontend');
  });
});

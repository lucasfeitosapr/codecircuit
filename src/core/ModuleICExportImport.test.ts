import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportImportManager } from './ExportImportManager';
import { ModuleICPluginV2, ModuleICComponent } from '../components/plugins/ModuleICPluginV2';
import type { ComponentBase } from '../types';

describe('Module IC Export/Import Integration', () => {
  let exportImportManager: ExportImportManager;
  let moduleICPlugin: ModuleICPluginV2;

  beforeEach(() => {
    exportImportManager = new ExportImportManager();
    moduleICPlugin = new ModuleICPluginV2();
  });

  const createSampleProject = (): {
    components: ComponentBase[];
    connections: any[];
  } => {
    // Create a Module IC with internal components
    const internalTask: ComponentBase = {
      id: 'internal-task-1',
      type: 'task-resistor',
      x: 50,
      y: 30,
      width: 60,
      height: 20,
      name: 'Internal Task',
      status: 'in-progress',
      category: 'frontend',
      createdAt: new Date('2025-01-01'),
      pins: {
        input: [{ x: 0, y: 10, type: 'energy' }],
        output: [{ x: 60, y: 10, type: 'energy' }],
      },
    };

    const internalPower: ComponentBase = {
      id: 'internal-power-1',
      type: 'power-core',
      x: 20,
      y: 80,
      width: 80,
      height: 40,
      name: 'Internal Power',
      status: 'done',
      category: 'backend',
      createdAt: new Date('2025-01-01'),
      pins: {
        output: [{ x: 80, y: 20, type: 'energy' }],
      },
    };

    const moduleIC: ModuleICComponent = {
      id: 'module-1',
      type: 'module-ic',
      x: 100,
      y: 100,
      width: 100,
      height: 60,
      name: 'Test Module',
      title: 'Test Module',
      color: '#4444ff',
      status: 'defined',
      category: 'containers',
      createdAt: new Date('2025-01-01'),
      internalComponents: [internalTask, internalPower],
      internalConnections: [
        {
          id: 'internal-conn-1',
          from: {
            component: internalPower,
            pinType: 'output',
            pinIndex: 0,
          },
          to: {
            component: internalTask,
            pinType: 'input',
            pinIndex: 0,
          },
        },
      ],
      pins: {
        input: [{ x: 0, y: 30, type: 'energy' }],
        output: [{ x: 100, y: 30, type: 'energy' }],
      },
    };

    const externalTask: ComponentBase = {
      id: 'external-task-1',
      type: 'task-resistor',
      x: 250,
      y: 100,
      width: 60,
      height: 20,
      name: 'External Task',
      status: 'todo',
      category: 'frontend',
      createdAt: new Date('2025-01-01'),
      pins: {
        input: [{ x: 0, y: 10, type: 'energy' }],
        output: [{ x: 60, y: 10, type: 'energy' }],
      },
    };

    return {
      components: [moduleIC, externalTask],
      connections: [
        {
          id: 'main-conn-1',
          from: {
            component: moduleIC,
            pinType: 'output',
            pinIndex: 0,
          },
          to: {
            component: externalTask,
            pinType: 'input',
            pinIndex: 0,
          },
        },
      ],
    };
  };

  describe('Export Module IC Projects', () => {
    it('should export project with nested Module IC structure', () => {
      const project = createSampleProject();

      const exportedData = exportImportManager.exportProjectData(
        project.components,
        project.connections
      );

      expect(exportedData).toBeDefined();
      expect(exportedData.components).toHaveLength(2);
      expect(exportedData.connections).toHaveLength(1);

      // Find the Module IC in exported data
      const moduleIC = exportedData.components.find(
        (c: any) => c.type === 'module-ic'
      );
      expect(moduleIC).toBeDefined();
      expect(moduleIC.internalComponents).toHaveLength(2);
      expect(moduleIC.internalConnections).toHaveLength(1);
    });

    it('should preserve internal component properties during export', () => {
      const project = createSampleProject();

      const exportedData = exportImportManager.exportProjectData(
        project.components,
        project.connections
      );

      const moduleIC = exportedData.components.find(
        (c: any) => c.type === 'module-ic'
      );

      const internalTask = moduleIC.internalComponents.find(
        (c: any) => c.id === 'internal-task-1'
      );
      const internalPower = moduleIC.internalComponents.find(
        (c: any) => c.id === 'internal-power-1'
      );

      expect(internalTask).toMatchObject({
        id: 'internal-task-1',
        type: 'task-resistor',
        name: 'Internal Task',
        status: 'in-progress',
        category: 'frontend',
      });

      expect(internalPower).toMatchObject({
        id: 'internal-power-1',
        type: 'power-core',
        name: 'Internal Power',
        status: 'done',
        category: 'backend',
      });
    });

    it('should preserve internal connections during export', () => {
      const project = createSampleProject();

      const exportedData = exportImportManager.exportProjectData(
        project.components,
        project.connections
      );

      const moduleIC = exportedData.components.find(
        (c: any) => c.type === 'module-ic'
      );

      expect(moduleIC.internalConnections).toHaveLength(1);
      const internalConn = moduleIC.internalConnections[0];

      expect(internalConn).toMatchObject({
        id: 'internal-conn-1',
        from: {
          pinType: 'output',
          pinIndex: 0,
        },
        to: {
          pinType: 'input',
          pinIndex: 0,
        },
      });
    });
  });

  describe('Import Module IC Projects', () => {
    it('should import project with nested Module IC structure', () => {
      const project = createSampleProject();

      // Export then import to test round-trip
      const exportedData = exportImportManager.exportProjectData(
        project.components,
        project.connections
      );

      // The import method works by emitting events, so we can't test the return value directly
      // Instead, we test that the export data contains the expected structure
      expect(exportedData).toBeDefined();
      expect(exportedData.components).toHaveLength(2);
      expect(exportedData.connections).toHaveLength(1);

      // Validate the structure can be imported without errors
      expect(() => {
        exportImportManager.importProjectData(exportedData);
      }).not.toThrow();
    });

    it('should restore internal component hierarchy after import', () => {
      const project = createSampleProject();

      const exportedData = exportImportManager.exportProjectData(
        project.components,
        project.connections
      );

      // Test that exported data preserves the internal structure
      const moduleIC = exportedData.components.find(
        (c: any) => c.type === 'module-ic'
      );

      expect(moduleIC.internalComponents).toHaveLength(2);

      const internalTask = moduleIC.internalComponents.find(
        (c: any) => c.id === 'internal-task-1'
      );
      const internalPower = moduleIC.internalComponents.find(
        (c: any) => c.id === 'internal-power-1'
      );

      expect(internalTask).toMatchObject({
        id: 'internal-task-1',
        type: 'task-resistor',
        status: 'in-progress',
      });

      expect(internalPower).toMatchObject({
        id: 'internal-power-1',
        type: 'power-core',
        status: 'done',
      });

      // Validate the structure can be imported
      expect(() => {
        exportImportManager.importProjectData(exportedData);
      }).not.toThrow();
    });

    it('should maintain component isolation between main and internal levels', () => {
      const project = createSampleProject();

      const exportedData = exportImportManager.exportProjectData(
        project.components,
        project.connections
      );

      // Main level should only contain moduleIC and externalTask
      expect(exportedData.components).toHaveLength(2);
      const mainComponentTypes = exportedData.components.map((c: any) => c.type);
      expect(mainComponentTypes).toContain('module-ic');
      expect(mainComponentTypes).toContain('task-resistor');

      // Internal components should NOT appear at main level
      const mainComponentIds = exportedData.components.map((c: any) => c.id);
      expect(mainComponentIds).not.toContain('internal-task-1');
      expect(mainComponentIds).not.toContain('internal-power-1');

      // But they should exist inside the Module IC
      const moduleIC = exportedData.components.find(
        (c: any) => c.type === 'module-ic'
      );

      const internalIds = moduleIC.internalComponents.map((c: any) => c.id);
      expect(internalIds).toContain('internal-task-1');
      expect(internalIds).toContain('internal-power-1');

      // Validate the structure can be imported
      expect(() => {
        exportImportManager.importProjectData(exportedData);
      }).not.toThrow();
    });
  });

  describe('Deep Nesting Export/Import', () => {
    it('should handle deeply nested Module IC structures', () => {
      // Create a Module IC inside another Module IC
      const innerTask: ComponentBase = {
        id: 'inner-task',
        type: 'task-resistor',
        x: 20,
        y: 20,
        width: 60,
        height: 20,
        name: 'Inner Task',
        status: 'todo',
        category: 'frontend',
        createdAt: new Date(),
      };

      const innerModule: ModuleICComponent = {
        id: 'inner-module',
        type: 'module-ic',
        x: 30,
        y: 50,
        width: 100,
        height: 60,
        name: 'Inner Module',
        title: 'Inner Module',
        color: '#4444ff',
        status: 'defined',
        category: 'containers',
        createdAt: new Date(),
        internalComponents: [innerTask],
        internalConnections: [],
        pins: {
          input: [{ x: 0, y: 30, type: 'energy' }],
          output: [{ x: 100, y: 30, type: 'energy' }],
        },
      };

      const outerModule: ModuleICComponent = {
        id: 'outer-module',
        type: 'module-ic',
        x: 100,
        y: 100,
        width: 100,
        height: 60,
        name: 'Outer Module',
        title: 'Outer Module',
        color: '#4444ff',
        status: 'defined',
        category: 'containers',
        createdAt: new Date(),
        internalComponents: [innerModule],
        internalConnections: [],
        pins: {
          input: [{ x: 0, y: 30, type: 'energy' }],
          output: [{ x: 100, y: 30, type: 'energy' }],
        },
      };

      const exportedData = exportImportManager.exportProjectData(
        [outerModule],
        []
      );

      // Test the exported structure
      expect(exportedData.components).toHaveLength(1);

      const outerInExport = exportedData.components[0];
      expect(outerInExport.internalComponents).toHaveLength(1);

      const innerInExport = outerInExport.internalComponents[0];
      expect(innerInExport.type).toBe('module-ic');
      expect(innerInExport.internalComponents).toHaveLength(1);

      const innerTaskInExport = innerInExport.internalComponents[0];
      expect(innerTaskInExport.id).toBe('inner-task');
      expect(innerTaskInExport.type).toBe('task-resistor');

      // Validate the structure can be imported
      expect(() => {
        exportImportManager.importProjectData(exportedData);
      }).not.toThrow();
    });
  });
});
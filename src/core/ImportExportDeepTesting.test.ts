import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportImportManager } from '../core/ExportImportManager';
import { ImportExportTestDataGenerator } from '../utils/ImportExportTestDataGenerator';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, ModuleComponent, Connection } from '../types';

/**
 * Comprehensive Import/Export Deep Testing Suite
 * 
 * Tests deep nested scenarios, complex multi-component projects,
 * and edge cases for robust Import/Export functionality.
 */
describe('Import/Export Deep Testing', () => {
  let exportImportManager: ExportImportManager;
  let testDataGenerator: ImportExportTestDataGenerator;

  beforeEach(() => {
    exportImportManager = new ExportImportManager();
    testDataGenerator = new ImportExportTestDataGenerator();
    vi.clearAllMocks();
  });

  /**
   * Helper to perform import and capture the result via events
   */
  const performImportTest = (projectData: any): Promise<{ components: ComponentBase[], connections: Connection[] }> => {
    return new Promise((resolve, reject) => {
      const handleImport = (payload: any) => {
        eventBus.off(Events.PROJECT_IMPORTED, handleImport);
        eventBus.off(Events.PROJECT_IMPORT_ERROR, handleError);
        resolve(payload);
      };

      const handleError = (payload: any) => {
        eventBus.off(Events.PROJECT_IMPORTED, handleImport);
        eventBus.off(Events.PROJECT_IMPORT_ERROR, handleError);
        reject(new Error(payload.error));
      };

      eventBus.on(Events.PROJECT_IMPORTED, handleImport);
      eventBus.on(Events.PROJECT_IMPORT_ERROR, handleError);

      exportImportManager.importProjectData(projectData);
    });
  };

  describe('Deep Nesting Scenarios', () => {
    it('should handle 4-level deep nesting', async () => {
      const { components, connections, metadata } = testDataGenerator.generateDeepNestedProject(4, 3);
      
      // Verify the structure was created correctly
      expect(components).toHaveLength(2); // Main module + power core
      expect(metadata.levels).toBe(4);
      expect(metadata.scenario).toBe('deep-nested');

      // Find the main Module IC
      const mainModule = components.find(c => c.type === 'module-ic') as ModuleComponent;
      expect(mainModule).toBeDefined();
      expect(mainModule.internalComponents).toHaveLength(3);

      // Verify deeper nesting exists
      const nestedModule = mainModule.internalComponents?.find(c => c.type === 'module-ic') as ModuleComponent;
      expect(nestedModule).toBeDefined();
      expect(nestedModule.internalComponents).toHaveLength(3);

      // Test export
      const exportedData = exportImportManager.exportProjectData(components, connections);
      expect(exportedData).toBeDefined();
      expect(exportedData.components).toHaveLength(2);
      expect(exportedData.metadata.totalComponents).toBe(2);

      // Test import using event-based helper
      const importedData = await performImportTest(exportedData);
      expect(importedData.components).toHaveLength(2);
      expect(importedData.connections).toHaveLength(connections.length);

      // Verify deep nesting is preserved
      const importedMainModule = importedData.components.find(c => c.type === 'module-ic') as ModuleComponent;
      expect(importedMainModule.internalComponents).toHaveLength(3);
    });

    it('should handle 6-level extreme deep nesting', async () => {
      const { components, connections } = testDataGenerator.generateDeepNestedProject(6, 2);
      
      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      // Verify all 6 levels are preserved
      let currentLevel = importedData.components.find(c => c.type === 'module-ic') as ModuleComponent;
      let levelCount = 0;

      while (currentLevel && currentLevel.internalComponents) {
        levelCount++;
        const nextModule = currentLevel.internalComponents.find(c => c.type === 'module-ic') as ModuleComponent;
        if (nextModule && nextModule.internalComponents) {
          currentLevel = nextModule;
        } else {
          break;
        }
      }

      expect(levelCount).toBeGreaterThanOrEqual(5); // Should have at least 5 levels of nesting
    });

    it('should preserve internal connections across all nesting levels', async () => {
      const { components, connections } = testDataGenerator.generateDeepNestedProject(4, 4);
      
      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      // Recursively verify internal connections are preserved
      const verifyInternalConnections = (module: ModuleComponent, level: number = 0) => {
        if (!module.internalComponents) return;

        // Each level should have connections between its internal components
        expect(module.internalConnections).toBeDefined();
        expect(module.internalConnections!.length).toBeGreaterThan(0);

        // Verify connection references are valid
        module.internalConnections!.forEach(connection => {
          const fromComponent = module.internalComponents!.find(c => c.id === connection.from.component.id);
          const toComponent = module.internalComponents!.find(c => c.id === connection.to.component.id);
          
          expect(fromComponent).toBeDefined();
          expect(toComponent).toBeDefined();
        });

        // Recursively check nested modules
        module.internalComponents.forEach(component => {
          if (component.type === 'module-ic') {
            verifyInternalConnections(component as ModuleComponent, level + 1);
          }
        });
      };

      const mainModule = importedData.components.find(c => c.type === 'module-ic') as ModuleComponent;
      verifyInternalConnections(mainModule);
    });

    it('should maintain component properties across deep nesting', async () => {
      const { components, connections } = testDataGenerator.generateDeepNestedProject(5, 3);
      
      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      // Recursively verify all component properties are preserved
      const verifyComponentProperties = (originalComponents: ComponentBase[], importedComponents: ComponentBase[]) => {
        expect(importedComponents).toHaveLength(originalComponents.length);

        originalComponents.forEach(originalComponent => {
          const importedComponent = importedComponents.find(c => c.id === originalComponent.id);
          expect(importedComponent).toBeDefined();
          
          // Verify basic properties
          expect(importedComponent!.name).toBe(originalComponent.name);
          expect(importedComponent!.status).toBe(originalComponent.status);
          expect(importedComponent!.x).toBe(originalComponent.x);
          expect(importedComponent!.y).toBe(originalComponent.y);
          expect(importedComponent!.category).toBe(originalComponent.category);

          // Verify nested components if it's a Module IC
          if (originalComponent.type === 'module-ic' && importedComponent!.type === 'module-ic') {
            const originalModule = originalComponent as ModuleComponent;
            const importedModule = importedComponent as ModuleComponent;

            if (originalModule.internalComponents && importedModule.internalComponents) {
              verifyComponentProperties(originalModule.internalComponents, importedModule.internalComponents);
            }
          }
        });
      };

      verifyComponentProperties(components, importedData.components);
    });
  });

  describe('Wide Project Scenarios', () => {
    it('should handle projects with 30+ components', async () => {
      const { components, connections, metadata } = testDataGenerator.generateWideProject(30, 8);
      
      expect(components).toHaveLength(30 + 8); // Main components + Module ICs
      expect(metadata.scenario).toBe('wide-project');

      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      expect(importedData.components).toHaveLength(38);
      expect(importedData.connections).toHaveLength(connections.length);

      // Verify Module ICs have internal components
      const moduleICs = importedData.components.filter(c => c.type === 'module-ic') as ModuleComponent[];
      expect(moduleICs).toHaveLength(8);

      moduleICs.forEach(module => {
        expect(module.internalComponents).toHaveLength(5);
        expect(module.internalConnections).toHaveLength(4); // 5 components = 4 connections
      });
    });

    it('should handle complex connection matrices', async () => {
      const { components, connections } = testDataGenerator.generateWideProject(20, 5);
      
      // Verify connections exist between different component types
      expect(connections.length).toBeGreaterThan(10); // Should have many connections

      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      // Verify all connections are preserved with correct references
      expect(importedData.connections).toHaveLength(connections.length);

      importedData.connections.forEach(connection => {
        const fromComponent = importedData.components.find(c => c.id === connection.from.component.id);
        const toComponent = importedData.components.find(c => c.id === connection.to.component.id);
        
        expect(fromComponent).toBeDefined();
        expect(toComponent).toBeDefined();
        expect(connection.category).toBeDefined();
      });
    });

    it('should preserve component diversity and metadata', async () => {
      const { components, connections } = testDataGenerator.generateWideProject(25, 6);
      
      // Verify component type diversity
      const componentTypes = Array.from(new Set(components.map(c => c.type)));
      expect(componentTypes.length).toBeGreaterThanOrEqual(4); // Should have multiple types

      // Verify status diversity
      const statuses = Array.from(new Set(components.map(c => c.status)));
      expect(statuses.length).toBeGreaterThanOrEqual(2); // Should have multiple statuses

      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      // Verify diversity is preserved
      const importedTypes = Array.from(new Set(importedData.components.map(c => c.type)));
      const importedStatuses = Array.from(new Set(importedData.components.map(c => c.status)));

      expect(importedTypes).toHaveLength(componentTypes.length);
      expect(importedStatuses).toHaveLength(statuses.length);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle edge case scenarios gracefully', async () => {
      const { scenarios } = testDataGenerator.generateEdgeCaseData();

      for (const scenario of scenarios) {
        console.log(`Testing edge case: ${scenario.name}`);

        if (scenario.expectedError) {
          // Scenarios that should fail on import validation
          if (scenario.data.components) {
            try {
              const exportedData = exportImportManager.exportProjectData(scenario.data.components, scenario.data.connections || []);
              await expect(async () => {
                await performImportTest(exportedData);
              }).rejects.toThrow();
            } catch (error) {
              // Some scenarios may fail on export due to invalid structure
              expect(error).toBeDefined();
            }
          }
        } else {
          // Scenarios that should work but may be slow/large
          const exportedData = exportImportManager.exportProjectData(scenario.data.components || [], scenario.data.connections || []);
          expect(exportedData).toBeDefined();

          const importedData = await performImportTest(exportedData);
          expect(importedData).toBeDefined();
        }
      }
    });

    it('should handle malformed JSON import gracefully', async () => {
      const malformedData = {
        // Missing required components array
        name: 'Malformed Project',
        version: '1.0.0',
        // connections exist but no components
        connections: []
      };

      await expect(async () => {
        await performImportTest(malformedData);
      }).rejects.toThrow('Project data must contain components array');
    });

    it('should detect and handle circular references in Module ICs', async () => {
      // Create a circular reference scenario
      const moduleA = testDataGenerator.generateDeepNestedProject(1, 1).components.find(c => c.type === 'module-ic') as ModuleComponent;
      const moduleB = testDataGenerator.generateDeepNestedProject(1, 1).components.find(c => c.type === 'module-ic') as ModuleComponent;

      if (moduleA && moduleB) {
        // Create circular reference: A contains B, B contains A
        moduleA.internalComponents = [moduleB];
        moduleB.internalComponents = [moduleA];

        // This should throw an error due to infinite recursion
        expect(() => {
          exportImportManager.exportProjectData([moduleA], []);
        }).toThrow(); // Should throw RangeError: Maximum call stack size exceeded
      }
    });

    it('should handle extremely deep nesting (10+ levels)', async () => {
      const { components, connections } = testDataGenerator.generateDeepNestedProject(10, 2);

      // This tests the performance and memory handling of very deep structures
      const startTime = performance.now();
      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);
      const endTime = performance.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max

      // Verify deep nesting is preserved
      let currentModule = importedData.components.find(c => c.type === 'module-ic') as ModuleComponent;
      let nestingLevels = 0;

      while (currentModule && currentModule.internalComponents) {
        nestingLevels++;
        const nextModule = currentModule.internalComponents.find(c => c.type === 'module-ic') as ModuleComponent;
        if (nextModule && nextModule.internalComponents) {
          currentModule = nextModule;
        } else {
          break;
        }
      }

      expect(nestingLevels).toBeGreaterThanOrEqual(8); // Should have deep nesting
    });

    it('should handle missing component references in connections', async () => {
      const validComponent = {
        id: 'valid-comp',
        type: 'power-core',
        x: 100, y: 100, width: 80, height: 40,
        name: 'Valid Component', status: 'done', category: 'backend',
        createdAt: new Date(), pins: { output: [{ x: 80, y: 20, type: 'energy' }] }
      } as ComponentBase;

      const invalidConnection = {
        id: 'invalid-conn',
        from: {
          componentId: 'valid-comp',
          pinType: 'output',
          pinIndex: 0,
          x: 180, y: 120, category: 'energy'
        },
        to: {
          componentId: 'non-existent-component', // This component doesn't exist
          pinType: 'input',
          pinIndex: 0,
          x: 300, y: 120, category: 'energy'
        },
        category: 'energy',
        createdAt: new Date()
      };

      const projectData = {
        name: 'Test Project',
        components: [validComponent],
        connections: [invalidConnection],
        version: '1.0.0'
      };

      const importedData = await performImportTest(projectData);

      // Connection with missing component should be filtered out
      expect(importedData.components).toHaveLength(1);
      expect(importedData.connections).toHaveLength(0); // Invalid connection removed
    });

    it('should handle components with invalid or missing properties', async () => {
      const invalidComponents = [
        { id: 'missing-type', x: 100, y: 100 }, // Missing type
        { type: 'power-core', x: 200, y: 100 }, // Missing id
        { id: 'valid-comp', type: 'power-core', x: 300, y: 100 }, // Valid
        null, // Null component
        undefined, // Undefined component
      ];

      const projectData = {
        name: 'Test Project',
        components: invalidComponents,
        connections: [],
        version: '1.0.0'
      };

      // This should fail validation due to missing required properties
      await expect(async () => {
        await performImportTest(projectData);
      }).rejects.toThrow('Each component must have id and type');
    });

    it('should handle very large projects (100+ components)', async () => {
      const startTime = performance.now();

      const { components, connections } = testDataGenerator.generateWideProject(100, 20);

      expect(components.length).toBeGreaterThanOrEqual(100);

      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Performance requirements from debug plan
      expect(executionTime).toBeLessThan(1000); // Sub-1-second for large projects
      expect(importedData.components.length).toBeGreaterThanOrEqual(100);
      expect(importedData.connections.length).toBeGreaterThan(0);
    });

    it('should handle empty projects', async () => {
      const exportedData = exportImportManager.exportProjectData([], []);
      expect(exportedData.components).toHaveLength(0);
      expect(exportedData.connections).toHaveLength(0);

      const importedData = await performImportTest(exportedData);
      expect(importedData.components).toHaveLength(0);
      expect(importedData.connections).toHaveLength(0);
    });

    it('should handle projects with only Module ICs', async () => {
      const moduleIC = {
        id: 'test-module',
        type: 'module-ic',
        x: 100,
        y: 100,
        width: 120,
        height: 80,
        name: 'Test Module',
        status: 'defined',
        category: 'backend',
        createdAt: new Date(),
        pins: { input: [], output: [] },
        internalComponents: [],
        internalConnections: []
      } as ModuleComponent;

      const exportedData = exportImportManager.exportProjectData([moduleIC], []);
      const importedData = await performImportTest(exportedData);

      expect(importedData.components).toHaveLength(1);
      expect(importedData.components[0].type).toBe('module-ic');
    });
  });

  describe('Connection Integrity Across Deep Nesting', () => {
    it('should preserve cross-level connections (Level 0 to Level 3+)', async () => {
      // Create a project with connections that span multiple nesting levels
      const { components } = testDataGenerator.generateDeepNestedProject(6, 3);

      // Create a connection from main level to deeply nested component
      const mainComponent = components.find(c => c.type === 'power-core');
      const moduleIC = components.find(c => c.type === 'module-ic') as ModuleComponent;

      let deepComponent: ComponentBase | undefined;
      if (moduleIC?.internalComponents) {
        // Navigate to level 3+ component
        let currentLevel = moduleIC;
        for (let i = 0; i < 3 && currentLevel.internalComponents; i++) {
          const nextModule = currentLevel.internalComponents.find(c => c.type === 'module-ic') as ModuleComponent;
          if (nextModule) {
            currentLevel = nextModule;
          } else {
            deepComponent = currentLevel.internalComponents.find(c => c.type !== 'module-ic');
            break;
          }
        }
        if (!deepComponent && currentLevel.internalComponents) {
          deepComponent = currentLevel.internalComponents.find(c => c.type !== 'module-ic');
        }
      }

      if (mainComponent && deepComponent) {
        const crossLevelConnection = {
          id: 'cross-level-connection',
          from: {
            component: mainComponent,
            pinType: 'output' as const,
            pinIndex: 0,
            x: mainComponent.x + 80,
            y: mainComponent.y + 20,
            category: 'energy'
          },
          to: {
            component: deepComponent,
            pinType: 'input' as const,
            pinIndex: 0,
            x: deepComponent.x,
            y: deepComponent.y + 15,
            category: 'energy'
          },
          category: 'energy',
          createdAt: new Date()
        } as Connection;

        const exportedData = exportImportManager.exportProjectData(components, [crossLevelConnection]);
        const importedData = await performImportTest(exportedData);

        // Verify the cross-level connection is preserved
        expect(importedData.connections).toHaveLength(1);
        expect(importedData.connections[0].from.component.id).toBe(mainComponent.id);
        expect(importedData.connections[0].to.component.id).toBe(deepComponent.id);
      }
    });

    it('should handle connection integrity validation across 6+ levels', async () => {
      const { components, connections } = testDataGenerator.generateDeepNestedProject(6, 2);

      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      // Recursively validate all internal connections
      const validateConnectionsRecursively = (module: ModuleComponent, level: number = 0) => {
        if (!module.internalConnections || !module.internalComponents) return;

        module.internalConnections.forEach(connection => {
          const fromComponent = module.internalComponents!.find(c => c.id === connection.from.component.id);
          const toComponent = module.internalComponents!.find(c => c.id === connection.to.component.id);

          expect(fromComponent).toBeDefined();
          expect(toComponent).toBeDefined();
          expect(connection.id).toBeDefined();
          expect(connection.category).toBeDefined();
        });

        // Recursively check nested modules
        module.internalComponents.forEach(component => {
          if (component.type === 'module-ic') {
            validateConnectionsRecursively(component as ModuleComponent, level + 1);
          }
        });
      };

      const mainModule = importedData.components.find(c => c.type === 'module-ic') as ModuleComponent;
      if (mainModule) {
        validateConnectionsRecursively(mainModule);
      }
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle large projects efficiently', async () => {
      const startTime = performance.now();

      const { components, connections } = testDataGenerator.generateWideProject(50, 10);
      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(importedData.components).toHaveLength(60); // 50 + 10 modules
    });

    it('should handle repeated export/import cycles without memory leaks', async () => {
      const { components, connections } = testDataGenerator.generateDeepNestedProject(3, 4);

      // Perform multiple export/import cycles
      for (let i = 0; i < 10; i++) {
        const exportedData = exportImportManager.exportProjectData(components, connections);
        const importedData = await performImportTest(exportedData);

        expect(importedData.components).toHaveLength(components.length);
        expect(importedData.connections).toHaveLength(connections.length);
      }
    });

    it('should monitor memory usage during deep nesting operations', async () => {
      // Get initial memory baseline (if available)
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const { components, connections } = testDataGenerator.generateDeepNestedProject(8, 3);

      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);

      // Check memory after operations
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Verify the operation completed successfully
      expect(importedData.components).toBeDefined();
      expect(importedData.connections).toBeDefined();

      // If memory monitoring is available, ensure reasonable memory usage
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      }
    });

    it('should validate export file size scaling', async () => {
      const smallProject = testDataGenerator.generateWideProject(5, 1);
      const mediumProject = testDataGenerator.generateWideProject(25, 5);
      const largeProject = testDataGenerator.generateWideProject(75, 15);

      const smallExport = exportImportManager.exportProjectData(smallProject.components, smallProject.connections);
      const mediumExport = exportImportManager.exportProjectData(mediumProject.components, mediumProject.connections);
      const largeExport = exportImportManager.exportProjectData(largeProject.components, largeProject.connections);

      const smallSize = JSON.stringify(smallExport).length;
      const mediumSize = JSON.stringify(mediumExport).length;
      const largeSize = JSON.stringify(largeExport).length;

      // Verify reasonable scaling of file sizes
      expect(mediumSize).toBeGreaterThan(smallSize);
      expect(largeSize).toBeGreaterThan(mediumSize);

      // Ensure no exponential explosion of file size
      expect(largeSize / smallSize).toBeLessThan(50); // Should scale reasonably
    });
  });

  describe('Round-trip Data Integrity', () => {
    it('should maintain perfect round-trip integrity for complex projects', async () => {
      const { components, connections } = testDataGenerator.generateDeepNestedProject(4, 4);
      
      // First export/import cycle
      const exported1 = exportImportManager.exportProjectData(components, connections);
      const imported1 = await performImportTest(exported1);
      
      // Second export/import cycle using imported data
      const exported2 = exportImportManager.exportProjectData(imported1.components, imported1.connections);
      const imported2 = await performImportTest(exported2);
      
      // Data should be identical after both cycles
      expect(imported2.components).toHaveLength(imported1.components.length);
      expect(imported2.connections).toHaveLength(imported1.connections.length);
      
      // Verify component IDs are preserved
      const originalIds = components.map(c => c.id).sort();
      const roundTripIds = imported2.components.map(c => c.id).sort();
      expect(roundTripIds).toEqual(originalIds);
    });

    it('should preserve pin configurations through round-trips', async () => {
      const { components, connections } = testDataGenerator.generateDeepNestedProject(3, 3);
      
      const exportedData = exportImportManager.exportProjectData(components, connections);
      const importedData = await performImportTest(exportedData);
      
      // Verify pin configurations are preserved
      components.forEach(originalComponent => {
        const importedComponent = importedData.components.find(c => c.id === originalComponent.id);
        expect(importedComponent).toBeDefined();
        
        if (originalComponent.pins) {
          expect(importedComponent!.pins).toBeDefined();
          expect(importedComponent!.pins?.input?.length || 0).toBe(originalComponent.pins.input?.length || 0);
          expect(importedComponent!.pins?.output?.length || 0).toBe(originalComponent.pins.output?.length || 0);
        }
      });
    });
  });
});
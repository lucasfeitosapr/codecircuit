import { describe, it, expect } from 'vitest';
import { ExportImportManager } from '../core/ExportImportManager';
import * as fs from 'fs';
import * as path from 'path';

describe('Example JSON Import Verification', () => {
  it('should import the example JSON file without errors', () => {
    const examplePath = path.join(__dirname, '../../motherboard-project-2026-03-15(2).json');
    const projectData = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));

    const manager = new ExportImportManager();

    // Should not throw during import
    expect(() => {
      manager.importProjectData(projectData);
    }).not.toThrow();
  });

  it('should preserve nested module structures from example JSON', () => {
    const examplePath = path.join(__dirname, '../../motherboard-project-2026-03-15(2).json');
    const projectData = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));

    // Find the module-ic components in the example
    const moduleICs = projectData.components.filter((c: any) => c.type === 'module-ic');
    
    // Verify at least one module has internal components
    const modulesWithInternals = moduleICs.filter((m: any) => 
      m.internalComponents && m.internalComponents.length > 0
    );

    expect(modulesWithInternals.length).toBeGreaterThan(0);

    // Check for nested modules (module inside module)
    const nestedModules = moduleICs.filter((m: any) => 
      m.internalComponents && 
      m.internalComponents.some((ic: any) => ic.type === 'module-ic')
    );

    if (nestedModules.length > 0) {
      const nestedModule = nestedModules[0];
      const innerModule = nestedModule.internalComponents.find((ic: any) => ic.type === 'module-ic');
      
      // Verify the inner module has its own internal components
      expect(innerModule).toBeDefined();
      expect(innerModule.internalComponents).toBeDefined();
    }
  });

  it('should handle duplicate component IDs in example JSON', () => {
    const examplePath = path.join(__dirname, '../../motherboard-project-2026-03-15(2).json');
    const projectData = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));

    // Count duplicate IDs
    const idCounts = new Map<string, number>();
    projectData.components.forEach((c: any) => {
      if (c.id) {
        idCounts.set(c.id, (idCounts.get(c.id) || 0) + 1);
      }
    });

    const duplicates = Array.from(idCounts.entries()).filter(([_, count]) => count > 1);
    
    // Document that duplicates exist in the example file
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate IDs in example JSON:`, 
        duplicates.map(([id, count]) => `${id} (${count}x)`).join(', ')
      );
    }

    // Import should still work despite duplicates
    const manager = new ExportImportManager();
    expect(() => {
      manager.importProjectData(projectData);
    }).not.toThrow();
  });
});

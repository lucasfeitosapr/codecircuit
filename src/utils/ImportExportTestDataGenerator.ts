import type { ComponentBase, ModuleComponent, Connection } from '../types';

/**
 * Import/Export Test Data Generator
 * 
 * Generates complex, realistic test data for debugging Import/Export functionality
 * with deep nesting scenarios, multiple component types, and complex connections.
 */
export class ImportExportTestDataGenerator {
  private componentIdCounter = 1000;
  private connectionIdCounter = 2000;

  /**
   * Generate a deep nested project structure
   * @param levels Number of nesting levels (recommended: 4-6)
   * @param componentsPerLevel Number of components per level (recommended: 2-5)
   */
  generateDeepNestedProject(levels: number = 4, componentsPerLevel: number = 3): {
    components: ComponentBase[];
    connections: Connection[];
    metadata: any;
  } {
    const components: ComponentBase[] = [];
    const connections: Connection[] = [];
    const metadata = {
      scenario: 'deep-nested',
      levels,
      componentsPerLevel,
      generatedAt: new Date().toISOString(),
    };

    // Create main level components with Module ICs
    const mainModuleIC = this.createModuleIC({
      x: 200,
      y: 100,
      name: `Level 0 - Main System`,
      description: 'Top level system container'
    });

    components.push(mainModuleIC);

    // Create power source at main level
    const mainPowerCore = this.createPowerCore({
      x: 50,
      y: 100,
      name: 'Main Power Supply',
      status: 'done'
    });
    components.push(mainPowerCore);

    // Connect power to main module
    connections.push(this.createConnection(mainPowerCore, mainModuleIC, 'energy'));

    // Recursively create nested levels
    this.generateNestedLevel(mainModuleIC, 1, levels, componentsPerLevel);

    return {
      components,
      connections,
      metadata
    };
  }

  /**
   * Generate a wide project with many components at main level
   * @param mainComponents Number of components at main level
   * @param moduleComponents Number of Module ICs with internal components
   */
  generateWideProject(mainComponents: number = 25, moduleComponents: number = 6): {
    components: ComponentBase[];
    connections: Connection[];
    metadata: any;
  } {
    const components: ComponentBase[] = [];
    const connections: Connection[] = [];
    const metadata = {
      scenario: 'wide-project',
      mainComponents,
      moduleComponents,
      generatedAt: new Date().toISOString(),
    };

    // Create main level components in a grid layout
    const componentTypes = ['power-core', 'task-resistor', 'decision-point', 'gateway'];
    const statuses = ['todo', 'in-progress', 'done'];
    const categories = ['frontend', 'backend', 'database', 'security'];

    for (let i = 0; i < mainComponents; i++) {
      const x = (i % 8) * 120 + 50;
      const y = Math.floor(i / 8) * 80 + 50;
      const type = componentTypes[i % componentTypes.length];
      const status = statuses[i % statuses.length];
      const category = categories[i % categories.length];

      const component = this.createComponentByType(type, {
        x,
        y,
        name: `Component ${i + 1}`,
        status,
        category,
        description: `Generated component ${i + 1} for wide project testing`
      });

      components.push(component);
    }

    // Create Module ICs with internal components
    for (let i = 0; i < moduleComponents; i++) {
      const x = 50 + i * 150;
      const y = 400;

      const moduleIC = this.createModuleIC({
        x,
        y,
        name: `Module System ${i + 1}`,
        description: `Module IC ${i + 1} with internal components`
      });

      // Add internal components
      const internalComponents = [];
      const internalConnections = [];

      for (let j = 0; j < 5; j++) {
        const internalComponent = this.createComponentByType(
          componentTypes[j % componentTypes.length],
          {
            x: 30 + j * 80,
            y: 30 + (j % 2) * 60,
            name: `Internal ${j + 1}`,
            status: statuses[j % statuses.length],
            category: categories[j % categories.length]
          }
        );
        internalComponents.push(internalComponent);
      }

      // Create internal connections
      for (let j = 0; j < internalComponents.length - 1; j++) {
        internalConnections.push(
          this.createConnection(internalComponents[j], internalComponents[j + 1], 'data')
        );
      }

      moduleIC.internalComponents = internalComponents;
      moduleIC.internalConnections = internalConnections;
      components.push(moduleIC);
    }

    // Create connections between main components
    this.generateComplexConnections(components, connections);

    return {
      components,
      connections,
      metadata
    };
  }

  /**
   * Generate edge case test data for error handling
   */
  generateEdgeCaseData(): {
    scenarios: Array<{
      name: string;
      description: string;
      data: any;
      expectedError?: string;
    }>;
  } {
    return {
      scenarios: [
        {
          name: 'Missing Component ID',
          description: 'Component without ID should be handled gracefully',
          data: {
            components: [
              {
                // Missing id property
                type: 'power-core',
                x: 100,
                y: 100,
                name: 'Invalid Component'
              }
            ],
            connections: []
          },
          expectedError: 'Component missing required ID'
        },
        {
          name: 'Circular Module Reference',
          description: 'Module IC containing itself (circular reference)',
          data: this.generateCircularReference(),
          expectedError: 'Circular reference detected'
        },
        {
          name: 'Invalid Connection Reference',
          description: 'Connection referencing non-existent component',
          data: {
            components: [this.createPowerCore({ x: 100, y: 100, name: 'Valid Component' })],
            connections: [
              {
                id: 'invalid-connection',
                from: {
                  componentId: 'non-existent-component',
                  pinType: 'output',
                  pinIndex: 0
                },
                to: {
                  componentId: 'also-non-existent',
                  pinType: 'input',
                  pinIndex: 0
                }
              }
            ]
          },
          expectedError: 'Invalid component reference in connection'
        },
        {
          name: 'Extremely Deep Nesting',
          description: 'Test performance with 10-level deep nesting',
          data: this.generateDeepNestedProject(10, 2),
          expectedError: undefined // Should not error, but may be slow
        },
        {
          name: 'Malformed JSON Structure',
          description: 'Invalid JSON structure should be handled',
          data: {
            // Missing required fields
            version: '1.0.0'
            // Missing components, connections, etc.
          },
          expectedError: 'Invalid project structure'
        }
      ]
    };
  }

  /**
   * Generate realistic connections between components
   */
  private generateComplexConnections(components: ComponentBase[], connections: Connection[]): void {
    const powerCores = components.filter(c => c.type === 'power-core');
    const otherComponents = components.filter(c => c.type !== 'power-core');

    // Connect power cores to other components
    powerCores.forEach((powerCore, index) => {
      const startIndex = index * Math.floor(otherComponents.length / powerCores.length);
      const endIndex = Math.min(startIndex + 3, otherComponents.length);

      for (let i = startIndex; i < endIndex; i++) {
        connections.push(this.createConnection(powerCore, otherComponents[i], 'energy'));
      }
    });

    // Create data flow connections
    const dataProducers = components.filter(c => c.type === 'gateway' || c.type === 'module-ic');
    const dataConsumers = components.filter(c => c.type === 'task-resistor' || c.type === 'decision-point');

    dataProducers.forEach((producer, index) => {
      if (index < dataConsumers.length) {
        connections.push(this.createConnection(producer, dataConsumers[index], 'data'));
      }
    });
  }

  /**
   * Recursively generate nested levels
   */
  private generateNestedLevel(
    parentModule: ModuleComponent,
    currentLevel: number,
    maxLevels: number,
    componentsPerLevel: number
  ): void {
    if (currentLevel >= maxLevels) return;

    const internalComponents: ComponentBase[] = [];
    const internalConnections: Connection[] = [];

    // Create components for this level
    for (let i = 0; i < componentsPerLevel; i++) {
      const x = 50 + i * 100;
      const y = 30 + (currentLevel % 2) * 80;

      let component: ComponentBase;

      if (i === 0 && currentLevel < maxLevels - 1) {
        // First component is a Module IC for deeper nesting
        component = this.createModuleIC({
          x,
          y,
          name: `Level ${currentLevel} Module ${i + 1}`,
          description: `Nested module at level ${currentLevel}`
        });

        // Recursively create deeper levels
        this.generateNestedLevel(component as ModuleComponent, currentLevel + 1, maxLevels, componentsPerLevel);
      } else {
        // Other components are various types
        const types = ['task-resistor', 'decision-point', 'gateway', 'power-core'];
        const type = types[i % types.length];
        component = this.createComponentByType(type, {
          x,
          y,
          name: `Level ${currentLevel} ${type} ${i + 1}`,
          status: i % 2 === 0 ? 'done' : 'in-progress'
        });
      }

      internalComponents.push(component);
    }

    // Create connections within this level
    for (let i = 0; i < internalComponents.length - 1; i++) {
      internalConnections.push(
        this.createConnection(internalComponents[i], internalComponents[i + 1], 'data')
      );
    }

    parentModule.internalComponents = internalComponents;
    parentModule.internalConnections = internalConnections;
  }

  /**
   * Create a Module IC component
   */
  private createModuleIC(config: {
    x: number;
    y: number;
    name: string;
    description?: string;
  }): ModuleComponent {
    return {
      id: `module-ic-${this.componentIdCounter++}`,
      type: 'module-ic',
      x: config.x,
      y: config.y,
      width: 120,
      height: 80,
      name: config.name,
      title: config.name,
      description: config.description || '',
      status: 'defined',
      category: 'backend',
      color: '#4A90E2',
      pins: {
        input: [{ x: 0, y: 40, type: 'energy', label: 'Power In' }],
        output: [{ x: 120, y: 40, type: 'data', label: 'Data Out' }]
      },
      createdAt: new Date(),
      internalComponents: [],
      internalConnections: [],
      pinMap: {}
    } as ModuleComponent;
  }

  /**
   * Create a Power Core component
   */
  private createPowerCore(config: {
    x: number;
    y: number;
    name: string;
    status?: string;
  }): ComponentBase {
    return {
      id: `power-core-${this.componentIdCounter++}`,
      type: 'power-core',
      x: config.x,
      y: config.y,
      width: 80,
      height: 40,
      name: config.name,
      title: config.name,
      status: config.status || 'done',
      category: 'backend',
      color: '#FFD700',
      pins: {
        output: [{ x: 80, y: 20, type: 'energy', label: 'Power Out' }]
      },
      createdAt: new Date()
    };
  }

  /**
   * Create component by type
   */
  private createComponentByType(type: string, config: any): ComponentBase {
    const baseConfig = {
      id: `${type}-${this.componentIdCounter++}`,
      type,
      x: config.x,
      y: config.y,
      name: config.name,
      title: config.name,
      status: config.status || 'defined',
      category: config.category || 'frontend',
      description: config.description || '',
      createdAt: new Date()
    };

    switch (type) {
      case 'power-core':
        return {
          ...baseConfig,
          width: 80,
          height: 40,
          color: '#FFD700',
          pins: {
            output: [{ x: 80, y: 20, type: 'energy', label: 'Power' }]
          }
        };

      case 'task-resistor':
        return {
          ...baseConfig,
          width: 100,
          height: 30,
          color: '#E74C3C',
          pins: {
            input: [{ x: 0, y: 15, type: 'data', label: 'Input' }],
            output: [{ x: 100, y: 15, type: 'data', label: 'Output' }]
          }
        };

      case 'decision-point':
        return {
          ...baseConfig,
          width: 60,
          height: 60,
          color: '#4ECDC4',
          pins: {
            input: [{ x: 30, y: 0, type: 'data', label: 'Condition' }],
            output: [
              { x: 60, y: 30, type: 'success', label: 'TRUE' },
              { x: 0, y: 30, type: 'failure', label: 'FALSE' }
            ]
          }
        };

      case 'gateway':
        return {
          ...baseConfig,
          width: 90,
          height: 50,
          color: '#9B59B6',
          pins: {
            input: [{ x: 0, y: 25, type: 'data', label: 'Request' }],
            output: [{ x: 90, y: 25, type: 'data', label: 'Response' }]
          }
        };

      default:
        return baseConfig as ComponentBase;
    }
  }

  /**
   * Create a connection between two components
   */
  private createConnection(from: ComponentBase, to: ComponentBase, category: string): Connection {
    return {
      id: `connection-${this.connectionIdCounter++}`,
      from: {
        component: from,
        pinType: 'output' as const,
        pinIndex: 0,
        x: from.x + (from.width || 80),
        y: from.y + (from.height || 40) / 2,
        category
      },
      to: {
        component: to,
        pinType: 'input' as const,
        pinIndex: 0,
        x: to.x,
        y: to.y + (to.height || 40) / 2,
        category
      },
      category,
      createdAt: new Date()
    } as Connection;
  }

  /**
   * Generate circular reference for testing
   */
  private generateCircularReference(): any {
    const moduleA = this.createModuleIC({
      x: 100,
      y: 100,
      name: 'Module A'
    });

    const moduleB = this.createModuleIC({
      x: 250,
      y: 100,
      name: 'Module B'
    });

    // Create circular reference: A contains B, B contains A
    moduleA.internalComponents = [moduleB];
    moduleB.internalComponents = [moduleA]; // This creates the circle

    return {
      components: [moduleA],
      connections: []
    };
  }
}
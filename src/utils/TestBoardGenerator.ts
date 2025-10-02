/**
 * Test Board Generator - Create boards for performance testing
 * 
 * Generates realistic test scenarios with various component counts
 * and connection densities for performance profiling
 */

import type { ComponentBase, Connection } from '../types';

export interface TestBoardConfig {
  componentCount: number;
  connectionDensity: 'sparse' | 'medium' | 'dense';
  includeModuleICs: boolean;
  nestingDepth: number;
}

export class TestBoardGenerator {
  private idCounter = 0;
  
  /**
   * Generate a test board with specified configuration
   */
  generateBoard(config: TestBoardConfig): { components: ComponentBase[]; connections: Connection[] } {
    this.idCounter = 0;
    const components: ComponentBase[] = [];
    
    // Distribute component types realistically
    const typeDistribution = {
      'power-core': 0.15,      // 15% power cores
      'task-resistor': 0.50,   // 50% task resistors
      'module-ic': 0.20,       // 20% module ICs
      'decision-point': 0.15,  // 15% decision points
    };
    
    // Generate components
    for (let i = 0; i < config.componentCount; i++) {
      const type = this.selectComponentType(i / config.componentCount, typeDistribution);
      const component = this.createComponent(type, i, config);
      components.push(component);
    }
    
    // Generate connections based on density
    const connections = this.generateConnections(components, config.connectionDensity);
    
    return { components, connections };
  }
  
  /**
   * Create a component of specified type
   */
  private createComponent(type: string, index: number, config: TestBoardConfig): ComponentBase {
    const gridSize = Math.ceil(Math.sqrt(config.componentCount));
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    const baseComponent: ComponentBase = {
      id: `test-${type}-${this.idCounter++}`,
      type,
      x: col * 200 + 50,
      y: row * 150 + 50,
      width: 120,
      height: 80,
      name: `${type}-${index}`,
      title: `Test ${type} ${index}`,
      status: this.randomStatus(),
      category: this.randomCategory(),
      pins: this.generatePins(type),
      icon: this.getIconForType(type),
      color: this.getColorForType(type),
      createdAt: Date.now(),
    };
    
    return baseComponent;
  }
  
  /**
   * Generate connections between components
   */
  private generateConnections(
    components: ComponentBase[],
    density: 'sparse' | 'medium' | 'dense'
  ): Connection[] {
    const connections: Connection[] = [];
    
    // Determine connection count based on density
    const densityMultiplier = {
      'sparse': 1.2,   // ~1.2 connections per component
      'medium': 2.0,   // ~2 connections per component
      'dense': 3.5,    // ~3.5 connections per component
    };
    
    const targetConnections = Math.floor(components.length * densityMultiplier[density]);
    
    for (let i = 0; i < targetConnections; i++) {
      const from = components[Math.floor(Math.random() * components.length)];
      const to = components[Math.floor(Math.random() * components.length)];
      
      // Skip self-connections
      if (from.id === to.id) continue;
      
      // Check if both have appropriate pins
      if (!from.pins?.output || !to.pins?.input) continue;
      
      const connection: Connection = {
        id: `test-conn-${i}`,
        from: {
          component: from,
          pinType: 'output',
          pinIndex: 0,
          x: from.x + (from.pins.output[0]?.x || 0),
          y: from.y + (from.pins.output[0]?.y || 0),
        },
        to: {
          component: to,
          pinType: 'input',
          pinIndex: 0,
          x: to.x + (to.pins.input[0]?.x || 0),
          y: to.y + (to.pins.input[0]?.y || 0),
        },
        category: from.category,
      };
      
      connections.push(connection);
    }
    
    return connections;
  }
  
  /**
   * Select component type based on distribution
   */
  private selectComponentType(
    progress: number,
    distribution: Record<string, number>
  ): string {
    let cumulative = 0;
    for (const [type, percentage] of Object.entries(distribution)) {
      cumulative += percentage;
      if (progress <= cumulative) {
        return type;
      }
    }
    return 'task-resistor'; // Default
  }
  
  /**
   * Generate pins for component type
   */
  private generatePins(type: string): any {
    switch (type) {
      case 'power-core':
        return {
          output: [{ x: 120, y: 40 }],
        };
      
      case 'task-resistor':
        return {
          input: [{ x: 0, y: 40 }],
          output: [{ x: 120, y: 40 }],
        };
      
      case 'decision-point':
        return {
          input: [{ x: 0, y: 40 }],
          output: [
            { x: 120, y: 30, type: 'success' },
            { x: 120, y: 50, type: 'failure' },
          ],
        };
      
      case 'module-ic':
        return {
          input: [{ x: 0, y: 40 }],
          output: [{ x: 120, y: 40 }],
        };
      
      default:
        return {
          input: [{ x: 0, y: 40 }],
          output: [{ x: 120, y: 40 }],
        };
    }
  }
  
  /**
   * Random status for variety
   */
  private randomStatus(): string {
    const statuses = ['defined', 'todo', 'in-progress', 'done'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
  
  /**
   * Random category for variety
   */
  private randomCategory(): string {
    const categories = ['frontend', 'backend', 'infrastructure', 'testing'];
    return categories[Math.floor(Math.random() * categories.length)];
  }
  
  /**
   * Get icon for component type
   */
  private getIconForType(type: string): string {
    const icons: Record<string, string> = {
      'power-core': '✨',
      'task-resistor': '🔧',
      'decision-point': '◆',
      'module-ic': '📦',
    };
    return icons[type] || '⚙️';
  }
  
  /**
   * Get color for component type
   */
  private getColorForType(type: string): string {
    const colors: Record<string, string> = {
      'power-core': '#00ff88',
      'task-resistor': '#00aaff',
      'decision-point': '#ffaa00',
      'module-ic': '#aa88ff',
    };
    return colors[type] || '#00ff88';
  }
  
  /**
   * Preset configurations for common test scenarios
   */
  static readonly presets = {
    small: {
      componentCount: 25,
      connectionDensity: 'medium' as const,
      includeModuleICs: false,
      nestingDepth: 0,
    },
    medium: {
      componentCount: 100,
      connectionDensity: 'medium' as const,
      includeModuleICs: true,
      nestingDepth: 2,
    },
    large: {
      componentCount: 200,
      connectionDensity: 'medium' as const,
      includeModuleICs: true,
      nestingDepth: 3,
    },
    xlarge: {
      componentCount: 500,
      connectionDensity: 'sparse' as const,
      includeModuleICs: true,
      nestingDepth: 2,
    },
    stress: {
      componentCount: 500,
      connectionDensity: 'dense' as const,
      includeModuleICs: true,
      nestingDepth: 4,
    },
  };
}

// Export singleton instance
export const testBoardGenerator = new TestBoardGenerator();

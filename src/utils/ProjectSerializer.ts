// Project Serialization and Deserialization Module
// Extracted from main.ts to improve maintainability and testability

import { ComponentBase, ModuleComponent, Connection } from '../types.d';

export class ProjectSerializer {
  /**
   * Serialize components with their complete internal structures
   */
  static serializeComponents(components: ComponentBase[]): any[] {
    return components.map(component => {
      const serialized: any = {
        id: component.id,
        type: component.type,
        x: component.x,
        y: component.y,
        width: component.width,
        height: component.height,
        name: component.name,
        title: component.title,
        icon: component.icon,
        color: component.color,
        pins: component.pins,
        status: component.status,
        category: component.category,
        description: component.description,
        createdAt: component.createdAt,
      };

      // Handle Module IC internal structures
      if (component.type === 'module-ic') {
        const moduleComponent = component as ModuleComponent;
        if (moduleComponent.internalComponents) {
          serialized.internalComponents = this.serializeComponents(
            moduleComponent.internalComponents
          );
        }
        if (moduleComponent.internalConnections) {
          serialized.internalConnections = this.serializeConnections(
            moduleComponent.internalConnections
          );
        }
        if (moduleComponent.pinMap) {
          serialized.pinMap = moduleComponent.pinMap;
        }
      }

      return serialized;
    });
  }

  /**
   * Serialize connections with component references
   */
  static serializeConnections(connections: Connection[]): any[] {
    return connections.map(connection => ({
      id: connection.id,
      from: {
        componentId: connection.from.component.id,
        pinType: connection.from.pinType,
        pinIndex: connection.from.pinIndex,
        x: connection.from.x,
        y: connection.from.y,
        category: connection.from.category,
      },
      to: {
        componentId: connection.to.component.id,
        pinType: connection.to.pinType,
        pinIndex: connection.to.pinIndex,
        x: connection.to.x,
        y: connection.to.y,
        category: connection.to.category,
      },
      category: connection.category,
      createdAt: connection.createdAt,
    }));
  }

  /**
   * Deserialize components and rebuild internal structures
   */
  static deserializeComponents(componentsData: any[]): ComponentBase[] {
    return componentsData.map(data => {
      const component: ComponentBase = {
        id: data.id,
        type: data.type,
        x: data.x,
        y: data.y,
        width: data.width,
        height: data.height,
        name: data.name,
        title: data.title,
        icon: data.icon,
        color: data.color,
        pins: data.pins,
        status: data.status || 'defined',
        category: data.category || 'frontend',
        description: data.description || '',
        createdAt: data.createdAt || new Date(),
      };

      // Handle Module IC internal structures
      if (data.type === 'module-ic') {
        const moduleComponent = component as ModuleComponent;

        if (data.internalComponents) {
          moduleComponent.internalComponents = this.deserializeComponents(data.internalComponents);
        }

        if (data.internalConnections) {
          moduleComponent.internalConnections = this.deserializeConnections(
            data.internalConnections,
            moduleComponent.internalComponents || []
          );
        }

        if (data.pinMap) {
          moduleComponent.pinMap = data.pinMap;
        }
      }

      return component;
    });
  }

  /**
   * Deserialize connections and rebuild component references
   */
  static deserializeConnections(connectionsData: any[], components: ComponentBase[]): Connection[] {
    return connectionsData
      .map(data => {
        const fromComponent = this.findComponentById(data.from.componentId, components);
        const toComponent = this.findComponentById(data.to.componentId, components);

        if (!fromComponent || !toComponent) {
          console.warn('Warning: Could not find component for connection', data.id);
          return null;
        }

        return {
          id: data.id,
          from: {
            component: fromComponent,
            pinType: data.from.pinType,
            pinIndex: data.from.pinIndex,
            x: data.from.x,
            y: data.from.y,
            category: data.from.category,
          },
          to: {
            component: toComponent,
            pinType: data.to.pinType,
            pinIndex: data.to.pinIndex,
            x: data.to.x,
            y: data.to.y,
            category: data.to.category,
          },
          category: data.category,
          createdAt: data.createdAt,
        };
      })
      .filter(conn => conn !== null) as Connection[];
  }

  /**
   * Helper to find component by ID recursively
   */
  static findComponentById(id: string, components: ComponentBase[]): ComponentBase | null {
    for (const component of components) {
      if (component.id === id) {
        return component;
      }

      // Search in internal components for Module ICs
      if (component.type === 'module-ic') {
        const moduleComponent = component as ModuleComponent;
        if (moduleComponent.internalComponents) {
          const found = this.findComponentById(id, moduleComponent.internalComponents);
          if (found) return found;
        }
      }
    }
    return null;
  }

  /**
   * Import and validate project data structure
   */
  static importProjectData(projectData: any): {
    components: ComponentBase[];
    connections: Connection[];
  } {
    try {
      let components: ComponentBase[] = [];
      let connections: Connection[] = [];

      // Deserialize components
      if (projectData.components) {
        components = this.deserializeComponents(projectData.components);
      }

      // Deserialize connections
      if (projectData.connections) {
        connections = this.deserializeConnections(projectData.connections, components);
      }

      console.log('✅ Project data deserialized successfully');
      return { components, connections };
    } catch (error) {
      console.error('❌ Failed to deserialize project data:', error);
      throw error;
    }
  }
}

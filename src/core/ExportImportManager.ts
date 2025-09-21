import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, Connection, ModuleComponent } from '../types';

/**
 * ExportImportManager - Phase 5 Legacy Code Extraction
 * 
 * Handles all project serialization, export, and import functionality for the Living Blueprint system.
 * Extracted from the monolithic MotherboardApp as part of Phase 5 modularization.
 * 
 * Responsibilities:
 * - Project data serialization and deserialization
 * - File export/import with browser download/upload
 * - Component and connection deep serialization
 * - Internal component structure handling (Module ICs)
 * - Data validation and error recovery
 * - Backward compatibility with existing project formats
 * 
 * Event-driven: Emits import/export events through the global EventBus
 * instead of directly manipulating application state.
 */
export class ExportImportManager {
  private projectName: string = 'Motherboard Project';
  private projectVersion: string = '1.0.0';

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for export/import requests
   */
  private setupEventListeners(): void {
    // Listen for export/import requests from UI or other modules
    eventBus.on(Events.PROJECT_EXPORT_REQUESTED, (payload: { filename?: string; timestamp: number }) => {
      this.exportProject(payload.filename);
    });

    eventBus.on(Events.PROJECT_IMPORT_REQUESTED, (payload: { timestamp: number }) => {
      this.importFromFile();
    });

    eventBus.on(Events.PROJECT_DATA_EXPORT_REQUESTED, (payload: { components: any[], connections: any[], callback: (data: any) => void, timestamp: number }) => {
      const projectData = this.exportProjectData(payload.components, payload.connections);
      payload.callback(projectData);
    });

    eventBus.on(Events.PROJECT_DATA_IMPORT_REQUESTED, (payload: { projectData: any, timestamp: number }) => {
      this.importProjectData(payload.projectData);
    });
  }

  /**
   * Export project to JSON file download
   */
  public exportProject(filename?: string): void {
    try {
      // Request current project state from the application
      eventBus.emit(Events.PROJECT_STATE_REQUEST, {
        callback: (components: ComponentBase[], connections: Connection[]) => {
          const projectData = this.exportProjectData(components, connections);
          this.downloadProjectFile(projectData, filename);
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Failed to export project:', error);
      eventBus.emit(Events.SystemError, {
        error,
        context: 'ExportImportManager.exportProject',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Create project data object from components and connections
   */
  public exportProjectData(components: ComponentBase[], connections: Connection[]): any {
    try {
      const projectData = {
        name: this.projectName,
        created: new Date().toISOString(),
        components: this.serializeComponents(components),
        connections: this.serializeConnections(connections),
        version: this.projectVersion,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedFrom: 'Living Blueprint v2.0',
          totalComponents: components.length,
          totalConnections: connections.length,
        }
      };

      eventBus.emit(Events.PROJECT_EXPORTED, {
        projectData,
        componentCount: components.length,
        connectionCount: connections.length,
        timestamp: Date.now()
      });

      return projectData;
    } catch (error) {
      console.error('❌ Failed to export project data:', error);
      eventBus.emit(Events.SystemError, {
        error,
        context: 'ExportImportManager.exportProjectData',
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Serialize components including internal structures
   */
  private serializeComponents(components: ComponentBase[]): any[] {
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
  private serializeConnections(connections: Connection[]): any[] {
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
   * Download project data as JSON file
   */
  private downloadProjectFile(projectData: any, filename?: string): void {
    try {
      const defaultFilename = `${this.projectName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      const finalFilename = filename || defaultFilename;

      const dataStr = JSON.stringify(projectData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      eventBus.emit(Events.PROJECT_DOWNLOAD_COMPLETED, {
        filename: finalFilename,
        size: dataStr.length,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Failed to download project file:', error);
      eventBus.emit(Events.SystemError, {
        error,
        context: 'ExportImportManager.downloadProjectFile',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Import project from file upload
   */
  public importFromFile(): void {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.style.display = 'none';
      
      input.addEventListener('change', (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          this.readProjectFile(file);
        }
      });
      
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
      
    } catch (error) {
      console.error('❌ Failed to create file input:', error);
      eventBus.emit(Events.SystemError, {
        error,
        context: 'ExportImportManager.importFromFile',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Read and parse project file
   */
  private readProjectFile(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const projectData = JSON.parse(event.target?.result as string);
        this.importProjectData(projectData);
      } catch (error) {
        console.error('❌ Error parsing project file:', error);
        eventBus.emit(Events.PROJECT_IMPORT_ERROR, {
          error: 'Invalid JSON format in project file',
          filename: file.name,
          timestamp: Date.now()
        });
      }
    };

    reader.onerror = () => {
      console.error('❌ Error reading project file:', file.name);
      eventBus.emit(Events.PROJECT_IMPORT_ERROR, {
        error: 'Failed to read project file',
        filename: file.name,
        timestamp: Date.now()
      });
    };

    reader.readAsText(file);
  }

  /**
   * Import project data and rebuild application state
   */
  public importProjectData(projectData: any): void {
    try {
      // Validate project data
      this.validateProjectData(projectData);

      // Deserialize components
      const components = projectData.components 
        ? this.deserializeComponents(projectData.components)
        : [];

      // Deserialize connections
      const connections = projectData.connections 
        ? this.deserializeConnections(projectData.connections, components)
        : [];

      // Update project metadata
      if (projectData.name) {
        this.projectName = projectData.name;
      }
      if (projectData.version) {
        this.projectVersion = projectData.version;
      }

      // Emit import completion event with new project state
      eventBus.emit(Events.PROJECT_IMPORTED, {
        components,
        connections,
        projectData,
        componentCount: components.length,
        connectionCount: connections.length,
        timestamp: Date.now()
      });

      console.log('✅ Project imported successfully');

    } catch (error) {
      console.error('❌ Failed to import project:', error);
      eventBus.emit(Events.PROJECT_IMPORT_ERROR, {
        error: error instanceof Error ? error.message : 'Unknown import error',
        projectData,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * Validate project data format
   */
  private validateProjectData(projectData: any): void {
    if (!projectData || typeof projectData !== 'object') {
      throw new Error('Invalid project data format');
    }

    if (!Array.isArray(projectData.components)) {
      throw new Error('Project data must contain components array');
    }

    if (projectData.connections && !Array.isArray(projectData.connections)) {
      throw new Error('Project connections must be an array');
    }

    // Validate component structure
    for (const component of projectData.components) {
      if (!component.id || !component.type) {
        throw new Error('Each component must have id and type');
      }
    }
  }

  /**
   * Deserialize components and rebuild internal structures
   */
  private deserializeComponents(componentsData: any[]): ComponentBase[] {
    return componentsData.map(data => {
      const component: ComponentBase = {
        id: data.id,
        type: data.type,
        x: data.x || 0,
        y: data.y || 0,
        width: data.width || 100,
        height: data.height || 50,
        name: data.name || data.title || 'Unnamed Component',
        title: data.title || data.name || 'Unnamed Component',
        icon: data.icon || '⚡',
        color: data.color || '#ffaa00',
        pins: data.pins || {},
        status: data.status || 'defined',
        category: data.category || 'frontend',
        description: data.description || '',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
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
  private deserializeConnections(
    connectionsData: any[],
    components: ComponentBase[]
  ): Connection[] {
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
          createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        };
      })
      .filter(conn => conn !== null) as Connection[];
  }

  /**
   * Helper to find component by ID recursively
   */
  private findComponentById(id: string, components: ComponentBase[]): ComponentBase | null {
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
   * Get project metadata
   */
  public getProjectInfo(): { name: string; version: string } {
    return {
      name: this.projectName,
      version: this.projectVersion
    };
  }

  /**
   * Set project metadata
   */
  public setProjectInfo(name: string, version?: string): void {
    this.projectName = name;
    if (version) {
      this.projectVersion = version;
    }
  }

  /**
   * Create project backup data
   */
  public createBackup(components: ComponentBase[], connections: Connection[]): string {
    try {
      const backupData = {
        ...this.exportProjectData(components, connections),
        backup: true,
        backupCreatedAt: new Date().toISOString(),
      };
      
      return JSON.stringify(backupData);
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Restore from backup data
   */
  public restoreFromBackup(backupData: string): void {
    try {
      const projectData = JSON.parse(backupData);
      if (!projectData.backup) {
        throw new Error('Invalid backup format');
      }
      
      this.importProjectData(projectData);
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Note: EventBus doesn't provide a way to remove all handlers for an event
    // This would need to be enhanced if we need proper cleanup
    // For now, this is a placeholder for future cleanup implementation
  }
}
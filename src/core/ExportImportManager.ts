import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import { ExportConfig } from '../config/exportConfig';
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
 * 
 * Phase 2B: Added circular reference detection and depth limiting
 */
export interface ExportImportAppHooks {
  getCurrentView: () => { type: string; component?: any; components: any[]; connections: any[] };
  getComponents: () => ComponentBase[];
  getConnections: () => Connection[];
  findComponentDeep: (id: string) => ComponentBase | undefined;
  setComponents: (components: ComponentBase[], emitEvents?: boolean) => void;
  setConnections: (connections: Connection[]) => void;
  setSelectedComponent: (component: ComponentBase | null) => void;
  initializeMainView: () => void;
  setCamera: (camera: { x: number; y: number; zoom: number }) => void;
  rebuildSpatialIndex: (components: ComponentBase[]) => void;
  pushHistorySnapshot: () => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

export class ExportImportManager {
  private projectName: string = 'Motherboard Project';
  private projectVersion: string = '1.0.0';
  private visitedComponents: Set<string> = new Set();
  private hooks: ExportImportAppHooks | null = null;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Phase 4: Wire app-level event handlers that were previously in main.ts.
   * Call this after all managers are initialized.
   */
  wireAppHandlers(hooks: ExportImportAppHooks): void {
    this.hooks = hooks;

    // Handle requests for current project state (export needs live data)
    eventBus.on(
      Events.PROJECT_STATE_REQUEST,
      (payload: { callback: (components: any[], connections: any[]) => void }) => {
        const currentView = hooks.getCurrentView();
        if (currentView.type === 'schematic' && currentView.component) {
          currentView.component.internalComponents = [...currentView.components];
          currentView.component.internalConnections = [...currentView.connections];
        }
        payload.callback(hooks.getComponents(), hooks.getConnections());
      }
    );

    // Handle project import completion
    eventBus.on(Events.PROJECT_IMPORTED, (payload: { components: any[]; connections: any[] }) => {
      hooks.pushHistorySnapshot();
      // Use emitEvents=false to prevent duplicate ComponentCreated events during bulk import
      hooks.setComponents(payload.components, false);
      hooks.setConnections(payload.connections);
      hooks.setSelectedComponent(null);
      hooks.initializeMainView();
      hooks.setCamera({ x: 0, y: 0, zoom: 1 });
      hooks.rebuildSpatialIndex(payload.components);
    });

    // Handle import errors
    eventBus.on(Events.PROJECT_IMPORT_ERROR, (payload: { error: string }) => {
      hooks.showError(`Import Error: ${payload.error}`);
    });

    // Handle export completion
    eventBus.on(
      Events.PROJECT_EXPORTED,
      (payload: { componentCount: number; connectionCount: number }) => {
        hooks.showSuccess(
          `Project exported: ${payload.componentCount} components, ${payload.connectionCount} connections`
        );
      }
    );
  }

  /**
   * Setup event listeners for export/import requests
   */
  private setupEventListeners(): void {
    // Listen for export/import requests from UI or other modules
    eventBus.on(
      Events.PROJECT_EXPORT_REQUESTED,
      (payload: { filename?: string; timestamp: number }) => {
        this.exportProject(payload.filename);
      }
    );

    eventBus.on(Events.PROJECT_IMPORT_REQUESTED, (payload: { timestamp: number }) => {
      this.importFromFile();
    });

    eventBus.on(
      Events.PROJECT_DATA_EXPORT_REQUESTED,
      (payload: {
        components: any[];
        connections: any[];
        callback: (data: any) => void;
        timestamp: number;
      }) => {
        const projectData = this.exportProjectData(payload.components, payload.connections);
        payload.callback(projectData);
      }
    );

    eventBus.on(
      Events.PROJECT_DATA_IMPORT_REQUESTED,
      (payload: { projectData: any; timestamp: number }) => {
        this.importProjectData(payload.projectData);
      }
    );
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
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('❌ Failed to export project:', error);
      eventBus.emit(Events.SystemError, {
        error,
        context: 'ExportImportManager.exportProject',
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Create project data object from components and connections
   */
  public exportProjectData(components: ComponentBase[], connections: Connection[]): any {
    // Reset visited set before each export (Phase 2B)
    this.visitedComponents.clear();
    
    try {
      // Validate input parameters
      if (!Array.isArray(components)) {
        throw new Error('Components must be an array');
      }
      if (!Array.isArray(connections)) {
        throw new Error('Connections must be an array');
      }

      const serializedComponents = this.serializeComponents(components);
      const serializedConnections = this.serializeConnections(connections);

      const projectData = {
        name: this.projectName,
        created: new Date().toISOString(),
        components: serializedComponents,
        connections: serializedConnections,
        version: this.projectVersion,
        metadata: {
          exportedAt: new Date().toISOString(),
          exportedFrom: 'Living Blueprint v2.0',
          totalComponents: serializedComponents.length,
          totalConnections: serializedConnections.length,
        },
      };

      eventBus.emit(Events.PROJECT_EXPORTED, {
        projectData,
        componentCount: components.length,
        connectionCount: connections.length,
        timestamp: Date.now(),
      });

      return projectData;
    } catch (error) {
      console.error('❌ Failed to export project data:', error);
      eventBus.emit(Events.SystemError, {
        error,
        context: 'ExportImportManager.exportProjectData',
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  /**
   * Serialize components including internal structures
   * Phase 2B: Added circular reference detection and depth limiting
   */
  private serializeComponents(components: ComponentBase[], depth = 0): any[] {
    // Prevent infinite recursion on deep nesting (Phase 2B)
    if (depth > ExportConfig.MAX_NESTING_DEPTH) {
      if (ExportConfig.VERBOSE_LOGGING) {
        console.warn(`⚠️ Maximum nesting depth (${ExportConfig.MAX_NESTING_DEPTH}) reached, truncating deeper levels`);
      }
      return [];
    }

    return components
      .filter(component => {
        // Filter out null/undefined components
        if (!component || !component.id) return false;
        
        // Check for circular references (Phase 2B)
        if (ExportConfig.DETECT_CIRCULAR_REFS && this.visitedComponents.has(component.id)) {
          console.warn(`⚠️ Circular reference detected for component: ${component.id}, skipping to prevent stack overflow`);
          return false;
        }
        
        return true;
      })
      .map(component => {
        // Mark as visited (Phase 2B)
        this.visitedComponents.add(component.id);
        
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
            // Recursively serialize with depth tracking (Phase 2B)
            serialized.internalComponents = this.serializeComponents(
              moduleComponent.internalComponents,
              depth + 1
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
   * Phase 2B: Added validation for component references
   */
  private serializeConnections(connections: Connection[]): any[] {
    return connections
      .filter(connection => {
        // Validate connection structure (Phase 2B)
        if (!connection || !connection.from || !connection.to) {
          if (ExportConfig.VERBOSE_LOGGING) {
            console.warn('⚠️ Skipping malformed connection:', connection);
          }
          return false;
        }
        
        // Validate component references exist (Phase 2B)
        if (!connection.from.component || !connection.from.component.id) {
          console.warn('⚠️ Skipping connection with invalid from component');
          return false;
        }
        
        if (!connection.to.component || !connection.to.component.id) {
          console.warn('⚠️ Skipping connection with invalid to component');
          return false;
        }
        
        return true;
      })
      .map(connection => ({
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
      const defaultFilename = `${this.projectName.toLowerCase().replace(/\s+/g, '-')}-${
        new Date().toISOString().split('T')[0]
      }.json`;
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
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('❌ Failed to download project file:', error);
      eventBus.emit(Events.SystemError, {
        error,
        context: 'ExportImportManager.downloadProjectFile',
        timestamp: Date.now(),
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

      input.addEventListener('change', e => {
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
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Read and parse project file
   */
  private readProjectFile(file: File): void {
    const reader = new FileReader();

    reader.onload = event => {
      try {
        const projectData = JSON.parse(event.target?.result as string);
        this.importProjectData(projectData);
      } catch (error) {
        console.error('❌ Error parsing project file:', error);
        eventBus.emit(Events.PROJECT_IMPORT_ERROR, {
          error: 'Invalid JSON format in project file',
          filename: file.name,
          timestamp: Date.now(),
        });
      }
    };

    reader.onerror = () => {
      console.error('❌ Error reading project file:', file.name);
      eventBus.emit(Events.PROJECT_IMPORT_ERROR, {
        error: 'Failed to read project file',
        filename: file.name,
        timestamp: Date.now(),
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
      const allComponents = projectData.components
        ? this.deserializeComponents(projectData.components)
        : [];

      // Filter out internal components that appear at the root level
      // These should only exist inside their parent Module ICs
      const mainLevelComponents = this.filterMainLevelComponents(allComponents);

      // Deserialize connections using all components for reference resolution
      const connections = projectData.connections
        ? this.deserializeConnections(projectData.connections, allComponents)
        : [];

      // Update project metadata
      if (projectData.name) {
        this.projectName = projectData.name;
      }
      if (projectData.version) {
        this.projectVersion = projectData.version;
      }

      // Emit import completion event with filtered main-level components
      eventBus.emit(Events.PROJECT_IMPORTED, {
        components: mainLevelComponents,
        connections,
        projectData,
        componentCount: mainLevelComponents.length,
        connectionCount: connections.length,
        timestamp: Date.now(),
      });

      console.log('✅ Project imported successfully');
    } catch (error) {
      console.error('❌ Failed to import project:', error);
      eventBus.emit(Events.PROJECT_IMPORT_ERROR, {
        error: error instanceof Error ? error.message : 'Unknown import error',
        projectData,
        timestamp: Date.now(),
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
        const fromComponent =
          this.hooks?.findComponentDeep(data.from.componentId) ||
          this.findComponentById(data.from.componentId, components);
        const toComponent =
          this.hooks?.findComponentDeep(data.to.componentId) ||
          this.findComponentById(data.to.componentId, components);

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
   * Filter main-level components, removing any that should be internal to Module ICs
   */
  private filterMainLevelComponents(allComponents: ComponentBase[]): ComponentBase[] {
    // Collect all IDs of components that should be internal
    const internalComponentIds = new Set<string>();

    allComponents.forEach(component => {
      if (component.type === 'module-ic') {
        const moduleComponent = component as ModuleComponent;
        if (moduleComponent.internalComponents) {
          moduleComponent.internalComponents.forEach(internal => {
            internalComponentIds.add(internal.id);
          });
        }
      }
    });

    // Return only components that are not marked as internal
    const mainComponents = allComponents.filter(comp => !internalComponentIds.has(comp.id));

    console.log(
      `🔧 Filtered components: ${allComponents.length} total → ${mainComponents.length} main-level (${internalComponentIds.size} internal)`
    );

    return mainComponents;
  }

  /**
   * @deprecated Import-only fallback for resolving freshly deserialized
   * components that are not yet present in AppStateManager. Prefer
   * AppStateManager.findComponentDeep() via hooks.findComponentDeep.
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
      version: this.projectVersion,
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

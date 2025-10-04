import { EventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, ViewState, ModuleComponent } from '../types';
import RuntimeLayer from '../rendering/layers/RuntimeLayer';
import { SpatialIndex } from '../utils/SpatialIndex';
import { PerformanceConfig } from '../config/performanceConfig';
import { connectionRenderer } from '../ui/rendererHelpers';
import { logger } from '../utils/Logger';

/**
 * ComponentLifecycleManager - Phase 6C Component Extraction
 *
 * Manages the complete lifecycle of components including:
 * - Component creation and initialization
 * - Status management with visual effects
 * - Hit testing and selection
 * - Component validation and business rules
 * - Event-driven architecture integration
 */
export class ComponentLifecycleManager {
  private runtimeLayer: RuntimeLayer;
  private componentTypes: Record<string, any>;
  private categories: Record<string, any>;
  private spatialIndex: SpatialIndex | null = null;

  constructor(
    private eventBus: EventBus,
    runtimeLayer: RuntimeLayer,
    componentTypes: Record<string, any>,
    categories: Record<string, any>
  ) {
    this.runtimeLayer = runtimeLayer;
    this.componentTypes = componentTypes;
    this.categories = categories;

    // Initialize spatial index if enabled
    if (PerformanceConfig.ENABLE_SPATIAL_INDEXING) {
      this.initializeSpatialIndex();
    }

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for component lifecycle events
   */
  private setupEventHandlers(): void {
    // Listen for component creation requests
    this.eventBus.on(Events.COMPONENT_CREATE_REQUESTED, (payload: any) => {
      this.handleComponentCreateRequest(payload);
    });

    // Listen for status toggle requests
    this.eventBus.on(Events.COMPONENT_STATUS_TOGGLE_REQUESTED, (payload: any) => {
      this.handleStatusToggleRequest(payload);
    });

    // Listen for component selection requests
    this.eventBus.on(Events.COMPONENT_SELECTED, (payload: any) => {
      this.handleComponentSelection(payload);
    });
  }

  /**
   * Handle component creation request event
   */
  private handleComponentCreateRequest(payload: any): void {
    const { type, x, y, currentView } = payload;
    if (type && typeof x === 'number' && typeof y === 'number' && currentView) {
      this.createComponent(type, x, y, currentView);
    }
  }

  /**
   * Handle status toggle request event
   */
  private handleStatusToggleRequest(payload: any): void {
    const { component } = payload;
    if (component) {
      this.toggleComponentStatus(component);
    }
  }

  /**
   * Handle component selection event
   */
  private handleComponentSelection(payload: any): void {
    // Component selection logic can be extended here
    // Currently handled by the main application
  }

  /**
   * Create a new component and add it to the specified view
   */
  createComponent(
    type: string,
    x: number,
    y: number,
    currentView: ViewState
  ): ComponentBase | null {
    const template = this.componentTypes[type];
    if (!template) {
      console.warn(`Component type '${type}' not found`);
      return null;
    }

    // Business rule: In schematic view, allow Task Resistors and Module ICs, but not Power Cores
    if (currentView.type === 'schematic' && type === 'power-core') {
      console.log('Power Cores only allowed on main board');
      return null;
    }

    const components = this.getCurrentViewComponents(currentView);

    // Ensure required numeric fields exist (template may be Partial<ComponentBase>)
    const width = template.width ?? 60;
    const height = template.height ?? 20;
    const pins = template.pins ?? { input: [], output: [] };

    const component: ComponentBase = {
      id: this.generateId(),
      type,
      x,
      y,
      width,
      height,
      pins,
      name: template.name,
      icon: template.icon,
      color: template.color,
      status: 'defined', // default to defined instead of 'todo'
      title: `${template.name ?? type} ${components.length + 1}`,
      description: '',
      category: 'frontend', // Default category
      createdAt: new Date(),
    };

    // Add internal components and connections for Module ICs
    if (type === 'module-ic') {
      (component as ModuleComponent).internalComponents = [];
      (component as ModuleComponent).internalConnections = [];
    }

    // Add component to view
    components.push(component);

    // Add to spatial index if enabled
    if (PerformanceConfig.ENABLE_SPATIAL_INDEXING && this.spatialIndex) {
      this.spatialIndex.insert(component);
    }

    // Add runtime effects for new component
    this.addComponentCreationEffects(component);

    // Emit component created event
    this.emitComponentCreated(component);

    return component;
  }

  /**
   * Toggle component status through the defined lifecycle
   */
  toggleComponentStatus(component: ComponentBase): void {
    const statusCycle = ['defined', 'todo', 'in-progress', 'done'];
    const currentIndex = statusCycle.indexOf(component.status ?? 'defined');
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    const oldStatus = component.status;
    component.status = statusCycle[nextIndex];

    // Add runtime effects for status changes
    this.addStatusChangeEffects(component, oldStatus);

    // Emit component updated event
    this.emitComponentUpdated(component, { status: component.status });
  }

  /**
   * Find component at specified coordinates (optimized with spatial indexing)
   */
  getComponentAt(x: number, y: number, currentView: ViewState): ComponentBase | null {
    // Use spatial index if available and enabled
    if (PerformanceConfig.ENABLE_SPATIAL_INDEXING && this.spatialIndex) {
      const candidates = this.spatialIndex.queryPoint(x, y);

      // Filter to current view and check precise hit testing
      const viewComponents = this.getCurrentViewComponents(currentView);
      const viewComponentSet = new Set(viewComponents);

      // Iterate from top to bottom (last drawn = topmost)
      for (let i = candidates.length - 1; i >= 0; i--) {
        const comp = candidates[i];
        if (viewComponentSet.has(comp) && this.isPointInComponent(x, y, comp)) {
          return comp;
        }
      }

      return null;
    }

    // Fallback to linear search
    return this.getComponentAtLinear(x, y, currentView);
  }

  /**
   * Legacy linear search (fallback when spatial indexing disabled)
   */
  private getComponentAtLinear(x: number, y: number, currentView: ViewState): ComponentBase | null {
    const components = this.getCurrentViewComponents(currentView);

    // Iterate from top to bottom (last drawn = topmost)
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      if (this.isPointInComponent(x, y, comp)) {
        return comp;
      }
    }

    return null;
  }

  /**
   * Check if a point is within a component's bounds
   */
  private isPointInComponent(x: number, y: number, component: ComponentBase): boolean {
    return (
      x >= component.x &&
      x <= component.x + component.width &&
      y >= component.y &&
      y <= component.y + component.height
    );
  }

  /**
   * Get components for the current view
   */
  getCurrentViewComponents(currentView: ViewState): ComponentBase[] {
    // For component lifecycle operations, always use the view's component array
    // The view-aware logic is handled at a higher level in main.ts
    return currentView.components;
  }

  /**
   * Validate component creation parameters
   */
  validateComponentCreation(type: string, x: number, y: number, currentView: ViewState): boolean {
    // Check if component type exists
    if (!this.componentTypes[type]) {
      return false;
    }

    // Check view-specific business rules
    if (currentView.type === 'schematic' && type === 'power-core') {
      return false;
    }

    // Check for valid coordinates
    if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
      return false;
    }

    return true;
  }

  /**
   * Add visual effects when creating a component
   */
  private addComponentCreationEffects(component: ComponentBase): void {
    const centerX = component.x + component.width / 2;
    const centerY = component.y + component.height / 2;

    this.runtimeLayer.glowEffect(centerX, centerY, component.color, 1000);
    this.runtimeLayer.pulseComponent(component.id, component.color, 800);
  }

  /**
   * Add visual effects when changing component status
   */
  private addStatusChangeEffects(component: ComponentBase, oldStatus?: string): void {
    const centerX = component.x + component.width / 2;
    const centerY = component.y + component.height / 2;

    if (component.status === 'done' && oldStatus !== 'done') {
      // Success effect when completing
      this.runtimeLayer.sparkEffect(centerX, centerY, '#00ff88');
      this.runtimeLayer.pulseComponent(component.id, '#00ff88', 600);
    } else if (component.status === 'in-progress' && oldStatus !== 'in-progress') {
      // Progress effect when starting
      this.runtimeLayer.pulseComponent(component.id, '#ffaa00', 400);
    } else if (component.status === 'todo' && oldStatus !== 'todo') {
      // Task effect when marking as todo
      this.runtimeLayer.glowEffect(centerX, centerY, '#4488ff', 500);
    }
  }

  /**
   * Emit component created event
   */
  private emitComponentCreated(component: ComponentBase): void {
    try {
      this.eventBus.emit(Events.ComponentCreated, {
        id: component.id,
        type: component.type,
        model: component,
        source: 'lifecycle-manager',
      });
    } catch (err) {
      console.error('Failed to emit ComponentCreated from ComponentLifecycleManager', err);
    }
  }

  /**
   * Emit component updated event
   */
  private emitComponentUpdated(component: ComponentBase, changes: Record<string, any>): void {
    try {
      this.eventBus.emit(Events.ComponentUpdated, {
        id: component.id,
        changes,
        source: 'lifecycle-manager',
      });

      // Update spatial index if component moved
      if (PerformanceConfig.ENABLE_SPATIAL_INDEXING && this.spatialIndex &&
          (changes.x !== undefined || changes.y !== undefined || changes.width !== undefined || changes.height !== undefined)) {
        this.spatialIndex.remove(component);
        this.spatialIndex.insert(component);
      }
    } catch (err) {
      console.error('Failed to emit ComponentUpdated from ComponentLifecycleManager', err);
    }
  }

  /**
   * Generate unique component ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Get available component types
   */
  getComponentTypes(): Record<string, any> {
    return { ...this.componentTypes };
  }

  /**
   * Get available categories
   */
  getCategories(): Record<string, any> {
    return { ...this.categories };
  }

  /**
   * Update component properties
   */
  updateComponent(component: ComponentBase, updates: Partial<ComponentBase>): void {
    const changes: Record<string, any> = {};

    // Apply valid updates
    Object.keys(updates).forEach(key => {
      if (key in component) {
        const oldValue = (component as any)[key];
        (component as any)[key] = (updates as any)[key];
        changes[key] = (updates as any)[key];

        // Add visual effects for specific property changes
        if (key === 'status' && oldValue !== updates[key]) {
          this.addStatusChangeEffects(component, oldValue);
        }

        // Invalidate connection cache if position changed (Performance optimization)
        if ((key === 'x' || key === 'y') && oldValue !== updates[key]) {
          if (PerformanceConfig.ENABLE_CONNECTION_CACHING) {
            connectionRenderer.markComponentMoved(component.id);
          }
        }
      }
    });

    // Emit update event if changes were made
    if (Object.keys(changes).length > 0) {
      this.emitComponentUpdated(component, changes);
    }
  }

  /**
   * Check if component can be placed at coordinates
   */
  canPlaceComponent(type: string, x: number, y: number, currentView: ViewState): boolean {
    return this.validateComponentCreation(type, x, y, currentView);
  }

  /**
   * Get component by ID from current view
   */
  getComponentById(id: string, currentView: ViewState): ComponentBase | null {
    const components = this.getCurrentViewComponents(currentView);
    return components.find(comp => comp.id === id) || null;
  }

  /**
   * Initialize spatial index for fast hit testing
   */
  private initializeSpatialIndex(): void {
    // Create spatial index with generous bounds (will auto-expand as needed)
    const bounds = { x: -5000, y: -5000, width: 10000, height: 10000 };
    this.spatialIndex = new SpatialIndex(bounds);
    logger.info('spatial', 'Spatial index initialized for fast hit testing');
  }

  /**
   * Rebuild spatial index with all current components
   */
  rebuildSpatialIndex(allComponents: ComponentBase[]): void {
    if (!PerformanceConfig.ENABLE_SPATIAL_INDEXING || !this.spatialIndex) {
      return;
    }

    this.spatialIndex.rebuild(allComponents);
    logger.throttle('spatial', `Spatial index rebuilt with ${allComponents.length} components`);
  }

  /**
   * Remove component from spatial index
   */
  removeFromSpatialIndex(component: ComponentBase): void {
    if (PerformanceConfig.ENABLE_SPATIAL_INDEXING && this.spatialIndex) {
      this.spatialIndex.remove(component);
    }
  }

  /**
   * Get spatial index statistics
   */
  getSpatialIndexStats(): any {
    if (!PerformanceConfig.ENABLE_SPATIAL_INDEXING || !this.spatialIndex) {
      return { enabled: false };
    }

    return {
      enabled: true,
      ...this.spatialIndex.getStats(),
    };
  }
}

/**
 * Factory function to create ComponentLifecycleManager
 */
export function createComponentLifecycleManager(
  eventBus: EventBus,
  runtimeLayer: RuntimeLayer,
  componentTypes: Record<string, any>,
  categories: Record<string, any>
): ComponentLifecycleManager {
  return new ComponentLifecycleManager(eventBus, runtimeLayer, componentTypes, categories);
}

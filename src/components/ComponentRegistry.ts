// ComponentRegistry.ts - Event-driven plugin registry
// Phase 1: Event-Driven Architecture Foundation

import { BaseComponentPlugin } from './plugins/BaseComponentPlugin';
import { EventBus } from '../events/EventBus';
import { Events, PluginRegisteredPayload, PluginUnregisteredPayload } from '../events/eventTypes';

/**
 * ComponentRegistry - The core of our event-driven architecture
 *
 * This class eliminates the manual coordination problem we experienced with DecisionPointPlugin.
 * Instead of requiring changes in 5+ files, plugin registration now triggers automatic
 * coordination via events.
 *
 * Before: DecisionPointPlugin required manual changes in:
 * - main.ts (componentTypes)
 * - main.ts (componentSystem.register)
 * - index.html (parts tray)
 * - ImplementationHelpers.ts (rendering)
 * - Tests (type references)
 *
 * After: Single registration line triggers all coordination automatically
 */
export class ComponentRegistry {
  private plugins: Map<string, BaseComponentPlugin> = new Map();
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Register a plugin - THE SINGLE COORDINATION POINT
   * This method eliminates the 5-file manual coordination problem
   */
  register(plugin: BaseComponentPlugin): void {
    if (this.plugins.has(plugin.type)) {
      console.warn(`Plugin ${plugin.type} already registered, skipping`);
      return;
    }

    // 1. Store the plugin
    this.plugins.set(plugin.type, plugin);

    // 2. Emit coordination event - this is the magic!
    // All other systems listen to this event and update automatically
    const payload: PluginRegisteredPayload = {
      pluginType: plugin.type,
      metadata: plugin.getMetadata(),
      timestamp: Date.now(),
    };

    this.eventBus.emit(Events.PLUGIN_REGISTERED, payload);

    console.log(`✅ Plugin registered: ${plugin.metadata.displayName} (${plugin.type})`);
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginType: string): void {
    if (!this.plugins.has(pluginType)) {
      console.warn(`Plugin ${pluginType} not found for unregistration`);
      return;
    }

    this.plugins.delete(pluginType);

    const payload: PluginUnregisteredPayload = {
      pluginType,
      timestamp: Date.now(),
    };

    this.eventBus.emit(Events.PLUGIN_UNREGISTERED, payload);

    console.log(`✅ Plugin unregistered: ${pluginType}`);
  }

  /**
   * Get a registered plugin
   */
  get(pluginType: string): BaseComponentPlugin | undefined {
    return this.plugins.get(pluginType);
  }

  /**
   * Check if a plugin is registered
   */
  has(pluginType: string): boolean {
    return this.plugins.has(pluginType);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): BaseComponentPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin types
   */
  getPluginTypes(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugin metadata for UI coordination
   */
  getPluginMetadata(): Array<{ type: string; metadata: any }> {
    return Array.from(this.plugins.entries()).map(([type, plugin]) => ({
      type,
      metadata: plugin.getMetadata(),
    }));
  }

  /**
   * Create a component using the registered plugin
   */
  createComponent(type: string, config: any): any {
    const plugin = this.plugins.get(type);
    if (!plugin) {
      throw new Error(`No plugin registered for component type: ${type}`);
    }

    if (plugin.createComponent) {
      return plugin.createComponent(config);
    }

    throw new Error(`Plugin ${type} does not support component creation`);
  }

  /**
   * Get render instructions for a component
   */
  getRenderInstructions(component: any): any[] {
    const plugin = this.plugins.get(component.type);
    if (!plugin) {
      console.warn(`No plugin found for component type: ${component.type}`);
      return [];
    }

    return plugin.getRenderInstructions(component);
  }
}

// Singleton instance for global access
let componentRegistryInstance: ComponentRegistry | null = null;

/**
 * Factory function to create/get the ComponentRegistry singleton
 */
export function createComponentRegistry(eventBus: EventBus): ComponentRegistry {
  if (!componentRegistryInstance) {
    componentRegistryInstance = new ComponentRegistry(eventBus);
  }
  return componentRegistryInstance;
}

/**
 * Get the global ComponentRegistry instance
 */
export function getComponentRegistry(): ComponentRegistry {
  if (!componentRegistryInstance) {
    throw new Error('ComponentRegistry not initialized. Call createComponentRegistry first.');
  }
  return componentRegistryInstance;
}

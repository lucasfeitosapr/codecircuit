// BaseComponentPlugin.ts - Abstract base class for component plugins
// Phase 1: Event-Driven Architecture Foundation

import { ComponentBase } from '../../types';
import { PluginMetadata } from '../../events/eventTypes';

export interface RenderInstruction {
  type: 'legacy-render' | 'custom-render' | 'delegated-render';
  render: (ctx: CanvasRenderingContext2D, frame: any) => void;
}

/**
 * Abstract base class for all component plugins
 * Provides consistent interface while wrapping existing plugin implementations
 */
export abstract class BaseComponentPlugin {
  abstract type: string;
  abstract metadata: PluginMetadata;
  
  /**
   * Factory method for creating components
   * Wraps existing createComponent functions
   */
  createComponent?(config: any): ComponentBase;
  
  /**
   * Returns render instructions for this component type
   * Default implementation wraps existing render functions
   */
  getRenderInstructions(component: ComponentBase): RenderInstruction[] {
    return [{
      type: 'legacy-render',
      render: (ctx, frame) => this.renderComponent(ctx, frame, component)
    }];
  }
  
  /**
   * Override this method to wrap existing render functions
   * Examples: renderDecisionPoint(), renderComponent() delegation
   */
  protected renderComponent(ctx: CanvasRenderingContext2D, frame: any, component: ComponentBase): void {
    // Default implementation - override in subclasses
    console.warn(`No render implementation for plugin type: ${this.type}`);
  }
  
  /**
   * Serialization - wraps existing serialize functions
   */
  serialize?(component: ComponentBase): any;
  
  /**
   * Deserialization - wraps existing deserialize functions  
   */
  deserialize?(data: any): ComponentBase;
  
  /**
   * Lifecycle hooks - new in Phase 1, optional
   */
  onCreate?(component: ComponentBase): void;
  onUpdate?(component: ComponentBase, changes: any): void;
  onDestroy?(component: ComponentBase): void;
  
  /**
   * Event handling - Phase 2+
   */
  handleEvent?(event: any): boolean;
  
  /**
   * Returns plugin metadata for UI coordination
   */
  getMetadata(): PluginMetadata {
    return this.metadata;
  }
}

/**
 * Legacy plugin descriptor interface for backward compatibility
 * Allows gradual migration from existing PluginDescriptor exports
 */
export interface LegacyPluginDescriptor {
  id: string;
  displayName: string;
  render?: (ctx: any, frame: any, model?: any) => void;
  evaluate?: (model: any, emit: (event: string, payload?: any) => void) => void | Promise<void>;
  serialize?: (model: any) => any;
  deserialize?: (data: any) => any;
}
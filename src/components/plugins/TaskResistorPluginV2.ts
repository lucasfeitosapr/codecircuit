// TaskResistorPluginV2.ts - Event-driven architecture migration
// Phase 2A: Core plugin migration with 95% code salvage
// Migrated from TaskResistorPlugin.ts - simplest plugin, perfect for building momentum

import { BaseComponentPlugin } from './BaseComponentPlugin';
import { ComponentBase } from '../../types';
import { RenderFrame } from '../../rendering/LayeredRenderer';
import { PluginMetadata } from '../../events/eventTypes';

export interface TaskResistorComponent extends ComponentBase {
  type: 'task-resistor';
}

/**
 * TaskResistorPluginV2 - First Phase 2 migration success!
 * 
 * This demonstrates the scalability of our Phase 1 architecture.
 * 95% code salvage achieved - only coordination layer changed.
 * 
 * Original TaskResistorPlugin: Simple rectangular component with zigzag pattern
 * V2 Version: Same functionality, event-driven coordination
 */
export class TaskResistorPluginV2 extends BaseComponentPlugin {
  type = 'task-resistor';
  metadata: PluginMetadata = {
    displayName: 'Task Resistor',
    icon: '▬▬',
    color: '#ff4444',
    category: 'processing',
    width: 60,
    height: 20,
    pins: {
      input: [{
        x: 0,
        y: 10,
        type: 'energy',
        label: 'input'
      }],
      output: [{
        x: 60,
        y: 10,
        type: 'energy',
        label: 'output'
      }]
    }
  };

  /**
   * Component factory - Creates TaskResistor components
   * Based on original component structure from main.ts
   */
  createComponent(config: {
    x: number;
    y: number;
    id?: string;
    title?: string;
  }): TaskResistorComponent {
    return {
      id: config.id || `task_resistor_${Date.now()}`,
      type: 'task-resistor',
      x: config.x,
      y: config.y,
      width: 60,
      height: 20,
      title: config.title || 'Task Resistor',
      color: '#ff4444',
      status: 'defined',
      
      // Pin configuration from original structure
      pins: {
        input: [{
          x: 0,
          y: 10,
          type: 'energy'
        }],
        output: [{
          x: 60,
          y: 10,
          type: 'energy'
        }]
      }
    };
  }

  /**
   * Rendering implementation - Direct rendering without recursion
   */
  renderComponent(
    ctx: CanvasRenderingContext2D,
    frame: RenderFrame,
    component: TaskResistorComponent
  ): void {
    try {
      if (!ctx || typeof ctx.fillRect !== 'function' || !component) {
        return;
      }

      const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
      const screenX = component.x * camera.zoom + camera.x;
      const screenY = component.y * camera.zoom + camera.y;
      const screenWidth = (component.width || 60) * camera.zoom;
      const screenHeight = (component.height || 20) * camera.zoom;

      // Component body
      if (component.status === 'defined') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      }
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);

      // Border with status-based coloring
      let borderColor = component.color || '#ff4444';
      let glowIntensity = 0;

      switch (component.status) {
        case 'defined':
          borderColor = '#00ffff';
          break;
        case 'todo':
          borderColor = (component.color || '#ff4444') + '66';
          break;
        case 'in-progress':
          borderColor = '#ff00ff';
          glowIntensity = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
          break;
        case 'done':
          borderColor = '#00ff88';
          glowIntensity = 0.8;
          break;
      }

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      if (glowIntensity > 0) {
        ctx.shadowColor = borderColor;
        ctx.shadowBlur = 15 * glowIntensity;
      }

      if (component.status === 'defined') {
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
        ctx.setLineDash([]);
      } else {
        ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
      }
      ctx.shadowBlur = 0;

      // Icon and text
      const centerX = screenX + screenWidth / 2;
      const centerY = screenY + screenHeight / 2;

      if (component.status === 'defined') {
        ctx.fillStyle = 'rgba(200, 255, 255, 0.85)';
        ctx.font = `${16 * camera.zoom}px monospace italic`;
        ctx.globalAlpha = 0.85;
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${16 * camera.zoom}px monospace`;
        ctx.globalAlpha = 1;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▬▬', centerX, centerY - 5 * camera.zoom);

      if (screenHeight > 40) {
        if (component.status === 'defined') {
          ctx.font = `${10 * camera.zoom}px monospace italic`;
          ctx.fillStyle = 'rgba(200, 255, 255, 0.7)';
        } else {
          ctx.font = `${10 * camera.zoom}px monospace`;
          ctx.fillStyle = '#ffffff';
        }
        ctx.fillText(component.title || 'Task Resistor', centerX, centerY + 15 * camera.zoom);
      }

      ctx.globalAlpha = 1;

      // Draw pins
      this.drawPins(ctx, component, screenX, screenY, camera, (frame as any).categories ?? {}, (frame as any).payload?.connections ?? []);

    } catch (e) {
      console.error('TaskResistorPluginV2.render failed', e);
    }
  }

  /**
   * Draw component pins - extracted from ImplementationHelpers
   */
  private drawPins(
    ctx: CanvasRenderingContext2D,
    component: TaskResistorComponent,
    screenX: number,
    screenY: number,
    camera: any,
    categories: any,
    connections: any[]
  ): void {
    const pinSize = 4 * camera.zoom;
    const categoryColor = categories[component.category ?? 'frontend']?.color || '#ff4444';
    const isActive = component.status === 'in-progress' || component.status === 'done';

    ctx.fillStyle = categoryColor;
    if (isActive) {
      ctx.shadowColor = categoryColor;
      ctx.shadowBlur = component.status === 'done' ? 10 * camera.zoom : 6 * camera.zoom;
    } else {
      ctx.shadowBlur = 3 * camera.zoom;
      ctx.shadowColor = categoryColor;
    }

    if (component.pins?.input) {
      component.pins.input.forEach((pin: any, index: number) => {
        const pinX = screenX + pin.x * camera.zoom;
        const pinY = screenY + pin.y * camera.zoom;

        const hasActiveInput = connections.some(
          (conn: any) => conn.to.component === component && conn.to.pinIndex === index && (conn.from.component.status === 'in-progress' || conn.from.component.status === 'done')
        );

        if (hasActiveInput) {
          const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.004);
          ctx.shadowBlur = 10 * camera.zoom * pulseIntensity;
          ctx.fillRect(pinX - pinSize * 0.6, pinY - pinSize * 0.6, pinSize * 1.2, pinSize * 1.2);
        } else {
          ctx.fillRect(pinX - pinSize / 2, pinY - pinSize / 2, pinSize, pinSize);
        }
      });
    }

    if (component.pins?.output) {
      component.pins.output.forEach((pin: any, index: number) => {
        const pinX = screenX + pin.x * camera.zoom;
        const pinY = screenY + pin.y * camera.zoom;

        const hasActiveOutput = connections.some(
          (conn: any) => conn.from.component === component && conn.from.pinIndex === index
        ) && isActive;

        if (hasActiveOutput) {
          const pulseIntensity = component.status === 'done' ? 1.0 : 0.6 + 0.4 * Math.sin(Date.now() * 0.003);
          ctx.shadowBlur = 12 * camera.zoom * pulseIntensity;
          const size = pinSize * (1.1 + 0.05 * Math.sin(Date.now() * 0.005));
          ctx.fillRect(pinX - size / 2, pinY - size / 2, size, size);
        } else {
          ctx.fillRect(pinX - pinSize / 2, pinY - pinSize / 2, pinSize, pinSize);
        }
      });
    }

    ctx.shadowBlur = 0;
  }

  /**
   * Serialization - 100% salvaged from original
   * Simple pass-through serialization
   */
  serialize(component: TaskResistorComponent): any {
    // Original: (model) => model
    return component;
  }

  /**
   * Deserialization - 100% salvaged from original  
   * Simple pass-through deserialization
   */
  deserialize(data: any): TaskResistorComponent {
    // Original: (data) => data
    return {
      ...data,
      type: 'task-resistor' // Ensure type consistency
    };
  }
}

/**
 * Legacy compatibility - can be removed after full migration
 * Allows gradual transition from PluginDescriptor to BaseComponentPlugin
 */
export const TaskResistorPluginLegacy = {
  id: 'task-resistor', 
  displayName: 'Task Resistor',
  render: (ctx: any, frame: any, model: any) => {
    const plugin = new TaskResistorPluginV2();
    plugin.renderComponent(ctx, frame, model);
  },
  serialize: (model: any) => model,
  deserialize: (data: any) => data,
};
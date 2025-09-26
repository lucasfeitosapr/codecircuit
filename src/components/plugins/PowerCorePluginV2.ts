// PowerCorePluginV2.ts - Event-driven architecture migration
// Phase 2A: Core plugin migration with 95% code salvage
// Migrated from PowerCorePlugin.ts - Energy source with output-only pins

import { BaseComponentPlugin } from './BaseComponentPlugin';
import { ComponentBase } from '../../types';
import { RenderFrame } from '../../rendering/LayeredRenderer';
import { PluginMetadata } from '../../events/eventTypes';

export interface PowerCoreComponent extends ComponentBase {
  type: 'power-core';
  energyOutput?: number; // Optional: energy generation capacity
}

/**
 * PowerCorePluginV2 - Phase 2A migration success #2!
 * 
 * Energy source component - the foundation of circuit power flow.
 * 95% code salvage achieved from original PowerCorePlugin.
 * 
 * Key characteristics:
 * - Output-only pins (energy source)
 * - Yellow/orange color scheme
 * - Square shape with energy symbol
 * - Central to power distribution workflows
 */
export class PowerCorePluginV2 extends BaseComponentPlugin {
  type = 'power-core';
  metadata: PluginMetadata = {
    displayName: 'Power Core',
    icon: '✨',
    color: '#ffaa00',
    category: 'energy',
    width: 80,
    height: 40,
    pins: {
      input: [], // Power cores are energy sources - no inputs
      output: [{
        x: 80,
        y: 20,
        type: 'energy',
        label: 'power'
      }]
    }
  };

  /**
   * Component factory - Creates PowerCore components
   * Based on original component structure from main.ts
   */
  createComponent(config: {
    x: number;
    y: number;
    id?: string;
    title?: string;
    energyOutput?: number;
  }): PowerCoreComponent {
    return {
      id: config.id || `power_core_${Date.now()}`,
      type: 'power-core',
      x: config.x,
      y: config.y,
      width: 80,
      height: 40,
      title: config.title || 'Power Core',
      color: '#ffaa00',
      status: 'defined',
      energyOutput: config.energyOutput || 100, // Default energy capacity
      
      // Pin configuration - output only (energy source)
      pins: {
        output: [{
          x: 80,
          y: 20,
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
    component: PowerCoreComponent
  ): void {
    try {
      if (!ctx || typeof ctx.fillRect !== 'function' || !component) {
        return;
      }

      const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
      const screenX = component.x * camera.zoom + camera.x;
      const screenY = component.y * camera.zoom + camera.y;
      const screenWidth = (component.width || 80) * camera.zoom;
      const screenHeight = (component.height || 40) * camera.zoom;

      // Component body
      if (component.status === 'defined') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      }
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);

      // Border with status-based coloring
      let borderColor = component.color || '#ffaa00';
      let glowIntensity = 0;

      switch (component.status) {
        case 'defined':
          borderColor = '#00ffff';
          break;
        case 'todo':
          borderColor = (component.color || '#ffaa00') + '66';
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
      ctx.fillText('✨', centerX, centerY - 5 * camera.zoom);

      if (screenHeight > 40) {
        if (component.status === 'defined') {
          ctx.font = `${10 * camera.zoom}px monospace italic`;
          ctx.fillStyle = 'rgba(200, 255, 255, 0.7)';
        } else {
          ctx.font = `${10 * camera.zoom}px monospace`;
          ctx.fillStyle = '#ffffff';
        }
        ctx.fillText(component.title || 'Power Core', centerX, centerY + 15 * camera.zoom);
      }

      ctx.globalAlpha = 1;

      // Draw pins
      this.drawPins(ctx, component, screenX, screenY, camera, (frame as any).categories ?? {}, (frame as any).payload?.connections ?? []);

    } catch (e) {
      console.error('PowerCorePluginV2.render failed', e);
    }
  }

  /**
   * Draw component pins - extracted from ImplementationHelpers
   */
  private drawPins(
    ctx: CanvasRenderingContext2D,
    component: PowerCoreComponent,
    screenX: number,
    screenY: number,
    camera: any,
    categories: any,
    connections: any[]
  ): void {
    const pinSize = 4 * camera.zoom;
    const categoryColor = categories[component.category ?? 'energy']?.color || '#ffaa00';
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
   * Simple pass-through serialization with energy state preservation
   */
  serialize(component: PowerCoreComponent): any {
    // Original: (model) => model
    return {
      ...component,
      // Preserve energy state for serialization
      energyOutput: component.energyOutput
    };
  }

  /**
   * Deserialization - 100% salvaged from original
   * Simple pass-through deserialization with energy state restoration
   */
  deserialize(data: any): PowerCoreComponent {
    // Original: (data) => data
    return {
      ...data,
      type: 'power-core', // Ensure type consistency
      energyOutput: data.energyOutput || 100 // Default if missing
    };
  }

  /**
   * Optional: Energy system integration (Phase 3+)
   * This would handle energy flow calculations in future phases
   */
  calculateEnergyOutput(component: PowerCoreComponent): number {
    // Future enhancement: dynamic energy calculation based on component state
    return component.energyOutput || 100;
  }
}

/**
 * Legacy compatibility - can be removed after full migration
 * Allows gradual transition from PluginDescriptor to BaseComponentPlugin
 */
export const PowerCorePluginLegacy = {
  id: 'power-core',
  displayName: 'Power Core', 
  render: (ctx: any, frame: any, model: any) => {
    const plugin = new PowerCorePluginV2();
    plugin.renderComponent(ctx, frame, model);
  },
  serialize: (model: any) => model,
  deserialize: (data: any) => data,
};
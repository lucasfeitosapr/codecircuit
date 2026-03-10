/**
 * PartsTrayRenderer - Dynamic parts tray population
 *
 * Listens to ComponentRegistry events and generates tray items dynamically.
 * Eliminates need to manually edit index.html when adding new component types.
 *
 * Phase 4 - Technical Debt Consolidation
 */

import { eventBus } from '../events/EventBus';
import { Events, PluginRegisteredPayload } from '../events/eventTypes';

export interface PartsTrayConfig {
  containerSelector: string;  // CSS selector for parts tray container
  beforeSelector?: string;    // Optional: insert items before this element
}

/**
 * Context hints for different component categories
 * Maps plugin category to display hint
 */
const CATEGORY_HINTS: Record<string, string> = {
  'source': 'Main board only',
  'container': 'Features & Sub-systems',
  'processing': 'Individual tasks',
  'logic': 'Conditional logic',
  'integration': 'External integrations',
};

export class PartsTrayRenderer {
  private container: HTMLElement | null;
  private beforeElement: HTMLElement | null;
  private componentItems: Map<string, HTMLElement> = new Map();

  constructor(config: PartsTrayConfig) {
    this.container = document.querySelector(config.containerSelector);
    this.beforeElement = config.beforeSelector
      ? document.querySelector(config.beforeSelector)
      : null;

    if (!this.container) {
      console.warn(`PartsTrayRenderer: container not found: ${config.containerSelector}`);
      return;
    }

    this.setupEventListeners();
  }

  /**
   * Listen for plugin registration events
   */
  private setupEventListeners(): void {
    eventBus.on(Events.PLUGIN_REGISTERED, (payload: PluginRegisteredPayload) => {
      this.addComponentItem(payload.pluginType, payload.metadata);
    });

    eventBus.on(Events.PLUGIN_UNREGISTERED, (payload: any) => {
      this.removeComponentItem(payload.pluginType);
    });
  }

  /**
   * Add a component item to the parts tray
   */
  private addComponentItem(type: string, metadata: any): void {
    if (!this.container) return;

    // Skip if already exists
    if (this.componentItems.has(type)) {
      console.warn(`PartsTrayRenderer: component ${type} already in tray`);
      return;
    }

    // Create component item element
    const item = document.createElement('div');
    item.className = 'component-item';
    item.dataset.component = type;
    item.id = `${type}-item`;
    item.draggable = true;

    // Get context hint from category
    const contextHint = CATEGORY_HINTS[metadata.category] || metadata.category || 'Component';

    // Build inner HTML
    item.innerHTML = `
      <div class="component-icon">${metadata.icon || '📦'}</div>
      <span>${metadata.displayName}</span>
      <small class="context-hint">${contextHint}</small>
    `;

    // Setup drag handler
    item.addEventListener('dragstart', (e: DragEvent) => {
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', type);
      }
    });

    // Insert into tray
    if (this.beforeElement) {
      this.container.insertBefore(item, this.beforeElement);
    } else {
      this.container.appendChild(item);
    }

    // Track the item
    this.componentItems.set(type, item);

    console.log(`🎨 Parts tray: added ${metadata.displayName} (${type})`);
  }

  /**
   * Remove a component item from the parts tray
   */
  private removeComponentItem(type: string): void {
    const item = this.componentItems.get(type);
    if (item && item.parentNode) {
      item.parentNode.removeChild(item);
      this.componentItems.delete(type);
      console.log(`🎨 Parts tray: removed ${type}`);
    }
  }

  /**
   * Get current component types in tray
   */
  getComponentTypes(): string[] {
    return Array.from(this.componentItems.keys());
  }

  /**
   * Clear all component items (for testing/reset)
   */
  clear(): void {
    this.componentItems.forEach((item) => {
      if (item.parentNode) {
        item.parentNode.removeChild(item);
      }
    });
    this.componentItems.clear();
  }
}

/**
 * Factory function to create PartsTrayRenderer
 */
export function createPartsTrayRenderer(config: PartsTrayConfig): PartsTrayRenderer {
  return new PartsTrayRenderer(config);
}

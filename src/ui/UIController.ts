/**
 * UIController - Extracted from main.ts
 * Handles UI setup, event handlers, keyboard shortcuts, breadcrumbs, and parts tray context
 * Part of Phase 2A Extended: Main.ts Migration - Task 4
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

import type { ViewState } from '../types';

export interface UIControllerContext {
  // Getter methods for current state (to avoid stale references)
  getCurrentView(): ViewState;
  getViewStack(): {
    size(): number;
    serialize(): any[];
  };
  getComponents(): any[];
  getConnections(): any[];
  getSelectedComponent(): any | null;
  getCanvas(): HTMLCanvasElement;
  getCamera(): { x: number; y: number; zoom: number };

  // State mutation methods
  setComponents(components: any[]): void;
  setConnections(connections: any[]): void;
  setSelectedComponent(component: any | null): void;

  // Methods that UIController needs to call back to main app
  exitSchematicView(): void;
  hideDatasheet(): void;
  navigateToBreadcrumbLevel(index: number): void;
  handleKeyboardShortcut(event: KeyboardEvent): void;
  addComponent(type: string, x: number, y: number): void;

  // Mouse event handlers
  onMouseDown(e: MouseEvent): void;
  onMouseMove(e: MouseEvent): void;
  onMouseUp(e: MouseEvent): void;
  onWheel(e: WheelEvent): void;
}

export class UIController {
  private context: UIControllerContext;

  constructor(context: UIControllerContext) {
    this.context = context;
  }

  /**
   * Setup main UI event handlers
   */
  setupUI() {
    this.setupDragAndDrop();
    this.setupCanvasEvents();
    // Close help overlay when clicking outside
    const helpOverlay = document.getElementById('help-overlay');
    if (helpOverlay) {
      helpOverlay.addEventListener('click', (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (target?.id === 'help-overlay') {
          target.classList.remove('active');
        }
      });
    }

    // UI controls
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.context.exitSchematicView();
      });
    }

    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        const overlay = document.getElementById('help-overlay');
        if (overlay) overlay.classList.add('active');
      });
    }

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Reset the entire board? This cannot be undone.')) {
          this.context.setComponents([]);
          this.context.setConnections([]);
          this.context.setSelectedComponent(null);
          this.context.hideDatasheet();
        }
      });
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        // Phase 5: Use new ExportImportManager instead of legacy method
        eventBus.emit(Events.PROJECT_EXPORT_REQUESTED, {
          timestamp: Date.now(),
        });
      });
    }
  }

  /**
   * Setup import button handler
   */
  setupImportHandler() {
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        // Phase 5: Use new ExportImportManager instead of legacy method
        eventBus.emit(Events.PROJECT_IMPORT_REQUESTED, {
          timestamp: Date.now(),
        });
      });
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', event => {
      this.context.handleKeyboardShortcut(event);
    });
  }

  /**
   * Update breadcrumb navigation UI
   */
  updateBreadcrumbs() {
    // Update the breadcrumb navigation in the UI with full path
    const breadcrumbNav = document.getElementById('breadcrumb-nav') as HTMLElement;
    const backBtn = document.getElementById('back-btn') as HTMLElement;

    if (!breadcrumbNav || !backBtn) return;

    // Build breadcrumb path from view stack
    const breadcrumbPath = this.buildBreadcrumbPath();

    // Clear existing breadcrumbs
    breadcrumbNav.innerHTML = '';

    // Create breadcrumb items
    breadcrumbPath.forEach((item, index) => {
      // Add separator before each item (except first)
      if (index > 0) {
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = '>';
        breadcrumbNav.appendChild(separator);
      }

      // Create breadcrumb item
      const breadcrumbItem = document.createElement('span');
      breadcrumbItem.className = `breadcrumb-item ${item.isCurrent ? 'current' : ''}`;
      breadcrumbItem.setAttribute('data-view-index', index.toString());

      // Add depth indicator
      const depthIndicator = document.createElement('span');
      depthIndicator.className = 'depth-indicator';
      depthIndicator.textContent = item.icon;
      breadcrumbItem.appendChild(depthIndicator);

      // Add text content
      const textNode = document.createTextNode(item.name);
      breadcrumbItem.appendChild(textNode);

      // Add click handler for navigation (except current item)
      if (!item.isCurrent) {
        breadcrumbItem.addEventListener('click', () => {
          this.context.navigateToBreadcrumbLevel(index);
        });
      }

      breadcrumbNav.appendChild(breadcrumbItem);
    });

    // Update back button visibility
    const currentView = this.context.getCurrentView();
    const isMainView = currentView.type === 'main';
    backBtn.style.display = isMainView ? 'none' : 'inline-block';

    // Update parts tray context filtering
    this.updatePartsTrayContext();
  }

  /**
   * Update parts tray context based on current view
   */
  updatePartsTrayContext() {
    // Update parts tray to show appropriate components for current context
    const powerCoreItem = document.getElementById('power-core-item') as HTMLElement;
    const moduleIcItem = document.getElementById('module-ic-item') as HTMLElement;
    const taskResistorItem = document.getElementById('task-resistor-item') as HTMLElement;

    if (!powerCoreItem || !moduleIcItem || !taskResistorItem) return;

    const currentView = this.context.getCurrentView();
    const viewStack = this.context.getViewStack();
    const isMainView = currentView.type === 'main';
    const currentDepth = viewStack.size() + (currentView.type === 'schematic' ? 1 : 0);

    if (isMainView) {
      // Main board: All components available
      powerCoreItem.classList.remove('disabled');
      moduleIcItem.classList.remove('disabled');
      taskResistorItem.classList.remove('disabled');

      powerCoreItem.querySelector('.context-hint')!.textContent = 'Energy sources';
      moduleIcItem.querySelector('.context-hint')!.textContent = 'Features & Systems';
      taskResistorItem.querySelector('.context-hint')!.textContent = 'Not typical on main board';
    } else {
      // Schematic view: No Power Cores allowed
      powerCoreItem.classList.add('disabled');
      moduleIcItem.classList.remove('disabled');
      taskResistorItem.classList.remove('disabled');

      powerCoreItem.querySelector('.context-hint')!.textContent = 'Main board only';
      moduleIcItem.querySelector('.context-hint')!.textContent = `Sub-systems (Level ${
        currentDepth + 1
      })`;
      taskResistorItem.querySelector('.context-hint')!.textContent = 'Individual tasks';
    }
  }

  /**
   * Build breadcrumb path array
   */
  buildBreadcrumbPath() {
    const path = [];
    const currentView = this.context.getCurrentView();
    const viewStack = this.context.getViewStack();

    // Always start with main board
    path.push({
      name: 'Project: Motherboard',
      icon: '⚡',
      isCurrent: currentView.type === 'main',
      viewIndex: 0,
    });

    // Add each level from view stack
    const stack = viewStack.serialize();
    stack.forEach((view: any, index: number) => {
      if (view.type === 'schematic' && view.component) {
        const depth = index + 1;
        const depthIcons = ['⚡', '🔲', '🔳', '🔵', '🟢', '🟡', '🟠', '🔴', '🟣', '⚫', '⚪', '🔘'];
        const icon = depth < depthIcons.length ? depthIcons[depth] : `🔹${depth}`;

        path.push({
          name: view.component.title || `Module ${depth}`,
          icon: icon,
          isCurrent: false,
          viewIndex: depth,
        });
      }
    });

    // Mark current schematic view
    if (currentView.type === 'schematic') {
      const currentDepth = stack.length + 1;
      const depthIcons = ['⚡', '🔲', '🔳', '🔵', '🟢', '🟡', '🟠', '🔴', '🟣', '⚫', '⚪', '🔘'];
      const icon =
        currentDepth < depthIcons.length ? depthIcons[currentDepth] : `🔹${currentDepth}`;

      path.push({
        name: currentView.component?.title || `Module ${currentDepth}`,
        icon: icon,
        isCurrent: true,
        viewIndex: currentDepth,
      });
    }

    return path;
  }

  /**
   * Navigate to specific breadcrumb level
   */
  navigateToBreadcrumbLevel(targetIndex: number) {
    this.context.navigateToBreadcrumbLevel(targetIndex);
  }

  /**
   * Setup drag & drop functionality for component creation
   */
  private setupDragAndDrop() {
    // Make parts tray items draggable
    document.querySelectorAll('.component-item').forEach((item: any) => {
      item.addEventListener('dragstart', (e: any) => {
        e.dataTransfer.setData('text/plain', item.dataset.component);
      });
      item.setAttribute('draggable', 'true');
    });

    // Setup canvas as drop zone
    const canvas = this.context.getCanvas();

    canvas.addEventListener('dragover', (e: any) => {
      e.preventDefault();
    });

    canvas.addEventListener('drop', (e: any) => {
      e.preventDefault();
      const componentType = e.dataTransfer.getData('text/plain');
      const rect = canvas.getBoundingClientRect();
      const camera = this.context.getCamera();

      const x = (e.clientX - rect.left - camera.x) / camera.zoom;
      const y = (e.clientY - rect.top - camera.y) / camera.zoom;

      this.context.addComponent(componentType, x, y);
    });
  }

  /**
   * Setup canvas mouse event listeners
   */
  private setupCanvasEvents() {
    const canvas = this.context.getCanvas();

    // Canvas mouse interactions
    canvas.addEventListener('mousedown', this.context.onMouseDown.bind(this.context));
    canvas.addEventListener('mousemove', this.context.onMouseMove.bind(this.context));
    canvas.addEventListener('mouseup', this.context.onMouseUp.bind(this.context));
    canvas.addEventListener('wheel', this.context.onWheel.bind(this.context));
    canvas.addEventListener('contextmenu', (e: any) => e.preventDefault());

    // Mouse position tracking for connection drawing
    canvas.addEventListener('mousemove', (e: any) => {
      const rect = canvas.getBoundingClientRect();
      const camera = this.context.getCamera();

      // Store mouse position for connection drawing (if mousePos setter exists)
      if ((this.context as any).setMousePos) {
        (this.context as any).setMousePos({
          x: (e.clientX - rect.left - camera.x) / camera.zoom,
          y: (e.clientY - rect.top - camera.y) / camera.zoom,
        });
      }
    });
  }
}

// Factory function for creating UIController with context
export function createUIController(context: UIControllerContext): UIController {
  return new UIController(context);
}

// Static utility methods that can be used without instance
export class UIControllerUtils {
  /**
   * Show help overlay
   */
  static showHelp() {
    const overlay = document.getElementById('help-overlay');
    if (overlay) overlay.classList.add('active');
  }

  /**
   * Hide help overlay
   */
  static hideHelp() {
    const overlay = document.getElementById('help-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  /**
   * Check if help overlay is active
   */
  static isHelpActive(): boolean {
    const overlay = document.getElementById('help-overlay');
    return overlay ? overlay.classList.contains('active') : false;
  }
}

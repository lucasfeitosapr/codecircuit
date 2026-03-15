/**
 * KeyboardShortcutManager - Handles all keyboard shortcuts and their actions
 * Extracted from main.ts to centralize keyboard interaction handling
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, ViewState } from '../types';
import { hideDatasheet as hideDatasheetUI } from '../datasheet';

export interface KeyboardShortcutManagerContext {
  getSelectedComponent: () => ComponentBase | null;
  setSelectedComponent: (component: ComponentBase | null) => void;
  getSelectedComponentIds: () => Set<string>;
  getCurrentView: () => ViewState;
  getCurrentViewComponents: () => ComponentBase[];
  getCurrentViewConnections: () => any[];
  isTransitioning: () => boolean;
  getViewStackSize: () => number;
  getMainComponents: () => ComponentBase[];
  toggleComponentStatus: (component: ComponentBase) => void;
  showTemporaryMessage: (message: string, duration?: number) => void;
  exitSchematicView: () => void;
  enterSchematicView: (component: ComponentBase) => void;
  cancelConnection: () => void;
  isConnecting: () => boolean;
  addComponentToCurrentView: (component: ComponentBase) => void;
  addConnectionToCurrentView: (connection: any) => void;
  pushHistorySnapshot: () => void;
}

export class KeyboardShortcutManager {
  private context: KeyboardShortcutManagerContext;
  private shortcuts: Map<string, (event: KeyboardEvent) => void> = new Map();
  private clipboard: { components: ComponentBase[]; connections: any[] } | null = null;

  constructor(context: KeyboardShortcutManagerContext) {
    this.context = context;
    this.setupShortcuts();
    this.setupEventListeners();
  }

  private setupShortcuts() {
    // ESC key: Exit current context or close modals
    this.shortcuts.set('Escape', event => {
      this.handleEscapeKey();
    });

    // TAB key: Cycle between views
    this.shortcuts.set('Tab', event => {
      this.handleTabKey(event.shiftKey);
    });

    // SPACE key: Toggle status of selected component
    this.shortcuts.set(' ', event => {
      this.handleSpaceKey();
    });

    // F1 key: Toggle help overlay
    this.shortcuts.set('F1', event => {
      this.handleHelpKey();
    });

    // Shift+?: Toggle help overlay (alternative)
    this.shortcuts.set('?', event => {
      if (event.shiftKey) {
        this.handleHelpKey();
      }
    });

    // Additional shortcuts can be added here
    this.shortcuts.set('Delete', event => {
      this.handleDeleteKey();
    });

    this.shortcuts.set('Backspace', event => {
      this.handleDeleteKey();
    });

    // Ctrl+Z: Undo
    this.shortcuts.set('z', event => {
      if (event.ctrlKey || event.metaKey) {
        this.handleUndoKey();
      }
    });

    // Ctrl+Y or Ctrl+Shift+Z: Redo
    this.shortcuts.set('y', event => {
      if (event.ctrlKey || event.metaKey) {
        this.handleRedoKey();
      }
    });

    // Ctrl+C: Copy
    this.shortcuts.set('c', event => {
      if (event.ctrlKey || event.metaKey) {
        this.handleCopyKey();
      }
    });

    // Ctrl+V: Paste
    this.shortcuts.set('v', event => {
      if (event.ctrlKey || event.metaKey) {
        this.handlePasteKey();
      }
    });
  }

  private setupEventListeners() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Ignore keyboard shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    // Handle special keys that might need modifier key checks
    let keyToCheck = event.key;
    if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
      if (event.shiftKey) {
        // Ctrl+Shift+Z (alternative redo)
        this.handleRedoKey();
        event.preventDefault();
        return;
      } else {
        keyToCheck = 'z';
      }
    }

    const handler = this.shortcuts.get(keyToCheck);
    if (handler) {
      // Prevent default behavior for our shortcuts
      const shortcutKeys = ['Escape', 'Tab', ' ', 'F1', 'Delete', 'Backspace'];
      if (
        shortcutKeys.includes(event.key) ||
        (event.key === '?' && event.shiftKey) ||
        ((event.key === 'z' || event.key === 'y' || event.key === 'c' || event.key === 'v') && (event.ctrlKey || event.metaKey))
      ) {
        event.preventDefault();
      }

      handler(event);
    }
  }

  private handleEscapeKey() {
    // ESC key: Exit current context or close modals

    // Priority 1: Close help overlay if open
    const helpOverlay = document.getElementById('help-overlay') as HTMLElement;
    if (helpOverlay && helpOverlay.classList.contains('active')) {
      helpOverlay.classList.remove('active');
      return;
    }

    // Priority 2: Exit connection mode if active
    if (this.context.isConnecting()) {
      this.context.cancelConnection();
      return;
    }

    // Priority 3: Clear component selection
    if (this.context.getSelectedComponent()) {
      this.context.setSelectedComponent(null);
      hideDatasheetUI();
      return;
    }

    // Priority 4: Exit schematic view if in one
    if (this.context.getCurrentView().type === 'schematic') {
      this.context.exitSchematicView();
      return;
    }
  }

  private handleTabKey(shiftPressed: boolean) {
    // TAB key: Cycle between views (Shift+TAB for reverse)
    if (this.context.isTransitioning()) return;

    const viewStackSize = this.context.getViewStackSize();

    if (viewStackSize === 0) {
      // No views to cycle through
      return;
    }

    if (shiftPressed) {
      // Shift+Tab: Go back one level
      if (this.context.getCurrentView().type === 'schematic') {
        this.context.exitSchematicView();
      }
    } else {
      // Tab: Navigate deeper or cycle through Module ICs
      const currentView = this.context.getCurrentView();

      if (currentView.type === 'main') {
        // Find first Module IC and enter it
        const moduleICs = this.context.getMainComponents().filter(c => c.type === 'module-ic');
        if (moduleICs.length > 0) {
          this.context.enterSchematicView(moduleICs[0]);
        }
      } else {
        // In schematic view - find next Module IC or exit to main
        const currentComponents = currentView.components || [];
        const moduleICs = currentComponents.filter(c => c.type === 'module-ic');
        if (moduleICs.length > 0) {
          this.context.enterSchematicView(moduleICs[0]);
        } else {
          this.context.exitSchematicView();
        }
      }
    }
  }

  private handleSpaceKey() {
    // SPACE key: Toggle status of selected component
    const selectedComponent = this.context.getSelectedComponent();

    if (selectedComponent && selectedComponent.type !== 'power-core') {
      this.context.toggleComponentStatus(selectedComponent);

      // Emit event for UI updates (like datasheet refresh)
      eventBus.emit('component.status.toggled', {
        componentId: selectedComponent.id,
        newStatus: selectedComponent.status,
        timestamp: Date.now(),
      });
    } else if (!selectedComponent) {
      // No component selected - show status hint
      this.context.showTemporaryMessage(
        'Select a component first, then press SPACE to toggle its status'
      );
    }
  }

  private handleHelpKey() {
    // F1 or Shift+?: Toggle help overlay
    const helpOverlay = document.getElementById('help-overlay') as HTMLElement;
    if (helpOverlay) {
      if (helpOverlay.classList.contains('active')) {
        helpOverlay.classList.remove('active');
      } else {
        helpOverlay.classList.add('active');
      }
    }
  }

  private handleDeleteKey() {
    const selectedIds = this.context.getSelectedComponentIds();

    if (selectedIds.size === 0) {
      this.context.showTemporaryMessage('Select a component to delete');
      return;
    }

    // Check if any selected component is a power-core
    const allComponents = this.context.getCurrentViewComponents();
    const toDelete = allComponents.filter(
      c => selectedIds.has(c.id) && c.type !== 'power-core'
    );

    if (toDelete.length === 0) {
      this.context.showTemporaryMessage('Power core cannot be deleted');
      return;
    }

    this.context.pushHistorySnapshot();

    for (const comp of toDelete) {
      eventBus.emit(Events.COMPONENT_DELETE_REQUESTED, {
        componentId: comp.id,
        timestamp: Date.now(),
      });
    }

    this.context.setSelectedComponent(null);
    hideDatasheetUI();

    this.context.showTemporaryMessage(
      `Deleted ${toDelete.length} component${toDelete.length !== 1 ? 's' : ''}`
    );
  }

  private handleUndoKey() {
    eventBus.emit(Events.UNDO_REQUESTED, {
      timestamp: Date.now(),
    });
  }

  private handleRedoKey() {
    eventBus.emit(Events.REDO_REQUESTED, {
      timestamp: Date.now(),
    });
  }

  private handleCopyKey() {
    const selectedIds = this.context.getSelectedComponentIds();
    if (selectedIds.size === 0) {
      this.context.showTemporaryMessage('Select components to copy');
      return;
    }

    const allComponents = this.context.getCurrentViewComponents();
    const allConnections = this.context.getCurrentViewConnections();

    // Copy selected components
    const copiedComponents = allComponents.filter(c => selectedIds.has(c.id));

    // Copy connections that exist entirely within the selection
    const copiedConnections = allConnections.filter(
      (conn: any) =>
        selectedIds.has(conn.from?.component?.id) && selectedIds.has(conn.to?.component?.id)
    );

    this.clipboard = {
      components: JSON.parse(JSON.stringify(copiedComponents)),
      connections: JSON.parse(JSON.stringify(copiedConnections)),
    };

    this.context.showTemporaryMessage(
      `Copied ${copiedComponents.length} component${copiedComponents.length !== 1 ? 's' : ''}`
    );
  }

  private handlePasteKey() {
    if (!this.clipboard || this.clipboard.components.length === 0) {
      this.context.showTemporaryMessage('Nothing to paste');
      return;
    }

    this.context.pushHistorySnapshot();

    const PASTE_OFFSET = 30;
    const idMap = new Map<string, string>();

    // Generate new IDs and offset positions
    for (const comp of this.clipboard.components) {
      const newId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      idMap.set(comp.id, newId);
      comp.id = newId;
      comp.x += PASTE_OFFSET;
      comp.y += PASTE_OFFSET;
      if (comp.title) {
        comp.title = comp.title + ' (copy)';
      }
      this.context.addComponentToCurrentView(comp);
    }

    // Remap connection references and add
    for (const conn of this.clipboard.connections) {
      conn.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
      if (conn.from?.component?.id) {
        const newFromId = idMap.get(conn.from.component.id);
        if (newFromId) conn.from.component.id = newFromId;
      }
      if (conn.to?.component?.id) {
        const newToId = idMap.get(conn.to.component.id);
        if (newToId) conn.to.component.id = newToId;
      }
      this.context.addConnectionToCurrentView(conn);
    }

    // Deep clone clipboard again so it can be pasted multiple times
    this.clipboard = JSON.parse(JSON.stringify(this.clipboard));
    // Reset IDs in clipboard to original (they were mutated)
    // Actually, re-clone from the already-offset versions - next paste will offset again

    this.context.showTemporaryMessage(
      `Pasted ${this.clipboard.components.length} component${this.clipboard.components.length !== 1 ? 's' : ''}`
    );
  }

  // Public methods for dynamic shortcut management
  addShortcut(key: string, handler: (event: KeyboardEvent) => void) {
    this.shortcuts.set(key, handler);
  }

  removeShortcut(key: string) {
    this.shortcuts.delete(key);
  }

  getShortcuts(): string[] {
    return Array.from(this.shortcuts.keys());
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.shortcuts.clear();
  }
}

export function createKeyboardShortcutManager(
  context: KeyboardShortcutManagerContext
): KeyboardShortcutManager {
  return new KeyboardShortcutManager(context);
}

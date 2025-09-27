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
  getCurrentView: () => ViewState;
  isTransitioning: () => boolean;
  getViewStackSize: () => number;
  getMainComponents: () => ComponentBase[];
  toggleComponentStatus: (component: ComponentBase) => void;
  showTemporaryMessage: (message: string, duration?: number) => void;
  exitSchematicView: () => void;
  enterSchematicView: (component: ComponentBase) => void;
  cancelConnection: () => void;
  isConnecting: () => boolean;
}

export class KeyboardShortcutManager {
  private context: KeyboardShortcutManagerContext;
  private shortcuts: Map<string, (event: KeyboardEvent) => void> = new Map();

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

    // Ctrl+Z: Undo (if implemented)
    this.shortcuts.set('z', event => {
      if (event.ctrlKey || event.metaKey) {
        this.handleUndoKey();
      }
    });

    // Ctrl+Y or Ctrl+Shift+Z: Redo (if implemented)
    this.shortcuts.set('y', event => {
      if (event.ctrlKey || event.metaKey) {
        this.handleRedoKey();
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
        ((event.key === 'z' || event.key === 'y') && (event.ctrlKey || event.metaKey))
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
    // Delete selected component
    const selectedComponent = this.context.getSelectedComponent();

    if (selectedComponent && selectedComponent.type !== 'power-core') {
      // Emit delete request
      eventBus.emit(Events.COMPONENT_DELETE_REQUESTED, {
        componentId: selectedComponent.id,
        timestamp: Date.now(),
      });

      this.context.setSelectedComponent(null);
      hideDatasheetUI();

      this.context.showTemporaryMessage(`Deleted ${selectedComponent.type}`);
    } else if (!selectedComponent) {
      this.context.showTemporaryMessage('Select a component to delete');
    } else {
      this.context.showTemporaryMessage('Power core cannot be deleted');
    }
  }

  private handleUndoKey() {
    // Undo last action
    eventBus.emit(Events.UNDO_REQUESTED, {
      timestamp: Date.now(),
    });

    this.context.showTemporaryMessage('Undo requested');
  }

  private handleRedoKey() {
    // Redo last undone action
    eventBus.emit(Events.REDO_REQUESTED, {
      timestamp: Date.now(),
    });

    this.context.showTemporaryMessage('Redo requested');
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

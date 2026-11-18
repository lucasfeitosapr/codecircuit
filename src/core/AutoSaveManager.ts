/**
 * AutoSaveManager - Persists board state to localStorage on every change
 *
 * Listens to state-mutating events (component/connection CRUD, drag completion,
 * import, undo/redo restore) and debounce-saves a serialized snapshot.
 * On startup, loadSavedState() returns the persisted data (if any) so the app
 * can restore it instead of starting with an empty board.
 *
 * Storage format matches ExportImportManager's project JSON, so a manual
 * export/import round-trip is fully compatible.
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, Connection, ModuleComponent } from '../types';

const STORAGE_KEY = 'codecircuit_autosave';
const DEBOUNCE_MS = 1000;

export interface AutoSaveHooks {
  getComponents: () => ComponentBase[];
  getConnections: () => Connection[];
  getCurrentView: () => { type: string; component?: any; components: any[]; connections: any[] };
  /** Module IDs from the main board down to the current level; empty on the main board. */
  getViewPath?: () => string[];
}

export interface SavedProjectData {
  components: any[];
  connections: any[];
  savedAt: string;
  /** Where the user was (B-007). Optional, so older saves and exports still load. */
  viewPath?: string[];
}

export class AutoSaveManager {
  private hooks: AutoSaveHooks | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private enabled = true;

  /**
   * Wire event listeners that trigger an auto-save.
   * Call once after all managers are initialized.
   */
  wireAutoSave(hooks: AutoSaveHooks): void {
    this.hooks = hooks;

    // State-mutating events that should trigger a save
    const dirtyEvents: string[] = [
      Events.ComponentCreated,
      Events.ComponentUpdated,
      Events.ComponentDeleted,
      Events.ConnectionCreated,
      Events.ConnectionDeleted,
      Events.ConnectionUpdated,
      Events.COMPONENT_DRAG_COMPLETED,
      Events.PROJECT_IMPORTED,
      Events.BOARD_RESET,
      // Navigation changes the saved view path (B-007)
      'schematic.view.entered',
      'schematic.view.exited',
      'schematic.view.main.entered',
    ];

    for (const event of dirtyEvents) {
      eventBus.on(event, () => this.scheduleSave());
    }

    // A save still waiting on the debounce is written before the page goes away (B-006).
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flushPendingSave());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.flushPendingSave();
      });
    }
  }

  /** Write a save that is waiting on the debounce, now. No-op when nothing is pending. */
  flushPendingSave(): void {
    if (this.debounceTimer === null) return;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    if (this.enabled) this.performSave();
  }

  /**
   * Try to load previously auto-saved state from localStorage.
   * Returns null if nothing is saved or the data is corrupt.
   */
  loadSavedState(): SavedProjectData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw) as SavedProjectData;

      // Basic validation
      if (!data || !Array.isArray(data.components)) {
        console.warn('⚠️ AutoSave: invalid saved data, ignoring');
        return null;
      }

      console.log(
        `💾 AutoSave: found saved state (${data.components.length} components, ${data.connections?.length ?? 0} connections, saved ${data.savedAt})`
      );
      return data;
    } catch (e) {
      console.warn('⚠️ AutoSave: failed to parse saved state', e);
      return null;
    }
  }

  /**
   * Immediately persist current state (skip debounce).
   */
  saveNow(): void {
    if (!this.hooks || !this.enabled) return;
    this.performSave();
  }

  /**
   * Clear the saved state from localStorage.
   */
  clearSavedState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ AutoSave: cleared saved state');
    } catch (e) {
      console.warn('⚠️ AutoSave: failed to clear saved state', e);
    }
  }

  /**
   * Enable or disable auto-saving (useful during bulk imports).
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // ── Private ──

  private scheduleSave(): void {
    if (!this.enabled || !this.hooks) return;

    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.performSave();
      this.debounceTimer = null;
    }, DEBOUNCE_MS);
  }

  private performSave(): void {
    if (!this.hooks) return;

    try {
      const currentView = this.hooks.getCurrentView();

      // Read only (B-001): inside a schematic view, the view's arrays ARE the
      // module's internal arrays (SchematicViewManager binds them), so the
      // top-level serialization already sees nested content. Never reassign
      // them here: a copy would split view and module.
      if (currentView.type === 'schematic' && currentView.component) {
        const mod = currentView.component;
        if (
          mod.internalComponents !== currentView.components ||
          mod.internalConnections !== currentView.connections
        ) {
          console.warn('⚠️ AutoSave: schematic view is not bound to its module arrays');
        }
      }

      const components = this.hooks.getComponents();
      const connections = this.hooks.getConnections();

      const serialized: SavedProjectData = {
        components: this.serializeComponents(components),
        connections: this.serializeConnections(connections),
        savedAt: new Date().toISOString(),
        viewPath: this.hooks.getViewPath?.() ?? [],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch (e) {
      console.warn('⚠️ AutoSave: failed to save', e);
    }
  }

  // ── Serialization (mirrors ExportImportManager for compatibility) ──

  private serializeComponents(components: ComponentBase[], depth = 0): any[] {
    if (depth > 10) return [];

    return components
      .filter(c => c && c.id)
      .map(component => {
        const s: any = {
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

        if (component.type === 'module-ic') {
          const mod = component as ModuleComponent;
          if (mod.internalComponents) {
            s.internalComponents = this.serializeComponents(mod.internalComponents, depth + 1);
          }
          if (mod.internalConnections) {
            s.internalConnections = this.serializeConnections(mod.internalConnections);
          }
          if (mod.pinMap) {
            s.pinMap = mod.pinMap;
          }
        }

        return s;
      });
  }

  private serializeConnections(connections: Connection[]): any[] {
    return connections
      .filter(c => c && c.from?.component?.id && c.to?.component?.id)
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
   * Cleanup resources.
   */
  destroy(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

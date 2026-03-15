/**
 * AppStateManager - Centralized application state management
 *
 * State consolidation: ViewState.components/connections are REFERENCES to the
 * canonical arrays, not copies. For main view they reference state.components/connections.
 * For schematic view they reference moduleComponent.internalComponents/internalConnections.
 * This eliminates the dual-storage sync problem.
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, Connection, ViewState } from '../types';

export interface AppState {
  components: ComponentBase[];
  connections: Connection[];
  selectedComponent: ComponentBase | null;
  selectedComponentIds: Set<string>;
  currentView: ViewState;
  isTransitioning: boolean;
  lastTime: number;
  fps: number;
}

export class AppStateManager {
  private state: AppState;

  constructor() {
    const components: ComponentBase[] = [];
    const connections: Connection[] = [];

    this.state = {
      components,
      connections,
      selectedComponent: null,
      selectedComponentIds: new Set(),
      currentView: {
        type: 'main',
        component: null,
        camera: { x: 0, y: 0, zoom: 1 },
        // Reference the same arrays — single source of truth
        components,
        connections,
      },
      isTransitioning: false,
      lastTime: 0,
      fps: 0,
    };

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    eventBus.on(Events.ComponentUpdated, (payload: any) => {
      const components = this.getCurrentViewComponents();
      const component = components.find(c => c.id === payload.id);
      if (component) {
        Object.assign(component, payload.changes);
      }
    });

    eventBus.on(Events.COMPONENT_SELECTED, (payload: any) => {
      this.setSelectedComponent(payload.component);
    });
  }

  // === Getters ===

  getComponents(): ComponentBase[] {
    return [...this.state.components];
  }

  getConnections(): Connection[] {
    return [...this.state.connections];
  }

  /** Returns the actual components array for the current view (reference, not copy). */
  getCurrentViewComponents(): ComponentBase[] {
    return this.state.currentView.components;
  }

  /** Returns the actual connections array for the current view (reference, not copy). */
  getCurrentViewConnections(): Connection[] {
    return this.state.currentView.connections;
  }

  getSelectedComponent(): ComponentBase | null {
    return this.state.selectedComponent;
  }

  getCurrentView(): ViewState {
    return this.state.currentView;
  }

  isInTransition(): boolean {
    return this.state.isTransitioning;
  }

  getFPS(): number {
    return this.state.fps;
  }

  getLastTime(): number {
    return this.state.lastTime;
  }

  // === Bulk setters (for import/restore) ===

  setComponents(components: ComponentBase[], emitEvents: boolean = true) {
    this.state.components.length = 0;

    if (emitEvents) {
      components.forEach(component => {
        this.state.components.push(component);
        eventBus.emit(Events.ComponentCreated, {
          id: component.id,
          type: component.type,
          model: component,
          source: 'import',
        });
      });
    } else {
      this.state.components.push(...components);
    }

    // Re-sync view reference if in main view
    if (this.state.currentView.type === 'main') {
      this.state.currentView.components = this.state.components;
    }
  }

  setConnections(connections: Connection[]) {
    this.state.connections.length = 0;
    this.state.connections.push(...connections);

    if (this.state.currentView.type === 'main') {
      this.state.currentView.connections = this.state.connections;
    }
  }

  // === View-aware add/remove (operates on current view's arrays) ===

  addComponentToCurrentView(component: ComponentBase) {
    this.state.currentView.components.push(component);

    eventBus.emit(Events.ComponentCreated, {
      id: component.id,
      type: component.type,
      model: component,
      source: 'view-aware',
    });
  }

  removeComponentFromCurrentView(componentId: string) {
    const arr = this.state.currentView.components;
    const idx = arr.findIndex(c => c.id === componentId);
    if (idx !== -1) arr.splice(idx, 1);

    eventBus.emit(Events.ComponentDeleted, {
      id: componentId,
      timestamp: Date.now(),
    });
  }

  addConnectionToCurrentView(connection: Connection) {
    this.state.currentView.connections.push(connection);
    // NOTE: Do NOT emit ConnectionCreated here — ConnectionManager already does this.
  }

  removeConnectionFromCurrentView(connectionId: string) {
    const arr = this.state.currentView.connections;
    const idx = arr.findIndex(c => c.id === connectionId);
    if (idx !== -1) arr.splice(idx, 1);

    eventBus.emit(Events.ConnectionDeleted, { id: connectionId, timestamp: Date.now() });
  }

  // === Legacy add/remove (always operates on global state.components) ===

  addComponent(component: ComponentBase) {
    this.state.components.push(component);
    eventBus.emit(Events.ComponentCreated, {
      id: component.id,
      type: component.type,
      model: component,
      source: 'legacy',
    });
  }

  removeComponent(componentId: string) {
    this.state.components = this.state.components.filter(c => c.id !== componentId);
    eventBus.emit(Events.ComponentDeleted, { id: componentId, timestamp: Date.now() });
  }

  addConnection(connection: Connection) {
    this.state.connections.push(connection);
  }

  removeConnection(connectionId: string) {
    this.state.connections = this.state.connections.filter(c => c.id !== connectionId);
  }

  // === Selection ===

  setSelectedComponent(component: ComponentBase | null) {
    this.state.selectedComponent = component;
    this.state.selectedComponentIds.clear();
    if (component) {
      this.state.selectedComponentIds.add(component.id);
    }

    eventBus.emit('component.selection.changed', {
      component,
      timestamp: Date.now(),
    });
  }

  getSelectedComponentIds(): Set<string> {
    return new Set(this.state.selectedComponentIds);
  }

  addToSelection(component: ComponentBase) {
    this.state.selectedComponentIds.add(component.id);
    this.state.selectedComponent = component;

    eventBus.emit('component.selection.changed', {
      component,
      selectedIds: [...this.state.selectedComponentIds],
      timestamp: Date.now(),
    });
  }

  removeFromSelection(componentId: string) {
    this.state.selectedComponentIds.delete(componentId);
    if (this.state.selectedComponent?.id === componentId) {
      this.state.selectedComponent = null;
    }
  }

  clearSelection() {
    this.state.selectedComponent = null;
    this.state.selectedComponentIds.clear();
  }

  isComponentSelected(componentId: string): boolean {
    return this.state.selectedComponentIds.has(componentId);
  }

  // === View management ===

  setCurrentView(view: ViewState) {
    this.state.currentView = view;
  }

  /**
   * Initialize the main view with references to the global state arrays.
   * Call this after bulk-setting components/connections to ensure view references are correct.
   */
  initializeMainView() {
    this.state.currentView = {
      type: 'main',
      component: null,
      camera: this.state.currentView.camera || { x: 0, y: 0, zoom: 1 },
      components: this.state.components,
      connections: this.state.connections,
    };
  }

  setTransitioning(isTransitioning: boolean) {
    this.state.isTransitioning = isTransitioning;
  }

  updateFPS(currentTime: number) {
    if (this.state.lastTime) {
      const delta = currentTime - this.state.lastTime;
      this.state.fps = Math.round(1000 / delta);

      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) {
        const newText = `FPS: ${this.state.fps}`;
        if (fpsEl.textContent !== newText) fpsEl.textContent = newText;
      }
    }
    this.state.lastTime = currentTime;
  }

  // === Deep component lookup ===

  /**
   * Phase 4: Find a component by ID across all locations — global, current view,
   * view stack, and recursively inside Module ICs. Replaces the 80-line inline
   * search that was duplicated in main.ts ViewNavigationManager init.
   */
  findComponentDeep(id: string, viewStack?: { serialize(): any[] }): ComponentBase | undefined {
    // 1. Global components
    const global = this.state.components.find(c => c.id === id);
    if (global) return global;

    // 2. Current view components
    const cv = this.state.currentView;
    if (cv.components) {
      const found = cv.components.find(c => c.id === id);
      if (found) return found;
    }

    // 3. Current view's module internals
    if (cv.type === 'schematic' && cv.component?.type === 'module-ic') {
      const mod = cv.component as any;
      if (mod.internalComponents) {
        const found = mod.internalComponents.find((c: any) => c.id === id);
        if (found) return found;
      }
    }

    // 4. ViewStack entries
    if (viewStack) {
      for (const view of viewStack.serialize()) {
        if (view.components) {
          const found = view.components.find((c: any) => c.id === id);
          if (found) return found;
        }
      }
    }

    // 5. Recursive search inside all Module ICs
    const searchModuleICs = (components: ComponentBase[]): ComponentBase | undefined => {
      for (const comp of components) {
        if (comp.type === 'module-ic') {
          const mod = comp as any;
          if (mod.internalComponents) {
            const found = mod.internalComponents.find((c: any) => c.id === id);
            if (found) return found;
            const deep = searchModuleICs(mod.internalComponents);
            if (deep) return deep;
          }
        }
      }
      return undefined;
    };

    const deepGlobal = searchModuleICs(this.state.components);
    if (deepGlobal) return deepGlobal;

    if (cv.components) {
      const deepView = searchModuleICs(cv.components);
      if (deepView) return deepView;
    }

    return undefined;
  }

  // === State utilities ===

  clearState() {
    this.state.components = [];
    this.state.connections = [];
    this.state.selectedComponent = null;
    this.state.selectedComponentIds.clear();
    this.state.isTransitioning = false;
    this.initializeMainView();
  }

  getSnapshot(): AppState {
    return {
      components: [...this.state.components],
      connections: [...this.state.connections],
      selectedComponent: this.state.selectedComponent,
      currentView: { ...this.state.currentView },
      isTransitioning: this.state.isTransitioning,
      lastTime: this.state.lastTime,
      fps: this.state.fps,
      selectedComponentIds: new Set(this.state.selectedComponentIds),
    };
  }

  restoreFromSnapshot(snapshot: Partial<AppState>) {
    if (snapshot.components) this.setComponents(snapshot.components);
    if (snapshot.connections) this.setConnections(snapshot.connections);
    if (snapshot.selectedComponent !== undefined)
      this.setSelectedComponent(snapshot.selectedComponent);
    if (snapshot.currentView) this.setCurrentView(snapshot.currentView);
    if (snapshot.isTransitioning !== undefined) this.setTransitioning(snapshot.isTransitioning);
    if (snapshot.lastTime !== undefined) this.state.lastTime = snapshot.lastTime;
    if (snapshot.fps !== undefined) this.state.fps = snapshot.fps;
  }

  /**
   * Phase 4: Wire component deletion handler that was previously in main.ts
   * (setupComponentDeletionEventHandlers). Cascade-deletes related connections.
   */
  wireComponentDeletion(hooks: {
    removeConnectionFromManager: (connectionId: string) => void;
    hideDatasheet: () => void;
  }): void {
    eventBus.on(Events.COMPONENT_DELETE_REQUESTED, (payload: { componentId: string }) => {
      const componentId = payload.componentId;

      // Build list of connections to remove from current view
      const connectionsToRemove = this.getCurrentViewConnections().filter(
        conn =>
          conn.from.component.id === componentId || conn.to.component.id === componentId
      );

      // Remove connections from both AppState and ConnectionManager
      for (const conn of connectionsToRemove) {
        this.removeConnectionFromCurrentView(conn.id);
        hooks.removeConnectionFromManager(conn.id);
      }

      // Remove the component (view-aware)
      this.removeComponentFromCurrentView(componentId);

      // Clear selection and hide datasheet if it was the selected component
      const selected = this.getSelectedComponent();
      if (selected && selected.id === componentId) {
        this.setSelectedComponent(null);
        hooks.hideDatasheet();
      }
    });
  }

  /**
   * Subscribe to state changes. Kept for test compatibility.
   * Production code should use EventBus instead.
   */
  subscribe<K extends keyof AppState>(_key: K, _callback: (value: AppState[K]) => void) {
    // No-op — listener system removed. Use EventBus events instead.
    return () => {};
  }
}

// Singleton instance
let appStateManager: AppStateManager | null = null;

export function createAppStateManager(): AppStateManager {
  if (appStateManager) {
    throw new Error('AppStateManager instance already exists. Use getAppStateManager() instead.');
  }
  appStateManager = new AppStateManager();
  return appStateManager;
}

export function getAppStateManager(): AppStateManager {
  if (!appStateManager) {
    throw new Error('AppStateManager not initialized. Call createAppStateManager() first.');
  }
  return appStateManager;
}

export function resetAppStateManager(): void {
  appStateManager = null;
}

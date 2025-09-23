/**
 * AppStateManager - Centralized application state management
 * Handles core application state that was previously managed directly in main.ts
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, Connection, ViewState } from '../types';

export interface AppState {
  components: ComponentBase[];
  connections: Connection[];
  selectedComponent: ComponentBase | null;
  currentView: ViewState;
  isTransitioning: boolean;
  lastTime: number;
  fps: number;
}

export class AppStateManager {
  private state: AppState;
  private listeners: Map<keyof AppState, Set<(value: any) => void>> = new Map();

  constructor() {
    this.state = {
      components: [],
      connections: [],
      selectedComponent: null,
      currentView: {
        type: 'main',
        component: null,
        camera: { x: 0, y: 0, zoom: 1 },
        components: [],
        connections: [],
      },
      isTransitioning: false,
      lastTime: 0,
      fps: 0,
    };

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Listen for component updates
    eventBus.on(Events.ComponentUpdated, (payload: any) => {
      const component = this.state.components.find(c => c.id === payload.id);
      if (component) {
        Object.assign(component, payload.changes);
        this.notifyListeners('components', this.state.components);
      }
    });

    // Listen for component selection changes
    eventBus.on(Events.COMPONENT_SELECTED, (payload: any) => {
      this.setSelectedComponent(payload.component);
    });

    // Listen for view changes
    eventBus.on('view.changed', (payload: any) => {
      this.setCurrentView(payload.view);
    });
  }

  // State getters
  getComponents(): ComponentBase[] {
    return [...this.state.components];
  }

  getConnections(): Connection[] {
    return [...this.state.connections];
  }

  getSelectedComponent(): ComponentBase | null {
    return this.state.selectedComponent;
  }

  getCurrentView(): ViewState {
    return { ...this.state.currentView };
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

  // State setters
  setComponents(components: ComponentBase[]) {
    this.state.components = [...components];
    this.notifyListeners('components', this.state.components);
  }

  addComponent(component: ComponentBase) {
    this.state.components.push(component);
    this.notifyListeners('components', this.state.components);
    
    eventBus.emit(Events.ComponentCreated, {
      id: component.id,
      type: component.type,
      model: component,
      source: 'legacy'
    });
  }

  removeComponent(componentId: string) {
    this.state.components = this.state.components.filter(c => c.id !== componentId);
    this.notifyListeners('components', this.state.components);
    
    eventBus.emit(Events.ComponentDeleted, {
      id: componentId,
      timestamp: Date.now()
    });
  }

  setConnections(connections: Connection[]) {
    this.state.connections = [...connections];
    this.notifyListeners('connections', this.state.connections);
  }

  addConnection(connection: Connection) {
    this.state.connections.push(connection);
    this.notifyListeners('connections', this.state.connections);
  }

  removeConnection(connectionId: string) {
    this.state.connections = this.state.connections.filter(c => c.id !== connectionId);
    this.notifyListeners('connections', this.state.connections);
  }

  setSelectedComponent(component: ComponentBase | null) {
    this.state.selectedComponent = component;
    this.notifyListeners('selectedComponent', component);
    
    eventBus.emit('component.selection.changed', {
      component,
      timestamp: Date.now()
    });
  }

  setCurrentView(view: ViewState) {
    this.state.currentView = { ...view };
    this.notifyListeners('currentView', view);
    
    eventBus.emit('view.changed', {
      view,
      timestamp: Date.now()
    });
  }

  setTransitioning(isTransitioning: boolean) {
    this.state.isTransitioning = isTransitioning;
    this.notifyListeners('isTransitioning', isTransitioning);
  }

  updateFPS(currentTime: number) {
    if (this.state.lastTime) {
      const delta = currentTime - this.state.lastTime;
      this.state.fps = Math.round(1000 / delta);
      this.notifyListeners('fps', this.state.fps);
      
      // Update FPS display if element exists
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) fpsEl.textContent = `FPS: ${this.state.fps}`;
    }
    this.state.lastTime = currentTime;
  }

  // State subscription system
  subscribe<K extends keyof AppState>(key: K, callback: (value: AppState[K]) => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  private notifyListeners<K extends keyof AppState>(key: K, value: AppState[K]) {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(value));
    }
  }

  // Utility methods
  clearState() {
    this.state.components = [];
    this.state.connections = [];
    this.state.selectedComponent = null;
    this.setCurrentView({
      type: 'main',
      component: null,
      camera: { x: 0, y: 0, zoom: 1 },
      components: [],
      connections: [],
    });
    this.state.isTransitioning = false;
    
    // Notify all listeners
    this.notifyListeners('components', this.state.components);
    this.notifyListeners('connections', this.state.connections);
    this.notifyListeners('selectedComponent', this.state.selectedComponent);
    this.notifyListeners('currentView', this.state.currentView);
    this.notifyListeners('isTransitioning', this.state.isTransitioning);
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
    };
  }

  restoreFromSnapshot(snapshot: Partial<AppState>) {
    if (snapshot.components) this.setComponents(snapshot.components);
    if (snapshot.connections) this.setConnections(snapshot.connections);
    if (snapshot.selectedComponent !== undefined) this.setSelectedComponent(snapshot.selectedComponent);
    if (snapshot.currentView) this.setCurrentView(snapshot.currentView);
    if (snapshot.isTransitioning !== undefined) this.setTransitioning(snapshot.isTransitioning);
    if (snapshot.lastTime !== undefined) this.state.lastTime = snapshot.lastTime;
    if (snapshot.fps !== undefined) this.state.fps = snapshot.fps;
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
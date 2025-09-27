/**
 * Enhanced StateManager - Phase 4 State Management Migration
 *
 * Integrates with the Command pattern to provide centralized state management
 * with undo/redo functionality and event-driven architecture.
 */

import { eventBus } from '../events/EventBus';
import { Events, CommandDispatchedPayload } from '../events/eventTypes';
import { commandExecutor } from '../commands/CommandExecutor';
import type { ComponentBase, Connection, ViewState } from '../types';

export type AppState = {
  components: Record<string, ComponentBase>;
  connections: Record<string, Connection>;
  view: ViewState;
  selectedComponentId: string | null;
  selectedComponentIds: string[];
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
};

export class StateManager {
  private state: AppState;
  private listeners: Map<string, ((state: AppState) => void)[]> = new Map();

  constructor(initialState?: Partial<AppState>) {
    this.state = {
      components: {},
      connections: {},
      view: {
        type: 'main',
        components: [],
        connections: [],
      },
      selectedComponentId: null,
      selectedComponentIds: [],
      camera: { x: 0, y: 0, zoom: 1 },
      ...initialState,
    } as AppState;

    this.setupEventListeners();
  }

  /**
   * Get current state (immutable)
   */
  getState(): AppState {
    return {
      ...this.state,
      components: { ...this.state.components },
      connections: { ...this.state.connections },
      view: { ...this.state.view },
      camera: { ...this.state.camera },
    };
  }

  /**
   * Dispatch a command and handle state changes
   */
  async dispatchCommand(name: string, args?: any, correlationId?: string): Promise<void> {
    const payload: CommandDispatchedPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      args,
      correlationId,
    };

    eventBus.emit(Events.CommandDispatched, payload);

    // Handle command execution based on command name
    await this.handleCommand(name, args);
  }

  /**
   * Set state snapshot (for initialization)
   */
  setSnapshot(state: AppState): void {
    this.state = state;
    this.notifyListeners('stateChanged');
  }

  /**
   * Add a state change listener
   */
  subscribe(event: string, callback: (state: AppState) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    const listeners = this.listeners.get(event)!;
    listeners.push(callback);

    // Return unsubscribe function
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  /**
   * Undo last command
   */
  async undo(): Promise<boolean> {
    const result = await commandExecutor.undo();
    if (result.success) {
      this.notifyListeners('stateChanged');
      return true;
    }
    return false;
  }

  /**
   * Redo next command
   */
  async redo(): Promise<boolean> {
    const result = await commandExecutor.redo();
    if (result.success) {
      this.notifyListeners('stateChanged');
      return true;
    }
    return false;
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return commandExecutor.canUndo();
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return commandExecutor.canRedo();
  }

  /**
   * Get command history
   */
  getHistory() {
    return commandExecutor.getHistory();
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    commandExecutor.clearHistory();
    this.notifyListeners('historyChanged');
  }

  /**
   * Setup event listeners for command results
   */
  private setupEventListeners(): void {
    // Listen for component events
    eventBus.on(Events.ComponentCreated, payload => {
      this.handleComponentCreated(payload);
    });

    eventBus.on(Events.ComponentUpdated, payload => {
      this.handleComponentUpdated(payload);
    });

    eventBus.on(Events.ComponentDeleted, payload => {
      this.handleComponentDeleted(payload);
    });

    // Listen for connection events
    eventBus.on(Events.ConnectionCreated, payload => {
      this.handleConnectionCreated(payload);
    });

    eventBus.on(Events.ConnectionDeleted, payload => {
      this.handleConnectionDeleted(payload);
    });
  }

  /**
   * Handle command execution
   */
  private async handleCommand(name: string, args?: any): Promise<void> {
    // This will be expanded to handle different command types
    // For now, we maintain backward compatibility with the existing system
    // Removed command logging to avoid console spam
  }

  /**
   * Handle component creation
   */
  private handleComponentCreated(payload: any): void {
    if (payload.model) {
      this.state.components[payload.id] = payload.model;
      this.state.view.components.push(payload.model);
      this.notifyListeners('componentCreated', payload);
    }
  }

  /**
   * Handle component updates
   */
  private handleComponentUpdated(payload: any): void {
    if (this.state.components[payload.id]) {
      Object.assign(this.state.components[payload.id], payload.updates);

      // Update in view components array
      const viewIndex = this.state.view.components.findIndex(
        (c: ComponentBase) => c.id === payload.id
      );
      if (viewIndex >= 0) {
        Object.assign(this.state.view.components[viewIndex], payload.updates);
      }

      this.notifyListeners('componentUpdated', payload);
    }
  }

  /**
   * Handle component deletion
   */
  private handleComponentDeleted(payload: any): void {
    if (this.state.components[payload.id]) {
      delete this.state.components[payload.id];

      // Remove from view components array
      this.state.view.components = this.state.view.components.filter(
        (c: ComponentBase) => c.id !== payload.id
      );

      this.notifyListeners('componentDeleted', payload);
    }
  }

  /**
   * Handle connection creation
   */
  private handleConnectionCreated(payload: any): void {
    if (payload.from && payload.to) {
      const connection: Connection = {
        id: payload.id || `conn_${Date.now()}`,
        from: payload.from,
        to: payload.to,
        category: payload.type || 'frontend',
        createdAt: new Date(),
      };

      this.state.connections[connection.id] = connection;
      this.state.view.connections.push(connection);
      this.notifyListeners('connectionCreated', payload);
    }
  }

  /**
   * Handle connection deletion
   */
  private handleConnectionDeleted(payload: any): void {
    if (this.state.connections[payload.id]) {
      delete this.state.connections[payload.id];

      // Remove from view connections array
      this.state.view.connections = this.state.view.connections.filter(
        (c: Connection) => c.id !== payload.id
      );

      this.notifyListeners('connectionDeleted', payload);
    }
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(event: string, data?: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(this.getState());
        } catch (error) {
          console.error(`Error in state listener for ${event}:`, error);
        }
      });
    }
  }
}

export const stateManager = new StateManager();

/**
 * Command Integration - Phase 4 State Management Migration
 * 
 * Integration layer that connects the Command pattern with the existing MotherboardApp
 * to provide seamless undo/redo functionality and enhanced state management.
 */

import { commandExecutor } from '../commands/CommandExecutor';
import { stateManager } from '../state/StateManager';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, Connection, PinHit } from '../types';

export class CommandIntegration {
  private app: any;
  private isInitialized = false;

  constructor(app: any) {
    this.app = app;
    this.setupEventListeners();
    this.isInitialized = true;
  }

  /**
   * Setup event listeners to integrate commands with the app
   */
  private setupEventListeners(): void {
    // Listen for component events and update app state
    eventBus.on(Events.ComponentCreated, (payload) => {
      this.handleComponentCreated(payload);
    });

    eventBus.on(Events.ComponentUpdated, (payload) => {
      this.handleComponentUpdated(payload);
    });

    eventBus.on(Events.ComponentDeleted, (payload) => {
      this.handleComponentDeleted(payload);
    });

    eventBus.on(Events.ConnectionCreated, (payload) => {
      this.handleConnectionCreated(payload);
    });

    eventBus.on(Events.ConnectionDeleted, (payload) => {
      this.handleConnectionDeleted(payload);
    });
  }

  /**
   * Handle component creation
   */
  private handleComponentCreated(payload: any): void {
    if (payload.model && this.app.currentView) {
      // Add to current view components
      this.app.currentView.components.push(payload.model);
      
      // Add to top-level components if on main view
      if (this.app.currentView.type === 'main') {
        this.app.components.push(payload.model);
      }
      
      // Update selection if this is the first component
      if (this.app.currentView.components.length === 1) {
        this.app.selectedComponent = payload.model;
      }
    }
  }

  /**
   * Handle component updates
   */
  private handleComponentUpdated(payload: any): void {
    if (payload.updates && this.app.currentView) {
      // Find and update component in current view
      const component = this.app.currentView.components.find((c: ComponentBase) => c.id === payload.id);
      if (component) {
        Object.assign(component, payload.updates);
      }
      
      // Update in top-level components if on main view
      if (this.app.currentView.type === 'main') {
        const topLevelComponent = this.app.components.find((c: ComponentBase) => c.id === payload.id);
        if (topLevelComponent) {
          Object.assign(topLevelComponent, payload.updates);
        }
      }
      
      // Update selection if this is the selected component
      if (this.app.selectedComponent && this.app.selectedComponent.id === payload.id) {
        Object.assign(this.app.selectedComponent, payload.updates);
      }
    }
  }

  /**
   * Handle component deletion
   */
  private handleComponentDeleted(payload: any): void {
    if (this.app.currentView) {
      // Remove from current view components
      this.app.currentView.components = this.app.currentView.components.filter(
        (c: ComponentBase) => c.id !== payload.id
      );
      
      // Remove from top-level components if on main view
      if (this.app.currentView.type === 'main') {
        this.app.components = this.app.components.filter(
          (c: ComponentBase) => c.id !== payload.id
        );
      }
      
      // Clear selection if deleted component was selected
      if (this.app.selectedComponent && this.app.selectedComponent.id === payload.id) {
        this.app.selectedComponent = null;
      }
    }
  }

  /**
   * Handle connection creation
   */
  private handleConnectionCreated(payload: any): void {
    if (payload.from && payload.to && this.app.currentView) {
      const connection: Connection = {
        id: payload.id || `conn_${Date.now()}`,
        from: payload.from,
        to: payload.to,
        category: payload.type || 'frontend',
        createdAt: new Date(),
      };
      
      // Add to current view connections
      this.app.currentView.connections.push(connection);
      
      // Add to top-level connections if on main view
      if (this.app.currentView.type === 'main') {
        this.app.connections.push(connection);
      }
    }
  }

  /**
   * Handle connection deletion
   */
  private handleConnectionDeleted(payload: any): void {
    if (this.app.currentView) {
      // Remove from current view connections
      this.app.currentView.connections = this.app.currentView.connections.filter(
        (c: Connection) => c.id !== payload.id
      );
      
      // Remove from top-level connections if on main view
      if (this.app.currentView.type === 'main') {
        this.app.connections = this.app.connections.filter(
          (c: Connection) => c.id !== payload.id
        );
      }
    }
  }

  /**
   * Get command history for display
   */
  getCommandHistory() {
    return commandExecutor.getHistory();
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
   * Execute undo
   */
  async undo(): Promise<boolean> {
    return await stateManager.undo();
  }

  /**
   * Execute redo
   */
  async redo(): Promise<boolean> {
    return await stateManager.redo();
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    commandExecutor.clearHistory();
  }

  /**
   * Get current state
   */
  getState() {
    return stateManager.getState();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(event: string, callback: (state: any) => void): () => void {
    return stateManager.subscribe(event, callback);
  }

  /**
   * Initialize the integration with app state
   */
  initializeAppState(): void {
    if (!this.isInitialized) return;

    // Set initial state snapshot
    const initialState = {
      components: this.app.components.reduce((acc: any, comp: ComponentBase) => {
        acc[comp.id] = comp;
        return acc;
      }, {}),
      connections: this.app.connections.reduce((acc: any, conn: Connection) => {
        acc[conn.id] = conn;
        return acc;
      }, {}),
      view: this.app.currentView,
      selectedComponentId: this.app.selectedComponent?.id || null,
      selectedComponentIds: [],
      camera: {
        x: this.app.camera.x,
        y: this.app.camera.y,
        zoom: this.app.camera.zoom,
      },
    };

    stateManager.setSnapshot(initialState);
  }

  /**
   * Cleanup integration
   */
  destroy(): void {
    // Remove event listeners
    eventBus.off(Events.ComponentCreated, this.handleComponentCreated);
    eventBus.off(Events.ComponentUpdated, this.handleComponentUpdated);
    eventBus.off(Events.ComponentDeleted, this.handleComponentDeleted);
    eventBus.off(Events.ConnectionCreated, this.handleConnectionCreated);
    eventBus.off(Events.ConnectionDeleted, this.handleConnectionDeleted);
    
    this.isInitialized = false;
  }
}

// Factory function to create integration
export function createCommandIntegration(app: any): CommandIntegration {
  return new CommandIntegration(app);
}

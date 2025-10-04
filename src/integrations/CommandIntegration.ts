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
    eventBus.on(Events.ComponentCreated, payload => {
      this.handleComponentCreated(payload);
    });

    eventBus.on(Events.ComponentUpdated, payload => {
      this.handleComponentUpdated(payload);
    });

    eventBus.on(Events.ComponentDeleted, payload => {
      this.handleComponentDeleted(payload);
    });

    eventBus.on(Events.ConnectionCreated, payload => {
      this.handleConnectionCreated(payload);
    });

    eventBus.on(Events.ConnectionDeleted, payload => {
      this.handleConnectionDeleted(payload);
    });
  }

  /**
   * Handle component creation
   * Note: State updates are handled by AppStateManager - this is just for command tracking
   */
  private handleComponentCreated(payload: any): void {
    // State updates are now handled by AppStateManager event handlers
    // This handler is primarily for command pattern tracking
    // No direct state manipulation needed here
  }

  /**
   * Handle component updates
   * Note: State updates are handled by AppStateManager - this is just for command tracking
   */
  private handleComponentUpdated(payload: any): void {
    // State updates are now handled by AppStateManager event handlers
    // This handler is primarily for command pattern tracking
    // No direct state manipulation needed here
  }

  /**
   * Handle component deletion
   * Note: State updates are handled by AppStateManager - this is just for command tracking
   */
  private handleComponentDeleted(payload: any): void {
    // State updates are now handled by AppStateManager event handlers
    // This handler is primarily for command pattern tracking
    // No direct state manipulation needed here
  }

  /**
   * Handle connection creation
   * Note: State updates are handled by AppStateManager - this is just for command tracking
   */
  private handleConnectionCreated(payload: any): void {
    // State updates are now handled by AppStateManager event handlers
    // This handler is primarily for command pattern tracking
    // No direct state manipulation needed here
  }

  /**
   * Handle connection deletion
   * Note: State updates are handled by AppStateManager - this is just for command tracking
   */
  private handleConnectionDeleted(payload: any): void {
    // State updates are now handled by AppStateManager event handlers
    // This handler is primarily for command pattern tracking
    // No direct state manipulation needed here
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

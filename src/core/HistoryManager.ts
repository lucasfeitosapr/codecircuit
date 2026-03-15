/**
 * HistoryManager - Snapshot-based undo/redo system
 * Uses serialized state snapshots (like Excalidraw/tldraw) instead of command pattern.
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { AppState } from './AppStateManager';
import type { ComponentBase, Connection } from '../types';

export interface AppSnapshot {
  components: ComponentBase[];
  connections: Connection[];
}

export class HistoryManager {
  private undoStack: AppSnapshot[] = [];
  private redoStack: AppSnapshot[] = [];
  private maxHistory: number;
  private getState: () => AppSnapshot;
  private restoreState: (snapshot: AppSnapshot) => void;
  private isRestoring = false;

  constructor(
    getState: () => AppSnapshot,
    restoreState: (snapshot: AppSnapshot) => void,
    maxHistory = 50
  ) {
    this.getState = getState;
    this.restoreState = restoreState;
    this.maxHistory = maxHistory;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    eventBus.on(Events.UNDO_REQUESTED, () => this.undo());
    eventBus.on(Events.REDO_REQUESTED, () => this.redo());
  }

  /**
   * Push current state onto the undo stack. Call this BEFORE the mutation happens.
   */
  pushSnapshot(): void {
    if (this.isRestoring) return;

    const snapshot = this.deepCloneSnapshot(this.getState());
    this.undoStack.push(snapshot);

    // Trim history if exceeding max
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    // Any new action clears the redo stack
    this.redoStack = [];
  }

  undo(): void {
    if (this.undoStack.length === 0) {
      eventBus.emit('history.undo.empty', { timestamp: Date.now() });
      return;
    }

    // Save current state to redo stack
    const currentState = this.deepCloneSnapshot(this.getState());
    this.redoStack.push(currentState);

    // Restore previous state
    const previousState = this.undoStack.pop()!;
    this.isRestoring = true;
    try {
      this.restoreState(previousState);
    } finally {
      this.isRestoring = false;
    }

    eventBus.emit('history.undo.applied', {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      timestamp: Date.now(),
    });
  }

  redo(): void {
    if (this.redoStack.length === 0) {
      eventBus.emit('history.redo.empty', { timestamp: Date.now() });
      return;
    }

    // Save current state to undo stack
    const currentState = this.deepCloneSnapshot(this.getState());
    this.undoStack.push(currentState);

    // Restore next state
    const nextState = this.redoStack.pop()!;
    this.isRestoring = true;
    try {
      this.restoreState(nextState);
    } finally {
      this.isRestoring = false;
    }

    eventBus.emit('history.redo.applied', {
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      timestamp: Date.now(),
    });
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  private deepCloneSnapshot(snapshot: AppSnapshot): AppSnapshot {
    return JSON.parse(JSON.stringify(snapshot));
  }
}

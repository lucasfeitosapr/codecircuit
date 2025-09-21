/**
 * Component Commands - Phase 4 State Management Migration
 * 
 * Concrete implementations of component-related commands for the Command pattern.
 * These commands handle component creation, updates, deletion, and movement.
 */

import type { 
  CreateComponentCommand,
  UpdateComponentCommand,
  DeleteComponentCommand,
  MoveComponentCommand,
  ToggleComponentStatusCommand,
  CommandResult
} from './commandTypes';
import { generateId } from '../utils';

export class CreateComponentCommandImpl implements CreateComponentCommand {
  readonly id: string;
  readonly type = 'component.create' as const;
  readonly timestamp: number;
  readonly args: CreateComponentCommand['args'];

  private createdComponentId?: string;
  private createdComponent?: any;

  constructor(args: CreateComponentCommand['args']) {
    this.id = generateId();
    this.timestamp = Date.now();
    this.args = args;
  }

  async execute(): Promise<CommandResult> {
    try {
      // This will be implemented to work with the StateManager
      // For now, we'll emit events that the existing system can handle
      const componentId = generateId();
      this.createdComponentId = componentId;

      const component = {
        id: componentId,
        type: this.args.type,
        x: this.args.x,
        y: this.args.y,
        status: 'todo',
        title: `${this.args.type} ${Date.now()}`,
        description: '',
        category: 'frontend',
        createdAt: new Date(),
      };

      this.createdComponent = component;

      return {
        success: true,
        events: ['component.created'],
        data: {
          id: component.id,
          type: component.type,
          model: component,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create component',
      };
    }
  }

  async undo(): Promise<CommandResult> {
    if (!this.createdComponentId) {
      return {
        success: false,
        error: 'No component to undo',
      };
    }

    try {
      return {
        success: true,
        events: ['component.deleted'],
        data: {
          id: this.createdComponentId,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo component creation',
      };
    }
  }

  canUndo(): boolean {
    return true;
  }
}

export class UpdateComponentCommandImpl implements UpdateComponentCommand {
  readonly id: string;
  readonly type = 'component.update' as const;
  readonly timestamp: number;
  readonly args: UpdateComponentCommand['args'];

  private previousState?: any;

  constructor(args: UpdateComponentCommand['args']) {
    this.id = generateId();
    this.timestamp = Date.now();
    this.args = args;
  }

  async execute(): Promise<CommandResult> {
    try {
      // Store previous state for undo
      // This will be implemented to work with the StateManager
      
      return {
        success: true,
        events: ['component.updated'],
        data: {
          id: this.args.id,
          updates: this.args.updates,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update component',
      };
    }
  }

  async undo(): Promise<CommandResult> {
    try {
      return {
        success: true,
        events: ['component.updated'],
        data: {
          id: this.args.id,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo component update',
      };
    }
  }

  canUndo(): boolean {
    return true;
  }
}

export class DeleteComponentCommandImpl implements DeleteComponentCommand {
  readonly id: string;
  readonly type = 'component.delete' as const;
  readonly timestamp: number;
  readonly args: DeleteComponentCommand['args'];

  private deletedComponent?: any;

  constructor(args: DeleteComponentCommand['args']) {
    this.id = generateId();
    this.timestamp = Date.now();
    this.args = args;
  }

  async execute(): Promise<CommandResult> {
    try {
      // Store component state for undo
      // This will be implemented to work with the StateManager
      
      return {
        success: true,
        events: ['component.deleted'],
        data: {
          id: this.args.id,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete component',
      };
    }
  }

  async undo(): Promise<CommandResult> {
    try {
      return {
        success: true,
        events: ['component.created'],
        data: {
          id: this.args.id,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo component deletion',
      };
    }
  }

  canUndo(): boolean {
    return true;
  }
}

export class MoveComponentCommandImpl implements MoveComponentCommand {
  readonly id: string;
  readonly type = 'component.move' as const;
  readonly timestamp: number;
  readonly args: MoveComponentCommand['args'];

  private previousPosition?: { x: number; y: number };

  constructor(args: MoveComponentCommand['args']) {
    this.id = generateId();
    this.timestamp = Date.now();
    this.args = args;
  }

  async execute(): Promise<CommandResult> {
    try {
      // Store previous position for undo
      // This will be implemented to work with the StateManager
      
      return {
        success: true,
        events: ['component.moved'],
        data: {
          id: this.args.id,
          x: this.args.x,
          y: this.args.y,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to move component',
      };
    }
  }

  async undo(): Promise<CommandResult> {
    try {
      return {
        success: true,
        events: ['component.moved'],
        data: {
          id: this.args.id,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo component move',
      };
    }
  }

  canUndo(): boolean {
    return true;
  }
}

export class ToggleComponentStatusCommandImpl implements ToggleComponentStatusCommand {
  readonly id: string;
  readonly type = 'component.toggleStatus' as const;
  readonly timestamp: number;
  readonly args: ToggleComponentStatusCommand['args'];

  private previousStatus?: string;

  constructor(args: ToggleComponentStatusCommand['args']) {
    this.id = generateId();
    this.timestamp = Date.now();
    this.args = args;
  }

  async execute(): Promise<CommandResult> {
    try {
      // Store previous status for undo
      // This will be implemented to work with the StateManager
      
      return {
        success: true,
        events: ['component.statusChanged'],
        data: {
          id: this.args.id,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle component status',
      };
    }
  }

  async undo(): Promise<CommandResult> {
    try {
      return {
        success: true,
        events: ['component.statusChanged'],
        data: {
          id: this.args.id,
          source: 'command',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to undo status toggle',
      };
    }
  }

  canUndo(): boolean {
    return true;
  }
}

// Command factory functions
export function createComponentCommand(args: CreateComponentCommand['args']): CreateComponentCommandImpl {
  return new CreateComponentCommandImpl(args);
}

export function updateComponentCommand(args: UpdateComponentCommand['args']): UpdateComponentCommandImpl {
  return new UpdateComponentCommandImpl(args);
}

export function deleteComponentCommand(args: DeleteComponentCommand['args']): DeleteComponentCommandImpl {
  return new DeleteComponentCommandImpl(args);
}

export function moveComponentCommand(args: MoveComponentCommand['args']): MoveComponentCommandImpl {
  return new MoveComponentCommandImpl(args);
}

export function toggleComponentStatusCommand(args: ToggleComponentStatusCommand['args']): ToggleComponentStatusCommandImpl {
  return new ToggleComponentStatusCommandImpl(args);
}

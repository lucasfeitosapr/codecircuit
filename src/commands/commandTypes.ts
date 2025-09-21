/**
 * Command Types - Phase 4 State Management Migration
 * 
 * Defines the command pattern interfaces and types for undo/redo functionality.
 * All state changes will go through these commands to enable reliable state management.
 */

export interface Command {
  readonly id: string;
  readonly type: string;
  readonly timestamp: number;
  execute(): Promise<CommandResult>;
  undo(): Promise<CommandResult>;
  canUndo(): boolean;
}

export interface CommandResult {
  success: boolean;
  error?: string;
  events?: string[]; // Event names that should be emitted
  data?: any; // Additional data for event payloads
}

// Component Commands
export interface CreateComponentCommand extends Command {
  readonly type: 'component.create';
  readonly args: {
    type: string;
    x: number;
    y: number;
    viewId?: string;
  };
}

export interface UpdateComponentCommand extends Command {
  readonly type: 'component.update';
  readonly args: {
    id: string;
    updates: Partial<{
      x: number;
      y: number;
      status: string;
      title: string;
      description: string;
      category: string;
    }>;
  };
}

export interface DeleteComponentCommand extends Command {
  readonly type: 'component.delete';
  readonly args: {
    id: string;
  };
}

export interface MoveComponentCommand extends Command {
  readonly type: 'component.move';
  readonly args: {
    id: string;
    x: number;
    y: number;
  };
}

export interface ToggleComponentStatusCommand extends Command {
  readonly type: 'component.toggleStatus';
  readonly args: {
    id: string;
  };
}

// Connection Commands
export interface CreateConnectionCommand extends Command {
  readonly type: 'connection.create';
  readonly args: {
    from: {
      componentId: string;
      pinIndex: number;
      pinType: 'input' | 'output';
    };
    to: {
      componentId: string;
      pinIndex: number;
      pinType: 'input' | 'output';
    };
    category: string;
  };
}

export interface DeleteConnectionCommand extends Command {
  readonly type: 'connection.delete';
  readonly args: {
    id: string;
  };
}

// View Commands
export interface NavigateToComponentCommand extends Command {
  readonly type: 'view.navigateToComponent';
  readonly args: {
    componentId: string;
  };
}

export interface NavigateBackCommand extends Command {
  readonly type: 'view.navigateBack';
}

export interface UpdateCameraCommand extends Command {
  readonly type: 'view.updateCamera';
  readonly args: {
    x: number;
    y: number;
    zoom: number;
  };
}

// Selection Commands
export interface SelectComponentCommand extends Command {
  readonly type: 'selection.select';
  readonly args: {
    componentId: string | null;
  };
}

export interface MultiSelectCommand extends Command {
  readonly type: 'selection.multiSelect';
  readonly args: {
    componentIds: string[];
  };
}

// Batch Commands
export interface BatchCommand extends Command {
  readonly type: 'batch';
  readonly args: {
    commands: Command[];
  };
}

// Command Factory Types
export type CommandType = 
  | CreateComponentCommand['type']
  | UpdateComponentCommand['type']
  | DeleteComponentCommand['type']
  | MoveComponentCommand['type']
  | ToggleComponentStatusCommand['type']
  | CreateConnectionCommand['type']
  | DeleteConnectionCommand['type']
  | NavigateToComponentCommand['type']
  | NavigateBackCommand['type']
  | UpdateCameraCommand['type']
  | SelectComponentCommand['type']
  | MultiSelectCommand['type']
  | BatchCommand['type'];

export type AnyCommand = 
  | CreateComponentCommand
  | UpdateComponentCommand
  | DeleteComponentCommand
  | MoveComponentCommand
  | ToggleComponentStatusCommand
  | CreateConnectionCommand
  | DeleteConnectionCommand
  | NavigateToComponentCommand
  | NavigateBackCommand
  | UpdateCameraCommand
  | SelectComponentCommand
  | MultiSelectCommand
  | BatchCommand;

// Command History for Undo/Redo
export interface CommandHistory {
  past: Command[];
  present: Command | null;
  future: Command[];
  maxHistorySize: number;
}

// Command Validation
export interface CommandValidator<T extends Command = AnyCommand> {
  validate(command: T): Promise<ValidationResult>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Command Middleware
export interface CommandMiddleware {
  beforeExecute?(command: Command): Promise<void>;
  afterExecute?(command: Command, result: CommandResult): Promise<void>;
  onError?(command: Command, error: Error): Promise<void>;
}

/**
 * Command Executor - Phase 4 State Management Migration
 * 
 * Executes commands and maintains command history for undo/redo functionality.
 * This is the core of the Command pattern implementation.
 */

import type { 
  Command, 
  CommandResult, 
  CommandHistory, 
  CommandValidator, 
  CommandMiddleware,
  AnyCommand,
  ValidationResult 
} from './commandTypes';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

export class CommandExecutor {
  private history: CommandHistory;
  private validators: Map<string, CommandValidator> = new Map();
  private middlewares: CommandMiddleware[] = [];
  private isExecuting = false;

  constructor(maxHistorySize = 50) {
    this.history = {
      past: [],
      present: null,
      future: [],
      maxHistorySize,
    };
  }

  /**
   * Execute a command and add it to history
   */
  async execute<T extends Command>(command: T): Promise<CommandResult> {
    if (this.isExecuting) {
      return {
        success: false,
        error: 'Command execution already in progress',
      };
    }

    this.isExecuting = true;

    try {
      // Validate command
      const validation = await this.validateCommand(command);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Command validation failed: ${validation.errors.join(', ')}`,
        };
      }

      // Run before middleware
      await this.runBeforeMiddleware(command);

      // Execute command
      const result = await command.execute();

      if (result.success) {
        // Add to history if command can be undone
        if (command.canUndo()) {
          this.addToHistory(command);
        }

        // Emit events if specified
        if (result.events) {
          for (const eventName of result.events) {
            eventBus.emit(eventName as any, result.data);
          }
        }

        // Run after middleware
        await this.runAfterMiddleware(command, result);
      }

      return result;
    } catch (error) {
      const errorResult: CommandResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Run error middleware
      await this.runErrorMiddleware(command, error as Error);

      return errorResult;
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Undo the last command
   */
  async undo(): Promise<CommandResult> {
    if (this.history.past.length === 0) {
      return {
        success: false,
        error: 'No commands to undo',
      };
    }

    const command = this.history.past[this.history.past.length - 1];
    
    try {
      const result = await command.undo();
      
      if (result.success) {
        // Move command from past to future
        this.history.past.pop();
        this.history.future.unshift(command);
        this.history.present = null;

        // Emit events if specified
        if (result.events) {
          for (const eventName of result.events) {
            eventBus.emit(eventName as any, result.data);
          }
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Undo failed',
      };
    }
  }

  /**
   * Redo the next command
   */
  async redo(): Promise<CommandResult> {
    if (this.history.future.length === 0) {
      return {
        success: false,
        error: 'No commands to redo',
      };
    }

    const command = this.history.future[0];
    
    try {
      const result = await command.execute();
      
      if (result.success) {
        // Move command from future to past
        this.history.future.shift();
        this.history.past.push(command);
        this.history.present = command;

        // Emit events if specified
        if (result.events) {
          for (const eventName of result.events) {
            eventBus.emit(eventName as any, result.data);
          }
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Redo failed',
      };
    }
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.history.past.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.history.future.length > 0;
  }

  /**
   * Get command history
   */
  getHistory(): Readonly<CommandHistory> {
    return {
      past: [...this.history.past],
      present: this.history.present,
      future: [...this.history.future],
      maxHistorySize: this.history.maxHistorySize,
    };
  }

  /**
   * Clear command history
   */
  clearHistory(): void {
    this.history.past = [];
    this.history.present = null;
    this.history.future = [];
  }

  /**
   * Register a command validator
   */
  registerValidator(commandType: string, validator: CommandValidator): void {
    this.validators.set(commandType, validator);
  }

  /**
   * Register command middleware
   */
  registerMiddleware(middleware: CommandMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Validate a command
   */
  private async validateCommand(command: Command): Promise<ValidationResult> {
    const validator = this.validators.get(command.type);
    if (!validator) {
      return { isValid: true, errors: [], warnings: [] };
    }

    return await validator.validate(command);
  }

  /**
   * Add command to history with size management
   */
  private addToHistory(command: Command): void {
    this.history.past.push(command);
    this.history.present = command;
    this.history.future = []; // Clear future when new command is added

    // Manage history size
    if (this.history.past.length > this.history.maxHistorySize) {
      this.history.past.shift();
    }
  }

  /**
   * Run before middleware
   */
  private async runBeforeMiddleware(command: Command): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.beforeExecute) {
        await middleware.beforeExecute(command);
      }
    }
  }

  /**
   * Run after middleware
   */
  private async runAfterMiddleware(command: Command, result: CommandResult): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.afterExecute) {
        await middleware.afterExecute(command, result);
      }
    }
  }

  /**
   * Run error middleware
   */
  private async runErrorMiddleware(command: Command, error: Error): Promise<void> {
    for (const middleware of this.middlewares) {
      if (middleware.onError) {
        await middleware.onError(command, error);
      }
    }
  }
}

// Singleton instance
export const commandExecutor = new CommandExecutor();

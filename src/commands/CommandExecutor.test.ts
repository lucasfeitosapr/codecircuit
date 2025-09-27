/**
 * Command Executor Tests - Phase 4 State Management Migration
 *
 * Comprehensive tests for the Command pattern implementation including
 * undo/redo functionality, command history, and middleware.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandExecutor } from './CommandExecutor';
import type { Command, CommandResult, CommandMiddleware } from './commandTypes';

// Mock the event bus
vi.mock('../events/EventBus', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock command for testing
class TestCommand implements Command {
  readonly id: string;
  readonly type = 'test.command' as const;
  readonly timestamp: number;
  readonly args: { value: string };

  private executed = false;
  private undone = false;

  constructor(args: { value: string }) {
    this.id = `test_${Date.now()}`;
    this.timestamp = Date.now();
    this.args = args;
  }

  async execute(): Promise<CommandResult> {
    this.executed = true;
    return {
      success: true,
      events: ['test.executed'],
      data: { value: this.args.value },
    };
  }

  async undo(): Promise<CommandResult> {
    this.undone = true;
    return {
      success: true,
      events: ['test.undone'],
      data: { value: this.args.value },
    };
  }

  canUndo(): boolean {
    return true;
  }

  getExecuted(): boolean {
    return this.executed;
  }

  getUndone(): boolean {
    return this.undone;
  }
}

// Mock command that fails
class FailingCommand implements Command {
  readonly id: string;
  readonly type = 'test.failing' as const;
  readonly timestamp: number;
  readonly args: { error: string };

  constructor(args: { error: string }) {
    this.id = `failing_${Date.now()}`;
    this.timestamp = Date.now();
    this.args = args;
  }

  async execute(): Promise<CommandResult> {
    throw new Error(this.args.error);
  }

  async undo(): Promise<CommandResult> {
    return {
      success: false,
      error: 'Cannot undo failing command',
    };
  }

  canUndo(): boolean {
    return false;
  }
}

describe('CommandExecutor', () => {
  let executor: CommandExecutor;
  let mockEventBus: any;

  beforeEach(() => {
    executor = new CommandExecutor(5); // Small history for testing
    vi.clearAllMocks();
  });

  describe('Command Execution', () => {
    it('should execute a command successfully', async () => {
      const command = new TestCommand({ value: 'test' });
      const result = await executor.execute(command);

      expect(result.success).toBe(true);
      expect(result.events).toEqual(['test.executed']);
      expect(result.data).toEqual({ value: 'test' });
      expect(command.getExecuted()).toBe(true);
    });

    it('should handle command execution failure', async () => {
      const command = new FailingCommand({ error: 'Test error' });
      const result = await executor.execute(command);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('should prevent concurrent execution', async () => {
      const command1 = new TestCommand({ value: 'test1' });
      const command2 = new TestCommand({ value: 'test2' });

      // Start first command
      const promise1 = executor.execute(command1);

      // Try to execute second command while first is running
      const promise2 = executor.execute(command2);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Command execution already in progress');
    });
  });

  describe('Command History', () => {
    it('should add executed command to history', async () => {
      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);

      const history = executor.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.past[0]).toBe(command);
      expect(history.present).toBe(command);
      expect(history.future).toHaveLength(0);
    });

    it('should not add non-undoable commands to history', async () => {
      const command = new FailingCommand({ error: 'test' });
      await executor.execute(command);

      const history = executor.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.present).toBeNull();
    });

    it('should limit history size', async () => {
      // Execute more commands than history limit
      for (let i = 0; i < 7; i++) {
        const command = new TestCommand({ value: `test${i}` });
        await executor.execute(command);
      }

      const history = executor.getHistory();
      expect(history.past).toHaveLength(5); // Should be limited to maxHistorySize
      expect(history.present).toBe(history.past[history.past.length - 1]);
    });
  });

  describe('Undo/Redo', () => {
    it('should undo the last command', async () => {
      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);

      const undoResult = await executor.undo();

      expect(undoResult.success).toBe(true);
      expect(command.getUndone()).toBe(true);

      const history = executor.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.future).toHaveLength(1);
      expect(history.future[0]).toBe(command);
    });

    it('should redo an undone command', async () => {
      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);
      await executor.undo();

      const redoResult = await executor.redo();

      expect(redoResult.success).toBe(true);
      expect(command.getExecuted()).toBe(true);

      const history = executor.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.future).toHaveLength(0);
      expect(history.past[0]).toBe(command);
    });

    it('should clear future when new command is executed', async () => {
      const command1 = new TestCommand({ value: 'test1' });
      const command2 = new TestCommand({ value: 'test2' });

      await executor.execute(command1);
      await executor.undo();
      await executor.execute(command2);

      const history = executor.getHistory();
      expect(history.past).toHaveLength(1);
      expect(history.past[0]).toBe(command2);
      expect(history.future).toHaveLength(0);
    });

    it('should return error when no commands to undo', async () => {
      const result = await executor.undo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No commands to undo');
    });

    it('should return error when no commands to redo', async () => {
      const result = await executor.redo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('No commands to redo');
    });
  });

  describe('History Management', () => {
    it('should clear history', async () => {
      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);

      executor.clearHistory();

      const history = executor.getHistory();
      expect(history.past).toHaveLength(0);
      expect(history.present).toBeNull();
      expect(history.future).toHaveLength(0);
    });

    it('should check undo availability', async () => {
      expect(executor.canUndo()).toBe(false);

      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);

      expect(executor.canUndo()).toBe(true);

      await executor.undo();

      expect(executor.canUndo()).toBe(false);
    });

    it('should check redo availability', async () => {
      expect(executor.canRedo()).toBe(false);

      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);
      await executor.undo();

      expect(executor.canRedo()).toBe(true);

      await executor.redo();

      expect(executor.canRedo()).toBe(false);
    });
  });

  describe('Middleware', () => {
    it('should run before middleware', async () => {
      const beforeSpy = vi.fn();
      const middleware: CommandMiddleware = {
        beforeExecute: beforeSpy,
      };

      executor.registerMiddleware(middleware);

      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);

      expect(beforeSpy).toHaveBeenCalledWith(command);
    });

    it('should run after middleware', async () => {
      const afterSpy = vi.fn();
      const middleware: CommandMiddleware = {
        afterExecute: afterSpy,
      };

      executor.registerMiddleware(middleware);

      const command = new TestCommand({ value: 'test' });
      const result = await executor.execute(command);

      expect(afterSpy).toHaveBeenCalledWith(command, result);
    });

    it('should run error middleware on failure', async () => {
      const errorSpy = vi.fn();
      const middleware: CommandMiddleware = {
        onError: errorSpy,
      };

      executor.registerMiddleware(middleware);

      const command = new FailingCommand({ error: 'test error' });
      await executor.execute(command);

      expect(errorSpy).toHaveBeenCalledWith(command, expect.any(Error));
    });

    it('should handle multiple middleware', async () => {
      const middleware1: CommandMiddleware = {
        beforeExecute: vi.fn(),
        afterExecute: vi.fn(),
      };
      const middleware2: CommandMiddleware = {
        beforeExecute: vi.fn(),
        afterExecute: vi.fn(),
      };

      executor.registerMiddleware(middleware1);
      executor.registerMiddleware(middleware2);

      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);

      expect(middleware1.beforeExecute).toHaveBeenCalledWith(command);
      expect(middleware2.beforeExecute).toHaveBeenCalledWith(command);
      expect(middleware1.afterExecute).toHaveBeenCalled();
      expect(middleware2.afterExecute).toHaveBeenCalled();
    });
  });

  describe('Event Emission', () => {
    it('should emit events from command result', async () => {
      const { eventBus } = await import('../events/EventBus');
      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);

      expect(eventBus.emit).toHaveBeenCalledWith('test.executed', { value: 'test' });
    });

    it('should emit events from undo result', async () => {
      const { eventBus } = await import('../events/EventBus');
      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);
      await executor.undo();

      expect(eventBus.emit).toHaveBeenCalledWith('test.undone', { value: 'test' });
    });

    it('should emit events from redo result', async () => {
      const { eventBus } = await import('../events/EventBus');
      const command = new TestCommand({ value: 'test' });
      await executor.execute(command);
      await executor.undo();
      await executor.redo();

      expect(eventBus.emit).toHaveBeenCalledWith('test.executed', { value: 'test' });
    });
  });
});

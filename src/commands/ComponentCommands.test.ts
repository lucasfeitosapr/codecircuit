/**
 * Component Commands Tests - Phase 4 State Management Migration
 *
 * Tests for component-related command implementations including
 * creation, updates, deletion, movement, and status changes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CreateComponentCommandImpl,
  UpdateComponentCommandImpl,
  DeleteComponentCommandImpl,
  MoveComponentCommandImpl,
  ToggleComponentStatusCommandImpl,
  createComponentCommand,
  updateComponentCommand,
  deleteComponentCommand,
  moveComponentCommand,
  toggleComponentStatusCommand,
} from './ComponentCommands';

describe('CreateComponentCommand', () => {
  it('should create a component command with correct properties', () => {
    const command = new CreateComponentCommandImpl({
      type: 'power-core',
      x: 100,
      y: 200,
    });

    expect(command.type).toBe('component.create');
    expect(command.args.type).toBe('power-core');
    expect(command.args.x).toBe(100);
    expect(command.args.y).toBe(200);
    expect(command.id).toBeDefined();
    expect(command.timestamp).toBeGreaterThan(0);
  });

  it('should execute successfully', async () => {
    const command = new CreateComponentCommandImpl({
      type: 'module-ic',
      x: 150,
      y: 250,
    });

    const result = await command.execute();

    expect(result.success).toBe(true);
    expect(result.events).toEqual(['component.created']);
    expect(result.data.id).toBeDefined();
    expect(result.data.type).toBe('module-ic');
    expect(result.data.model).toBeDefined();
    expect(result.data.source).toBe('command');
  });

  it('should undo successfully', async () => {
    const command = new CreateComponentCommandImpl({
      type: 'task-resistor',
      x: 300,
      y: 400,
    });

    await command.execute();
    const undoResult = await command.undo();

    expect(undoResult.success).toBe(true);
    expect(undoResult.events).toEqual(['component.deleted']);
    expect(undoResult.data.id).toBeDefined();
    expect(undoResult.data.source).toBe('command');
  });

  it('should return error when undoing without executing', async () => {
    const command = new CreateComponentCommandImpl({
      type: 'power-core',
      x: 0,
      y: 0,
    });

    const result = await command.undo();

    expect(result.success).toBe(false);
    expect(result.error).toBe('No component to undo');
  });

  it('should indicate it can be undone', () => {
    const command = new CreateComponentCommandImpl({
      type: 'power-core',
      x: 0,
      y: 0,
    });

    expect(command.canUndo()).toBe(true);
  });
});

describe('UpdateComponentCommand', () => {
  it('should create an update command with correct properties', () => {
    const command = new UpdateComponentCommandImpl({
      id: 'test-component',
      updates: {
        title: 'Updated Title',
        status: 'in-progress',
      },
    });

    expect(command.type).toBe('component.update');
    expect(command.args.id).toBe('test-component');
    expect(command.args.updates.title).toBe('Updated Title');
    expect(command.args.updates.status).toBe('in-progress');
  });

  it('should execute successfully', async () => {
    const command = new UpdateComponentCommandImpl({
      id: 'test-component',
      updates: {
        x: 100,
        y: 200,
        title: 'New Title',
      },
    });

    const result = await command.execute();

    expect(result.success).toBe(true);
    expect(result.events).toEqual(['component.updated']);
    expect(result.data.id).toBe('test-component');
    expect(result.data.updates.x).toBe(100);
    expect(result.data.updates.y).toBe(200);
    expect(result.data.updates.title).toBe('New Title');
  });

  it('should undo successfully', async () => {
    const command = new UpdateComponentCommandImpl({
      id: 'test-component',
      updates: {
        status: 'done',
      },
    });

    await command.execute();
    const undoResult = await command.undo();

    expect(undoResult.success).toBe(true);
    expect(undoResult.events).toEqual(['component.updated']);
    expect(undoResult.data.id).toBe('test-component');
    expect(undoResult.data.source).toBe('command');
  });

  it('should indicate it can be undone', () => {
    const command = new UpdateComponentCommandImpl({
      id: 'test-component',
      updates: { title: 'test' },
    });

    expect(command.canUndo()).toBe(true);
  });
});

describe('DeleteComponentCommand', () => {
  it('should create a delete command with correct properties', () => {
    const command = new DeleteComponentCommandImpl({
      id: 'component-to-delete',
    });

    expect(command.type).toBe('component.delete');
    expect(command.args.id).toBe('component-to-delete');
  });

  it('should execute successfully', async () => {
    const command = new DeleteComponentCommandImpl({
      id: 'component-to-delete',
    });

    const result = await command.execute();

    expect(result.success).toBe(true);
    expect(result.events).toEqual(['component.deleted']);
    expect(result.data.id).toBe('component-to-delete');
    expect(result.data.source).toBe('command');
  });

  it('should undo successfully', async () => {
    const command = new DeleteComponentCommandImpl({
      id: 'component-to-delete',
    });

    await command.execute();
    const undoResult = await command.undo();

    expect(undoResult.success).toBe(true);
    expect(undoResult.events).toEqual(['component.created']);
    expect(undoResult.data.id).toBeDefined();
    expect(undoResult.data.source).toBe('command');
  });

  it('should indicate it can be undone', () => {
    const command = new DeleteComponentCommandImpl({
      id: 'component-to-delete',
    });

    expect(command.canUndo()).toBe(true);
  });
});

describe('MoveComponentCommand', () => {
  it('should create a move command with correct properties', () => {
    const command = new MoveComponentCommandImpl({
      id: 'component-to-move',
      x: 150,
      y: 250,
    });

    expect(command.type).toBe('component.move');
    expect(command.args.id).toBe('component-to-move');
    expect(command.args.x).toBe(150);
    expect(command.args.y).toBe(250);
  });

  it('should execute successfully', async () => {
    const command = new MoveComponentCommandImpl({
      id: 'component-to-move',
      x: 300,
      y: 400,
    });

    const result = await command.execute();

    expect(result.success).toBe(true);
    expect(result.events).toEqual(['component.moved']);
    expect(result.data.id).toBe('component-to-move');
    expect(result.data.x).toBe(300);
    expect(result.data.y).toBe(400);
    expect(result.data.source).toBe('command');
  });

  it('should undo successfully', async () => {
    const command = new MoveComponentCommandImpl({
      id: 'component-to-move',
      x: 300,
      y: 400,
    });

    await command.execute();
    const undoResult = await command.undo();

    expect(undoResult.success).toBe(true);
    expect(undoResult.events).toEqual(['component.moved']);
    expect(undoResult.data.id).toBe('component-to-move');
    expect(undoResult.data.source).toBe('command');
  });

  it('should indicate it can be undone', () => {
    const command = new MoveComponentCommandImpl({
      id: 'component-to-move',
      x: 0,
      y: 0,
    });

    expect(command.canUndo()).toBe(true);
  });
});

describe('ToggleComponentStatusCommand', () => {
  it('should create a toggle status command with correct properties', () => {
    const command = new ToggleComponentStatusCommandImpl({
      id: 'component-to-toggle',
    });

    expect(command.type).toBe('component.toggleStatus');
    expect(command.args.id).toBe('component-to-toggle');
  });

  it('should execute successfully', async () => {
    const command = new ToggleComponentStatusCommandImpl({
      id: 'component-to-toggle',
    });

    const result = await command.execute();

    expect(result.success).toBe(true);
    expect(result.events).toEqual(['component.statusChanged']);
    expect(result.data.id).toBe('component-to-toggle');
    expect(result.data.source).toBe('command');
  });

  it('should undo successfully', async () => {
    const command = new ToggleComponentStatusCommandImpl({
      id: 'component-to-toggle',
    });

    await command.execute();
    const undoResult = await command.undo();

    expect(undoResult.success).toBe(true);
    expect(undoResult.events).toEqual(['component.statusChanged']);
    expect(undoResult.data.id).toBe('component-to-toggle');
    expect(undoResult.data.source).toBe('command');
  });

  it('should indicate it can be undone', () => {
    const command = new ToggleComponentStatusCommandImpl({
      id: 'component-to-toggle',
    });

    expect(command.canUndo()).toBe(true);
  });
});

describe('Command Factory Functions', () => {
  it('should create component command via factory', () => {
    const command = createComponentCommand({
      type: 'power-core',
      x: 100,
      y: 200,
    });

    expect(command).toBeInstanceOf(CreateComponentCommandImpl);
    expect(command.type).toBe('component.create');
  });

  it('should create update command via factory', () => {
    const command = updateComponentCommand({
      id: 'test',
      updates: { title: 'test' },
    });

    expect(command).toBeInstanceOf(UpdateComponentCommandImpl);
    expect(command.type).toBe('component.update');
  });

  it('should create delete command via factory', () => {
    const command = deleteComponentCommand({
      id: 'test',
    });

    expect(command).toBeInstanceOf(DeleteComponentCommandImpl);
    expect(command.type).toBe('component.delete');
  });

  it('should create move command via factory', () => {
    const command = moveComponentCommand({
      id: 'test',
      x: 100,
      y: 200,
    });

    expect(command).toBeInstanceOf(MoveComponentCommandImpl);
    expect(command.type).toBe('component.move');
  });

  it('should create toggle status command via factory', () => {
    const command = toggleComponentStatusCommand({
      id: 'test',
    });

    expect(command).toBeInstanceOf(ToggleComponentStatusCommandImpl);
    expect(command.type).toBe('component.toggleStatus');
  });
});

/**
 * BatchedComponentRenderer.test.ts - Test batched component rendering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BatchedComponentRenderer } from './BatchedComponentRenderer';
import type { ComponentBase } from '../types';

// Mock the renderComponent function to avoid canvas issues in tests
vi.mock('./ImplementationHelpers', () => ({
  renderComponent: vi.fn(),
}));

describe('BatchedComponentRenderer', () => {
  let renderer: BatchedComponentRenderer;
  let mockCtx: CanvasRenderingContext2D;
  let mockComponents: ComponentBase[];

  beforeEach(() => {
    renderer = new BatchedComponentRenderer();

    // Mock canvas context with all necessary methods
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      setLineDash: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
      font: '',
      textAlign: 'center',
      textBaseline: 'middle',
      lineCap: 'butt',
      globalAlpha: 1,
    } as any;

    // Mock components of different types
    mockComponents = [
      {
        id: 'task-1',
        type: 'task-resistor',
        x: 100,
        y: 100,
        width: 60,
        height: 30,
        status: 'todo',
        category: 'frontend',
        name: 'Task 1',
        createdAt: new Date(),
      },
      {
        id: 'task-2',
        type: 'task-resistor',
        x: 200,
        y: 100,
        width: 60,
        height: 30,
        status: 'in-progress',
        category: 'frontend',
        name: 'Task 2',
        createdAt: new Date(),
      },
      {
        id: 'power-1',
        type: 'power-core',
        x: 100,
        y: 200,
        width: 60,
        height: 60,
        status: 'done',
        category: 'backend',
        name: 'Power Core',
        createdAt: new Date(),
      },
      {
        id: 'decision-1',
        type: 'decision-point',
        x: 300,
        y: 150,
        width: 60,
        height: 60,
        status: 'defined',
        category: 'flow-control',
        name: 'Decision',
        createdAt: new Date(),
      },
    ];
  });

  describe('Component Batching', () => {
    it('should group components by type', () => {
      const renderContext = {
        camera: { x: 0, y: 0, zoom: 1 },
        timestamp: performance.now(),
        categories: {
          frontend: { name: 'Frontend', color: '#00ff88' },
          backend: { name: 'Backend', color: '#ff8800' },
          'flow-control': { name: 'Flow Control', color: '#8800ff' },
        },
        selectedComponentId: null,
        connections: [],
      };

      // Test the actual batching logic without mocking
      renderer.renderComponents(mockCtx, mockComponents, renderContext);

      const stats = renderer.getStats();

      // Should have 3 batches (task-resistor, power-core, decision-point)
      expect(stats.batchCount).toBe(3);
      expect(stats.totalComponents).toBe(4);

      // Should have task-resistor batch with 2 components
      expect(stats.batchSizes['task-resistor']).toBe(2);
      expect(stats.batchSizes['power-core']).toBe(1);
      expect(stats.batchSizes['decision-point']).toBe(1);

      // Should reduce state changes significantly
      expect(stats.stateChanges).toBe(3); // One per batch instead of per component
    });

    it('should optimize canvas state changes', () => {
      const renderContext = {
        camera: { x: 0, y: 0, zoom: 1 },
        timestamp: performance.now(),
        categories: {
          frontend: { name: 'Frontend', color: '#00ff88' },
        },
        selectedComponentId: null,
        connections: [],
      };

      renderer.renderComponents(mockCtx, mockComponents, renderContext);

      // Should call save/restore once per batch, not per component
      expect(mockCtx.save).toHaveBeenCalledTimes(3); // 3 batches
      expect(mockCtx.restore).toHaveBeenCalledTimes(3); // 3 batches
    });

    it('should track performance metrics', () => {
      const renderContext = {
        camera: { x: 0, y: 0, zoom: 1 },
        timestamp: performance.now(),
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      renderer.renderComponents(mockCtx, mockComponents, renderContext);

      const stats = renderer.getStats();
      const performanceGain = renderer.getPerformanceGain();

      expect(stats.renderTime).toBeGreaterThan(0);
      expect(performanceGain.stateChangeReduction).toBeCloseTo(0.25); // 3 state changes vs 4 components = 25% reduction
      expect(performanceGain.timePerComponent).toBeGreaterThan(0);
      expect(performanceGain.efficiency).toContain('components/batch');
    });

    it('should handle empty component list', () => {
      const renderContext = {
        camera: { x: 0, y: 0, zoom: 1 },
        timestamp: performance.now(),
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      renderer.renderComponents(mockCtx, [], renderContext);

      const stats = renderer.getStats();
      expect(stats.totalComponents).toBe(0);
      expect(stats.batchCount).toBe(0);
      expect(stats.stateChanges).toBe(0);
    });

    it('should handle single component type efficiently', () => {
      const singleTypeComponents = mockComponents.filter(c => c.type === 'task-resistor');

      const renderContext = {
        camera: { x: 0, y: 0, zoom: 1 },
        timestamp: performance.now(),
        categories: { frontend: { name: 'Frontend', color: '#00ff88' } },
        selectedComponentId: null,
        connections: [],
      };

      renderer.renderComponents(mockCtx, singleTypeComponents, renderContext);

      const stats = renderer.getStats();
      expect(stats.batchCount).toBe(1); // Single batch
      expect(stats.totalComponents).toBe(2);
      expect(stats.stateChanges).toBe(1); // Only one state change needed
    });
  });

  describe('Performance Comparison', () => {
    it('should show performance improvement vs individual rendering', () => {
      const renderContext = {
        camera: { x: 0, y: 0, zoom: 1 },
        timestamp: performance.now(),
        categories: {
          frontend: { name: 'Frontend', color: '#00ff88' },
          backend: { name: 'Backend', color: '#ff8800' },
          'flow-control': { name: 'Flow Control', color: '#8800ff' },
        },
        selectedComponentId: null,
        connections: [],
      };

      // Test batched rendering
      const startBatched = performance.now();
      renderer.renderComponents(mockCtx, mockComponents, renderContext);
      const batchedTime = performance.now() - startBatched;

      const batchedStats = renderer.getStats();
      const performanceGain = renderer.getPerformanceGain();

      // Verify we got performance benefits
      expect(batchedStats.stateChanges).toBeLessThan(mockComponents.length);
      expect(performanceGain.stateChangeReduction).toBeGreaterThan(0);

      console.log('🎨 Batched rendering performance test:', {
        components: batchedStats.totalComponents,
        batches: batchedStats.batchCount,
        stateChanges: batchedStats.stateChanges,
        stateChangeReduction: `${(performanceGain.stateChangeReduction * 100).toFixed(1)}%`,
        efficiency: performanceGain.efficiency,
      });
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide detailed statistics', () => {
      const renderContext = {
        camera: { x: 0, y: 0, zoom: 1 },
        timestamp: performance.now(),
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      renderer.renderComponents(mockCtx, mockComponents, renderContext);

      const stats = renderer.getStats();

      expect(stats).toHaveProperty('totalComponents');
      expect(stats).toHaveProperty('batchCount');
      expect(stats).toHaveProperty('stateChanges');
      expect(stats).toHaveProperty('renderTime');
      expect(stats).toHaveProperty('batchSizes');

      expect(typeof stats.totalComponents).toBe('number');
      expect(typeof stats.batchCount).toBe('number');
      expect(typeof stats.stateChanges).toBe('number');
      expect(typeof stats.renderTime).toBe('number');
      expect(typeof stats.batchSizes).toBe('object');
    });

    it('should reset statistics correctly', () => {
      const renderContext = {
        camera: { x: 0, y: 0, zoom: 1 },
        timestamp: performance.now(),
        categories: {},
        selectedComponentId: null,
        connections: [],
      };

      renderer.renderComponents(mockCtx, mockComponents, renderContext);

      // Verify stats exist
      let stats = renderer.getStats();
      expect(stats.totalComponents).toBeGreaterThan(0);

      // Reset stats
      renderer.resetStats();

      // Verify stats are reset
      stats = renderer.getStats();
      expect(stats.totalComponents).toBe(0);
      expect(stats.batchCount).toBe(0);
      expect(stats.stateChanges).toBe(0);
      expect(stats.renderTime).toBe(0);
    });
  });
});
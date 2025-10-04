/**
 * ConnectionCache.test.ts - Test connection path caching with dirty tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConnectionCache } from './ConnectionCache';
import type { Connection, ComponentBase } from '../types';

// Mock Path2D for testing environment
class MockPath2D {
  public commands: string[] = [];

  moveTo(x: number, y: number) {
    this.commands.push(`moveTo(${x},${y})`);
  }

  lineTo(x: number, y: number) {
    this.commands.push(`lineTo(${x},${y})`);
  }
}

// @ts-ignore
global.Path2D = MockPath2D;

describe('ConnectionCache', () => {
  let cache: ConnectionCache;
  let mockConnection: Connection;
  let mockFromComponent: ComponentBase;
  let mockToComponent: ComponentBase;

  beforeEach(() => {
    cache = new ConnectionCache();

    // Mock components with pins
    mockFromComponent = {
      id: 'comp-1',
      type: 'task-resistor',
      x: 100,
      y: 100,
      width: 60,
      height: 30,
      status: 'todo',
      category: 'frontend',
      name: 'Component 1',
      createdAt: new Date(),
      pins: {
        output: [{ x: 50, y: 15, type: 'data' }]
      }
    };

    mockToComponent = {
      id: 'comp-2',
      type: 'power-core',
      x: 200,
      y: 150,
      width: 60,
      height: 60,
      status: 'todo',
      category: 'backend',
      name: 'Component 2',
      createdAt: new Date(),
      pins: {
        input: [{ x: 10, y: 30, type: 'data' }]
      }
    };

    mockConnection = {
      id: 'conn-1',
      from: {
        component: mockFromComponent,
        pinIndex: 0,
      },
      to: {
        component: mockToComponent,
        pinIndex: 0,
      },
      category: 'frontend',
      createdAt: new Date(),
    };
  });

  describe('Basic Caching', () => {
    it('should cache connection paths on first access', () => {
      const path1 = cache.getConnectionPath(mockConnection);
      const path2 = cache.getConnectionPath(mockConnection);

      expect(path1).toBeTruthy();
      expect(path2).toBeTruthy();
      expect(path1).toBe(path2); // Same MockPath2D object returned from cache

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.total).toBe(2);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track cache statistics correctly', () => {
      // First access - cache miss
      cache.getConnectionPath(mockConnection);
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);

      // Second access - cache hit
      cache.getConnectionPath(mockConnection);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);

      // Third access - another hit
      cache.getConnectionPath(mockConnection);
      stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should handle disabled cache', () => {
      cache.setEnabled(false);

      const path1 = cache.getConnectionPath(mockConnection);
      const path2 = cache.getConnectionPath(mockConnection);

      expect(path1).toBeNull();
      expect(path2).toBeNull();

      const stats = cache.getStats();
      expect(stats.total).toBe(0);
    });
  });

  describe('Dirty Tracking', () => {
    it('should invalidate cache when component is marked dirty', () => {
      // Cache the connection
      const path1 = cache.getConnectionPath(mockConnection);
      expect(path1).toBeTruthy();

      // Mark component as dirty
      cache.markComponentDirty('comp-1');

      // Should get new path (cache miss)
      const path2 = cache.getConnectionPath(mockConnection);
      expect(path2).toBeTruthy();
      expect(path2).not.toBe(path1); // Different MockPath2D object

      const stats = cache.getStats();
      expect(stats.hits).toBe(0); // No hits after invalidation
      expect(stats.misses).toBe(2); // Two misses
    });

    it('should invalidate cache when position changes', () => {
      // Cache the connection
      cache.getConnectionPath(mockConnection);

      // Change component position
      mockFromComponent.x = 150;

      // Should detect position change and return new path
      const newPath = cache.getConnectionPath(mockConnection);
      expect(newPath).toBeTruthy();

      const stats = cache.getStats();
      expect(stats.misses).toBe(2); // Original miss + position change miss
    });

    it('should handle multiple components being dirty', () => {
      // Create connections for multiple components
      const component3: ComponentBase = {
        ...mockFromComponent, // Use fromComponent as template to have output pins
        id: 'comp-3',
        x: 300,
        y: 200,
      };

      const connection2: Connection = {
        ...mockConnection,
        id: 'conn-2',
        from: { component: component3, pinIndex: 0 }, // Different from component - should not be affected by comp-1 dirty
        to: { component: mockToComponent, pinIndex: 0 },
      };

      // Cache both connections
      cache.getConnectionPath(mockConnection);
      cache.getConnectionPath(connection2);

      // Mark one component dirty - should only affect its connections
      cache.markComponentDirty('comp-1');

      // First connection should be invalidated
      cache.getConnectionPath(mockConnection);
      // Second connection should still be cached
      cache.getConnectionPath(connection2);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1); // Only connection2 was a hit
      expect(stats.misses).toBe(3); // Initial 2 + 1 after invalidation
    });
  });

  describe('Cache Management', () => {
    it('should clear all cache and statistics', () => {
      // Cache some connections
      cache.getConnectionPath(mockConnection);
      cache.getConnectionPath(mockConnection); // Hit

      let stats = cache.getStats();
      expect(stats.total).toBe(2);
      expect(stats.size).toBeGreaterThan(0);

      // Clear cache
      cache.clear();

      stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.total).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should handle invalid connection data gracefully', () => {
      const invalidConnection = {
        ...mockConnection,
        from: { ...mockConnection.from, component: { ...mockFromComponent, pins: undefined } }
      };

      const path = cache.getConnectionPath(invalidConnection as Connection);
      expect(path).toBeNull();

      const stats = cache.getStats();
      expect(stats.misses).toBe(1); // Still counts as a miss attempt
    });
  });

  describe('Path Generation', () => {
    it('should generate orthogonal paths correctly', () => {
      const path = cache.getConnectionPath(mockConnection);
      expect(path).toBeInstanceOf(MockPath2D);
    });

    it('should handle different pin configurations', () => {
      // Test with different pin positions
      mockFromComponent.pins!.output![0] = { x: 0, y: 15, type: 'data' };
      mockToComponent.pins!.input![0] = { x: 60, y: 30, type: 'data' };

      const path = cache.getConnectionPath(mockConnection);
      expect(path).toBeTruthy();
    });
  });

  describe('Performance Characteristics', () => {
    it('should maintain good hit rates with repeated access', () => {
      // Simulate typical usage pattern
      for (let i = 0; i < 100; i++) {
        cache.getConnectionPath(mockConnection);
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.98); // 99 hits out of 100 calls
      expect(stats.hits).toBe(99);
      expect(stats.misses).toBe(1);
    });

    it('should handle cache size efficiently', () => {
      // Create many different connections
      const connections: Connection[] = [];
      for (let i = 0; i < 50; i++) {
        const comp1 = { ...mockFromComponent, id: `comp-from-${i}`, x: i * 100 };
        const comp2 = { ...mockToComponent, id: `comp-to-${i}`, x: i * 100 + 200 };
        connections.push({
          ...mockConnection,
          id: `conn-${i}`,
          from: { component: comp1, pinIndex: 0 },
          to: { component: comp2, pinIndex: 0 },
        });
      }

      // Cache all connections
      connections.forEach(conn => cache.getConnectionPath(conn));

      const stats = cache.getStats();
      expect(stats.size).toBe(50);
      expect(stats.misses).toBe(50); // All initial misses
      expect(stats.hits).toBe(0);

      // Access all again - should be all hits
      connections.forEach(conn => cache.getConnectionPath(conn));

      const finalStats = cache.getStats();
      expect(finalStats.hits).toBe(50);
      expect(finalStats.hitRate).toBe(0.5); // 50 hits out of 100 total calls
    });
  });
});
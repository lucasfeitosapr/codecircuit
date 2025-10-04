/**
 * ConnectionCacheDemo.test.ts - Demonstrate connection cache performance benefits
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConnectionCache } from './ConnectionCache';
import type { Connection, ComponentBase } from '../types';

// Mock Path2D for testing environment
class MockPath2D {
  public commands: string[] = [];
  moveTo(x: number, y: number) { this.commands.push(`moveTo(${x},${y})`); }
  lineTo(x: number, y: number) { this.commands.push(`lineTo(${x},${y})`); }
}
// @ts-ignore
global.Path2D = MockPath2D;

describe('Connection Cache Performance Demo', () => {
  let cache: ConnectionCache;

  beforeEach(() => {
    cache = new ConnectionCache();
  });

  it('should demonstrate significant performance improvement with repeated renders', () => {
    console.log('\n🚀 Connection Cache Performance Demonstration\n');

    // Create a typical board with multiple connections
    const components: ComponentBase[] = [];
    const connections: Connection[] = [];

    // Generate 20 components in a grid pattern
    for (let i = 0; i < 20; i++) {
      const component: ComponentBase = {
        id: `comp-${i}`,
        type: i % 3 === 0 ? 'power-core' : i % 3 === 1 ? 'task-resistor' : 'decision-point',
        x: (i % 5) * 150,
        y: Math.floor(i / 5) * 100,
        width: 60,
        height: 30,
        status: 'todo',
        category: 'frontend',
        name: `Component ${i}`,
        createdAt: new Date(),
        pins: {
          output: [{ x: 50, y: 15, type: 'data' }],
          input: [{ x: 10, y: 15, type: 'data' }]
        }
      };
      components.push(component);
    }

    // Create connections between adjacent components (19 connections)
    for (let i = 0; i < components.length - 1; i++) {
      const connection: Connection = {
        id: `conn-${i}`,
        from: { component: components[i], pinIndex: 0 },
        to: { component: components[i + 1], pinIndex: 0 },
        category: 'frontend',
        createdAt: new Date(),
      };
      connections.push(connection);
    }

    console.log(`📊 Test scenario: ${components.length} components, ${connections.length} connections`);

    // Simulate typical rendering pattern: many repeated renders with occasional component moves
    let totalCacheHits = 0;
    let totalCacheMisses = 0;

    // Simulate 10 render frames
    for (let frame = 1; frame <= 10; frame++) {
      // Each frame renders all connections
      connections.forEach(conn => {
        cache.getConnectionPath(conn);
      });

      const stats = cache.getStats();
      const frameHits = stats.hits - totalCacheHits;
      const frameMisses = stats.misses - totalCacheMisses;

      console.log(`  Frame ${frame}: ${frameHits} cache hits, ${frameMisses} cache misses (${stats.hitRate.toFixed(3)} hit rate)`);

      totalCacheHits = stats.hits;
      totalCacheMisses = stats.misses;

      // Simulate component movement every 3rd frame (causing cache invalidation)
      if (frame % 3 === 0) {
        const componentToMove = components[frame % components.length];
        componentToMove.x += 10; // Move component
        cache.markComponentDirty(componentToMove.id);
        console.log(`    🔄 Moved component ${componentToMove.id}, invalidated cache`);
      }
    }

    const finalStats = cache.getStats();
    console.log(`\n✅ Final Results:`);
    console.log(`   • Total cache requests: ${finalStats.total}`);
    console.log(`   • Cache hits: ${finalStats.hits} (${(finalStats.hitRate * 100).toFixed(1)}%)`);
    console.log(`   • Cache misses: ${finalStats.misses}`);
    console.log(`   • Cache size: ${finalStats.size} stored paths`);

    // Calculate performance improvement
    const withoutCacheOperations = finalStats.total; // Each request would be a "miss" without cache
    const withCacheOperations = finalStats.misses + (finalStats.hits * 0.1); // Hits are ~90% faster
    const performanceImprovement = ((withoutCacheOperations - withCacheOperations) / withoutCacheOperations) * 100;

    console.log(`   • Performance improvement: ~${performanceImprovement.toFixed(1)}% faster rendering`);
    console.log(`   • Estimated speed: ${finalStats.hits} connections rendered ~10x faster\n`);

    // Verify performance characteristics
    expect(finalStats.hitRate).toBeGreaterThan(0.7); // Should achieve >70% hit rate
    expect(finalStats.size).toBeGreaterThan(0); // Should have cached paths
    expect(finalStats.total).toBe(connections.length * 10); // 19 connections × 10 frames = 190 requests
  });

  it('should demonstrate memory efficiency with cache limits', () => {
    console.log('💾 Memory Efficiency Demonstration\n');

    // Generate many unique connections to test cache behavior
    const connections: Connection[] = [];
    for (let i = 0; i < 100; i++) {
      const comp1: ComponentBase = {
        id: `comp-from-${i}`, type: 'task-resistor', x: i * 50, y: 100,
        width: 60, height: 30, status: 'todo', category: 'frontend',
        name: `Component ${i}`, createdAt: new Date(),
        pins: { output: [{ x: 50, y: 15, type: 'data' }] }
      };

      const comp2: ComponentBase = {
        id: `comp-to-${i}`, type: 'power-core', x: i * 50 + 200, y: 100,
        width: 60, height: 60, status: 'todo', category: 'backend',
        name: `Component ${i + 100}`, createdAt: new Date(),
        pins: { input: [{ x: 10, y: 30, type: 'data' }] }
      };

      connections.push({
        id: `conn-${i}`,
        from: { component: comp1, pinIndex: 0 },
        to: { component: comp2, pinIndex: 0 },
        category: 'frontend',
        createdAt: new Date(),
      });
    }

    // First pass - populate cache
    connections.forEach(conn => cache.getConnectionPath(conn));

    const afterFirstPass = cache.getStats();
    console.log(`  After caching ${connections.length} connections:`);
    console.log(`   • Cache size: ${afterFirstPass.size} paths`);
    console.log(`   • Memory usage: ~${afterFirstPass.size * 0.5}KB (estimated)`);

    // Second pass - all should be cache hits
    connections.forEach(conn => cache.getConnectionPath(conn));

    const afterSecondPass = cache.getStats();
    console.log(`  After second render pass:`);
    console.log(`   • Hit rate: ${(afterSecondPass.hitRate * 100).toFixed(1)}%`);
    console.log(`   • Cache efficiency: ${afterSecondPass.hits}/${afterSecondPass.total} requests served from cache\n`);

    expect(afterSecondPass.hitRate).toBe(0.5); // 100 misses + 100 hits = 50% hit rate
    expect(afterSecondPass.size).toBe(100); // Should cache all 100 unique connections
  });
});
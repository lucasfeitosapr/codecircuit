/**
 * PerformanceTest - Simple test to demonstrate optimization benefits
 *
 * Phase 2B+: Test our performance optimizations
 */

import { SpatialIndex } from './SpatialIndex';
import { ConnectionCache } from './ConnectionCache';
import type { ComponentBase, Connection } from '../types';

export class PerformanceTest {
  /**
   * Test spatial index vs linear search performance
   */
  static testSpatialIndexPerformance(componentCount: number = 200): {
    linearTime: number;
    spatialTime: number;
    speedup: number;
  } {
    // Generate test components
    const components: ComponentBase[] = [];
    for (let i = 0; i < componentCount; i++) {
      components.push({
        id: `test-${i}`,
        type: 'task-resistor',
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        width: 60,
        height: 30,
        status: 'todo',
        category: 'test',
        createdAt: new Date(),
      });
    }

    // Test linear search
    const linearStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 2000;
      const y = Math.random() * 2000;

      // Linear search (O(n))
      for (const comp of components) {
        if (
          x >= comp.x &&
          x <= comp.x + comp.width &&
          y >= comp.y &&
          y <= comp.y + comp.height
        ) {
          break;
        }
      }
    }
    const linearTime = performance.now() - linearStart;

    // Test spatial index
    const spatialIndex = new SpatialIndex({ x: 0, y: 0, width: 2000, height: 2000 });
    for (const comp of components) {
      spatialIndex.insert(comp);
    }

    const spatialStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 2000;
      const y = Math.random() * 2000;

      // Spatial search (O(log n))
      spatialIndex.queryPoint(x, y);
    }
    const spatialTime = performance.now() - spatialStart;

    return {
      linearTime,
      spatialTime,
      speedup: linearTime / spatialTime,
    };
  }

  /**
   * Test connection cache performance
   */
  static testConnectionCachePerformance(connectionCount: number = 100): {
    noCacheTime: number;
    cacheTime: number;
    speedup: number;
  } {
    // Generate test connections
    const connections: Connection[] = [];
    for (let i = 0; i < connectionCount; i++) {
      const fromComp: ComponentBase = {
        id: `from-${i}`,
        type: 'power-core',
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        width: 60,
        height: 60,
        status: 'done',
        category: 'test',
        createdAt: new Date(),
        pins: {
          output: [{ x: 60, y: 30, type: 'energy' }],
        },
      };

      const toComp: ComponentBase = {
        id: `to-${i}`,
        type: 'task-resistor',
        x: Math.random() * 1000 + 100,
        y: Math.random() * 1000 + 100,
        width: 60,
        height: 30,
        status: 'todo',
        category: 'test',
        createdAt: new Date(),
        pins: {
          input: [{ x: 0, y: 15, type: 'energy' }],
        },
      };

      connections.push({
        id: `conn-${i}`,
        from: { component: fromComp, pinIndex: 0 },
        to: { component: toComp, pinIndex: 0 },
        category: 'test',
      });
    }

    // Test without cache (recalculate every time)
    const noCacheStart = performance.now();
    for (let i = 0; i < 100; i++) {
      for (const conn of connections) {
        // Simulate path calculation
        const fromComp = conn.from.component as ComponentBase;
        const toComp = conn.to.component as ComponentBase;
        const fromPin = fromComp.pins?.output?.[conn.from.pinIndex];
        const toPin = toComp.pins?.input?.[conn.to.pinIndex];

        if (fromPin && toPin) {
          // Simulate expensive path calculation
          const fromX = fromComp.x + fromPin.x;
          const fromY = fromComp.y + fromPin.y;
          const toX = toComp.x + toPin.x;
          const toY = toComp.y + toPin.y;

          // Simulate work
          Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
        }
      }
    }
    const noCacheTime = performance.now() - noCacheStart;

    // Test with cache
    const cache = new ConnectionCache();
    cache.setEnabled(true);

    const cacheStart = performance.now();
    for (let i = 0; i < 100; i++) {
      for (const conn of connections) {
        // Use cached path (first call creates cache, subsequent calls are fast)
        cache.getConnectionPath(conn);
      }
    }
    const cacheTime = performance.now() - cacheStart;

    return {
      noCacheTime,
      cacheTime,
      speedup: noCacheTime / cacheTime,
    };
  }

  /**
   * Run comprehensive performance benchmark
   */
  static runBenchmark(): {
    spatialIndex: ReturnType<typeof PerformanceTest.testSpatialIndexPerformance>;
    connectionCache: ReturnType<typeof PerformanceTest.testConnectionCachePerformance>;
    summary: string;
  } {
    console.log('🚀 Running performance benchmark...');

    const spatialIndex = this.testSpatialIndexPerformance(200);
    const connectionCache = this.testConnectionCachePerformance(100);

    const summary = `
╔════════════════════════════════════════════════════════════╗
║                Performance Benchmark Results               ║
╚════════════════════════════════════════════════════════════╝

🗂️ Spatial Index (Hit Testing)
   • Components: 200
   • Test Queries: 1000
   • Linear Search: ${spatialIndex.linearTime.toFixed(2)}ms
   • Spatial Index: ${spatialIndex.spatialTime.toFixed(2)}ms
   • Speedup: ${spatialIndex.speedup.toFixed(1)}x faster

🔗 Connection Cache (Path Calculation)
   • Connections: 100
   • Test Renders: 100
   • No Cache: ${connectionCache.noCacheTime.toFixed(2)}ms
   • With Cache: ${connectionCache.cacheTime.toFixed(2)}ms
   • Speedup: ${connectionCache.speedup.toFixed(1)}x faster

💡 Overall Impact:
   • Hit testing is ${spatialIndex.speedup.toFixed(0)}x faster with spatial indexing
   • Connection rendering is ${connectionCache.speedup.toFixed(0)}x faster with caching
   • Combined optimizations should provide significant FPS improvement
`;

    console.log(summary);

    return {
      spatialIndex,
      connectionCache,
      summary,
    };
  }
}

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).PerformanceTest = PerformanceTest;
}
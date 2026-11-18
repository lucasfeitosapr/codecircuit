import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchedComponentRenderer } from './BatchedComponentRenderer';
import { renderComponent } from './ImplementationHelpers';
import { PerformanceConfig } from '../config/FeatureFlagAdapter';

vi.mock('./ImplementationHelpers', () => ({ renderComponent: vi.fn() }));

// B-023: parts were drawn in type groups, biggest group first, so whichever type had the most
// parts went underneath. The stacking order must be the order parts were placed in.
const part = (id: string, type: string) =>
  ({ id, type, x: 0, y: 0, width: 50, height: 50, pins: { input: [], output: [] } }) as any;
const ctx: any = new Proxy({}, { get: (t: any, k) => (k in t ? t[k] : () => {}), set: (t: any, k, v) => ((t[k] = v), true) });
const drawnOrder = () =>
  (renderComponent as any).mock.calls.map((args: any[]) => args.find(a => a && typeof a === 'object' && 'type' in a && 'id' in a)?.id);

describe('BatchedComponentRenderer draw order (B-023)', () => {
  beforeEach(() => (renderComponent as any).mockClear());

  it('draws parts in placement order, whatever their type and count @B-023', () => {
    (PerformanceConfig as any).ENABLE_BATCH_RENDERING = true;
    const parts = [part('m1', 'module-ic'), part('t1', 'task-resistor'), part('t2', 'task-resistor'), part('m2', 'module-ic'), part('t3', 'task-resistor')];
    new BatchedComponentRenderer().renderComponents(ctx, parts, { camera: { x: 0, y: 0, zoom: 1 }, timestamp: 0, categories: {}, selectedComponentId: null, connections: [] } as any);
    expect(drawnOrder()).toEqual(['m1', 't1', 't2', 'm2', 't3']);
  });
});

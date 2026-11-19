import { describe, it, expect } from 'vitest';
import { FusePluginV2, fuseWireSegments } from './FusePluginV2';
import { CapacitorPluginV2 } from './CapacitorPluginV2';
import { partIcon } from '../icons';

// S-013 (Lucas, 18/nov): root causes are Fuses (blown = active), debt items are Capacitors.
describe('Fuse and Capacitor parts (S-013)', () => {
  it('a Fuse is its own part type, left in and right out @S-013', () => {
    const fuse = new FusePluginV2().createComponent({ x: 10, y: 20 });
    expect(fuse.type).toBe('fuse');
    expect(fuse.pins.input?.[0].x).toBe(0);
    expect(fuse.pins.output?.[0].x).toBe(fuse.width);
    expect(partIcon('fuse').shape).toBe('fuse');
  });

  it('a Capacitor is its own part type, left in and right out @S-013', () => {
    const cap = new CapacitorPluginV2().createComponent({ x: 10, y: 20 });
    expect(cap.type).toBe('capacitor');
    expect(cap.pins.input?.[0].x).toBe(0);
    expect(cap.pins.output?.[0].x).toBe(cap.width);
    expect(partIcon('capacitor').shape).toBe('plates');
  });

  it('a done Fuse is intact (one wire); any other status is blown (wire broken in two) @S-013', () => {
    expect(fuseWireSegments('done', 0, 60)).toHaveLength(1);
    for (const status of ['defined', 'todo', 'in-progress', undefined]) {
      const parts = fuseWireSegments(status as any, 0, 60);
      expect(parts).toHaveLength(2);
      expect(parts[0][1]).toBeLessThan(parts[1][0]); // a gap between the halves
    }
  });

  it('the default title is the part name, not Task Resistor @S-013', () => {
    const calls: string[] = [];
    const ctx: any = new Proxy({ fillText: (t: string) => calls.push(t) }, {
      get: (t: any, k) => (k in t ? t[k] : () => {}),
      set: (t: any, k, v) => ((t[k] = v), true),
    });
    const plugin = new FusePluginV2();
    const fuse = { ...plugin.createComponent({ x: 0, y: 0 }), title: '' };
    plugin.renderComponent(ctx, { timestamp: 0, camera: { x: 0, y: 0, zoom: 1 } } as any, fuse as any);
    expect(calls).toContain('Fuse');
  });
});

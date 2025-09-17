import { describe, it, expect } from 'vitest';
import { ViewStack } from './viewStack';

describe('ViewStack', () => {
  it('pushes and pops view states preserving camera and components', () => {
    const vs = new ViewStack();
    const view = {
      type: 'main',
      component: null,
      camera: { x: 10, y: 20, zoom: 1.5 },
      selectedComponent: null,
      components: [{ id: 'c1' }],
      connections: [],
    };
    vs.push(view);
    expect(vs.size()).toBe(1);
    const popped = vs.pop();
    expect(popped).toBeDefined();
    expect(popped!.camera.x).toBe(10);
    expect(Array.isArray(popped!.components)).toBe(true);
    expect(popped!.components!.length).toBe(1);
    expect(vs.size()).toBe(0);
  });

  it('serializes and restores stack', () => {
    const vs = new ViewStack();
    vs.push({
      type: 'schematic',
      component: { id: 'm1' },
      camera: { x: 0, y: 0, zoom: 1 },
      selectedComponent: null,
      components: [],
      connections: [],
    });
    const s = vs.serialize();
    const vs2 = new ViewStack();
    vs2.restore(s);
    expect(vs2.size()).toBe(1);
    const top = vs2.pop();
    expect(top).toBeDefined();
    expect((top as any).component.id).toBe('m1');
  });
});

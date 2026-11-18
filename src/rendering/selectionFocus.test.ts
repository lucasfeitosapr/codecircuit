import { describe, it, expect } from 'vitest';
import { selectionFocus } from './selectionFocus';

const part = (id: string) => ({ id }) as any;
const trace = (id: string, from: string, to: string) =>
  ({ id, from: { component: part(from), pinIndex: 0 }, to: { component: part(to), pinIndex: 0 } }) as any;

describe('selectionFocus (S-006)', () => {
  const traces = [trace('ab', 'a', 'b'), trace('bc', 'b', 'c'), trace('cd', 'c', 'd')];

  it('is off when nothing is selected', () => {
    expect(selectionFocus(null, traces)).toBeNull();
    expect(selectionFocus(undefined, traces)).toBeNull();
  });

  it('keeps the selected part, its traces in both directions, and the parts at their other ends', () => {
    const focus = selectionFocus('b', traces)!;
    expect(focus.connections.map(c => c.id)).toEqual(['ab', 'bc']);
    expect([...focus.componentIds].sort()).toEqual(['a', 'b', 'c']);
  });

  it('does not follow traces past the neighbours', () => {
    expect(selectionFocus('a', traces)!.componentIds.has('c')).toBe(false);
  });

  it('a part with no traces is focused alone', () => {
    const focus = selectionFocus('z', traces)!;
    expect(focus.connections).toEqual([]);
    expect([...focus.componentIds]).toEqual(['z']);
  });

  it('reads serialized ends (componentId) as well as live ones', () => {
    const serialized = [{ id: 'x', from: { componentId: 'p', pinIndex: 0 }, to: { componentId: 'q', pinIndex: 0 } }] as any;
    expect([...selectionFocus('q', serialized)!.componentIds].sort()).toEqual(['p', 'q']);
  });
});

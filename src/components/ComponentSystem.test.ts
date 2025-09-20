import { describe, it, expect } from 'vitest';
import { ComponentSystem } from './ComponentSystem';

describe('ComponentSystem', () => {
  it('registers and retrieves plugins', () => {
    const cs = new ComponentSystem();
    const p = { id: 'x', displayName: 'X', render: () => null };
    cs.register(p);
    const got = cs.get('x');
    expect(got).toBeDefined();
    expect(got!.displayName).toBe('X');
    cs.unregister('x');
    expect(cs.get('x')).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { focusBorderColor } from './focusColor';
import { TaskResistorPluginV2 } from './plugins/TaskResistorPluginV2';

// S-014 (Lucas, 18/nov): a finished board goes green and loses the category colors; under
// selection focus, parts show their own (category) color instead, like a debug lens.
const categories = { security: { name: 'Security', color: '#ff0066' } };

describe('focus colors (S-014)', () => {
  it('outside focus, the status color stays @S-014', () => {
    expect(focusBorderColor({ payload: { categories } }, { category: 'security' }, '#00ff88')).toBe('#00ff88');
  });

  it('under focus, the part shows its category color @S-014', () => {
    expect(focusBorderColor({ payload: { categories, trueColors: true } }, { category: 'security' }, '#00ff88')).toBe('#ff0066');
  });

  it('under focus, a part without a known category keeps its status color @S-014', () => {
    expect(focusBorderColor({ payload: { categories, trueColors: true } }, { category: 'nope' }, '#00ff88')).toBe('#00ff88');
  });

  it('a done Task Resistor under focus strokes its border in the category color @S-014', () => {
    const strokes: string[] = [];
    const ctx: any = new Proxy({ strokeRect: () => strokes.push(ctx.strokeStyle) }, {
      get: (t: any, k) => (k in t ? t[k] : () => {}),
      set: (t: any, k, v) => ((t[k] = v), true),
    });
    const plugin = new TaskResistorPluginV2();
    const part = { ...plugin.createComponent({ x: 0, y: 0 }), status: 'done', category: 'security' };
    plugin.renderComponent(ctx, { timestamp: 0, camera: { x: 0, y: 0, zoom: 1 }, payload: { categories, trueColors: true } } as any, part as any);
    expect(strokes[0]).toBe('#ff0066');
  });
});

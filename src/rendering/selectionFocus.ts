import type { Connection } from '../types';

/**
 * Selection focus (spec S-006): when one part is selected, its traces and the parts at
 * their other ends stay bright, and everything else is dimmed.
 *
 * Kept pure so the rule is testable without a canvas. The renderer only draws what this returns.
 * Multi-select can later pass several ids and get the union.
 */
export interface SelectionFocus {
  componentIds: Set<string>;
  connections: Connection[];
}

/** How dark the film over everything outside the focus is (0 = off, 1 = black). */
export const FOCUS_DIM_ALPHA = 0.8;

function endId(end: any): string | undefined {
  return end?.component?.id ?? end?.componentId;
}

export function selectionFocus(
  selectedId: string | null | undefined,
  connections: readonly Connection[]
): SelectionFocus | null {
  if (!selectedId) return null;
  const componentIds = new Set<string>([selectedId]);
  const focused: Connection[] = [];
  for (const c of connections) {
    const from = endId(c.from);
    const to = endId(c.to);
    if (from === selectedId || to === selectedId) {
      focused.push(c);
      if (from) componentIds.add(from);
      if (to) componentIds.add(to);
    }
  }
  return { componentIds, connections: focused };
}

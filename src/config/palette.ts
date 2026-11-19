/**
 * One palette for the board (S-015, Lucas 19/nov).
 *
 * Status colors are reserved hues: green = done, cyan = defined (blueprint), magenta = in progress.
 * Category colors must stay clearly apart from them and from each other, so a part's own color
 * (S-014, under selection focus) never looks like a status. palette.test.ts enforces the distance.
 */
export const STATUS_COLORS = {
  defined: '#00ffff',
  'in-progress': '#ff00ff',
  done: '#00ff88',
} as const;

export const CATEGORY_COLORS: Record<string, { name: string; color: string }> = {
  frontend: { name: 'Frontend', color: '#ffd400' }, // yellow (was #00ff88 = done green)
  backend: { name: 'Backend', color: '#3d7bff' }, // blue
  database: { name: 'Database', color: '#ff8c00' }, // orange
  security: { name: 'Security', color: '#ff3344' }, // red (was #ff0088, near in-progress magenta)
  testing: { name: 'Testing', color: '#f2f2f2' }, // white (was #88ff00, near done green)
  devops: { name: 'DevOps', color: '#a0703c' }, // brown (was #ff8800, near Database orange)
  design: { name: 'Design', color: '#9b5cff' }, // purple
  research: { name: 'Research', color: '#7f8fa6' }, // slate (was #00aaff, near Backend and defined cyan)
};

/** A fresh copy, for code that keeps its own mutable categories map. */
export function defaultCategories(): Record<string, { name: string; color: string }> {
  return Object.fromEntries(Object.entries(CATEGORY_COLORS).map(([k, v]) => [k, { ...v }]));
}

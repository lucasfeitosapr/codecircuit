/**
 * S-014: under selection focus (S-006), focused parts are drawn with their own category color
 * instead of the status color, so a finished (all green) board still shows what each part is.
 * The focus pass sets `payload.trueColors` on the frame; every part plugin passes its status
 * border color through here.
 */
export function focusBorderColor(frame: any, component: { category?: string }, statusColor: string): string {
  if (!frame?.payload?.trueColors) return statusColor;
  const categories = frame.payload.categories ?? frame.categories;
  return categories?.[component.category ?? '']?.color ?? statusColor;
}

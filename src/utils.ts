export function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '0, 255, 136';
}

export function getPointOnPath(points: { x: number; y: number }[], ratio: number) {
  const lengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    lengths.push(len);
    totalLength += len;
  }

  const target = ratio * totalLength;
  let current = 0;
  for (let i = 0; i < lengths.length; i++) {
    if (current + lengths[i] >= target) {
      const segRatio = (target - current) / lengths[i];
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * segRatio,
        y: points[i].y + (points[i + 1].y - points[i].y) * segRatio,
      };
    }
    current += lengths[i];
  }

  return points[points.length - 1];
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

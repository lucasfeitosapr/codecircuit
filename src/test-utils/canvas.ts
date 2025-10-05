// Test utility to create a stubbed HTMLCanvasElement with a minimal 2D context
export function makeCanvasStub({ id = 'circuit-board', width = 800, height = 600 }: { id?: string; width?: number; height?: number } = {}) {
  const c = document.createElement('canvas');
  c.id = id;
  c.width = width;
  c.height = height;

  // Provide a minimal 2D context stub so jsdom tests don't require node-canvas
  const ctxStub: any = {
    scale: () => {},
    clearRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    fillText: () => {},
    arc: () => {},
    setLineDash: () => {},
    fill: () => {},
    // properties used by drawing code
    shadowBlur: 0,
    shadowColor: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };

  (c as any).getContext = () => ctxStub;

  // Stable bounding rect for coordinate conversion
  (c as any).getBoundingClientRect = () => ({ left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON: () => {} });

  document.body.appendChild(c);
  return c as HTMLCanvasElement;
}

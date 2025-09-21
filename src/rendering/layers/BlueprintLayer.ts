export const BlueprintLayer = {
  name: 'blueprint',
  render(ctx: CanvasRenderingContext2D | WebGLRenderingContext) {
    // Minimal no-op render that can be spied on in tests
    // e.g., draw a small marker for debug
    try {
      if (ctx && (ctx as any).fillRect) {
        (ctx as any).fillStyle = 'rgba(0,0,0,0)';
        (ctx as any).fillRect(0, 0, 0, 0);
      }
    } catch (e) {
      // swallow in tests
    }
  },
};

export default BlueprintLayer;

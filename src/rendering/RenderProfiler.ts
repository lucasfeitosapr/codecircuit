/**
 * RenderProfiler - lightweight instrumentation for frame breakdowns
 *
 * Provides a simple global API (window.renderProfiler) used by profiling.html:
 * - startRecording()
 * - stopRecording(): returns summary/breakdown
 * - exportToCSV(): CSV of recorded frames
 *
 * Integration points:
 * - Call RenderProfiler.beginFrame()
 * - Wrap sections with RenderProfiler.measureSection('name', fn)
 * - Call RenderProfiler.endFrame({ componentsRendered, connectionsRendered })
 */

export type SectionName = 'grid' | 'components' | 'connections' | 'ui';

export type FrameSample = {
  t: number; // epoch ms
  frameTime: number; // ms
  sections: Record<SectionName, number>; // ms per section
  fps: number;
  componentsRendered: number;
  connectionsRendered: number;
};

type EndFrameStats = Pick<FrameSample, 'componentsRendered' | 'connectionsRendered'>;

class _RenderProfiler {
  private recording = false;
  private samples: FrameSample[] = [];
  private currentStart = 0;
  private lastTimestamp = 0;
  private lastFrameTime = 0;
  private lastFPS = 60;
  private sectionTotals: Record<SectionName, number> = {
    grid: 0,
    components: 0,
    connections: 0,
    ui: 0,
  };

  isRecording(): boolean {
    return this.recording;
  }

  beginFrame(): void {
    if (!this.recording) return;
    this.currentStart = performance.now();
    // reset section totals for this frame
    this.sectionTotals.grid = 0;
    this.sectionTotals.components = 0;
    this.sectionTotals.connections = 0;
    this.sectionTotals.ui = 0;
  }

  /**
   * Measure a render section and accumulate into the current frame
   */
  measureSection<T>(name: SectionName, fn: () => T): T {
    if (!this.recording) return fn();
    const s = performance.now();
    const result = fn();
    const d = performance.now() - s;
    this.sectionTotals[name] += d;
    return result;
  }

  endFrame(extra: EndFrameStats): void {
    if (!this.recording) return;
    const now = performance.now();
    const frameTime = now - this.currentStart;
    const ts = Date.now();
    let fps = 60;
    if (this.lastTimestamp > 0) {
      const delta = now - this.lastTimestamp;
      fps = delta > 0 ? Math.round(1000 / delta) : 60;
    }
    this.lastTimestamp = now;
    this.lastFrameTime = frameTime;
    this.lastFPS = fps;

    this.samples.push({
      t: ts,
      frameTime,
      sections: { ...this.sectionTotals },
      fps,
      componentsRendered: extra.componentsRendered,
      connectionsRendered: extra.connectionsRendered,
    });
  }

  startRecording(): void {
    this.recording = true;
    this.samples = [];
    this.currentStart = 0;
    this.lastTimestamp = 0;
  }

  stopRecording(): {
    frames: number;
    avgFPS: number;
    avgFrameTime: number;
    p95FrameTime: number;
    breakdown: Record<SectionName, number>; // ms per frame avg
    breakdownPercentages: Record<SectionName, number>;
    componentCountAvg: number;
    connectionCountAvg: number;
    summary: string;
  } {
    this.recording = false;
    const n = this.samples.length || 1;
    const avgFrame = this.samples.reduce((a, s) => a + s.frameTime, 0) / n;
    const sorted = [...this.samples.map(s => s.frameTime)].sort((a, b) => a - b);
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] || avgFrame;
    const avgFPS = this.samples.reduce((a, s) => a + s.fps, 0) / n || 60;

    const sectionAvg: Record<SectionName, number> = {
      grid: 0,
      components: 0,
      connections: 0,
      ui: 0,
    };
    const compAvg = this.samples.reduce((a, s) => a + s.componentsRendered, 0) / n;
    const connAvg = this.samples.reduce((a, s) => a + s.connectionsRendered, 0) / n;

    for (const s of this.samples) {
      sectionAvg.grid += s.sections.grid;
      sectionAvg.components += s.sections.components;
      sectionAvg.connections += s.sections.connections;
      sectionAvg.ui += s.sections.ui;
    }
    sectionAvg.grid /= n;
    sectionAvg.components /= n;
    sectionAvg.connections /= n;
    sectionAvg.ui /= n;

    const totalSections =
      sectionAvg.grid + sectionAvg.components + sectionAvg.connections + sectionAvg.ui || 1;
    const pct = {
      grid: (sectionAvg.grid / totalSections) * 100,
      components: (sectionAvg.components / totalSections) * 100,
      connections: (sectionAvg.connections / totalSections) * 100,
      ui: (sectionAvg.ui / totalSections) * 100,
    } as Record<SectionName, number>;

    const summary =
      `Frames: ${n}\n` +
      `Avg FPS: ${avgFPS.toFixed(1)}\n` +
      `Avg Frame: ${avgFrame.toFixed(2)}ms (p95 ${p95.toFixed(2)}ms)\n` +
      `Components avg: ${compAvg.toFixed(0)}, Connections avg: ${connAvg.toFixed(0)}\n` +
      `Breakdown avg (ms): grid ${sectionAvg.grid.toFixed(2)}, components ${sectionAvg.components.toFixed(2)}, connections ${sectionAvg.connections.toFixed(2)}, ui ${sectionAvg.ui.toFixed(2)}`;

    return {
      frames: n,
      avgFPS,
      avgFrameTime: avgFrame,
      p95FrameTime: p95,
      breakdown: sectionAvg,
      breakdownPercentages: pct,
      componentCountAvg: compAvg,
      connectionCountAvg: connAvg,
      summary,
    };
  }

  exportToCSV(): string {
    const header = [
      'timestamp',
      'frameTimeMs',
      'gridMs',
      'componentsMs',
      'connectionsMs',
      'uiMs',
      'fps',
      'componentsRendered',
      'connectionsRendered',
    ].join(',');
    const rows = this.samples.map(s =>
      [
        new Date(s.t).toISOString(),
        s.frameTime.toFixed(3),
        s.sections.grid.toFixed(3),
        s.sections.components.toFixed(3),
        s.sections.connections.toFixed(3),
        s.sections.ui.toFixed(3),
        s.fps,
        s.componentsRendered,
        s.connectionsRendered,
      ].join(',')
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Public API exposed to window
   */
  publicAPI() {
    return {
      startRecording: () => this.startRecording(),
      stopRecording: () => this.stopRecording(),
      exportToCSV: () => this.exportToCSV(),
      isRecording: () => this.isRecording(),
      // lightweight live stats for dashboards
      getCurrentFPS: () => this.lastFPS,
      getCurrentFrameTime: () => this.lastFrameTime,
    };
  }
}

export const RenderProfiler = new _RenderProfiler();

/**
 * Performance Profiling Utilities
 * 
 * Tools for measuring and analyzing rendering performance
 * Use these to establish baseline metrics before optimization
 */

export interface FrameTiming {
  timestamp: number;
  frameTime: number;
  fps: number;
  components: number;
  connections: number;
  breakdown: {
    grid?: number;
    components?: number;
    connections?: number;
    ui?: number;
    spatialIndex?: number;
    connectionCache?: number;
    total: number;
  };
}

export class RenderProfiler {
  private frames: FrameTiming[] = [];
  private maxFrames: number = 300; // 5 seconds at 60fps
  private isRecording: boolean = false;
  private currentFrame: Partial<FrameTiming> = {};
  
  /**
   * Start recording performance data
   */
  startRecording(): void {
    this.isRecording = true;
    this.frames = [];
    console.log('📊 Performance profiling started');
  }
  
  /**
   * Stop recording and return results
   */
  stopRecording(): PerformanceReport {
    this.isRecording = false;
    const report = this.generateReport();
    console.log('📊 Performance profiling stopped');
    console.log(report.summary);
    return report;
  }
  
  /**
   * Mark the start of a frame
   */
  frameStart(timestamp: number, components: number, connections: number): void {
    if (!this.isRecording) return;
    
    this.currentFrame = {
      timestamp,
      components,
      connections,
      breakdown: { total: 0 },
    };
  }
  
  /**
   * Mark a timing checkpoint within a frame
   */
  mark(label: keyof FrameTiming['breakdown'], startTime: number): void {
    if (!this.isRecording || !this.currentFrame.breakdown) return;
    
    const elapsed = performance.now() - startTime;
    this.currentFrame.breakdown[label] = elapsed;
  }
  
  /**
   * Mark the end of a frame and record timing
   */
  frameEnd(): void {
    if (!this.isRecording || !this.currentFrame.timestamp) return;
    
    const now = performance.now();
    const frameTime = now - this.currentFrame.timestamp;
    const fps = Math.round(1000 / frameTime);
    
    const completedFrame: FrameTiming = {
      timestamp: this.currentFrame.timestamp,
      frameTime,
      fps,
      components: this.currentFrame.components || 0,
      connections: this.currentFrame.connections || 0,
      breakdown: {
        ...this.currentFrame.breakdown,
        total: frameTime,
      },
    };
    
    this.frames.push(completedFrame);
    
    // Keep only recent frames
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }
  
  /**
   * Generate performance report
   */
  private generateReport(): PerformanceReport {
    if (this.frames.length === 0) {
      return this.emptyReport();
    }
    
    const frameTimes = this.frames.map(f => f.frameTime);
    const fps = this.frames.map(f => f.fps);
    
    // Calculate statistics
    const avgFrameTime = this.average(frameTimes);
    const minFrameTime = Math.min(...frameTimes);
    const maxFrameTime = Math.max(...frameTimes);
    const avgFPS = this.average(fps);
    const minFPS = Math.min(...fps);
    
    // Count slow frames (> 16ms = below 60fps)
    const slowFrames = frameTimes.filter(t => t > 16).length;
    const slowFramePercentage = (slowFrames / this.frames.length) * 100;
    
    // Calculate breakdown averages
    const breakdown = {
      grid: this.averageBreakdown('grid'),
      components: this.averageBreakdown('components'),
      connections: this.averageBreakdown('connections'),
      ui: this.averageBreakdown('ui'),
      spatialIndex: this.averageBreakdown('spatialIndex'),
      connectionCache: this.averageBreakdown('connectionCache'),
    };

    // Calculate percentages
    const breakdownPercentages = {
      grid: (breakdown.grid / avgFrameTime) * 100,
      components: (breakdown.components / avgFrameTime) * 100,
      connections: (breakdown.connections / avgFrameTime) * 100,
      ui: (breakdown.ui / avgFrameTime) * 100,
      spatialIndex: (breakdown.spatialIndex / avgFrameTime) * 100,
      connectionCache: (breakdown.connectionCache / avgFrameTime) * 100,
    };
    
    return {
      summary: this.formatSummary({
        avgFrameTime,
        minFrameTime,
        maxFrameTime,
        avgFPS,
        minFPS,
        slowFrames,
        slowFramePercentage,
        totalFrames: this.frames.length,
        avgComponents: this.average(this.frames.map(f => f.components)),
        avgConnections: this.average(this.frames.map(f => f.connections)),
      }),
      timings: {
        avgFrameTime,
        minFrameTime,
        maxFrameTime,
        avgFPS,
        minFPS,
      },
      breakdown,
      breakdownPercentages,
      slowFrames: {
        count: slowFrames,
        percentage: slowFramePercentage,
      },
      frames: this.frames,
    };
  }
  
  private average(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  
  private averageBreakdown(label: keyof FrameTiming['breakdown']): number {
    const values = this.frames
      .map(f => f.breakdown[label])
      .filter((v): v is number => v !== undefined);
    
    if (values.length === 0) return 0;
    return this.average(values);
  }
  
  private formatSummary(data: any): string {
    return `
╔════════════════════════════════════════════════════════════╗
║           Performance Profiling Report                     ║
╚════════════════════════════════════════════════════════════╝

📊 Frame Statistics (${data.totalFrames} frames recorded)
   • Average FPS: ${data.avgFPS.toFixed(1)}
   • Min FPS: ${data.minFPS}
   • Average Frame Time: ${data.avgFrameTime.toFixed(2)}ms
   • Min Frame Time: ${data.minFrameTime.toFixed(2)}ms
   • Max Frame Time: ${data.maxFrameTime.toFixed(2)}ms

⚠️  Slow Frames (>16ms)
   • Count: ${data.slowFrames} / ${data.totalFrames}
   • Percentage: ${data.slowFramePercentage.toFixed(1)}%

🎯 Scene Complexity
   • Average Components: ${data.avgComponents.toFixed(0)}
   • Average Connections: ${data.avgConnections.toFixed(0)}
`;
  }
  
  private emptyReport(): PerformanceReport {
    return {
      summary: 'No performance data recorded',
      timings: { avgFrameTime: 0, minFrameTime: 0, maxFrameTime: 0, avgFPS: 0, minFPS: 0 },
      breakdown: { grid: 0, components: 0, connections: 0, ui: 0, spatialIndex: 0, connectionCache: 0 },
      breakdownPercentages: { grid: 0, components: 0, connections: 0, ui: 0, spatialIndex: 0, connectionCache: 0 },
      slowFrames: { count: 0, percentage: 0 },
      frames: [],
    };
  }
  
  /**
   * Export frames to CSV for external analysis
   */
  exportToCSV(): string {
    const headers = 'timestamp,frameTime,fps,components,connections,grid,componentsTime,connectionsTime,ui,spatialIndex,connectionCache,total';
    const rows = this.frames.map(f =>
      `${f.timestamp},${f.frameTime},${f.fps},${f.components},${f.connections},` +
      `${f.breakdown.grid || 0},${f.breakdown.components || 0},${f.breakdown.connections || 0},` +
      `${f.breakdown.ui || 0},${f.breakdown.spatialIndex || 0},${f.breakdown.connectionCache || 0},${f.breakdown.total}`
    );

    return [headers, ...rows].join('\n');
  }
}

export interface PerformanceReport {
  summary: string;
  timings: {
    avgFrameTime: number;
    minFrameTime: number;
    maxFrameTime: number;
    avgFPS: number;
    minFPS: number;
  };
  breakdown: {
    grid: number;
    components: number;
    connections: number;
    ui: number;
    spatialIndex: number;
    connectionCache: number;
  };
  breakdownPercentages: {
    grid: number;
    components: number;
    connections: number;
    ui: number;
    spatialIndex: number;
    connectionCache: number;
  };
  slowFrames: {
    count: number;
    percentage: number;
  };
  frames: FrameTiming[];
}

// Global profiler instance
export const renderProfiler = new RenderProfiler();

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).renderProfiler = renderProfiler;
}

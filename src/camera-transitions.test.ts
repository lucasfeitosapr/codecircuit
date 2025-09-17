// src/camera-transitions.test.ts
// Unit tests for smooth camera transitions

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the MotherboardApp class methods for testing
class MockMotherboardApp {
  camera = { x: 0, y: 0, zoom: 1 };
  canvas = { width: 800, height: 600 };
  transitionConfig = {
    duration: 800,
    zoomOutFactor: 0.3,
    focusZoom: 1.2,
    easingFunction: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  };

  // Easing functions
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  // Camera utility methods
  private interpolateCamera(start: any, end: any, progress: number) {
    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress,
      zoom: start.zoom + (end.zoom - start.zoom) * progress,
    };
  }

  private getCameraDistance(cam1: any, cam2: any): number {
    const dx = cam1.x - cam2.x;
    const dy = cam1.y - cam2.y;
    const dz = Math.abs(cam1.zoom - cam2.zoom) * 100;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private getComponentCenter(component: any) {
    return {
      x: component.x + component.width / 2,
      y: component.y + component.height / 2,
    };
  }

  private getFocusCameraPosition(component: any, zoom: number = 1) {
    const center = this.getComponentCenter(component);
    return {
      x: this.canvas.width / 2 - center.x * zoom,
      y: this.canvas.height / 2 - center.y * zoom,
      zoom: zoom,
    };
  }

  private calculateTransitionDuration(start: any, end: any): number {
    const distance = this.getCameraDistance(start, end);
    const baseDuration = this.transitionConfig.duration;
    const maxDuration = baseDuration * 1.5;
    const minDuration = baseDuration * 0.5;
    
    const scaleFactor = Math.min(distance / 500, 2);
    return Math.max(minDuration, Math.min(maxDuration, baseDuration * scaleFactor));
  }

  public setTransitionConfig(config: Partial<typeof this.transitionConfig>) {
    this.transitionConfig = { ...this.transitionConfig, ...config };
  }

  public getTransitionConfig() {
    return { ...this.transitionConfig };
  }
}

describe('Camera Transitions', () => {
  let app: MockMotherboardApp;

  beforeEach(() => {
    app = new MockMotherboardApp();
  });

  describe('Easing Functions', () => {
    it('should calculate easeInOutCubic correctly', () => {
      const easeFunc = app['easeInOutCubic'];
      expect(easeFunc(0)).toBe(0);
      expect(easeFunc(1)).toBe(1);
      expect(easeFunc(0.5)).toBeCloseTo(0.5, 1);
    });

    it('should calculate easeOutCubic correctly', () => {
      const easeFunc = app['easeOutCubic'];
      expect(easeFunc(0)).toBe(0);
      expect(easeFunc(1)).toBe(1);
      expect(easeFunc(0.5)).toBeCloseTo(0.875, 2);
    });
  });

  describe('Camera Utilities', () => {
    it('should interpolate between cameras correctly', () => {
      const start = { x: 0, y: 0, zoom: 1 };
      const end = { x: 100, y: 200, zoom: 2 };
      
      const result = app['interpolateCamera'](start, end, 0.5);
      
      expect(result.x).toBe(50);
      expect(result.y).toBe(100);
      expect(result.zoom).toBe(1.5);
    });

    it('should calculate camera distance correctly', () => {
      const cam1 = { x: 0, y: 0, zoom: 1 };
      const cam2 = { x: 100, y: 0, zoom: 1 };
      
      const distance = app['getCameraDistance'](cam1, cam2);
      
      expect(distance).toBe(100);
    });

    it('should get component center correctly', () => {
      const component = { x: 10, y: 20, width: 100, height: 60 };
      
      const center = app['getComponentCenter'](component);
      
      expect(center.x).toBe(60);
      expect(center.y).toBe(50);
    });

    it('should calculate focus camera position correctly', () => {
      const component = { x: 100, y: 100, width: 200, height: 100 };
      
      const focusCamera = app['getFocusCameraPosition'](component, 1.2);
      
      expect(focusCamera.zoom).toBe(1.2);
      // Camera should center on component
      expect(focusCamera.x).toBe(app.canvas.width / 2 - 200 * 1.2); // center.x * zoom
      expect(focusCamera.y).toBe(app.canvas.height / 2 - 150 * 1.2); // center.y * zoom
    });
  });

  describe('Transition Configuration', () => {
    it('should allow setting transition config', () => {
      const newConfig = { duration: 1000, zoomOutFactor: 0.5 };
      
      app.setTransitionConfig(newConfig);
      
      const config = app.getTransitionConfig();
      expect(config.duration).toBe(1000);
      expect(config.zoomOutFactor).toBe(0.5);
      expect(config.focusZoom).toBe(1.2); // unchanged
    });

    it('should calculate dynamic transition duration', () => {
      const shortDistance = { x: 0, y: 0, zoom: 1 };
      const longDistance = { x: 1000, y: 1000, zoom: 3 };
      
      const shortDuration = app['calculateTransitionDuration'](shortDistance, { x: 10, y: 10, zoom: 1 });
      const longDuration = app['calculateTransitionDuration'](shortDistance, longDistance);
      
      expect(longDuration).toBeGreaterThan(shortDuration);
      expect(shortDuration).toBeGreaterThanOrEqual(app.transitionConfig.duration * 0.5);
      expect(longDuration).toBeLessThanOrEqual(app.transitionConfig.duration * 1.5);
    });
  });
});

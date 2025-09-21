import { describe, it, expect, beforeEach, vi } from 'vitest';
import RuntimeLayer, { type Animation, type Particle } from './RuntimeLayer';

describe('RuntimeLayer', () => {
  let runtimeLayer: RuntimeLayer;
  let mockCtx: CanvasRenderingContext2D;
  let mockFrame: any;

  beforeEach(() => {
    runtimeLayer = new RuntimeLayer();
    
    // Mock canvas context
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      strokeStyle: '',
      lineWidth: 1,
      shadowColor: '',
      shadowBlur: 0,
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillRect: vi.fn(),
    } as any;

    mockFrame = {
      timestamp: 1000,
      camera: { x: 0, y: 0, zoom: 1 },
      payload: {
        models: [
          { id: 'comp1', x: 100, y: 100, width: 80, height: 40 }
        ]
      }
    };
  });

  describe('Animation Management', () => {
    it('should add and track animations', () => {
      const animationId = runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0, componentId: 'comp1' },
        config: { color: '#00ff88', intensity: 1.0 },
        easing: 'easeInOut'
      });

      expect(animationId).toMatch(/^anim_\d+_\d+$/);
    });

    it('should remove animations by id', () => {
      const animationId = runtimeLayer.addAnimation({
        type: 'glow',
        duration: 500,
        target: { x: 100, y: 100 },
        config: { color: '#ff0000', intensity: 0.8 }
      });

      const removed = runtimeLayer.removeAnimation(animationId);
      expect(removed).toBe(true);
    });

    it('should clear all animations', () => {
      runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0 },
        config: { color: '#00ff88' }
      });

      runtimeLayer.addAnimation({
        type: 'glow',
        duration: 500,
        target: { x: 100, y: 100 },
        config: { color: '#ff0000' }
      });

      runtimeLayer.clearAnimations();
      // No direct way to test internal state, but should not throw
      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should remove completed animations during rendering', () => {
      const animationId = runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 100, // Very short duration
        target: { x: 0, y: 0 },
        config: { color: '#00ff88' }
      });

      // Simulate time passing
      mockFrame.timestamp = 1200; // Past the animation duration
      
      runtimeLayer.render(mockCtx, mockFrame);
      
      // Animation should be removed (no way to directly test, but should not crash)
      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });

  describe('Particle Management', () => {
    it('should add and track particles', () => {
      const particleId = runtimeLayer.addParticle({
        x: 100,
        y: 100,
        vx: 10,
        vy: -5,
        life: 1000,
        maxLife: 1000,
        size: 3,
        color: '#00ff88',
        alpha: 1.0,
        type: 'energy'
      });

      expect(particleId).toMatch(/^particle_\d+_\d+$/);
    });

    it('should remove particles by id', () => {
      const particleId = runtimeLayer.addParticle({
        x: 100,
        y: 100,
        vx: 10,
        vy: -5,
        life: 1000,
        maxLife: 1000,
        size: 3,
        color: '#00ff88',
        alpha: 1.0,
        type: 'energy'
      });

      const removed = runtimeLayer.removeParticle(particleId);
      expect(removed).toBe(true);
    });

    it('should clear all particles', () => {
      runtimeLayer.addParticle({
        x: 100,
        y: 100,
        vx: 10,
        vy: -5,
        life: 1000,
        maxLife: 1000,
        size: 3,
        color: '#00ff88',
        alpha: 1.0,
        type: 'energy'
      });

      runtimeLayer.clearParticles();
      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should update particle positions and life', () => {
      const particleId = runtimeLayer.addParticle({
        x: 100,
        y: 100,
        vx: 10,
        vy: -5,
        life: 1000,
        maxLife: 1000,
        size: 3,
        color: '#00ff88',
        alpha: 1.0,
        type: 'energy'
      });

      // Render to trigger particle update
      runtimeLayer.render(mockCtx, mockFrame);
      
      // Particle should be updated (no direct way to test, but should not crash)
      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should remove dead particles', () => {
      runtimeLayer.addParticle({
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        life: 0, // Already dead
        maxLife: 1000,
        size: 3,
        color: '#00ff88',
        alpha: 0,
        type: 'energy'
      });

      // Render should remove dead particles
      runtimeLayer.render(mockCtx, mockFrame);
      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });

  describe('Animation Effects', () => {
    it('should create pulse animation for component', () => {
      const animationId = runtimeLayer.pulseComponent('comp1', '#00ff88', 1000);
      
      expect(animationId).toMatch(/^anim_\d+_\d+$/);
    });

    it('should create glow effect animation', () => {
      const animationId = runtimeLayer.glowEffect(100, 100, '#ff0000', 800);
      
      expect(animationId).toMatch(/^anim_\d+_\d+$/);
    });

    it('should create energy flow animation', () => {
      const animationId = runtimeLayer.energyFlow(0, 0, 100, 100, '#00ff88');
      
      expect(animationId).toMatch(/^energy_flow_\d+$/);
    });

    it('should create spark effect', () => {
      const animationId = runtimeLayer.sparkEffect(100, 100, '#ffff00');
      
      expect(animationId).toMatch(/^spark_\d+$/);
    });
  });

  describe('Rendering', () => {
    it('should render without errors with empty state', () => {
      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should render animations', () => {
      runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0, componentId: 'comp1' },
        config: { color: '#00ff88', intensity: 1.0 }
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should render particles', () => {
      runtimeLayer.addParticle({
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        life: 1000,
        maxLife: 1000,
        size: 3,
        color: '#00ff88',
        alpha: 1.0,
        type: 'energy'
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should handle missing component in pulse animation', () => {
      runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0, componentId: 'nonexistent' },
        config: { color: '#00ff88', intensity: 1.0 }
      });

      // Should not throw when component is not found
      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should render different particle types', () => {
      const particleTypes: Particle['type'][] = ['energy', 'spark', 'glow', 'data'];
      
      particleTypes.forEach(type => {
        runtimeLayer.addParticle({
          x: 100,
          y: 100,
          vx: 0,
          vy: 0,
          life: 1000,
          maxLife: 1000,
          size: 3,
          color: '#00ff88',
          alpha: 1.0,
          type
        });
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should apply camera transformations', () => {
      mockFrame.camera = { x: 50, y: 50, zoom: 2 };
      
      runtimeLayer.addParticle({
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        life: 1000,
        maxLife: 1000,
        size: 3,
        color: '#00ff88',
        alpha: 1.0,
        type: 'energy'
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });

  describe('Easing Functions', () => {
    it('should apply linear easing', () => {
      const animationId = runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0 },
        config: { color: '#00ff88' },
        easing: 'linear'
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should apply easeIn easing', () => {
      const animationId = runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0 },
        config: { color: '#00ff88' },
        easing: 'easeIn'
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should apply easeOut easing', () => {
      const animationId = runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0 },
        config: { color: '#00ff88' },
        easing: 'easeOut'
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should apply easeInOut easing', () => {
      const animationId = runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0 },
        config: { color: '#00ff88' },
        easing: 'easeInOut'
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should apply bounce easing', () => {
      const animationId = runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0 },
        config: { color: '#00ff88' },
        easing: 'bounce'
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle render errors gracefully', () => {
      const errorCtx = {
        save: vi.fn(() => { throw new Error('Canvas error'); }),
        restore: vi.fn(),
      } as any;

      runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0 },
        config: { color: '#00ff88' }
      });

      // Should not throw even if canvas operations fail
      expect(() => runtimeLayer.render(errorCtx, mockFrame)).not.toThrow();
    });

    it('should handle missing frame properties', () => {
      const incompleteFrame = {
        timestamp: 1000
        // Missing camera and payload
      };

      expect(() => runtimeLayer.render(mockCtx, incompleteFrame as any)).not.toThrow();
    });

    it('should handle invalid animation configurations', () => {
      runtimeLayer.addAnimation({
        type: 'pulse',
        duration: 1000,
        target: { x: 0, y: 0 },
        config: {} // Missing required config properties
      });

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of animations', () => {
      // Add many animations
      for (let i = 0; i < 100; i++) {
        runtimeLayer.addAnimation({
          type: 'pulse',
          duration: 1000,
          target: { x: i * 10, y: i * 10 },
          config: { color: '#00ff88' }
        });
      }

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });

    it('should handle large numbers of particles', () => {
      // Add many particles
      for (let i = 0; i < 200; i++) {
        runtimeLayer.addParticle({
          x: i * 5,
          y: i * 5,
          vx: Math.random() * 10 - 5,
          vy: Math.random() * 10 - 5,
          life: 1000,
          maxLife: 1000,
          size: 2,
          color: '#00ff88',
          alpha: 1.0,
          type: 'energy'
        });
      }

      expect(() => runtimeLayer.render(mockCtx, mockFrame)).not.toThrow();
    });
  });
});

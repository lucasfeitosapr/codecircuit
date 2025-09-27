import type { RenderFrame } from '../LayeredRenderer';

export interface Animation {
  id: string;
  type: 'pulse' | 'glow' | 'particle' | 'fade' | 'scale' | 'rotate';
  startTime: number;
  duration: number;
  target: {
    x: number;
    y: number;
    componentId?: string;
  };
  config: {
    color?: string;
    intensity?: number;
    size?: number;
    direction?: number;
    speed?: number;
    opacity?: number;
    scale?: number;
    rotation?: number;
  };
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce';
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'energy' | 'data' | 'spark' | 'glow';
}

export default class RuntimeLayer {
  static name = 'runtime';
  name = RuntimeLayer.name;

  private animations: Map<string, Animation> = new Map();
  private particles: Map<string, Particle> = new Map();
  private animationIdCounter = 0;
  private particleIdCounter = 0;

  render(ctx: CanvasRenderingContext2D, frame: RenderFrame) {
    try {
      const timestamp = frame.timestamp;

      // Update and render animations
      this.updateAnimations(timestamp);
      this.renderAnimations(ctx, frame);

      // Update and render particles
      this.updateParticles(timestamp);
      this.renderParticles(ctx, frame);
    } catch (error) {
      // Graceful error handling
      console.error('RuntimeLayer render failed:', error);
    }
  }

  // Animation Management
  addAnimation(animation: Omit<Animation, 'id' | 'startTime'>): string {
    const id = `anim_${++this.animationIdCounter}_${Date.now()}`;
    const fullAnimation: Animation = {
      ...animation,
      id,
      startTime: performance.now(),
    };

    this.animations.set(id, fullAnimation);
    return id;
  }

  removeAnimation(id: string): boolean {
    return this.animations.delete(id);
  }

  clearAnimations(): void {
    this.animations.clear();
  }

  // Particle Management
  addParticle(particle: Omit<Particle, 'id'>): string {
    const id = `particle_${++this.particleIdCounter}_${Date.now()}`;
    const fullParticle: Particle = {
      ...particle,
      id,
    };

    this.particles.set(id, fullParticle);
    return id;
  }

  removeParticle(id: string): boolean {
    return this.particles.delete(id);
  }

  clearParticles(): void {
    this.particles.clear();
  }

  // Animation Effects
  pulseComponent(componentId: string, color: string = '#00ff88', duration: number = 1000): string {
    return this.addAnimation({
      type: 'pulse',
      duration,
      target: { x: 0, y: 0, componentId },
      config: { color, intensity: 1.0 },
      easing: 'easeInOut',
    });
  }

  glowEffect(x: number, y: number, color: string = '#00ff88', duration: number = 800): string {
    return this.addAnimation({
      type: 'glow',
      duration,
      target: { x, y },
      config: { color, intensity: 0.8, size: 20 },
      easing: 'easeOut',
    });
  }

  energyFlow(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string = '#00ff88'
  ): string {
    // Create particle flow animation
    const particleCount = 8;
    const flowDuration = 1500;

    for (let i = 0; i < particleCount; i++) {
      const delay = (i / particleCount) * flowDuration;
      setTimeout(() => {
        this.addParticle({
          x: fromX,
          y: fromY,
          vx: ((toX - fromX) / flowDuration) * 1000,
          vy: ((toY - fromY) / flowDuration) * 1000,
          life: flowDuration,
          maxLife: flowDuration,
          size: 3,
          color,
          alpha: 0.8,
          type: 'energy',
        });
      }, delay);
    }

    return `energy_flow_${Date.now()}`;
  }

  sparkEffect(x: number, y: number, color: string = '#ffff00'): string {
    // Create multiple spark particles
    const sparkCount = 6;
    const sparkId = `spark_${Date.now()}`;

    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300,
        maxLife: 300,
        size: 2,
        color,
        alpha: 1.0,
        type: 'spark',
      });
    }

    return sparkId;
  }

  // Animation Updates
  private updateAnimations(timestamp: number): void {
    const toRemove: string[] = [];

    for (const [id, animation] of this.animations) {
      const elapsed = timestamp - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);

      if (progress >= 1) {
        toRemove.push(id);
      }
    }

    // Remove completed animations
    toRemove.forEach(id => this.animations.delete(id));
  }

  private updateParticles(timestamp: number): void {
    const toRemove: string[] = [];

    for (const [id, particle] of this.particles) {
      // Update particle position
      particle.x += particle.vx * (16.67 / 1000); // Assume 60fps
      particle.y += particle.vy * (16.67 / 1000);

      // Update particle life
      particle.life -= 16.67; // Assume 60fps

      // Apply gravity and drag for certain particle types
      if (particle.type === 'spark') {
        particle.vy += 0.2; // gravity
        particle.vx *= 0.98; // drag
        particle.vy *= 0.98;
      }

      // Fade out particles
      particle.alpha = particle.life / particle.maxLife;

      if (particle.life <= 0) {
        toRemove.push(id);
      }
    }

    // Remove dead particles
    toRemove.forEach(id => this.particles.delete(id));
  }

  // Rendering
  private renderAnimations(ctx: CanvasRenderingContext2D, frame: RenderFrame): void {
    const timestamp = frame.timestamp;

    for (const animation of this.animations.values()) {
      const elapsed = timestamp - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);
      const easedProgress = this.applyEasing(progress, animation.easing || 'linear');

      switch (animation.type) {
        case 'pulse':
          this.renderPulseAnimation(ctx, animation, easedProgress, frame);
          break;
        case 'glow':
          this.renderGlowAnimation(ctx, animation, easedProgress, frame);
          break;
        case 'fade':
          this.renderFadeAnimation(ctx, animation, easedProgress, frame);
          break;
        case 'scale':
          this.renderScaleAnimation(ctx, animation, easedProgress, frame);
          break;
        case 'rotate':
          this.renderRotateAnimation(ctx, animation, easedProgress, frame);
          break;
      }
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D, frame: RenderFrame): void {
    for (const particle of this.particles.values()) {
      this.renderParticle(ctx, particle, frame);
    }
  }

  private renderPulseAnimation(
    ctx: CanvasRenderingContext2D,
    animation: Animation,
    progress: number,
    frame: RenderFrame
  ): void {
    if (!animation.target.componentId) return;

    // Find component in frame payload
    const component = frame.payload?.models?.find(
      (m: any) => m.id === animation.target.componentId
    );
    if (!component) return;

    const centerX = (component.x + component.width / 2) * frame.camera.zoom + frame.camera.x;
    const centerY = (component.y + component.height / 2) * frame.camera.zoom + frame.camera.y;

    // Create pulsing effect
    const pulseSize = 20 + Math.sin(progress * Math.PI * 4) * 10;
    const alpha = (1 - progress) * animation.config.intensity!;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = animation.config.color!;
    ctx.lineWidth = 3;
    ctx.shadowColor = animation.config.color!;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private renderGlowAnimation(
    ctx: CanvasRenderingContext2D,
    animation: Animation,
    progress: number,
    frame: RenderFrame
  ): void {
    const x = animation.target.x * frame.camera.zoom + frame.camera.x;
    const y = animation.target.y * frame.camera.zoom + frame.camera.y;

    const glowSize = animation.config.size! * (1 + progress * 2);
    const alpha = (1 - progress) * animation.config.intensity!;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Create radial gradient for glow effect
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowSize);
    gradient.addColorStop(0, animation.config.color! + 'ff');
    gradient.addColorStop(0.5, animation.config.color! + '80');
    gradient.addColorStop(1, animation.config.color! + '00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderFadeAnimation(
    ctx: CanvasRenderingContext2D,
    animation: Animation,
    progress: number,
    frame: RenderFrame
  ): void {
    // Implementation for fade effects
    const alpha = animation.config.opacity! * (1 - progress);
    // Add fade rendering logic here
  }

  private renderScaleAnimation(
    ctx: CanvasRenderingContext2D,
    animation: Animation,
    progress: number,
    frame: RenderFrame
  ): void {
    // Implementation for scale effects
    const scale = 1 + (animation.config.scale! - 1) * progress;
    // Add scale rendering logic here
  }

  private renderRotateAnimation(
    ctx: CanvasRenderingContext2D,
    animation: Animation,
    progress: number,
    frame: RenderFrame
  ): void {
    // Implementation for rotation effects
    const rotation = animation.config.rotation! * progress;
    // Add rotation rendering logic here
  }

  private renderParticle(
    ctx: CanvasRenderingContext2D,
    particle: Particle,
    frame: RenderFrame
  ): void {
    const x = particle.x * frame.camera.zoom + frame.camera.x;
    const y = particle.y * frame.camera.zoom + frame.camera.y;

    ctx.save();
    ctx.globalAlpha = particle.alpha;

    switch (particle.type) {
      case 'energy':
        this.renderEnergyParticle(ctx, x, y, particle);
        break;
      case 'spark':
        this.renderSparkParticle(ctx, x, y, particle);
        break;
      case 'glow':
        this.renderGlowParticle(ctx, x, y, particle);
        break;
      case 'data':
        this.renderDataParticle(ctx, x, y, particle);
        break;
    }

    ctx.restore();
  }

  private renderEnergyParticle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    particle: Particle
  ): void {
    // Energy particles with glow effect
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderSparkParticle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    particle: Particle
  ): void {
    // Sharp spark particles
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = 1;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.moveTo(x - particle.size, y - particle.size);
    ctx.lineTo(x + particle.size, y + particle.size);
    ctx.moveTo(x + particle.size, y - particle.size);
    ctx.lineTo(x - particle.size, y + particle.size);
    ctx.stroke();
  }

  private renderGlowParticle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    particle: Particle
  ): void {
    // Soft glow particles
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, particle.size * 2);
    gradient.addColorStop(0, particle.color + 'ff');
    gradient.addColorStop(1, particle.color + '00');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, particle.size * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderDataParticle(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    particle: Particle
  ): void {
    // Data particles as small squares
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 2;

    ctx.fillRect(x - particle.size / 2, y - particle.size / 2, particle.size, particle.size);
  }

  // Easing Functions
  private applyEasing(t: number, easing: Animation['easing']): number {
    switch (easing) {
      case 'linear':
        return t;
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return 1 - Math.pow(1 - t, 2);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case 'bounce':
        return this.bounceEasing(t);
      default:
        return t;
    }
  }

  private bounceEasing(t: number): number {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }
}

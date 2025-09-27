import type { ComponentBase, Camera } from '../types';
import { ViewportManager } from '../core/ViewportManager';
import * as cameraTransitions from './cameraTransitions';

export interface ViewNavigationContext {
  viewportManager: ViewportManager;
  components: ComponentBase[];
  getCurrentView: () => string;
  getViewStack: () => string[];
  setCurrentView: (view: string) => void;
  pushView: (view: string) => void;
  popView: () => void;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
  getComponent: (id: string) => ComponentBase | undefined;
}

/**
 * Manages view navigation and camera animations for transitioning between views
 */
export class ViewNavigationManager {
  private context: ViewNavigationContext;

  // Configuration for transition animations
  private transitionConfig = {
    duration: 800, // milliseconds
    zoomOutFactor: 0.3,
    focusZoom: 1.2,
    easingFunction: this.easeInOutCubic.bind(this),
  };

  constructor(context: ViewNavigationContext) {
    this.context = context;
  }

  // Public method to configure transition parameters
  public setTransitionConfig(config: Partial<typeof this.transitionConfig>) {
    this.transitionConfig = { ...this.transitionConfig, ...config };
  }

  // Method to get current transition config (useful for debugging/tuning)
  public getTransitionConfig() {
    return { ...this.transitionConfig };
  }

  // Camera utility methods
  private interpolateCamera(start: Camera, end: Camera, progress: number): Camera {
    return cameraTransitions.interpolateCamera(start, end, progress);
  }

  private easeInOutCubic(t: number): number {
    return cameraTransitions.easeInOutCubic(t);
  }

  private getFocusCameraPosition(component: ComponentBase, zoom: number = 1): Camera {
    return cameraTransitions.getFocusCameraPosition(component, zoom);
  }

  private calculateTransitionDuration(start: Camera, end: Camera): number {
    return cameraTransitions.calculateTransitionDuration(
      start,
      end,
      this.transitionConfig.duration
    );
  }

  /**
   * Animate to schematic view of a specific component with callback
   */
  public animateToSchematicView(componentId: string, callback?: () => void): void {
    const moduleComponent = this.context.getComponent(componentId);
    if (!moduleComponent) {
      console.warn(`Component ${componentId} not found for schematic animation`);
      return;
    }

    // Calculate camera positions for the animation
    const startCamera = this.context.viewportManager.camera;
    const focusCamera = this.getFocusCameraPosition(
      moduleComponent,
      this.transitionConfig.focusZoom
    );

    const finalCamera: Camera = { x: 0, y: 0, zoom: 1 }; // Schematic view starts at origin

    // Calculate midpoint for smooth transition
    const midCamera: Camera = {
      x: startCamera.x + (focusCamera.x - startCamera.x) * 0.3,
      y: startCamera.y + (focusCamera.y - startCamera.y) * 0.3,
      zoom: this.transitionConfig.zoomOutFactor,
    };

    // Animation state
    const startTime = Date.now();
    const animationDuration = this.calculateTransitionDuration(startCamera, finalCamera);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      if (progress < 0.4) {
        // Phase 1: Move to midpoint with zoom out
        const phaseProgress = progress / 0.4;
        const phaseEased = this.transitionConfig.easingFunction(phaseProgress);
        this.context.viewportManager.setCamera(
          this.interpolateCamera(startCamera, midCamera, phaseEased)
        );
      } else if (progress < 0.7) {
        // Phase 2: Move to focus position
        const focusProgress = (progress - 0.4) / 0.3;
        const focusPhase = this.transitionConfig.easingFunction(focusProgress);
        this.context.viewportManager.setCamera(
          this.interpolateCamera(midCamera, focusCamera, focusPhase)
        );
      } else {
        // Phase 3: Final zoom out to schematic view
        const finalProgress = (progress - 0.7) / 0.3;
        const finalPhase = Math.min(finalProgress, 1);
        this.context.viewportManager.setCamera(
          this.interpolateCamera(focusCamera, finalCamera, this.easeInOutCubic(finalPhase))
        );
      }

      if (progress < 1) {
        this.context.requestAnimationFrame(animate);
      } else {
        // Animation complete, set final camera state and call callback
        this.context.viewportManager.setCamera(finalCamera);
        if (callback) callback();
      }
    };

    animate();
  }

  /**
   * Animate to main view with callback
   */
  public animateToMainView(targetCamera?: Camera, callback?: () => void): void {
    const startCamera = this.context.viewportManager.camera;
    const mainCamera: Camera = targetCamera || { x: 0, y: 0, zoom: 1 };

    const startTime = Date.now();
    const animationDuration = this.calculateTransitionDuration(startCamera, mainCamera);

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      const easedProgress = this.transitionConfig.easingFunction(progress);

      this.context.viewportManager.setCamera(
        this.interpolateCamera(startCamera, mainCamera, easedProgress)
      );

      if (progress < 1) {
        this.context.requestAnimationFrame(animate);
      } else {
        this.context.viewportManager.setCamera(mainCamera);
        if (callback) callback();
      }
    };

    animate();
  }
}

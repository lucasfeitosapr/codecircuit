/**
 * SchematicViewManager - Handles schematic view navigation and management
 * Extracted from main.ts to centralize schematic view handling
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { ComponentBase, ModuleComponent, ViewState, Camera } from '../types';
import { ViewStack } from '../viewStack';

export interface SchematicViewManagerContext {
  getCurrentView: () => ViewState;
  setCurrentView: (view: ViewState) => void;
  getViewStack: () => ViewStack;
  getViewportManager: () => any; // ViewportManager
  getViewNavigationManager: () => any; // ViewNavigationManager
  getUIController: () => any; // UIController
  isTransitioning: () => boolean;
  setTransitioning: (transitioning: boolean) => void;
  getSelectedComponent: () => ComponentBase | null;
  setSelectedComponent: (component: ComponentBase | null) => void;
  hideDatasheet: () => void;
  getComponents: () => ComponentBase[];
  getConnections: () => any[];
  getCurrentViewComponents: () => ComponentBase[];
  getCurrentViewConnections: () => any[];
  setComponents: (components: ComponentBase[]) => void;
  setConnections: (connections: any[]) => void;
  initializeMainView: () => void;
}

export class SchematicViewManager {
  private context: SchematicViewManagerContext;

  constructor(context: SchematicViewManagerContext) {
    this.context = context;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Listen for schematic view requests
    eventBus.on(Events.VIEW_ENTER_SCHEMATIC_REQUESTED, (payload: any) => {
      const moduleComponent = payload.component;
      if (moduleComponent && moduleComponent.type === 'module-ic') {
        this.enterSchematicView(moduleComponent);
      }
    });

    eventBus.on(Events.VIEW_EXIT_SCHEMATIC_REQUESTED, () => {
      this.exitSchematicView();
    });
  }

  enterSchematicView(moduleComponent: ModuleComponent): void {
    if (this.context.isTransitioning()) return;

    const currentView = this.context.getCurrentView();
    const viewStack = this.context.getViewStack();
    const viewportManager = this.context.getViewportManager();
    const viewNavigationManager = this.context.getViewNavigationManager();
    const uiController = this.context.getUIController();

    // Save current view state — snapshot copies for the viewStack
    const shouldPreserveSchematicRefs =
      currentView.type === 'schematic' && currentView.component?.type === 'module-ic';
    const currentModule = shouldPreserveSchematicRefs
      ? (currentView.component as ModuleComponent)
      : null;
    const currentViewState = {
      type: currentView.type,
      component: currentView.component,
      camera: { ...viewportManager.camera },
      selectedComponent: this.context.getSelectedComponent(),
      components: shouldPreserveSchematicRefs
        ? currentModule?.internalComponents || []
        : [...this.context.getCurrentViewComponents()],
      connections: shouldPreserveSchematicRefs
        ? currentModule?.internalConnections || []
        : [...this.context.getCurrentViewConnections()],
    };
    viewStack.push(currentViewState);

    // Initialize internal components if they don't exist
    if (!moduleComponent.internalComponents) {
      moduleComponent.internalComponents = [];
      moduleComponent.internalConnections = [];
    }

    // Switch to schematic view
    this.context.setTransitioning(true);
    this.context.hideDatasheet();
    this.context.setSelectedComponent(null);

    // Animate transition using ViewNavigationManager
    viewNavigationManager.animateToSchematicView(moduleComponent.id, () => {
      const newView: ViewState = {
        type: 'schematic',
        component: moduleComponent,
        camera: { x: 0, y: 0, zoom: 1 },
        // Reference the module's internal arrays directly — single source of truth
        components: moduleComponent.internalComponents!,
        connections: moduleComponent.internalConnections!,
      };

      if (!this.assertSchematicViewInvariant(newView, moduleComponent)) {
        console.error(
          '[SchematicViewManager] Invariant violated: invalid schematic view state; recovering to main'
        );
        this.context.initializeMainView();
        viewportManager.setCamera({ x: 0, y: 0, zoom: 1 });
        this.context.setTransitioning(false);
        uiController.updateBreadcrumbs();
        return;
      }

      this.context.setCurrentView(newView);

      // Update camera to schematic view
      viewportManager.setCamera({ ...newView.camera });
      this.context.setTransitioning(false);
      uiController.updateBreadcrumbs();

      // Emit event for other systems
      eventBus.emit('schematic.view.entered', {
        moduleComponent,
        view: newView,
        timestamp: Date.now(),
      });
    });
  }

  exitSchematicView(): void {
    const viewStack = this.context.getViewStack();

    if (this.context.isTransitioning() || viewStack.size() === 0) return;

    const currentView = this.context.getCurrentView();
    const viewportManager = this.context.getViewportManager();
    const viewNavigationManager = this.context.getViewNavigationManager();
    const uiController = this.context.getUIController();

    // No need to save back — currentView.components IS moduleComponent.internalComponents (same reference)

    // Restore previous view
    const previousView = viewStack.pop();
    if (!previousView) {
      // Nothing to restore — safely exit
      this.context.setTransitioning(false);
      return;
    }

    this.context.setTransitioning(true);
    this.context.hideDatasheet();
    this.context.setSelectedComponent(null);

    viewNavigationManager.animateToMainView(previousView.camera, () => {
      // Restore the previous view — use its saved references
      const restoredView: ViewState = {
        type: previousView.type,
        component: previousView.component,
        camera: { ...previousView.camera },
        components: previousView.components || [],
        connections: previousView.connections || [],
      };

      if (restoredView.type === 'schematic' && restoredView.component?.type === 'module-ic') {
        const moduleComponent = restoredView.component as ModuleComponent;
        moduleComponent.internalComponents = moduleComponent.internalComponents || [];
        moduleComponent.internalConnections = moduleComponent.internalConnections || [];
        restoredView.components = moduleComponent.internalComponents;
        restoredView.connections = moduleComponent.internalConnections;

        if (!this.assertSchematicViewInvariant(restoredView, moduleComponent)) {
          console.error(
            '[SchematicViewManager] Invariant violated: invalid restored schematic view state; recovering to main'
          );
          this.context.initializeMainView();
          viewportManager.setCamera({ x: 0, y: 0, zoom: 1 });
          this.context.setTransitioning(false);
          uiController.updateBreadcrumbs();
          return;
        }
      }

      this.context.setCurrentView(restoredView);

      viewportManager.setCamera({ ...previousView.camera });
      this.context.setSelectedComponent(previousView.selectedComponent);
      this.context.setTransitioning(false);
      uiController.updateBreadcrumbs();

      // Emit event for other systems
      eventBus.emit('schematic.view.exited', {
        previousView: restoredView,
        timestamp: Date.now(),
      });
    });
  }

  exitToMainBoard(): void {
    const viewStack = this.context.getViewStack();
    const viewportManager = this.context.getViewportManager();
    const viewNavigationManager = this.context.getViewNavigationManager();
    const uiController = this.context.getUIController();

    // Exit all the way to main board
    this.context.setTransitioning(true);

    const mainCamera = { x: 0, y: 0, zoom: 1 };

    viewNavigationManager.animateToMainView(mainCamera, () => {
      // Transition complete
      viewStack.clear();

      this.context.initializeMainView();
      viewportManager.setCamera({ ...mainCamera });
      this.context.setTransitioning(false);
      uiController.updateBreadcrumbs();

      // Emit event for other systems
      eventBus.emit('schematic.view.main.entered', {
        view: this.context.getCurrentView(),
        timestamp: Date.now(),
      });
    });
  }

  navigateToBreadcrumbLevel(targetIndex: number): void {
    // Navigate directly to a specific breadcrumb level
    if (this.context.isTransitioning()) return;

    const viewStack = this.context.getViewStack();
    const currentDepth = this.getViewDepth();
    const viewportManager = this.context.getViewportManager();
    const uiController = this.context.getUIController();

    if (targetIndex === 0) {
      // Navigate to main board
      this.exitToMainBoard();
    } else if (targetIndex < currentDepth) {
      // Pop the stack down to the target level and restore that view directly.
      // Previous approach called exitSchematicView() in a sync loop which raced
      // with animation callbacks, corrupting state.
      const levelsToExit = currentDepth - targetIndex;

      this.context.setTransitioning(true);
      this.context.hideDatasheet();
      this.context.setSelectedComponent(null);

      // Pop excess levels off the stack
      let restoredView: any = null;
      for (let i = 0; i < levelsToExit; i++) {
        restoredView = viewStack.pop();
      }

      if (!restoredView) {
        this.context.setTransitioning(false);
        return;
      }

      // Restore the target level's view
      const targetView: ViewState = {
        type: restoredView.type,
        component: restoredView.component,
        camera: { ...restoredView.camera },
        components: restoredView.components || [],
        connections: restoredView.connections || [],
      };

      // Re-bind Module IC internal arrays for reference consistency
      if (targetView.type === 'schematic' && targetView.component?.type === 'module-ic') {
        const mod = targetView.component as ModuleComponent;
        mod.internalComponents = mod.internalComponents || [];
        mod.internalConnections = mod.internalConnections || [];
        targetView.components = mod.internalComponents;
        targetView.connections = mod.internalConnections;
      }

      this.context.setCurrentView(targetView);
      viewportManager.setCamera({ ...restoredView.camera });
      this.context.setSelectedComponent(restoredView.selectedComponent ?? null);
      this.context.setTransitioning(false);
      uiController.updateBreadcrumbs();
    }
  }

  buildBreadcrumbPath(): Array<{
    name: string;
    icon: string;
    isCurrent: boolean;
    viewIndex: number;
  }> {
    const path = [];
    const viewStack = this.context.getViewStack();
    const currentView = this.context.getCurrentView();

    // Always start with main board
    path.push({
      name: 'Project: Motherboard',
      icon: '⚡',
      isCurrent: currentView.type === 'main',
      viewIndex: 0,
    });

    // Add each level from view stack
    const stack = viewStack.serialize();
    stack.forEach((view: any, index: number) => {
      if (view.type === 'schematic' && view.component) {
        const depth = index + 1;
        const depthIcons = ['⚡', '🔲', '🔳', '🔵', '🟢', '🟡', '🟠', '🔴', '🟣', '⚫', '⚪', '🔘'];
        const icon = depth < depthIcons.length ? depthIcons[depth] : `🔹${depth}`;

        path.push({
          name: view.component.title || `Module ${depth}`,
          icon: icon,
          isCurrent: false,
          viewIndex: depth,
        });
      }
    });

    // Mark current schematic view
    if (currentView.type === 'schematic') {
      const currentDepth = stack.length + 1;
      const depthIcons = ['⚡', '🔲', '🔳', '🔵', '🟢', '🟡', '🟠', '🔴', '🟣', '⚫', '⚪', '🔘'];
      const icon =
        currentDepth < depthIcons.length ? depthIcons[currentDepth] : `🔹${currentDepth}`;

      path.push({
        name: currentView.component?.title || `Module ${currentDepth}`,
        icon: icon,
        isCurrent: true,
        viewIndex: currentDepth,
      });
    }

    return path;
  }

  // Helper method to check if a component is internal to any Module IC
  private assertSchematicViewInvariant(
    view: ViewState,
    moduleComponent: ModuleComponent
  ): boolean {
    const hasValidComponent = view.component?.type === 'module-ic';
    const hasArrayState = Array.isArray(view.components) && Array.isArray(view.connections);
    const hasReferenceConsistency =
      view.components === moduleComponent.internalComponents &&
      view.connections === moduleComponent.internalConnections;

    return view.type === 'schematic' && hasValidComponent && hasArrayState && hasReferenceConsistency;
  }

  // Helper method to check if a component is internal to any Module IC
  isComponentInternal(component: ComponentBase, allComponents: ComponentBase[]): boolean {
    return allComponents.some(containerComponent => {
      if (containerComponent.type === 'module-ic') {
        const moduleComponent = containerComponent as ModuleComponent;
        return (
          moduleComponent.internalComponents?.some(internal => internal.id === component.id) ||
          false
        );
      }
      return false;
    });
  }

  // Get current view type
  getCurrentViewType(): 'main' | 'schematic' {
    return this.context.getCurrentView().type as 'main' | 'schematic';
  }

  // Get current schematic component (if in schematic view)
  getCurrentSchematicComponent(): ModuleComponent | null {
    const currentView = this.context.getCurrentView();
    return currentView.type === 'schematic' ? (currentView.component as ModuleComponent) : null;
  }

  // Get view depth (0 = main, 1+ = schematic levels)
  getViewDepth(): number {
    const viewStack = this.context.getViewStack();
    const currentView = this.context.getCurrentView();
    // If we're in main view, depth is 0
    // If we're in schematic view, depth is the number of views saved in the stack
    return currentView.type === 'schematic' ? viewStack.size() : 0;
  }
}

export function createSchematicViewManager(
  context: SchematicViewManagerContext
): SchematicViewManager {
  return new SchematicViewManager(context);
}

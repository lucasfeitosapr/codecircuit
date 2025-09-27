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
  setComponents: (components: ComponentBase[]) => void;
  setConnections: (connections: any[]) => void;
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

    // Save current view state with proper array copying
    const currentViewState = {
      type: currentView.type,
      component: currentView.component,
      camera: { ...viewportManager.camera },
      selectedComponent: this.context.getSelectedComponent(),
      // For main view, save global arrays; for schematic view, save view arrays
      components:
        currentView.type === 'main'
          ? [...this.context.getComponents()]
          : [...currentView.components],
      connections:
        currentView.type === 'main'
          ? [...this.context.getConnections()]
          : [...currentView.connections],
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
        // Create defensive copies to prevent contamination
        components: [...(moduleComponent.internalComponents ?? [])],
        connections: [...(moduleComponent.internalConnections ?? [])],
      };

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

    // Save current schematic state to the component's internal structure
    if (currentView.type === 'schematic' && currentView.component) {
      currentView.component.internalComponents = [...currentView.components];
      currentView.component.internalConnections = [...currentView.connections];
    }

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
      // Restore the previous view with proper array isolation
      const restoredView: ViewState = {
        type: previousView.type,
        component: previousView.component,
        camera: { ...previousView.camera },
        components: [...(previousView.components || [])], // Use saved components from viewStack
        connections: [...(previousView.connections || [])], // Use saved connections from viewStack
      };

      this.context.setCurrentView(restoredView);

      // For main view, also sync with global arrays to maintain backward compatibility
      if (previousView.type === 'main') {
        // Restore global arrays from the saved state
        const components = this.context.getComponents();
        const connections = this.context.getConnections();

        components.length = 0; // Clear existing
        components.push(...restoredView.components);

        connections.length = 0; // Clear existing
        connections.push(...restoredView.connections);
      }

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

      const mainView: ViewState = {
        type: 'main',
        component: null,
        camera: { ...mainCamera },
        components: [...this.context.getComponents()],
        connections: [...this.context.getConnections()],
      };

      this.context.setCurrentView(mainView);
      viewportManager.setCamera({ ...mainCamera });
      this.context.setTransitioning(false);
      uiController.updateBreadcrumbs();

      // Emit event for other systems
      eventBus.emit('schematic.view.main.entered', {
        view: mainView,
        timestamp: Date.now(),
      });
    });
  }

  navigateToBreadcrumbLevel(targetIndex: number): void {
    // Navigate directly to a specific breadcrumb level
    if (this.context.isTransitioning()) return;

    const viewStack = this.context.getViewStack();
    const currentView = this.context.getCurrentView();
    const currentDepth = this.getViewDepth();

    if (targetIndex === 0) {
      // Navigate to main board
      this.exitToMainBoard();
    } else if (targetIndex < currentDepth) {
      // Navigate to intermediate level by exiting the right number of levels
      const levelsToExit = currentDepth - targetIndex;

      // For now, just exit one level at a time
      // TODO: Implement batch exit for better UX
      for (let i = 0; i < levelsToExit; i++) {
        this.exitSchematicView();
      }
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

// src/viewStack.ts
// Manage view stack and per-view camera state for schematic navigation

export type ViewState = {
  type: string;
  component: any;
  camera: any;
  selectedComponent?: any;
  components?: any[];
  connections?: any[];
};

export class ViewStack {
  private static instance: ViewStack | null = null;
  private stack: ViewState[];

  constructor() {
    this.stack = [];
  }

  public static getInstance(): ViewStack {
    if (!ViewStack.instance) {
      ViewStack.instance = new ViewStack();
    }
    return ViewStack.instance;
  }

  public static resetInstance(): void {
    ViewStack.instance = null;
  }

  push(view: ViewState) {
    // shallow clone to avoid mutations from outside
    const clone: ViewState = {
      type: view.type,
      component: view.component,
      camera: view.camera ? { ...view.camera } : { x: 0, y: 0, zoom: 1 },
      selectedComponent: view.selectedComponent,
      components: view.components ? [...view.components] : [],
      connections: view.connections ? [...view.connections] : [],
    };
    this.stack.push(clone);
  }

  pop(): ViewState | undefined {
    return this.stack.pop();
  }

  peek(): ViewState | undefined {
    return this.stack[this.stack.length - 1];
  }

  clear() {
    this.stack = [];
  }

  size(): number {
    return this.stack.length;
  }

  // helpers for schematic workflows
  saveSchematicState(currentView: ViewState) {
    // Replace top of stack with updated state if matches
    if (this.stack.length === 0) return;
    const topIdx = this.stack.length - 1;
    this.stack[topIdx] = {
      type: currentView.type,
      component: currentView.component,
      camera: currentView.camera ? { ...currentView.camera } : { x: 0, y: 0, zoom: 1 },
      selectedComponent: currentView.selectedComponent,
      components: currentView.components ? [...currentView.components] : [],
      connections: currentView.connections ? [...currentView.connections] : [],
    };
  }

  // Serialize stack for persistence (e.g., export/import)
  serialize(): any {
    return JSON.parse(JSON.stringify(this.stack));
  }

  // Restore from serialized structure
  restore(serialized: any[]) {
    this.stack = serialized.map(s => ({
      type: s.type,
      component: s.component,
      camera: s.camera || { x: 0, y: 0, zoom: 1 },
      selectedComponent: s.selectedComponent,
      components: s.components || [],
      connections: s.connections || [],
    }));
  }
}

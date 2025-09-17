// src/types.d.ts
// Consolidated shared types for runtime and persistence.

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export type PinDef = {
  x: number;
  y: number;
  type?: string;
  label?: string;
};

// Serialized pin reference (used for export/import)
export type PinSerialized = {
  componentId: string;
  pinType: 'input' | 'output';
  pinIndex: number;
  x: number;
  y: number;
  category?: string;
};

// Runtime pin reference (live object reference)
export type PinRef = {
  component: ComponentBase;
  pinType: 'input' | 'output';
  pinIndex: number;
  x: number;
  y: number;
  category?: string;
};

export type PinHit = PinRef;

export interface Connection {
  id: string;
  from: PinRef;
  to: PinRef;
  category?: string;
  createdAt?: string | Date;
  // allow additional runtime fields during migration
  [k: string]: any;
}

export interface ComponentBase {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  title?: string;
  icon?: string;
  color?: string;
  pins: {
    input?: PinDef[];
    output?: PinDef[];
    [k: string]: PinDef[] | undefined;
  };
  status?: 'defined' | 'todo' | 'in-progress' | 'done' | string;
  category?: string;
  description?: string;
  createdAt?: string | Date;
  // allow extensible fields (internalComponents, templates, etc.)
  [k: string]: any;
}

export interface ModuleComponent extends ComponentBase {
  internalComponents?: ComponentBase[];
  internalConnections?: Connection[];
  pinMap?: Record<string, any>;
}

export type ViewState = {
  type: 'main' | 'schematic' | string;
  component?: ModuleComponent | null;
  camera: Camera;
  components: ComponentBase[];
  connections: Connection[];
  selectedComponent?: ComponentBase | null;
  [k: string]: any;
};

export type AppState = {
  components: ComponentBase[];
  connections: Connection[];
  viewStack?: ViewState[];
  currentView?: ViewState;
  camera?: Camera;
  [k: string]: any;
};

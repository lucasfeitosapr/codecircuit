export const Events = {
  // Phase 1: Event-Driven Architecture Foundation
  PLUGIN_REGISTERED: 'plugin:registered',
  PLUGIN_UNREGISTERED: 'plugin:unregistered',
  UI_PARTS_TRAY_UPDATE: 'ui:parts_tray_update',
  UI_COMPONENT_TYPES_UPDATE: 'ui:component_types_update',

  // Legacy events (Phase 1-4)
  ComponentCreated: 'component.created',
  ComponentUpdated: 'component.updated',
  ComponentDeleted: 'component.deleted',
  ConnectionCreated: 'connection.created',
  ConnectionDeleted: 'connection.deleted',
  ConnectionUpdated: 'connection.updated',
  CommandDispatched: 'command.dispatched',
  RuntimePulse: 'runtime.pulse',
  SystemError: 'system.error',

  // Phase 5 Input Handler Events
  COMPONENT_CREATE_REQUESTED: 'input.component.create.requested',
  COMPONENT_DELETE_REQUESTED: 'input.component.delete.requested',
  COMPONENT_SELECTED: 'input.component.selected',
  COMPONENT_DESELECTED: 'input.component.deselected',
  COMPONENT_DRAG_STARTED: 'input.component.drag.started',
  COMPONENT_DRAG_UPDATED: 'input.component.drag.updated',
  COMPONENT_DRAG_COMPLETED: 'input.component.drag.completed',
  COMPONENT_HIT_TEST_REQUESTED: 'input.component.hit.test.requested',
  COMPONENT_STATUS_TOGGLE_REQUESTED: 'input.component.status.toggle.requested',

  CONNECTION_CREATE_REQUESTED: 'input.connection.create.requested',
  CONNECTION_START_REQUESTED: 'connection.start.requested',
  CONNECTION_END_REQUESTED: 'connection.end.requested',
  CONNECTION_CANCEL_REQUESTED: 'connection.cancel.requested',
  CONNECTION_MODE_STARTED: 'input.connection.mode.started',
  CONNECTION_MODE_CANCELLED: 'input.connection.mode.cancelled',

  PIN_HIT_TEST_REQUESTED: 'input.pin.hit.test.requested',

  CAMERA_ZOOM_REQUESTED: 'input.camera.zoom.requested',
  CAMERA_PAN_UPDATED: 'input.camera.pan.updated',
  CAMERA_RESET_REQUESTED: 'input.camera.reset.requested',

  VIEW_ENTER_SCHEMATIC_REQUESTED: 'input.view.enter.schematic.requested',
  VIEW_EXIT_SCHEMATIC_REQUESTED: 'input.view.exit.schematic.requested',

  MOUSE_POSITION_UPDATED: 'input.mouse.position.updated',

  PROJECT_RESET_REQUESTED: 'input.project.reset.requested',
  UNDO_REQUESTED: 'input.undo.requested',
  REDO_REQUESTED: 'input.redo.requested',

  // Phase 5 Export/Import Events
  PROJECT_EXPORT_REQUESTED: 'export.project.requested',
  PROJECT_IMPORT_REQUESTED: 'import.project.requested',
  PROJECT_DATA_EXPORT_REQUESTED: 'export.project.data.requested',
  PROJECT_DATA_IMPORT_REQUESTED: 'import.project.data.requested',
  PROJECT_STATE_REQUEST: 'project.state.request',
  PROJECT_EXPORTED: 'project.exported',
  PROJECT_IMPORTED: 'project.imported',
  PROJECT_DOWNLOAD_COMPLETED: 'project.download.completed',
  PROJECT_IMPORT_ERROR: 'project.import.error',

  // Phase 5 Viewport Manager Events
  VIEWPORT_CAMERA_UPDATED: 'viewport.camera.updated',
  VIEWPORT_RESIZED: 'viewport.resized',
  VIEWPORT_ZOOM_REQUESTED: 'viewport.zoom.requested',
  VIEWPORT_PAN_REQUESTED: 'viewport.pan.requested',
  VIEWPORT_CANVAS_SETUP_COMPLETED: 'viewport.canvas.setup.completed',

  // Phase 6 Renderer Integration Events
  RENDER_FRAME_COMPLETE: 'render.frame.complete',
  RENDER_ERROR: 'render.error',

  // Phase 7 Extended Component Events
  EXTENDED_COMPONENTS_INITIALIZED: 'extended.components.initialized',
  DECISION_EVALUATED: 'decision.evaluated',
} as const;

export type EventName = (typeof Events)[keyof typeof Events];

export interface ComponentCreatedPayload {
  id: string;
  type: string;
  model: Record<string, any>;
  source?: 'legacy' | 'plugin';
}

export interface ComponentUpdatedPayload {
  id: string;
  changes: Record<string, any>;
  source?: 'legacy' | 'plugin';
}

export interface ConnectionPayload {
  id: string;
  from: string;
  to: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface CommandDispatchedPayload {
  id: string;
  name: string;
  args?: any;
  correlationId?: string;
}

export interface RuntimePulsePayload {
  traceId: string;
  from: string;
  to: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SystemErrorPayload {
  error: any;
  context?: string;
  timestamp: number;
}

// Phase 5 Input Handler Event Payloads
export interface ComponentCreateRequestedPayload {
  type: string;
  position: { x: number; y: number };
  timestamp: number;
}

export interface ComponentDeleteRequestedPayload {
  componentId: string;
  timestamp: number;
}

export interface ComponentSelectedPayload {
  component: any; // ComponentBase
  timestamp: number;
}

export interface ComponentDeselectedPayload {
  componentId: string;
  timestamp: number;
}

export interface ComponentDragUpdatedPayload {
  componentId: string;
  position: { x: number; y: number };
  timestamp: number;
}

export interface ComponentDragCompletedPayload {
  componentId: string;
  timestamp: number;
}

export interface ComponentHitTestRequestedPayload {
  position: { x: number; y: number };
  callback: (component: any | null) => void;
  timestamp: number;
}

export interface ComponentStatusToggleRequestedPayload {
  componentId: string;
  timestamp: number;
}

export interface ConnectionCreateRequestedPayload {
  startPin: any; // PinHit
  endPin: any; // PinHit
  timestamp: number;
}

export interface ConnectionModeStartedPayload {
  startPin: any; // PinHit
  timestamp: number;
}

export interface ConnectionModeCancelledPayload {
  timestamp: number;
}

export interface PinHitTestRequestedPayload {
  position: { x: number; y: number };
  callback: (pinHit: any | null) => void;
  timestamp: number;
}

export interface CameraZoomRequestedPayload {
  factor: number;
  center: { x: number; y: number };
  timestamp: number;
}

export interface CameraPanUpdatedPayload {
  camera: { x: number; y: number; zoom: number };
  timestamp: number;
}

export interface CameraResetRequestedPayload {
  timestamp: number;
}

export interface ViewEnterSchematicRequestedPayload {
  component: any; // ComponentBase
  timestamp: number;
}

export interface ViewExitSchematicRequestedPayload {
  timestamp: number;
}

export interface MousePositionUpdatedPayload {
  position: { x: number; y: number };
  screenPosition: { x: number; y: number };
  timestamp: number;
}

export interface ProjectResetRequestedPayload {
  timestamp: number;
}

export interface UndoRequestedPayload {
  timestamp: number;
}

export interface RedoRequestedPayload {
  timestamp: number;
}

// Phase 5 Export/Import Event Payloads
export interface ProjectExportRequestedPayload {
  filename?: string;
  timestamp: number;
}

export interface ProjectImportRequestedPayload {
  timestamp: number;
}

export interface ProjectDataExportRequestedPayload {
  components: any[]; // ComponentBase[]
  connections: any[]; // Connection[]
  callback: (projectData: any) => void;
  timestamp: number;
}

export interface ProjectDataImportRequestedPayload {
  projectData: any;
  timestamp: number;
}

export interface ProjectStateRequestPayload {
  callback: (components: any[], connections: any[]) => void;
  timestamp: number;
}

export interface ProjectExportedPayload {
  projectData: any;
  componentCount: number;
  connectionCount: number;
  timestamp: number;
}

export interface ProjectImportedPayload {
  components: any[]; // ComponentBase[]
  connections: any[]; // Connection[]
  projectData: any;
  componentCount: number;
  connectionCount: number;
  timestamp: number;
}

export interface ProjectDownloadCompletedPayload {
  filename: string;
  size: number;
  timestamp: number;
}

export interface ProjectImportErrorPayload {
  error: string;
  filename?: string;
  projectData?: any;
  timestamp: number;
}

// Phase 5 Viewport Manager Event Payloads
export interface ViewportCameraUpdatedPayload {
  camera: { x: number; y: number; zoom: number };
  previousCamera: { x: number; y: number; zoom: number };
  timestamp: number;
}

export interface ViewportResizedPayload {
  width: number;
  height: number;
  pixelRatio: number;
  timestamp: number;
}

export interface ViewportZoomRequestedPayload {
  zoomFactor: number;
  screenX: number;
  screenY: number;
  wheelDelta?: number;
  timestamp: number;
}

export interface ViewportPanRequestedPayload {
  deltaX: number;
  deltaY: number;
  timestamp: number;
}

export interface ViewportCanvasSetupCompletedPayload {
  canvasId: string;
  width: number;
  height: number;
  timestamp: number;
}

// Phase 1: Event-Driven Architecture Coordination Events
export interface PluginMetadata {
  displayName: string;
  icon: string;
  color: string;
  category: string;
  width?: number;
  height?: number;
  pins?: {
    input?: Array<{ x: number; y: number; type: string; label?: string }>;
    output?: Array<{ x: number; y: number; type: string; label?: string }>;
  };
}

export interface PluginRegisteredPayload {
  pluginType: string;
  metadata: PluginMetadata;
  timestamp: number;
}

export interface PluginUnregisteredPayload {
  pluginType: string;
  timestamp: number;
}

export interface UIPartsTrayUpdatePayload {
  plugins: PluginMetadata[];
  timestamp: number;
}

export interface UIComponentTypesUpdatePayload {
  componentTypes: Record<string, any>;
  timestamp: number;
}

// Phase 1: Component System Events Interface
export interface ComponentSystemEvents {
  [Events.PLUGIN_REGISTERED]: PluginRegisteredPayload;
  [Events.PLUGIN_UNREGISTERED]: PluginUnregisteredPayload;
  [Events.UI_PARTS_TRAY_UPDATE]: UIPartsTrayUpdatePayload;
  [Events.UI_COMPONENT_TYPES_UPDATE]: UIComponentTypesUpdatePayload;
}

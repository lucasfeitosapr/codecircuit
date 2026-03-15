/**
 * AppContext - Shared typed container for all manager references.
 *
 * Phase 4: Replaces the 65-line ad-hoc context interfaces that were passed
 * into every manager constructor from main.ts. Managers now receive the full
 * AppContext and pick what they need, keeping main.ts thin.
 */

import type { AppStateManager } from './AppStateManager';
import type { ViewportManager } from './ViewportManager';
import type { ConnectionManager } from './ConnectionManager';
import type { ComponentLifecycleManager } from './ComponentLifecycleManager';
import type { SchematicViewManager } from './SchematicViewManager';
import type { NotificationManager } from './NotificationManager';
import type { KeyboardShortcutManager } from './KeyboardShortcutManager';
import type { HistoryManager } from './HistoryManager';
import type { InputEventCoordinator } from './InputEventCoordinator';
import type { ExportImportManager } from './ExportImportManager';
import type { ApplicationInitializer } from './ApplicationInitializer';
import type { ComponentRegistry } from '../components/ComponentRegistry';
import type { UIController } from '../ui/UIController';
import type { PartsTrayRenderer } from '../ui/PartsTrayRenderer';
import type { ViewNavigationManager } from '../ui/ViewNavigationManager';
import type { RenderScheduler } from '../rendering/RenderScheduler';
import type RuntimeLayer from '../rendering/layers/RuntimeLayer';
import type UILayer from '../rendering/layers/UILayer';
import type { ComponentBase } from '../types';
import type { ViewStack } from '../viewStack';

/**
 * Central container holding references to all managers.
 * Populated incrementally during initialization (fields are set as managers are created).
 */
export interface AppContext {
  // Core state
  appStateManager: AppStateManager;
  viewportManager: ViewportManager;
  notificationManager: NotificationManager;

  // Feature managers
  connectionManager: ConnectionManager;
  componentLifecycleManager: ComponentLifecycleManager;
  schematicViewManager: SchematicViewManager;
  keyboardShortcutManager: KeyboardShortcutManager;
  historyManager: HistoryManager;
  inputEventCoordinator: InputEventCoordinator;
  exportImportManager: ExportImportManager;
  applicationInitializer: ApplicationInitializer;

  // UI
  componentRegistry: ComponentRegistry;
  uiController: UIController;
  partsTrayRenderer: PartsTrayRenderer;
  viewNavigationManager: ViewNavigationManager;

  // Rendering
  renderScheduler: RenderScheduler;
  runtimeLayer: RuntimeLayer;
  uiLayer: UILayer;

  // Configuration data
  componentTypes: Record<string, Partial<ComponentBase>>;
  categories: Record<string, { name: string; color: string }>;

  // Shared instances
  viewStack: ViewStack;
}

/**
 * Mutable builder used during initialization.
 * All fields are optional so managers can be assigned as they are created.
 * Call `freeze()` when initialization is complete.
 */
export type AppContextBuilder = Partial<AppContext>;

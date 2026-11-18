/**
 * EventHandlerWiring - Extracted event handler coordination from main.ts.
 *
 * Phase 3 (CC-12): Consolidates manager-to-manager event wiring that was previously
 * scattered across setupEventHandlers() and initializeAutoSave() in main.ts.
 *
 * Note: Some managers already have their own wireAppHandlers() methods
 * (ConnectionManager, ExportImportManager, AppStateManager, RenderScheduler).
 * This module calls those methods with the appropriate hooks from AppContext.
 */

import type { AppContext } from './AppContext';
import { ViewStack } from '../viewStack';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

/**
 * Wire all event handlers for manager-to-manager coordination.
 * Call this after all managers are initialized in MotherboardApp constructor.
 */
export function wireEventHandlers(ctx: AppContext): void {
  wireRenderScheduler(ctx);
  wireExportImport(ctx);
  wireConnectionManager(ctx);
  wireComponentDeletion(ctx);
  wireAutoSave(ctx);
  wireSpatialIndex(ctx);
}

/**
 * Keep the click index (spatial index) matching the current view (COD-280, debt map D-001).
 *
 * The quadtree finds entries by position, so a part moved by writing x/y directly can't be
 * removed from its old cell. Instead of patching single entries, rebuild from the current
 * view's parts whenever the view changes or a path that bypasses the lifecycle manager
 * changes its contents. getComponentAt already filters hits to the current view.
 *
 * Covers: drag end (B-002), paste (B-003), entering/leaving a module or jumping to a level,
 * including after reload (B-004) and after an undo inside a module (B-018).
 */
function wireSpatialIndex(ctx: AppContext): void {
  const syncToView = () =>
    ctx.componentLifecycleManager.rebuildSpatialIndex(ctx.appStateManager.getCurrentViewComponents());

  eventBus.on(Events.COMPONENT_DRAG_COMPLETED, syncToView);
  eventBus.on('schematic.view.entered', syncToView);
  eventBus.on('schematic.view.exited', syncToView);
  eventBus.on('schematic.view.main.entered', syncToView);
  // Paste adds through appStateManager.addComponentToCurrentView ('view-aware'), not the lifecycle manager.
  eventBus.on(Events.ComponentCreated, (payload: { source?: string }) => {
    if (payload?.source === 'view-aware') syncToView();
  });
}

/**
 * Wire RenderScheduler event handlers for history and notifications.
 */
function wireRenderScheduler(ctx: AppContext): void {
  ctx.renderScheduler.wireEventHandlers({
    pushHistorySnapshot: () => ctx.historyManager.pushSnapshot(),
    showTemporaryMessage: (msg: string) => ctx.notificationManager.showTemporaryMessage(msg),
  });
}

/**
 * Wire ExportImportManager event handlers for project import/export coordination.
 */
function wireExportImport(ctx: AppContext): void {
  ctx.exportImportManager.wireAppHandlers({
    getCurrentView: () => ctx.appStateManager.getCurrentView(),
    getComponents: () => ctx.appStateManager.getComponents(),
    getConnections: () => ctx.appStateManager.getConnections(),
    findComponentDeep: id => ctx.appStateManager.findComponentDeep(id, ViewStack.getInstance()),
    setComponents: (components, emitEvents) => ctx.appStateManager.setComponents(components, emitEvents),
    setConnections: connections => ctx.appStateManager.setConnections(connections),
    setSelectedComponent: component => ctx.appStateManager.setSelectedComponent(component),
    initializeMainView: () => {
      ctx.appStateManager.initializeMainView();
      ctx.uiController.updateBreadcrumbs();
    },
    setCamera: camera => ctx.viewportManager.setCamera(camera),
    rebuildSpatialIndex: components => ctx.componentLifecycleManager.rebuildSpatialIndex(components),
    pushHistorySnapshot: () => ctx.historyManager.pushSnapshot(),
    showError: msg => ctx.notificationManager.error(msg),
    showSuccess: msg => ctx.notificationManager.success(msg),
  });
}

/**
 * Wire ConnectionManager event handlers for connection lifecycle and UI updates.
 */
function wireConnectionManager(ctx: AppContext): void {
  ctx.connectionManager.wireAppHandlers({
    getCurrentViewComponents: () => ctx.appStateManager.getCurrentViewComponents(),
    addConnectionToCurrentView: conn => ctx.appStateManager.addConnectionToCurrentView(conn),
    getConnections: () => ctx.appStateManager.getConnections(),
    updateConnectionModeUI: () => {
      const indicator = document.getElementById('connection-mode');
      if (!indicator) return;
      const connectionState = ctx.connectionManager.getConnectionState();
      if (connectionState.isConnecting) {
        indicator.style.display = 'block';
      } else {
        indicator.style.display = 'none';
      }
    },
    clearConnectionIntents: () => ctx.uiLayer.clearConnectionIntents(),
    runtimeEnergyFlow: (fx, fy, tx, ty, color) => ctx.runtimeLayer.energyFlow(fx, fy, tx, ty, color),
    getCategoryColor: cat => ctx.categories[cat]?.color || '#00ff88',
  });
}

/**
 * Wire component deletion event handlers for cascade cleanup.
 */
function wireComponentDeletion(ctx: AppContext): void {
  ctx.appStateManager.wireComponentDeletion({
    removeConnectionFromManager: id => ctx.connectionManager.removeConnection(id),
    hideDatasheet: () => {
      const datasheetPanel = document.getElementById('datasheet-panel');
      if (datasheetPanel) {
        datasheetPanel.style.display = 'none';
      }
    },
  });
}

/**
 * Wire AutoSaveManager event handlers for state persistence.
 */
function wireAutoSave(ctx: AppContext): void {
  if (!ctx.autoSaveManager) {
    throw new Error(
      'wireAutoSave: ctx.autoSaveManager is undefined. ' +
      'Ensure AutoSaveManager is instantiated before setupEventHandlers() in start().'
    );
  }
  ctx.autoSaveManager.wireAutoSave({
    getComponents: () => ctx.appStateManager.getComponents(),
    getConnections: () => ctx.appStateManager.getConnections(),
    getCurrentView: () => ctx.appStateManager.getCurrentView(),
  });
}

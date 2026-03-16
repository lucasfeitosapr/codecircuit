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
    setComponents: components => ctx.appStateManager.setComponents(components),
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
  ctx.autoSaveManager.wireAutoSave({
    getComponents: () => ctx.appStateManager.getComponents(),
    getConnections: () => ctx.appStateManager.getConnections(),
    getCurrentView: () => ctx.appStateManager.getCurrentView(),
  });
}

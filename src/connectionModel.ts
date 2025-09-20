import type { Connection, PinHit } from './types';

/**
 * ConnectionModel - connection creation and rendering helpers
 *
 * These functions operate on the app instance (minimal surface area) so we can
 * move connection-related logic out of the large main.ts file.
 */

import { eventBus } from './events/EventBus';
import { Events } from './events/eventTypes';

export function createConnection(app: any, startPin: PinHit, endPin: PinHit) {
  // Prevent connecting to the same component
  if (startPin.component === endPin.component) return;

  // Prevent output->output or input->input
  if (startPin.pinType === endPin.pinType) return;

  // Ensure output->input orientation
  let outputPin: PinHit, inputPin: PinHit;
  if (startPin.pinType === 'output') {
    outputPin = startPin;
    inputPin = endPin;
  } else {
    outputPin = endPin;
    inputPin = startPin;
  }

  const connections: Connection[] = app.currentView.connections;

  // Check for existing identical connection
  const existing = connections.find(
    (conn: Connection) =>
      conn.from.component === outputPin.component &&
      conn.from.pinIndex === outputPin.pinIndex &&
      conn.to.component === inputPin.component &&
      conn.to.pinIndex === inputPin.pinIndex
  );
  if (existing) return;

  const conn: Connection = {
    id: app.generateId(),
    from: outputPin,
    to: inputPin,
    category: outputPin.category ?? 'frontend',
    createdAt: new Date(),
  };

  // Push to view connections (this is the canonical list for current view)
  connections.push(conn);

  // Maintain top-level arrays when on main view
  if (app.currentView.type === 'main') {
    if (app.connections !== connections) {
      app.connections.push(conn);
    }
  } else if (app.currentView.type === 'schematic' && app.currentView.component) {
    if (!app.currentView.component.internalConnections) {
      app.currentView.component.internalConnections = [];
    }
    if (app.currentView.component.internalConnections !== connections) {
      app.currentView.component.internalConnections.push(conn);
    }
  }
  try {
    eventBus.emit(Events.ConnectionCreated, { id: conn.id, from: conn.from, to: conn.to, type: conn.category, metadata: {}, source: 'legacy' });
  } catch (err) {
    console.error('Failed to emit ConnectionCreated', err);
  }
}

export function drawConnections(app: any) {
  const connections: Connection[] = app.currentView.connections;
  connections.forEach((connection: Connection) => {
    const fromPin = connection.from;
    const toPin = connection.to;

    const fromComp = fromPin.component;
    const toComp = toPin.component;

    // Guard against missing pin arrays
    if (!fromComp.pins?.output || !toComp.pins?.input) return;

    const fromPinDef = fromComp.pins.output[fromPin.pinIndex];
    const toPinDef = toComp.pins.input[toPin.pinIndex];

    const fromX = (fromComp.x + fromPinDef.x) * app.camera.zoom + app.camera.x;
    const fromY = (fromComp.y + fromPinDef.y) * app.camera.zoom + app.camera.y;
    const toX = (toComp.x + toPinDef.x) * app.camera.zoom + app.camera.x;
    const toY = (toComp.y + toPinDef.y) * app.camera.zoom + app.camera.y;

    const categoryColor = app.categories[connection.category ?? 'frontend']?.color || '#00ff88';

    const isActive =
      connection.from.component.status === 'in-progress' ||
      connection.from.component.status === 'done';
    const isPowered = connection.from.component.status === 'done';

    // Delegate layered drawing to app helpers (keeps glow/particle logic centralized)
    app.drawTraceBackground(fromX, fromY, toX, toY, categoryColor, isActive);

    if (isActive) {
      app.drawActiveTrace(fromX, fromY, toX, toY, categoryColor, isPowered);
      app.drawDataFlow(connection, fromX, fromY, toX, toY, categoryColor, isPowered);
    }
  });
}

export function drawTempConnection(app: any) {
  if (!app.connectionStart) return;
  const fromX = app.connectionStart.x * app.camera.zoom + app.camera.x;
  const fromY = app.connectionStart.y * app.camera.zoom + app.camera.y;
  const toX = app.mousePos.x * app.camera.zoom + app.camera.x;
  const toY = app.mousePos.y * app.camera.zoom + app.camera.y;

  const cat = app.connectionStart.category ?? 'frontend';
  const categoryColor = app.categories[cat]?.color || '#00ff88';

  app.ctx.strokeStyle = categoryColor + '80';
  app.ctx.lineWidth = 2;
  app.ctx.setLineDash([5, 5]);

  if (typeof app.drawOrthogonalTrace === 'function') {
    app.drawOrthogonalTrace(fromX, fromY, toX, toY);
  } else {
    const midX = fromX + (toX - fromX) * 0.7;
    app.ctx.beginPath();
    app.ctx.moveTo(fromX, fromY);
    app.ctx.lineTo(midX, fromY);
    app.ctx.lineTo(midX, toY);
    app.ctx.lineTo(toX, toY);
    app.ctx.stroke();
  }

  app.ctx.setLineDash([]);
}

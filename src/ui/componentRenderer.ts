import { renderComponent } from '../rendering/ImplementationHelpers';
import type { ComponentBase, Camera, Connection } from '../types';

// Minimal App interface used here so we don't depend on the full application
// surface. This keeps the helper focused and easy to test.
interface AppMinimal {
  getCurrentViewConnections: () => Connection[];
  categories: Record<string, { name: string; color: string }>;
  selectedComponent?: ComponentBase | null;
}

export function renderComponentWrapper(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  app: AppMinimal,
  component: ComponentBase
) {
  const connections = app
    .getCurrentViewConnections()
    .filter(conn => conn && conn.from && conn.to)
    .map(connection => {
      const fromPinDef = connection.from.component.pins?.output?.[connection.from.pinIndex];
      const toPinDef = connection.to.component.pins?.input?.[connection.to.pinIndex];

      const fromX = connection.from.x ?? connection.from.component.x + (fromPinDef?.x ?? 0);
      const fromY = connection.from.y ?? connection.from.component.y + (fromPinDef?.y ?? 0);
      const toX = connection.to.x ?? connection.to.component.x + (toPinDef?.x ?? 0);
      const toY = connection.to.y ?? connection.to.component.y + (toPinDef?.y ?? 0);

      return {
        ...connection,
        from: { ...connection.from, x: fromX, y: fromY, component: connection.from.component },
        to: { ...connection.to, x: toX, y: toY, component: connection.to.component },
      } as Connection;
    });

  renderComponent(ctx, { timestamp: performance.now(), camera }, component, {
    camera,
    categories: app.categories,
    selectedComponentId: app.selectedComponent?.id ?? null,
    connections,
  });
}

import { hexToRgb } from '../utils';

export type RenderOptions = {
  camera: any;
  categories: Record<string, { name: string; color: string }>;
  selectedComponentId?: string | null;
  connections?: any[]; // precomputed connections with pin positions and component refs
};

export function renderComponent(
  c: CanvasRenderingContext2D,
  frame: { timestamp: number; camera?: any },
  component: any,
  options: RenderOptions
) {
  const camera = options.camera ?? { x: 0, y: 0, zoom: 1 };
  const selectedComponentId = options.selectedComponentId ?? null;
  const connections = options.connections ?? [];

  const screenX = component.x * camera.zoom + camera.x;
  const screenY = component.y * camera.zoom + camera.y;
  const screenWidth = (component.width ?? 60) * camera.zoom;
  const screenHeight = (component.height ?? 20) * camera.zoom;

  // Component body
  if (component.status === 'defined') {
    c.fillStyle = 'rgba(0, 0, 0, 0.08)';
    c.fillRect(screenX, screenY, screenWidth, screenHeight);
  } else {
    c.fillStyle = 'rgba(0, 0, 0, 0.8)';
    c.fillRect(screenX, screenY, screenWidth, screenHeight);
  }

  // Border
  let borderColor = component.color ?? '#000000';
  let glowIntensity = 0;
  switch (component.status) {
    case 'defined':
      borderColor = '#00ffff';
      glowIntensity = 0;
      break;
    case 'todo':
      borderColor = (component.color ?? '#000000') + '66';
      break;
    case 'in-progress':
      borderColor = '#ff00ff';
      glowIntensity = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
      break;
    case 'done':
      borderColor = '#00ff88';
      glowIntensity = 0.8;
      break;
  }

  c.strokeStyle = borderColor;
  c.lineWidth = 2;
  if (glowIntensity > 0) {
    c.shadowColor = borderColor;
    c.shadowBlur = 15 * glowIntensity;
  }

  if (component.status === 'defined') {
    c.setLineDash([6, 6]);
    c.strokeRect(screenX, screenY, screenWidth, screenHeight);
    c.setLineDash([]);
  } else {
    c.strokeRect(screenX, screenY, screenWidth, screenHeight);
  }
  c.shadowBlur = 0;

  // Selection
  if (selectedComponentId === component.id) {
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.setLineDash([5, 5]);
    c.strokeRect(screenX - 2, screenY - 2, screenWidth + 4, screenHeight + 4);
    c.setLineDash([]);
  }

  // Icon and text
  if (component.status === 'defined') {
    c.fillStyle = 'rgba(200, 255, 255, 0.85)';
    c.font = `${16 * camera.zoom}px monospace italic`;
    c.globalAlpha = 0.85;
  } else {
    c.fillStyle = '#ffffff';
    c.font = `${16 * camera.zoom}px monospace`;
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';

  const centerX = screenX + screenWidth / 2;
  const centerY = screenY + screenHeight / 2;
  c.fillText(component.icon ?? '', centerX, centerY - 5 * camera.zoom);

  if (screenHeight > 40) {
    if (component.status === 'defined') {
      c.font = `${10 * camera.zoom}px monospace italic`;
      c.fillStyle = 'rgba(200, 255, 255, 0.7)';
    } else {
      c.font = `${10 * camera.zoom}px monospace`;
      c.fillStyle = '#ffffff';
    }
    c.fillText(component.title ?? '', centerX, centerY + 15 * camera.zoom);
  }

  // Draw pins
  drawPins(c, component, screenX, screenY, camera, options.categories, connections);

  // Internal particles
  if (component.status === 'in-progress') {
    drawEnergyParticles(c, component, screenX, screenY, screenWidth, screenHeight, camera, options.categories);
  }
}

function drawPins(
  c: CanvasRenderingContext2D,
  component: any,
  screenX: number,
  screenY: number,
  camera: any,
  categories: any,
  connections: any[]
) {
  const pinSize = 4 * camera.zoom;
  const categoryColor = categories[component.category ?? 'frontend']?.color || '#ffaa00';
  const isActive = component.status === 'in-progress' || component.status === 'done';

  c.fillStyle = categoryColor;
  if (isActive) {
    c.shadowColor = categoryColor;
    c.shadowBlur = component.status === 'done' ? 10 * camera.zoom : 6 * camera.zoom;
  } else {
    c.shadowBlur = 3 * camera.zoom;
    c.shadowColor = categoryColor;
  }

  if (component.pins?.input) {
    component.pins.input.forEach((pin: any, index: number) => {
      const pinX = screenX + pin.x * camera.zoom;
      const pinY = screenY + pin.y * camera.zoom;

      const hasActiveInput = connections.some(
        (conn: any) => conn.to.component === component && conn.to.pinIndex === index && (conn.from.component.status === 'in-progress' || conn.from.component.status === 'done')
      );

      if (hasActiveInput) {
        const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.004);
        c.shadowBlur = 10 * camera.zoom * pulseIntensity;
        c.fillRect(pinX - pinSize * 0.6, pinY - pinSize * 0.6, pinSize * 1.2, pinSize * 1.2);
      } else {
        c.fillRect(pinX - pinSize / 2, pinY - pinSize / 2, pinSize, pinSize);
      }
    });
  }

  if (component.pins?.output) {
    component.pins.output.forEach((pin: any, index: number) => {
      const pinX = screenX + pin.x * camera.zoom;
      const pinY = screenY + pin.y * camera.zoom;

      const hasActiveOutput = connections.some(
        (conn: any) => conn.from.component === component && conn.from.pinIndex === index
      ) && isActive;

      if (hasActiveOutput) {
        const pulseIntensity = component.status === 'done' ? 1.0 : 0.6 + 0.4 * Math.sin(Date.now() * 0.003);
        c.shadowBlur = 12 * camera.zoom * pulseIntensity;
        const size = pinSize * (1.1 + 0.05 * Math.sin(Date.now() * 0.005));
        c.fillRect(pinX - size / 2, pinY - size / 2, size, size);
      } else {
        c.fillRect(pinX - pinSize / 2, pinY - pinSize / 2, pinSize, pinSize);
      }
    });
  }

  c.shadowBlur = 0;
}

function drawEnergyParticles(
  c: CanvasRenderingContext2D,
  component: any,
  screenX: number,
  screenY: number,
  screenWidth: number,
  screenHeight: number,
  camera: any,
  categories: any
) {
  const time = Date.now() * 0.0008;
  const particleCount = 3;
  const categoryColor = categories[component.category ?? 'frontend']?.color || '#ff00ff';

  for (let i = 0; i < particleCount; i++) {
    const phase = (time + i * 0.6) % 2;
    let x: number, y: number, alpha: number;

    if (phase < 1.2) {
      const progress = phase / 1.2;
      const smoothProgress = progress * progress * (3 - 2 * progress);
      x = screenX + screenWidth * smoothProgress;
      y = screenY + screenHeight / 2 + Math.sin(time * 2 + i) * 2;
      alpha = 0.8 - progress * 0.2;
    } else {
      const p = (phase - 1.2) / 0.8;
      x = screenX + screenWidth * (1 - p);
      y = screenY + screenHeight / 2 + Math.sin(time * 2 + i) * 2;
      alpha = 0.4 * (1 - p);
    }

    c.fillStyle = `rgba(${hexToRgb(categoryColor)}, ${alpha})`;
    c.shadowColor = categoryColor;
    c.shadowBlur = 6 * camera.zoom * alpha;

    c.beginPath();
    c.arc(x, y, 2 * camera.zoom, 0, Math.PI * 2);
    c.fill();
  }
}

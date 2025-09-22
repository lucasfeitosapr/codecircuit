import type { RenderFrame } from '../LayeredRenderer';
import type { ComponentBase, Connection, PinHit } from '../../types';

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  componentId: string;
  type: 'single' | 'multi' | 'hover';
  timestamp: number;
}

export interface GuideLine {
  id: string;
  type: 'horizontal' | 'vertical' | 'diagonal';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  opacity: number;
  dashed?: boolean;
  label?: string;
}

export interface UIOverlay {
  id: string;
  type: 'tooltip' | 'context-menu' | 'datasheet' | 'connection-hint';
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  visible: boolean;
  timestamp: number;
}

export interface ConnectionIntent {
  startPin: PinHit;
  endPin?: PinHit;
  isValid: boolean;
  category: string;
  timestamp: number;
}

export default class UILayer {
  static name = 'ui';
  name = UILayer.name;
  
  private selectionBoxes: Map<string, SelectionBox> = new Map();
  private guideLines: Map<string, GuideLine> = new Map();
  private uiOverlays: Map<string, UIOverlay> = new Map();
  private connectionIntents: Map<string, ConnectionIntent> = new Map();
  
  private selectionIdCounter = 0;
  private guideIdCounter = 0;
  private overlayIdCounter = 0;
  private intentIdCounter = 0;

  render(ctx: CanvasRenderingContext2D, frame: RenderFrame) {
    try {
      const timestamp = frame.timestamp || performance.now();
      
      // Clean up old UI elements
      this.cleanupOldElements(timestamp);
      
      // Render UI elements in order of visual priority
      this.renderGuideLines(ctx, frame);
      this.renderConnectionIntents(ctx, frame);
      this.renderSelectionBoxes(ctx, frame);
      this.renderUIOverlays(ctx, frame);
    } catch (error) {
      // Graceful error handling
      console.error('UILayer render failed:', error);
    }
  }

  // Selection Management
  addSelectionBox(component: ComponentBase, type: SelectionBox['type'] = 'single'): string {
    const id = `selection_${++this.selectionIdCounter}_${Date.now()}`;
    const selectionBox: SelectionBox = {
      x: component.x,
      y: component.y,
      width: component.width,
      height: component.height,
      componentId: component.id,
      type,
      timestamp: performance.now()
    };
    
    this.selectionBoxes.set(id, selectionBox);
    return id;
  }

  updateSelectionBox(id: string, component: ComponentBase): void {
    const selectionBox = this.selectionBoxes.get(id);
    if (selectionBox) {
      selectionBox.x = component.x;
      selectionBox.y = component.y;
      selectionBox.width = component.width;
      selectionBox.height = component.height;
      selectionBox.timestamp = performance.now();
    }
  }

  removeSelectionBox(id: string): boolean {
    return this.selectionBoxes.delete(id);
  }

  clearSelectionBoxes(): void {
    this.selectionBoxes.clear();
  }

  // Guide Line Management
  addGuideLine(guide: Omit<GuideLine, 'id'>): string {
    const id = `guide_${++this.guideIdCounter}_${Date.now()}`;
    const fullGuide: GuideLine = { ...guide, id };
    
    this.guideLines.set(id, fullGuide);
    return id;
  }

  removeGuideLine(id: string): boolean {
    return this.guideLines.delete(id);
  }

  clearGuideLines(): void {
    this.guideLines.clear();
  }

  // Smart guide lines for component alignment
  addAlignmentGuides(component: ComponentBase, allComponents: ComponentBase[]): string[] {
    const guideIds: string[] = [];
    const tolerance = 5; // pixels
    
    for (const other of allComponents) {
      if (other.id === component.id) continue;
      
      // Horizontal alignment guides
      if (Math.abs(component.y - other.y) < tolerance) {
        guideIds.push(this.addGuideLine({
          type: 'horizontal',
          startX: Math.min(component.x, other.x) - 20,
          startY: component.y,
          endX: Math.max(component.x + component.width, other.x + other.width) + 20,
          endY: component.y,
          color: '#00ff88',
          opacity: 0.6,
          dashed: true,
          label: 'Align top'
        }));
      }
      
      if (Math.abs(component.y + component.height - (other.y + other.height)) < tolerance) {
        guideIds.push(this.addGuideLine({
          type: 'horizontal',
          startX: Math.min(component.x, other.x) - 20,
          startY: component.y + component.height,
          endX: Math.max(component.x + component.width, other.x + other.width) + 20,
          endY: component.y + component.height,
          color: '#00ff88',
          opacity: 0.6,
          dashed: true,
          label: 'Align bottom'
        }));
      }
      
      // Vertical alignment guides
      if (Math.abs(component.x - other.x) < tolerance) {
        guideIds.push(this.addGuideLine({
          type: 'vertical',
          startX: component.x,
          startY: Math.min(component.y, other.y) - 20,
          endX: component.x,
          endY: Math.max(component.y + component.height, other.y + other.height) + 20,
          color: '#00ff88',
          opacity: 0.6,
          dashed: true,
          label: 'Align left'
        }));
      }
      
      if (Math.abs(component.x + component.width - (other.x + other.width)) < tolerance) {
        guideIds.push(this.addGuideLine({
          type: 'vertical',
          startX: component.x + component.width,
          startY: Math.min(component.y, other.y) - 20,
          endX: component.x + component.width,
          endY: Math.max(component.y + component.height, other.y + other.height) + 20,
          color: '#00ff88',
          opacity: 0.6,
          dashed: true,
          label: 'Align right'
        }));
      }
      
      // Center alignment guides
      const componentCenterX = component.x + component.width / 2;
      const componentCenterY = component.y + component.height / 2;
      const otherCenterX = other.x + other.width / 2;
      const otherCenterY = other.y + other.height / 2;
      
      if (Math.abs(componentCenterX - otherCenterX) < tolerance) {
        guideIds.push(this.addGuideLine({
          type: 'vertical',
          startX: componentCenterX,
          startY: Math.min(component.y, other.y) - 20,
          endX: componentCenterX,
          endY: Math.max(component.y + component.height, other.y + other.height) + 20,
          color: '#ffaa00',
          opacity: 0.8,
          dashed: true,
          label: 'Center align'
        }));
      }
      
      if (Math.abs(componentCenterY - otherCenterY) < tolerance) {
        guideIds.push(this.addGuideLine({
          type: 'horizontal',
          startX: Math.min(component.x, other.x) - 20,
          startY: componentCenterY,
          endX: Math.max(component.x + component.width, other.x + other.width) + 20,
          endY: componentCenterY,
          color: '#ffaa00',
          opacity: 0.8,
          dashed: true,
          label: 'Center align'
        }));
      }
    }
    
    return guideIds;
  }

  // UI Overlay Management
  addUIOverlay(overlay: Omit<UIOverlay, 'id' | 'timestamp'>): string {
    const id = `overlay_${++this.overlayIdCounter}_${Date.now()}`;
    const fullOverlay: UIOverlay = {
      ...overlay,
      id,
      timestamp: performance.now()
    };
    
    this.uiOverlays.set(id, fullOverlay);
    return id;
  }

  updateUIOverlay(id: string, updates: Partial<UIOverlay>): void {
    const overlay = this.uiOverlays.get(id);
    if (overlay) {
      Object.assign(overlay, updates);
      overlay.timestamp = performance.now();
    }
  }

  removeUIOverlay(id: string): boolean {
    return this.uiOverlays.delete(id);
  }

  clearUIOverlays(): void {
    this.uiOverlays.clear();
  }

  // Connection Intent Management
  addConnectionIntent(intent: Omit<ConnectionIntent, 'timestamp'>): string {
    const id = `intent_${++this.intentIdCounter}_${Date.now()}`;
    const fullIntent: ConnectionIntent = {
      ...intent,
      timestamp: performance.now()
    };
    
    this.connectionIntents.set(id, fullIntent);
    return id;
  }

  updateConnectionIntent(id: string, updates: Partial<ConnectionIntent>): void {
    const intent = this.connectionIntents.get(id);
    if (intent) {
      Object.assign(intent, updates);
      intent.timestamp = performance.now();
    }
  }

  removeConnectionIntent(id: string): boolean {
    return this.connectionIntents.delete(id);
  }

  clearConnectionIntents(): void {
    this.connectionIntents.clear();
  }

  // Rendering Methods
  private renderSelectionBoxes(ctx: CanvasRenderingContext2D, frame: RenderFrame): void {
    for (const selectionBox of this.selectionBoxes.values()) {
      this.renderSelectionBox(ctx, selectionBox, frame);
    }
  }

  private renderSelectionBox(ctx: CanvasRenderingContext2D, selectionBox: SelectionBox, frame: RenderFrame): void {
    const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
    const x = selectionBox.x * camera.zoom + camera.x;
    const y = selectionBox.y * camera.zoom + camera.y;
    const width = selectionBox.width * camera.zoom;
    const height = selectionBox.height * camera.zoom;
    
    ctx.save();
    
    // Selection box style based on type
    switch (selectionBox.type) {
      case 'single':
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;
        break;
      case 'multi':
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 8;
        ctx.setLineDash([5, 5]);
        break;
      case 'hover':
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash([3, 3]);
        break;
    }
    
    // Draw selection box
    ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
    
    // Draw corner handles for single selection
    if (selectionBox.type === 'single') {
      this.renderSelectionHandles(ctx, x, y, width, height);
    }
    
    ctx.restore();
  }

  private renderSelectionHandles(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    const handleSize = 8;
    const handles = [
      { x: x - handleSize/2, y: y - handleSize/2 }, // top-left
      { x: x + width - handleSize/2, y: y - handleSize/2 }, // top-right
      { x: x - handleSize/2, y: y + height - handleSize/2 }, // bottom-left
      { x: x + width - handleSize/2, y: y + height - handleSize/2 }, // bottom-right
      { x: x + width/2 - handleSize/2, y: y - handleSize/2 }, // top-center
      { x: x + width/2 - handleSize/2, y: y + height - handleSize/2 }, // bottom-center
      { x: x - handleSize/2, y: y + height/2 - handleSize/2 }, // left-center
      { x: x + width - handleSize/2, y: y + height/2 - handleSize/2 }, // right-center
    ];
    
    ctx.fillStyle = '#00ff88';
    ctx.shadowBlur = 4;
    
    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
    });
  }

  private renderGuideLines(ctx: CanvasRenderingContext2D, frame: RenderFrame): void {
    for (const guide of this.guideLines.values()) {
      this.renderGuideLine(ctx, guide, frame);
    }
  }

  private renderGuideLine(ctx: CanvasRenderingContext2D, guide: GuideLine, frame: RenderFrame): void {
    const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
    const startX = guide.startX * camera.zoom + camera.x;
    const startY = guide.startY * camera.zoom + camera.y;
    const endX = guide.endX * camera.zoom + camera.x;
    const endY = guide.endY * camera.zoom + camera.y;
    
    ctx.save();
    ctx.strokeStyle = guide.color;
    ctx.globalAlpha = guide.opacity;
    ctx.lineWidth = 1;
    
    if (guide.dashed) {
      ctx.setLineDash([5, 5]);
    }
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw label if provided
    if (guide.label) {
      ctx.fillStyle = guide.color;
      ctx.font = '12px monospace';
      ctx.fillText(guide.label, startX + 5, startY - 5);
    }
    
    ctx.restore();
  }

  private renderUIOverlays(ctx: CanvasRenderingContext2D, frame: RenderFrame): void {
    for (const overlay of this.uiOverlays.values()) {
      if (overlay.visible) {
        this.renderUIOverlay(ctx, overlay, frame);
      }
    }
  }

  private renderUIOverlay(ctx: CanvasRenderingContext2D, overlay: UIOverlay, frame: RenderFrame): void {
    const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
    const x = overlay.x * camera.zoom + camera.x;
    const y = overlay.y * camera.zoom + camera.y;
    const width = overlay.width * camera.zoom;
    const height = overlay.height * camera.zoom;
    
    ctx.save();
    
    switch (overlay.type) {
      case 'tooltip':
        this.renderTooltip(ctx, x, y, width, height, overlay.content);
        break;
      case 'context-menu':
        this.renderContextMenu(ctx, x, y, width, height, overlay.content);
        break;
      case 'datasheet':
        this.renderDatasheetOverlay(ctx, x, y, width, height, overlay.content);
        break;
      case 'connection-hint':
        this.renderConnectionHint(ctx, x, y, width, height, overlay.content);
        break;
    }
    
    ctx.restore();
  }

  private renderTooltip(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, content: string): void {
    // Tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    
    // Tooltip text
    ctx.fillStyle = '#00ff88';
    ctx.font = '12px monospace';
    ctx.fillText(content, x + 8, y + 16);
  }

  private renderContextMenu(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, content: string): void {
    // Context menu background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    
    // Context menu items
    const items = content.split('\n');
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px monospace';
    
    items.forEach((item, index) => {
      ctx.fillText(item, x + 8, y + 20 + (index * 20));
    });
  }

  private renderDatasheetOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, content: string): void {
    // Datasheet background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 2;
    
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    
    // Datasheet content
    ctx.fillStyle = '#ffaa00';
    ctx.font = '14px monospace';
    
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      ctx.fillText(line, x + 8, y + 20 + (index * 18));
    });
  }

  private renderConnectionHint(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, content: string): void {
    // Connection hint background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    
    // Connection hint text
    ctx.fillStyle = '#00ffff';
    ctx.font = '12px monospace';
    ctx.fillText(content, x + 8, y + 16);
  }

  private renderConnectionIntents(ctx: CanvasRenderingContext2D, frame: RenderFrame): void {
    for (const intent of this.connectionIntents.values()) {
      this.renderConnectionIntent(ctx, intent, frame);
    }
  }

  private renderConnectionIntent(ctx: CanvasRenderingContext2D, intent: ConnectionIntent, frame: RenderFrame): void {
    const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
    const startX = intent.startPin.x * camera.zoom + camera.x;
    const startY = intent.startPin.y * camera.zoom + camera.y;
    
    ctx.save();
    
    // Connection intent line
    if (intent.endPin) {
      const endX = intent.endPin.x * camera.zoom + camera.x;
      const endY = intent.endPin.y * camera.zoom + camera.y;
      
      ctx.strokeStyle = intent.isValid ? '#00ff88' : '#ff4444';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([8, 4]);
      
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
    
    // Start pin highlight
    ctx.fillStyle = intent.isValid ? '#00ff88' : '#ff4444';
    ctx.shadowColor = intent.isValid ? '#00ff88' : '#ff4444';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.arc(startX, startY, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

  private cleanupOldElements(timestamp: number): void {
    const maxAge = 5000; // 5 seconds
    
    // Clean up old selection boxes (except single type)
    for (const [id, selectionBox] of this.selectionBoxes) {
      if (selectionBox.type !== 'single' && timestamp - selectionBox.timestamp > maxAge) {
        this.selectionBoxes.delete(id);
      }
    }
    
    // Clean up old guide lines
    for (const [id, guide] of this.guideLines) {
      if (timestamp - (guide as any).timestamp > maxAge) {
        this.guideLines.delete(id);
      }
    }
    
    // Clean up old UI overlays
    for (const [id, overlay] of this.uiOverlays) {
      if (timestamp - overlay.timestamp > maxAge) {
        this.uiOverlays.delete(id);
      }
    }
    
    // Clean up old connection intents
    for (const [id, intent] of this.connectionIntents) {
      if (timestamp - intent.timestamp > maxAge) {
        this.connectionIntents.delete(id);
      }
    }
  }
}

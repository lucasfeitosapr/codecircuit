// DecisionPointPlugin.ts - Diamond-shaped conditional logic component
// Part of Phase 7A: Core Extended Components

import { PluginDescriptor, RenderFrame } from '../ComponentSystem';
import { ComponentBase, PinDef } from '../../types';

export interface DecisionPointComponent extends ComponentBase {
  type: 'decision-point';
  // Decision-specific properties
  condition?: string;           // The condition being evaluated
  trueLabel?: string;          // Label for TRUE/SUCCESS output
  falseLabel?: string;         // Label for FALSE/FAILURE output
  lastResult?: boolean;        // Last evaluation result (for visualization)
  evaluationCount?: number;    // How many times evaluated (for analytics)
}

/**
 * Creates a Decision Point component with diamond shape
 * Represents conditional branching in business logic flow
 */
export function createDecisionPoint(config: {
  x: number;
  y: number;
  id?: string;
  condition?: string;
  trueLabel?: string;
  falseLabel?: string;
}): DecisionPointComponent {
  const size = 60; // Diamond size
  
  return {
    id: config.id || `decision_${Date.now()}`,
    type: 'decision-point',
    x: config.x,
    y: config.y,
    width: size,
    height: size,
    title: config.condition || 'Decision Point',
    condition: config.condition || 'condition?',
    trueLabel: config.trueLabel || 'TRUE',
    falseLabel: config.falseLabel || 'FALSE',
    color: '#4ECDC4', // Teal color for decision points
    status: 'defined',
    lastResult: undefined,
    evaluationCount: 0,
    
    // Pin configuration: 1 input, 2 outputs
    pins: {
      input: [{
        x: 30,           // Top center input
        y: 0,
        type: 'input',
        label: 'condition'
      }],
      output: [
        {
          x: 60,    // Right output (TRUE/SUCCESS)
          y: 30,
          type: 'success',
          label: config.trueLabel || 'TRUE'
        },
        {
          x: 0,   // Left output (FALSE/FAILURE)
          y: 30,
          type: 'failure', 
          label: config.falseLabel || 'FALSE'
        }
      ]
    }
  };
}

/**
 * Renders a diamond-shaped decision point with conditional indicators
 */
export function renderDecisionPoint(
  ctx: CanvasRenderingContext2D | WebGLRenderingContext, 
  frame: RenderFrame, 
  component?: DecisionPointComponent
): void {
  if (!component) {
    return;
  }
  
  // Check if we're in a test environment or have a valid canvas context
  const isCanvas = ctx && (
    typeof CanvasRenderingContext2D !== 'undefined' && ctx instanceof CanvasRenderingContext2D ||
    ctx.constructor?.name === 'CanvasRenderingContext2D' ||
    'fillRect' in ctx // Duck typing for test mocks
  );
  
  if (!isCanvas) {
    return; // Skip WebGL or invalid context
  }
  
  // Cast to 2D context after validation
  const canvasCtx = ctx as CanvasRenderingContext2D;
  const { x, y, width, height, title, lastResult, color, status } = component;
  const size = Math.min(width, height);
  
  // Apply camera transformation if available
  const camera = frame.camera || { x: 0, y: 0, zoom: 1 };
  const screenX = x * camera.zoom + camera.x;
  const screenY = y * camera.zoom + camera.y;
  const screenSize = size * camera.zoom;
  
  canvasCtx.save();
  canvasCtx.translate(screenX + screenSize/2, screenY + screenSize/2);
  
  // Diamond shape path
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, -screenSize/2);        // Top
  canvasCtx.lineTo(screenSize/2, 0);         // Right
  canvasCtx.lineTo(0, screenSize/2);         // Bottom
  canvasCtx.lineTo(-screenSize/2, 0);        // Left
  canvasCtx.closePath();
  
  // Fill with component color based on status
  let fillColor = color || '#4ECDC4';
  if (status === 'defined') {
    canvasCtx.fillStyle = 'rgba(78, 205, 196, 0.3)'; // Semi-transparent for defined
  } else {
    canvasCtx.fillStyle = fillColor;
  }
  canvasCtx.fill();
  
  // Border with status-based coloring
  canvasCtx.lineWidth = 2;
  let borderColor = '#34495E'; // Default dark border
  let glowIntensity = 0;
  
  switch (status) {
    case 'defined':
      borderColor = '#00ffff';
      break;
    case 'todo':
      borderColor = fillColor + '66'; // Semi-transparent
      break;
    case 'in-progress':
      borderColor = '#ff00ff';
      glowIntensity = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
      break;
    case 'done':
      borderColor = '#00ff88';
      glowIntensity = 0.8;
      break;
    default:
      if (lastResult === true) {
        borderColor = '#2ECC71'; // Green for TRUE result
      } else if (lastResult === false) {
        borderColor = '#E74C3C'; // Red for FALSE result
      }
  }
  
  if (glowIntensity > 0) {
    canvasCtx.shadowColor = borderColor;
    canvasCtx.shadowBlur = 15 * glowIntensity * camera.zoom;
  }
  
  canvasCtx.strokeStyle = borderColor;
  canvasCtx.stroke();
  canvasCtx.shadowBlur = 0;
  
  // Decision symbol (diamond with question mark)
  canvasCtx.fillStyle = '#2C3E50';
  canvasCtx.font = `bold ${16 * camera.zoom}px Arial`;
  canvasCtx.textAlign = 'center';
  canvasCtx.textBaseline = 'middle';
  canvasCtx.fillText('◆', 0, 0);
  
  // Title above diamond
  if (title && screenSize > 30) {
    canvasCtx.fillStyle = '#2C3E50';
    canvasCtx.font = `${12 * camera.zoom}px Arial`;
    canvasCtx.textAlign = 'center';
    canvasCtx.textBaseline = 'bottom';
    canvasCtx.fillText(title, 0, -screenSize/2 - 8 * camera.zoom);
  }
  
  // Render input and output pins
  renderDecisionPointPins(canvasCtx, component, screenSize, camera.zoom);

  // Output indicators (only if there's enough space)
  if (screenSize > 40) {
    renderOutputIndicators(canvasCtx, component, screenSize, camera.zoom);
  }

  // Status indicator at bottom of diamond
  if (status) {
    const statusColors: Record<string, string> = {
      'defined': '#95A5A6',     // Gray
      'todo': '#3498DB',        // Blue  
      'in-progress': '#F39C12', // Orange
      'done': '#2ECC71'         // Green
    };
    
    canvasCtx.fillStyle = statusColors[status] || '#95A5A6';
    canvasCtx.beginPath();
    canvasCtx.arc(0, screenSize/2 + 8 * camera.zoom, 4 * camera.zoom, 0, Math.PI * 2);
    canvasCtx.fill();
  }
  
  canvasCtx.restore();
}

/**
 * Renders input and output pins for the Decision Point
 * Called within a transformed context where origin is at diamond center
 */
function renderDecisionPointPins(ctx: CanvasRenderingContext2D, component: DecisionPointComponent, screenSize: number, zoom: number = 1): void {
  const pinSize = 4 * zoom;
  const pinColor = '#4ECDC4'; // Teal color matching the Decision Point
  const originalSize = screenSize / zoom; // Get original component size
  
  ctx.fillStyle = pinColor;
  ctx.shadowColor = pinColor;
  ctx.shadowBlur = 6 * zoom;
  
  // Input pin at top (center) - coordinates relative to diamond center
  if (component.pins?.input?.[0]) {
    const inputPin = component.pins.input[0];
    // Convert from component coordinates to centered coordinates
    const pinX = (inputPin.x - originalSize/2) * zoom;
    const pinY = (inputPin.y - originalSize/2) * zoom;
    
    ctx.beginPath();
    ctx.arc(pinX, pinY, pinSize, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Output pins at left and right - coordinates relative to diamond center
  if (component.pins?.output) {
    component.pins.output.forEach((pin, index) => {
      // Convert from component coordinates to centered coordinates
      const pinX = (pin.x - originalSize/2) * zoom;
      const pinY = (pin.y - originalSize/2) * zoom;
      
      ctx.beginPath();
      ctx.arc(pinX, pinY, pinSize, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  ctx.shadowBlur = 0;
}

/**
 * Renders TRUE/FALSE output indicators with color coding
 */
function renderOutputIndicators(ctx: CanvasRenderingContext2D, component: DecisionPointComponent, size: number, zoom: number = 1): void {
  ctx.font = `${10 * zoom}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // TRUE output (right side)
  ctx.fillStyle = '#2ECC71'; // Green
  ctx.fillText(component.trueLabel || 'TRUE', size/2 + 15 * zoom, -8 * zoom);
  
  // FALSE output (left side) 
  ctx.fillStyle = '#E74C3C'; // Red
  ctx.fillText(component.falseLabel || 'FALSE', -size/2 - 15 * zoom, -8 * zoom);
  
  // Small arrows pointing to outputs
  ctx.strokeStyle = '#7F8C8D';
  ctx.lineWidth = 1 * zoom;
  
  // Right arrow (TRUE)
  ctx.beginPath();
  ctx.moveTo(size/2 + 5 * zoom, -3 * zoom);
  ctx.lineTo(size/2 + 10 * zoom, 0);
  ctx.lineTo(size/2 + 5 * zoom, 3 * zoom);
  ctx.stroke();
  
  // Left arrow (FALSE)
  ctx.beginPath();
  ctx.moveTo(-size/2 - 5 * zoom, -3 * zoom);
  ctx.lineTo(-size/2 - 10 * zoom, 0);
  ctx.lineTo(-size/2 - 5 * zoom, 3 * zoom);
  ctx.stroke();
}



/**
 * Evaluates the decision point condition
 * In a real system, this would connect to actual business logic
 */
export function evaluateDecisionPoint(
  component: any, 
  emit: (event: string, payload?: any) => void
): void {
  if (!component || component.type !== 'decision-point') {
    return;
  }
  
  const decisionComponent = component as DecisionPointComponent;
  // Simulate decision evaluation
  // In real implementation, this would evaluate the actual condition
  const result = Math.random() > 0.5; // Mock evaluation
  
  // Update component state
  decisionComponent.lastResult = result;
  decisionComponent.evaluationCount = (decisionComponent.evaluationCount || 0) + 1;
  
  // Emit evaluation event for analytics/monitoring
  emit('decision.evaluated', {
    componentId: decisionComponent.id,
    condition: decisionComponent.condition,
    result,
    timestamp: Date.now(),
    evaluationCount: decisionComponent.evaluationCount
  });
}

/**
 * Decision Point Plugin Descriptor
 */
export const DecisionPointPlugin: PluginDescriptor = {
  id: 'decision-point',
  displayName: 'Decision Point ◆',
  render: (ctx, frame, model) => renderDecisionPoint(ctx, frame, model as DecisionPointComponent),
  evaluate: evaluateDecisionPoint,
  serialize: (component: DecisionPointComponent) => ({
    ...component,
    // Remove runtime-only properties for serialization
    lastResult: undefined
  }),
  deserialize: (data: any): DecisionPointComponent => ({
    ...data,
    type: 'decision-point',
    lastResult: undefined,
    evaluationCount: 0
  })
};
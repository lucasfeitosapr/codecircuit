import { EventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import { Connection, PinHit, ComponentBase, ViewState } from '../types.d';

/**
 * ConnectionManager - Handles all connection-related logic
 * 
 * Extracted from MotherboardApp to manage:
 * - Connection creation and validation
 * - Pin hit detection and interaction
 * - Connection state management
 * - Connection visual effects coordination
 * - View-specific connection management
 * 
 * Part of Phase 5 refactoring - Living Blueprint & Legacy Code Elimination
 */

export interface ConnectionCreatedPayload {
  connection: Connection;
  from: PinHit;
  to: PinHit;
  category: string;
  timestamp: number;
}

export interface ConnectionValidationPayload {
  startPin: PinHit;
  endPin: PinHit;
  isValid: boolean;
  reason?: string;
  timestamp: number;
}

export interface ConnectionStateChangedPayload {
  connectionId: string;
  oldState: string;
  newState: string;
  timestamp: number;
}

export interface PinInteractionPayload {
  pin: PinHit;
  action: 'hover' | 'click' | 'connect';
  isValid?: boolean;
  timestamp: number;
}

export class ConnectionManager {
  private eventBus: EventBus;
  private connections: Connection[] = [];
  private connectionStart: PinHit | null = null;
  private isConnecting: boolean = false;
  private categories: Record<string, { name: string; color: string }>;

  constructor(eventBus: EventBus, categories: Record<string, { name: string; color: string }>) {
    this.eventBus = eventBus;
    this.categories = categories;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Listen for connection requests from UI interactions
    this.eventBus.on(Events.CONNECTION_START_REQUESTED, (payload: any) => {
      this.startConnection(payload.pin);
    });

    this.eventBus.on(Events.CONNECTION_END_REQUESTED, (payload: any) => {
      this.endConnection(payload.pin);
    });

    this.eventBus.on(Events.CONNECTION_CANCEL_REQUESTED, () => {
      this.cancelConnection();
    });

    // Listen for component updates that might affect connections
    this.eventBus.on(Events.ComponentUpdated, (payload: any) => {
      this.handleComponentUpdate(payload);
    });

    this.eventBus.on(Events.ComponentDeleted, (payload: any) => {
      this.handleComponentDeleted(payload.id);
    });
  }

  /**
   * Get pin at specific coordinates with hit detection
   */
  getPinAt(x: number, y: number, components: ComponentBase[]): PinHit | null {
    const pinRadius = 8; // Hit detection radius

    for (const component of components) {
      // Check input pins
      if (component.pins.input) {
        for (let i = 0; i < component.pins.input.length; i++) {
          const pin = component.pins.input[i];
          const pinX = component.x + pin.x;
          const pinY = component.y + pin.y;
          const distance = Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2);

          if (distance < pinRadius) {
            const pinHit: PinHit = {
              component: component,
              pinType: 'input',
              pinIndex: i,
              x: pinX,
              y: pinY,
              category: component.category || 'frontend',
            };
            
            // Emit pin interaction event
            this.eventBus.emit('pin.interaction', {
              pin: pinHit,
              action: 'hover',
              timestamp: Date.now()
            } as PinInteractionPayload);
            
            return pinHit;
          }
        }
      }

      // Check output pins
      if (component.pins.output) {
        for (let i = 0; i < component.pins.output.length; i++) {
          const pin = component.pins.output[i];
          const pinX = component.x + pin.x;
          const pinY = component.y + pin.y;
          const distance = Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2);

          if (distance < pinRadius) {
            const pinHit: PinHit = {
              component: component,
              pinType: 'output',
              pinIndex: i,
              x: pinX,
              y: pinY,
              category: component.category || 'frontend',
            };
            
            // Emit pin interaction event
            this.eventBus.emit('pin.interaction', {
              pin: pinHit,
              action: 'hover',
              timestamp: Date.now()
            } as PinInteractionPayload);
            
            return pinHit;
          }
        }
      }
    }
    return null;
  }

  /**
   * Start a new connection from a pin
   */
  startConnection(pin: PinHit): void {
    this.connectionStart = pin;
    this.isConnecting = true;

    // Emit pin interaction event
    this.eventBus.emit('pin.interaction', {
      pin,
      action: 'connect',
      timestamp: Date.now()
    } as PinInteractionPayload);

    // Emit connection start event
    this.eventBus.emit('connection.start', {
      pin,
      timestamp: Date.now()
    });
  }

  /**
   * End connection at target pin
   */
  endConnection(pin: PinHit): boolean {
    if (!this.isConnecting || !this.connectionStart) {
      return false;
    }

    const validation = this.validateConnection(this.connectionStart, pin);
    
    // Emit validation event
    this.eventBus.emit('connection.validation', validation);

    if (!validation.isValid) {
      this.cancelConnection();
      return false;
    }

    const connection = this.createConnection(this.connectionStart, pin);
    if (connection) {
      // Emit connection created event
      this.eventBus.emit(Events.ConnectionCreated, {
        connection,
        from: this.connectionStart,
        to: pin,
        category: connection.category,
        timestamp: Date.now()
      } as ConnectionCreatedPayload);

      this.resetConnectionState();
      return true;
    }

    this.cancelConnection();
    return false;
  }

  /**
   * Cancel current connection attempt
   */
  cancelConnection(): void {
    if (this.isConnecting) {
      this.eventBus.emit('connection.cancelled', {
        startPin: this.connectionStart,
        timestamp: Date.now()
      });
    }
    
    this.resetConnectionState();
  }

  private resetConnectionState(): void {
    this.connectionStart = null;
    this.isConnecting = false;
  }

  /**
   * Validate if a connection between two pins is allowed
   */
  validateConnection(startPin: PinHit, endPin: PinHit): ConnectionValidationPayload {
    const timestamp = Date.now();

    // Cannot connect to the same component
    if (startPin.component === endPin.component) {
      return {
        startPin,
        endPin,
        isValid: false,
        reason: 'Cannot connect to the same component',
        timestamp
      };
    }

    // Cannot connect pins of the same type
    if (startPin.pinType === endPin.pinType) {
      return {
        startPin,
        endPin,
        isValid: false,
        reason: 'Cannot connect pins of the same type',
        timestamp
      };
    }

    // Check for existing connection
    const existingConnection = this.findConnection(startPin, endPin);
    if (existingConnection) {
      return {
        startPin,
        endPin,
        isValid: false,
        reason: 'Connection already exists',
        timestamp
      };
    }

    return {
      startPin,
      endPin,
      isValid: true,
      timestamp
    };
  }

  /**
   * Create a new connection between pins
   */
  createConnection(startPin: PinHit, endPin: PinHit): Connection | null {
    const validation = this.validateConnection(startPin, endPin);
    if (!validation.isValid) {
      return null;
    }

    // Ensure output to input connection
    let outputPin: PinHit, inputPin: PinHit;
    if (startPin.pinType === 'output') {
      outputPin = startPin;
      inputPin = endPin;
    } else {
      outputPin = endPin;
      inputPin = startPin;
    }

    const connection: Connection = {
      id: this.generateId(),
      from: outputPin,
      to: inputPin,
      category: outputPin.category ?? 'frontend',
      createdAt: new Date(),
    };

    this.connections.push(connection);
    return connection;
  }

  /**
   * Find existing connection between two pins
   */
  findConnection(startPin: PinHit, endPin: PinHit): Connection | null {
    // Normalize to output->input order
    let outputPin: PinHit, inputPin: PinHit;
    if (startPin.pinType === 'output') {
      outputPin = startPin;
      inputPin = endPin;
    } else {
      outputPin = endPin;
      inputPin = startPin;
    }

    return this.connections.find(
      (conn: Connection) =>
        conn.from.component === outputPin.component &&
        conn.from.pinIndex === outputPin.pinIndex &&
        conn.to.component === inputPin.component &&
        conn.to.pinIndex === inputPin.pinIndex
    ) || null;
  }

  /**
   * Remove a connection by ID
   */
  removeConnection(connectionId: string): boolean {
    const index = this.connections.findIndex(conn => conn.id === connectionId);
    if (index === -1) {
      return false;
    }

    const connection = this.connections[index];
    this.connections.splice(index, 1);

    this.eventBus.emit('connection.deleted', {
      connectionId,
      connection,
      timestamp: Date.now()
    });

    return true;
  }

  /**
   * Get all connections for specific components
   */
  getConnectionsForComponent(componentId: string): Connection[] {
    return this.connections.filter(conn => 
      conn.from.component.id === componentId || 
      conn.to.component.id === componentId
    );
  }

  /**
   * Update connections when component changes
   */
  private handleComponentUpdate(payload: any): void {
    const componentId = payload.id;
    const affectedConnections = this.getConnectionsForComponent(componentId);
    
    if (affectedConnections.length > 0) {
      this.eventBus.emit('connections.component_updated', {
        componentId,
        affectedConnections: affectedConnections.map(c => c.id),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Remove connections when component is deleted
   */
  private handleComponentDeleted(componentId: string): void {
    const connectionsToRemove = this.getConnectionsForComponent(componentId);
    
    connectionsToRemove.forEach(connection => {
      this.removeConnection(connection.id);
    });

    if (connectionsToRemove.length > 0) {
      this.eventBus.emit('connections.cleanup', {
        componentId,
        removedConnectionIds: connectionsToRemove.map(c => c.id),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get connection state info for rendering
   */
  getConnectionRenderState(connection: Connection): {
    isActive: boolean;
    isPowered: boolean;
    categoryColor: string;
    fromStatus: string;
    toStatus: string;
  } {
    const fromStatus = connection.from.component.status ?? 'defined';
    const toStatus = connection.to.component.status ?? 'defined';
    const isActive = fromStatus === 'in-progress' || fromStatus === 'done';
    const isPowered = fromStatus === 'done';
    const categoryColor = this.categories[connection.category ?? 'frontend']?.color || '#00ff88';

    return {
      isActive,
      isPowered,
      categoryColor,
      fromStatus,
      toStatus
    };
  }

  /**
   * Check if connection should render as intention (dashed) trace
   */
  shouldRenderAsIntention(connection: Connection): boolean {
    const state = this.getConnectionRenderState(connection);
    
    // Both ends are DEFINED - show intention
    if (state.fromStatus === 'defined' && state.toStatus === 'defined') {
      return true;
    }

    // Source is DEFINED and not active yet - show intention
    if (state.fromStatus === 'defined' && !state.isActive) {
      return true;
    }

    return false;
  }

  /**
   * Manage connections for different views (main/schematic)
   */
  getConnectionsForView(view: ViewState): Connection[] {
    return view.connections || [];
  }

  setConnectionsForView(view: ViewState, connections: Connection[]): void {
    view.connections = connections;
  }

  /**
   * Add connection to view-specific arrays
   */
  addConnectionToView(connection: Connection, view: ViewState, globalConnections?: Connection[]): void {
    const viewConnections = this.getConnectionsForView(view);
    viewConnections.push(connection);

    // Update global connections if on main view
    if (view.type === 'main' && globalConnections && globalConnections !== viewConnections) {
      globalConnections.push(connection);
    }
    
    // Handle schematic view internal connections
    if (view.type === 'schematic' && view.component) {
      if (!view.component.internalConnections) {
        view.component.internalConnections = [];
      }
      if (view.component.internalConnections !== viewConnections) {
        view.component.internalConnections.push(connection);
      }
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): {
    isConnecting: boolean;
    connectionStart: PinHit | null;
  } {
    return {
      isConnecting: this.isConnecting,
      connectionStart: this.connectionStart
    };
  }

  /**
   * Update categories for color management
   */
  updateCategories(categories: Record<string, { name: string; color: string }>): void {
    this.categories = categories;
  }

  /**
   * Get all connections
   */
  getAllConnections(): Connection[] {
    return [...this.connections];
  }

  /**
   * Set connections (for import/restore operations)
   */
  setConnections(connections: Connection[]): void {
    this.connections = [...connections];
    this.eventBus.emit('connections.restored', {
      connectionCount: connections.length,
      timestamp: Date.now()
    });
  }

  /**
   * Clear all connections
   */
  clearAllConnections(): void {
    const count = this.connections.length;
    this.connections = [];
    this.resetConnectionState();
    
    this.eventBus.emit('connections.cleared', {
      clearedCount: count,
      timestamp: Date.now()
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Factory function for creating ConnectionManager instance
export function createConnectionManager(
  eventBus: EventBus, 
  categories: Record<string, { name: string; color: string }>
): ConnectionManager {
  return new ConnectionManager(eventBus, categories);
}
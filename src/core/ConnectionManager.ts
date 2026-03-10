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
    private connectionIndex = new Map<string, Connection>();
    private connectionIdIndex = new Map<string, Connection>();
    private connectionIdToIndex = new Map<string, number>();
    private componentConnections = new Map<string, Set<string>>();
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
                    let pinX = component.x + pin.x;
                    let pinY = component.y + pin.y;

                    // Special handling for Decision Point - match rendering coordinate system
                    if (component.type === 'decision-point') {
                        // Decision Point renders from center, so pin coordinates need adjustment
                        const centerX = component.x + component.width / 2;
                        const centerY = component.y + component.height / 2;
                        pinX = centerX + (pin.x - component.width / 2);
                        pinY = centerY + (pin.y - component.height / 2);
                    }

                    const distance = Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2);

                    if (distance < pinRadius) {
                        const pinHit: PinHit = {
                            component: component,
                            pinType: pin.type || 'input', // Use actual pin type, fallback to 'input'
                            pinIndex: i,
                            x: pinX,
                            y: pinY,
                            category: component.category || 'frontend',
                            isInputPin: true, // Mark that this came from input array
                        };

                        // Emit pin interaction event
                        this.eventBus.emit('pin.interaction', {
                            pin: pinHit,
                            action: 'hover',
                            timestamp: Date.now(),
                        } as PinInteractionPayload);

                        return pinHit;
                    }
                }
            }

            // Check output pins
            if (component.pins.output) {
                for (let i = 0; i < component.pins.output.length; i++) {
                    const pin = component.pins.output[i];
                    let pinX = component.x + pin.x;
                    let pinY = component.y + pin.y;

                    // Special handling for Decision Point - match rendering coordinate system
                    if (component.type === 'decision-point') {
                        // Decision Point renders from center, so pin coordinates need adjustment
                        const centerX = component.x + component.width / 2;
                        const centerY = component.y + component.height / 2;
                        pinX = centerX + (pin.x - component.width / 2);
                        pinY = centerY + (pin.y - component.height / 2);
                    }

                    const distance = Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2);

                    if (distance < pinRadius) {
                        const pinHit: PinHit = {
                            component: component,
                            pinType: pin.type || 'output', // Use actual pin type, fallback to 'output'
                            pinIndex: i,
                            x: pinX,
                            y: pinY,
                            category: component.category || 'frontend',
                            isInputPin: false, // Mark that this came from output array
                        };

                        // Emit pin interaction event
                        this.eventBus.emit('pin.interaction', {
                            pin: pinHit,
                            action: 'hover',
                            timestamp: Date.now(),
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
            timestamp: Date.now(),
        } as PinInteractionPayload);

        // Emit connection start event
        this.eventBus.emit('connection.start', {
            pin,
            timestamp: Date.now(),
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
                timestamp: Date.now(),
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
                timestamp: Date.now(),
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
                timestamp,
            };
        }

        // Check logical pin compatibility (output-to-input connections)
        const startIsOutput = this.isOutputPin(startPin);
        const endIsInput = this.isInputPin(endPin);
        const startIsInput = this.isInputPin(startPin);
        const endIsOutput = this.isOutputPin(endPin);

        // Allow output-to-input connections (including custom types like success/failure to input)
        const isValidConnection = (startIsOutput && endIsInput) || (startIsInput && endIsOutput);

        if (!isValidConnection) {
            return {
                startPin,
                endPin,
                isValid: false,
                reason: 'Can only connect output pins to input pins',
                timestamp,
            };
        }

        // Check for existing connection
        if (this.connectionIndex.has(this.buildConnectionKey(startPin, endPin))) {
            return {
                startPin,
                endPin,
                isValid: false,
                reason: 'Connection already exists',
                timestamp,
            };
        }

        return {
            startPin,
            endPin,
            isValid: true,
            timestamp,
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

        // Ensure output to input connection using proper classification
        let outputPin: PinHit, inputPin: PinHit;
        if (this.isOutputPin(startPin)) {
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

        this.addConnection(connection);
        return connection;
    }

    /**
     * Find existing connection between two pins
     */
    findConnection(startPin: PinHit, endPin: PinHit): Connection | null {
        return this.connectionIndex.get(this.buildConnectionKey(startPin, endPin)) ?? null;
    }

    /**
     * Remove a connection by ID
     */
    removeConnection(connectionId: string): boolean {
        const connection = this.connectionIdIndex.get(connectionId);
        const index = this.connectionIdToIndex.get(connectionId);
        if (!connection || index === undefined) {
            return false;
        }

        const lastIndex = this.connections.length - 1;
        if (index !== lastIndex) {
            const lastConnection = this.connections[lastIndex];
            this.connections[index] = lastConnection;
            this.connectionIdToIndex.set(lastConnection.id, index);
        }
        this.connections.pop();
        this.connectionIdToIndex.delete(connectionId);
        this.connectionIdIndex.delete(connectionId);
        this.connectionIndex.delete(this.buildConnectionKey(connection.from, connection.to));
        this.detachFromComponentSets(connection);

        this.eventBus.emit(Events.ConnectionDeleted, {
            id: connectionId,
            connection,
            timestamp: Date.now(),
        });

        return true;
    }

    /**
     * Get all connections for specific components
     */
    getConnectionsForComponent(componentId: string): Connection[] {
        const connectionIds = this.componentConnections.get(componentId);
        if (!connectionIds) {
            return [];
        }

        return Array.from(connectionIds)
            .map(connectionId => this.connectionIdIndex.get(connectionId))
            .filter((connection): connection is Connection => Boolean(connection));
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
                timestamp: Date.now(),
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
                timestamp: Date.now(),
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
            toStatus,
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
    addConnectionToView(
        connection: Connection,
        view: ViewState,
        globalConnections?: Connection[]
    ): void {
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
            connectionStart: this.connectionStart,
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
        this.rebuildIndexes();
        this.eventBus.emit('connections.restored', {
            connectionCount: connections.length,
            timestamp: Date.now(),
        });
    }

    /**
     * Clear all connections
     */
    clearAllConnections(): void {
        const count = this.connections.length;
        this.connections = [];
        this.connectionIndex.clear();
        this.connectionIdIndex.clear();
        this.connectionIdToIndex.clear();
        this.componentConnections.clear();
        this.resetConnectionState();

        this.eventBus.emit('connections.cleared', {
            clearedCount: count,
            timestamp: Date.now(),
        });
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private addConnection(connection: Connection): void {
        this.connections.push(connection);
        this.indexConnection(connection, this.connections.length - 1);
    }

    private indexConnection(connection: Connection, index: number): void {
        const connectionKey = this.buildConnectionKey(connection.from, connection.to);
        this.connectionIndex.set(connectionKey, connection);
        this.connectionIdIndex.set(connection.id, connection);
        this.connectionIdToIndex.set(connection.id, index);
        this.attachToComponentSets(connection);
    }

    private rebuildIndexes(): void {
        this.connectionIndex.clear();
        this.connectionIdIndex.clear();
        this.connectionIdToIndex.clear();
        this.componentConnections.clear();

        this.connections.forEach((connection, index) => {
            this.indexConnection(connection, index);
        });
    }

    private buildConnectionKey(startPin: PinHit, endPin: PinHit): string {
        const { outputPin, inputPin } = this.normalizePins(startPin, endPin);
        return `${outputPin.component.id}:${outputPin.pinIndex}->${inputPin.component.id}:${inputPin.pinIndex}`;
    }

    private normalizePins(startPin: PinHit, endPin: PinHit): {
        outputPin: PinHit;
        inputPin: PinHit;
    } {
        if (this.isOutputPin(startPin)) {
            return { outputPin: startPin, inputPin: endPin };
        }

        return { outputPin: endPin, inputPin: startPin };
    }

    private attachToComponentSets(connection: Connection): void {
        const fromComponentId = connection.from.component.id;
        const toComponentId = connection.to.component.id;
        this.addConnectionToComponentSet(fromComponentId, connection.id);
        this.addConnectionToComponentSet(toComponentId, connection.id);
    }

    private addConnectionToComponentSet(componentId: string, connectionId: string): void {
        let connectionSet = this.componentConnections.get(componentId);
        if (!connectionSet) {
            connectionSet = new Set();
            this.componentConnections.set(componentId, connectionSet);
        }
        connectionSet.add(connectionId);
    }

    private detachFromComponentSets(connection: Connection): void {
        [connection.from.component.id, connection.to.component.id].forEach(componentId => {
            const connectionSet = this.componentConnections.get(componentId);
            if (!connectionSet) {
                return;
            }

            connectionSet.delete(connection.id);
            if (connectionSet.size === 0) {
                this.componentConnections.delete(componentId);
            }
        });
    }

    /**
     * Check if a pin is logically an input pin (accepts connections)
     */
    private isInputPin(pin: PinHit): boolean {
        // Use the reliable flag set by getPinAt() to determine which array the pin came from
        if (pin.isInputPin !== undefined) {
            return pin.isInputPin;
        }

        // Fallback for older code that doesn't set the flag
        return pin.pinType === 'input';
    }

    /**
     * Check if a pin is logically an output pin (provides connections)
     */
    private isOutputPin(pin: PinHit): boolean {
        // Custom pin types that act as outputs (Decision Point success/failure)
        if (pin.pinType === 'success' || pin.pinType === 'failure') {
            return true;
        }

        // Use the reliable flag set by getPinAt() to determine which array the pin came from
        if (pin.isInputPin !== undefined) {
            return !pin.isInputPin; // Output pins have isInputPin: false
        }

        // Fallback for older code that doesn't set the flag
        return pin.pinType === 'output';
    }
}

// Factory function for creating ConnectionManager instance
export function createConnectionManager(
    eventBus: EventBus,
    categories: Record<string, { name: string; color: string }>
): ConnectionManager {
    return new ConnectionManager(eventBus, categories);
}

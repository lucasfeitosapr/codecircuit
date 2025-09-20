export const Events = {
  ComponentCreated: 'component.created',
  ComponentUpdated: 'component.updated',
  ConnectionCreated: 'connection.created',
  ConnectionUpdated: 'connection.updated',
  CommandDispatched: 'command.dispatched',
  RuntimePulse: 'runtime.pulse',
  SystemError: 'system.error',
} as const;

export type EventName = typeof Events[keyof typeof Events];

export interface ComponentCreatedPayload {
  id: string;
  type: string;
  model: Record<string, any>;
  source?: 'legacy' | 'plugin';
}

export interface ComponentUpdatedPayload {
  id: string;
  changes: Record<string, any>;
  source?: 'legacy' | 'plugin';
}

export interface ConnectionPayload {
  id: string;
  from: string;
  to: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface CommandDispatchedPayload {
  id: string;
  name: string;
  args?: any;
  correlationId?: string;
}

export interface RuntimePulsePayload {
  traceId: string;
  from: string;
  to: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface SystemErrorPayload {
  error: any;
  sourceEvent?: string;
}

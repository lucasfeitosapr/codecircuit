import { eventBus } from '../events/EventBus';
import { Events, CommandDispatchedPayload } from '../events/eventTypes';

export type AppState = {
  components: Record<string, any>;
  connections: Record<string, any>;
  view: any;
};

export class StateManager {
  private state: AppState;

  constructor(initialState?: Partial<AppState>) {
    this.state = {
      components: {},
      connections: {},
      view: {},
      ...initialState,
    } as AppState;
  }

  getState(): AppState {
    return { ...this.state, components: { ...this.state.components }, connections: { ...this.state.connections } };
  }

  async dispatchCommand(name: string, args?: any, correlationId?: string): Promise<void> {
    const payload: CommandDispatchedPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      args,
      correlationId,
    };
    eventBus.emit(Events.CommandDispatched, payload);
  }

  setSnapshot(state: AppState) {
    this.state = state;
  }
}

export const stateManager = new StateManager();

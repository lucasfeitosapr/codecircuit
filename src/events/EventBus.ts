export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export class EventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();
  private emittingSystemError = false;

  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as EventHandler<any>);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<any>);
  }

  once<T = any>(event: string, handler: EventHandler<T>): void {
    const wrapper: EventHandler<T> = payload => {
      try {
        this.off(event, wrapper);
        return handler(payload);
      } catch (err) {
        this.emit('system.error', { error: err, sourceEvent: event });
        throw err;
      }
    };
    this.on(event, wrapper);
  }

  emit<T = any>(event: string, payload?: T): void {
    const list = this.handlers.get(event);
    if (!list || list.size === 0) return;

    for (const handler of Array.from(list)) {
      try {
        const res = handler(payload as T);
        if (res instanceof Promise) {
          res.catch(err => this.handleHandlerError(err, event));
        }
      } catch (err) {
        this.handleHandlerError(err, event);
      }
    }
  }

  private handleHandlerError(err: any, event: string) {
    try {
      if (this.emittingSystemError) {
        console.error('EventBus handler error while handling system.error:', err);
        return;
      }
      this.emittingSystemError = true;
      this.emit('system.error', { error: err, sourceEvent: event });
    } finally {
      this.emittingSystemError = false;
    }
  }
}

export const eventBus = new EventBus();

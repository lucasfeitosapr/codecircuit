export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export class EventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();
  private emittingSystemError = false;

  // Performance optimization: handler pooling and batch processing
  private batchedEvents: Array<{ event: string; payload: any }> = [];
  private batchFlushScheduled = false;
  private enableBatching = false;

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
    if (this.enableBatching && this.shouldBatchEvent(event)) {
      this.batchedEvents.push({ event, payload });
      this.scheduleBatchFlush();
      return;
    }

    this.emitImmediate(event, payload);
  }

  private emitImmediate<T = any>(event: string, payload?: T): void {
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

  /**
   * Enable batching for high-frequency events (reduces GC pressure)
   */
  setBatching(enabled: boolean): void {
    this.enableBatching = enabled;
    if (!enabled) {
      this.flushBatchedEvents();
    }
  }

  private shouldBatchEvent(event: string): boolean {
    // Batch high-frequency events like mouse movement, render updates
    const batchableEvents = [
      'viewport.pan',
      'viewport.zoom',
      'component.drag',
      'render.frame',
    ];
    return batchableEvents.includes(event);
  }

  private scheduleBatchFlush(): void {
    if (this.batchFlushScheduled) return;

    this.batchFlushScheduled = true;
    requestAnimationFrame(() => {
      this.flushBatchedEvents();
      this.batchFlushScheduled = false;
    });
  }

  private flushBatchedEvents(): void {
    const events = this.batchedEvents.splice(0);

    // Group similar events and only emit the latest
    const latestEvents = new Map<string, any>();

    for (const { event, payload } of events) {
      latestEvents.set(event, payload);
    }

    for (const [event, payload] of latestEvents) {
      this.emitImmediate(event, payload);
    }
  }

  /**
   * Get EventBus performance stats
   */
  getStats(): { handlers: number; batchedEvents: number } {
    let totalHandlers = 0;
    for (const handlers of this.handlers.values()) {
      totalHandlers += handlers.size;
    }

    return {
      handlers: totalHandlers,
      batchedEvents: this.batchedEvents.length,
    };
  }
}

export const eventBus = new EventBus();

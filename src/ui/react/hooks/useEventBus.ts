import { useEffect } from 'react';
import { useEventBusContext } from '../contexts/EventBusContext';
import type { EventHandler } from '../../../events/EventBus';

/**
 * Hook to subscribe to EventBus events and auto-unsubscribe on unmount
 */
export function useEventBus<T = any>(event: string, handler: EventHandler<T>): void {
  const eb = useEventBusContext();

  useEffect(() => {
    eb.on(event, handler);
    return () => eb.off(event, handler);
  }, [eb, event, handler]);
}

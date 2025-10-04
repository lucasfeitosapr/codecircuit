import React, { createContext, useContext, ReactNode } from 'react';
import { EventBus, eventBus as globalEventBus } from '../../../events/EventBus';

const EventBusContext = createContext<EventBus | null>(null);

interface EventBusProviderProps {
  eventBus?: EventBus;
  children: ReactNode;
}

export function EventBusProvider({ eventBus = globalEventBus, children }: EventBusProviderProps) {
  return <EventBusContext.Provider value={eventBus}>{children}</EventBusContext.Provider>;
}

export function useEventBusContext(): EventBus {
  const eb = useContext(EventBusContext);
  if (!eb) throw new Error('useEventBusContext must be used within EventBusProvider');
  return eb;
}

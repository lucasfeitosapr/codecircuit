import React from 'react';
import { EventBusProvider } from './contexts/EventBusContext';
import { StatusIndicator } from './components/StatusIndicator';

export function MotherboardReactUI() {
  return (
    <EventBusProvider>
      <StatusIndicator />
    </EventBusProvider>
  );
}

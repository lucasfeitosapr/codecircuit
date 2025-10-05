import React from 'react';
import { EventBusProvider } from './contexts/EventBusContext';
import { StatusIndicator } from './components/StatusIndicator';
import { FeatureFlagPanel } from './components/FeatureFlagPanel';

export function MotherboardReactUI() {
  return (
    <EventBusProvider>
      <StatusIndicator />
      <FeatureFlagPanel />
    </EventBusProvider>
  );
}

import React, { useState } from 'react';
import { useEventBus } from '../hooks/useEventBus';
import { Events } from '../../../events/eventTypes';

export function StatusIndicator() {
    const [componentCount, setComponentCount] = useState(0);

    useEventBus(Events.ComponentCreated, () => setComponentCount(c => c + 1));
    useEventBus(Events.ComponentDeleted, () => setComponentCount(c => Math.max(0, c - 1)));

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '40px',
                left: '20px',
                background: '#1a1a2e',
                color: '#4ECDC4',
                padding: '10px 15px',
                borderRadius: '5px',
                fontSize: '14px',
                fontFamily: 'monospace',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
        >
            Components: {componentCount}
        </div>
    );
}

// CapacitorPluginV2.ts - S-013 (Lucas, 18/nov): a debt item is a Capacitor, charge that
// builds up. Showing how charged it is (interest) comes later.

import { TaskResistorPluginV2 } from './TaskResistorPluginV2';
import type { PluginMetadata } from '../../events/eventTypes';

const WIDTH = 40;
const HEIGHT = 30;

export class CapacitorPluginV2 extends TaskResistorPluginV2 {
  type = 'capacitor';
  metadata: PluginMetadata = {
    displayName: 'Capacitor',
    icon: '─||─',
    color: '#44aaff',
    category: 'storage',
    width: WIDTH,
    height: HEIGHT,
    pins: {
      input: [{ x: 0, y: HEIGHT / 2, type: 'energy', label: 'input' }],
      output: [{ x: WIDTH, y: HEIGHT / 2, type: 'energy', label: 'output' }],
    },
  };

  createComponent(config: { x: number; y: number; id?: string; title?: string }): any {
    return {
      id: config.id || `capacitor_${Date.now()}`,
      type: 'capacitor',
      x: config.x,
      y: config.y,
      width: WIDTH,
      height: HEIGHT,
      title: config.title || 'Capacitor',
      color: '#44aaff',
      status: 'defined',
      pins: {
        input: [{ x: 0, y: HEIGHT / 2, type: 'energy' }],
        output: [{ x: WIDTH, y: HEIGHT / 2, type: 'energy' }],
      },
    };
  }

  deserialize(data: any): any {
    return { ...data, type: 'capacitor' };
  }
}

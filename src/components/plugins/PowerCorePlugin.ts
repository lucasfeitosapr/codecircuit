import { PluginDescriptor, componentSystem } from '../ComponentSystem';

export const PowerCorePlugin: PluginDescriptor = {
  id: 'power-core',
  displayName: 'Power Core',
  render: (model) => ({ shape: 'square', color: '#ffcc00', model }),
  serialize: (model) => model,
  deserialize: (data) => data,
};

componentSystem.register(PowerCorePlugin);

import { PluginDescriptor, componentSystem } from '../ComponentSystem';

export const ModuleICPlugin: PluginDescriptor = {
  id: 'module-ic',
  displayName: 'Module IC',
  render: (model) => ({ shape: 'rounded-rect', color: '#66ccff', model }),
  serialize: (model) => model,
  deserialize: (data) => data,
};

componentSystem.register(ModuleICPlugin);

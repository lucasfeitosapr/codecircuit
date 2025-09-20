import { PluginDescriptor, componentSystem } from '../ComponentSystem';

export const TaskResistorPlugin: PluginDescriptor = {
  id: 'task-resistor',
  displayName: 'Task Resistor',
  render: (model) => ({ shape: 'zigzag', color: '#cc6666', model }),
  serialize: (model) => model,
  deserialize: (data) => data,
};

componentSystem.register(TaskResistorPlugin);

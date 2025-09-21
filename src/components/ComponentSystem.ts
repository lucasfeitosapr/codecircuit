export type RenderFrame = {
  timestamp: number;
  camera?: any;
};

export type PluginDescriptor = {
  id: string;
  displayName: string;
  // New render signature for plugin renderers
  render?: (ctx: CanvasRenderingContext2D | WebGLRenderingContext, frame: RenderFrame, model?: any) => void;
  evaluate?: (model: any, emit: (event: string, payload?: any) => void) => void | Promise<void>;
  serialize?: (model: any) => any;
  deserialize?: (data: any) => any;
};

export class ComponentSystem {
  private plugins: Map<string, PluginDescriptor> = new Map();

  register(plugin: PluginDescriptor): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin with id ${plugin.id} already registered`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  unregister(id: string): void {
    this.plugins.delete(id);
  }

  get(id: string): PluginDescriptor | undefined {
    return this.plugins.get(id);
  }

  list(): PluginDescriptor[] {
    return Array.from(this.plugins.values());
  }
}

export const componentSystem = new ComponentSystem();

/**
 * ApplicationInitializer - Handles complex application initialization
 * Extracted from main.ts constructor to centralize setup logic
 */

import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import { stateManager } from '../state/StateManager';
import { layeredRenderer } from '../rendering/LayeredRenderer';

// Import V2 plugins
import { DecisionPointPluginV2 } from '../components/plugins/DecisionPointPluginV2';
import { PowerCorePluginV2 } from '../components/plugins/PowerCorePluginV2';
import { ModuleICPluginV2 } from '../components/plugins/ModuleICPluginV2';
import { TaskResistorPluginV2 } from '../components/plugins/TaskResistorPluginV2';
import { GatewayPluginV2 } from '../components/plugins/GatewayPluginV2';

// Import layers
import BackgroundLayer from '../rendering/layers/BackgroundLayer';
import ImplementationLayer from '../rendering/layers/ImplementationLayer';
import ConnectionsLayer from '../rendering/layers/ConnectionsLayer';
import RuntimeLayer from '../rendering/layers/RuntimeLayer';
import UILayer from '../rendering/layers/UILayer';

import type { ComponentBase, Connection } from '../types';

export interface InitializationContext {
  getComponents: () => ComponentBase[];
  getConnections: () => Connection[];
  getCurrentView: () => any;
  getSelectedComponent: () => ComponentBase | null;
  getCamera: () => any;
  addComponent: (type: string, x: number, y: number) => ComponentBase | null;
  createConnection: (startPin: any, endPin: any) => Connection | null;
  componentRegistry: any;
  componentTypes: Record<string, any>;
  categories: Record<string, any>;
}

export class ApplicationInitializer {
  private context: InitializationContext;

  constructor(context: InitializationContext) {
    this.context = context;
  }

  setupPluginSystem() {
    // Phase 5B: Event-driven plugin coordination
    // Listen for plugin registrations to automatically update componentTypes
    eventBus.on(Events.PLUGIN_REGISTERED, (payload: any) => {
      const { pluginType, metadata } = payload;

      // Convert plugin metadata to componentType format
      const componentType = {
        name: metadata.displayName,
        icon: metadata.icon,
        color: metadata.color,
        width: metadata.width || 60,
        height: metadata.height || 40,
        pins: metadata.pins || { input: [], output: [] },
      };

      // Add to componentTypes (replacing manual coordination)
      this.context.componentTypes[pluginType] = componentType;

      console.log(`✅ ComponentType auto-updated: ${metadata.displayName} (${pluginType})`);
    });

    // Register V2 plugins - single registration triggers all coordination
    this.context.componentRegistry.register(new DecisionPointPluginV2());
    this.context.componentRegistry.register(new PowerCorePluginV2());
    this.context.componentRegistry.register(new ModuleICPluginV2());
    this.context.componentRegistry.register(new TaskResistorPluginV2());
    this.context.componentRegistry.register(new GatewayPluginV2()); // Phase 2B: Gateway plugin!

    console.log('🚀 Event-driven plugin system initialized');
    console.log('📊 ComponentTypes populated:', Object.keys(this.context.componentTypes));
    console.log('🔧 V2 Plugins registered:', this.context.componentRegistry.getPluginTypes());
  }

  registerRenderingLayers() {
    // Register layers (idempotent during app lifecycle)
    try {
      layeredRenderer.registerLayer(BackgroundLayer.name, BackgroundLayer as any);
      layeredRenderer.registerLayer(ImplementationLayer.name, ImplementationLayer as any);
      layeredRenderer.registerLayer(ConnectionsLayer.name, ConnectionsLayer as any);
      layeredRenderer.registerLayer(RuntimeLayer.name, RuntimeLayer as any);
      layeredRenderer.registerLayer(UILayer.name, UILayer as any);
    } catch (e) {
      // ignore if already registered
    }
  }

  initializeStateManager() {
    try {
      // initialize state manager snapshot from current app state (Phase-1)
      // StateManager expects records keyed by id; convert arrays to maps keyed by component/connection id
      const components = this.context.getComponents();
      const connections = this.context.getConnections();
      const currentView = this.context.getCurrentView();
      const selectedComponent = this.context.getSelectedComponent();
      const camera = this.context.getCamera();

      const componentsById = components.reduce((acc: Record<string, any>, c: any) => {
        acc[c.id] = c;
        return acc;
      }, {} as Record<string, any>);

      const connectionsById = connections.reduce((acc: Record<string, any>, conn: any) => {
        acc[conn.id] = conn;
        return acc;
      }, {} as Record<string, any>);

      stateManager.setSnapshot({
        components: componentsById,
        connections: connectionsById,
        view: currentView,
        selectedComponentId: (selectedComponent as any)?.id ?? null,
        selectedComponentIds: selectedComponent ? [(selectedComponent as any).id] : [],
        camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
      } as any);
    } catch (err) {
      // avoid affecting runtime if snapshotting fails
      // eslint-disable-next-line no-console
      console.error('Failed to initialize stateManager snapshot', err);
    }
  }

  seedDemoDataIfRequested() {
    // Optional demo seeding: append `?seedDemo=true` to the URL to populate sample components for smoke tests
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('seedDemo') === 'true') {
          // richer, idempotent seeding: components + connections + varied statuses
          if (this.context.getComponents().length === 0) {
            const p = this.context.addComponent('power-core', 100, 100);
            const m = this.context.addComponent('module-ic', 320, 120);
            const r = this.context.addComponent('task-resistor', 220, 220);

            // set statuses to show different visuals
            if (p) p.status = 'done';
            if (m) m.status = 'in-progress';
            if (r) r.status = 'todo';

            // add connections: power-core -> module-ic, module-ic -> task-resistor
            try {
              if (p && m && r) {
                const fromPin = {
                  component: p,
                  pinType: 'output' as 'output',
                  pinIndex: 0,
                  x: p.x + (p.pins?.output?.[0]?.x ?? 0),
                  y: p.y + (p.pins?.output?.[0]?.y ?? 0),
                  category: p.category,
                };
                const toPin = {
                  component: m,
                  pinType: 'input' as 'input',
                  pinIndex: 0,
                  x: m.x + (m.pins?.input?.[0]?.x ?? 0),
                  y: m.y + (m.pins?.input?.[0]?.y ?? 0),
                  category: m.category,
                };
                this.context.createConnection(fromPin, toPin);

                const fromPin2 = {
                  component: m,
                  pinType: 'output' as 'output',
                  pinIndex: 0,
                  x: m.x + (m.pins?.output?.[0]?.x ?? 0),
                  y: m.y + (m.pins?.output?.[0]?.y ?? 0),
                  category: m.category,
                };
                const toPin2 = {
                  component: r,
                  pinType: 'input' as 'input',
                  pinIndex: 0,
                  x: r.x + (r.pins?.input?.[0]?.x ?? 0),
                  y: r.y + (r.pins?.input?.[0]?.y ?? 0),
                  category: r.category,
                };
                this.context.createConnection(fromPin2, toPin2);
              }
            } catch (e) {
              // ignore any seeding errors
            }
          }
        }
      }
    } catch (e) {
      // ignore in non-browser or unexpected environments
    }
  }

  // Complete initialization sequence
  initialize() {
    console.log('🚀 Starting application initialization...');

    try {
      // Phase 1: Register rendering layers
      this.registerRenderingLayers();
      console.log('✅ Rendering layers registered');

      // Phase 2: Initialize state manager
      this.initializeStateManager();
      console.log('✅ State manager initialized');

      // Phase 3: Setup plugin system
      this.setupPluginSystem();
      console.log('✅ Plugin system initialized');

      // Phase 5: Seed demo data if requested
      this.seedDemoDataIfRequested();
      console.log('✅ Demo data seeding completed');

      console.log('🎉 Application initialization complete!');

      // Emit initialization complete event
      eventBus.emit('app.initialization.complete', {
        timestamp: Date.now(),
        components: this.context.getComponents().length,
        connections: this.context.getConnections().length,
      });
    } catch (error) {
      console.error('❌ Application initialization failed:', error);

      // Emit initialization error event
      eventBus.emit('app.initialization.error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });

      throw error;
    }
  }
}

export function createApplicationInitializer(
  context: InitializationContext
): ApplicationInitializer {
  return new ApplicationInitializer(context);
}

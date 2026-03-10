import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PartsTrayRenderer } from './PartsTrayRenderer';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';

describe('PartsTrayRenderer', () => {
  let container: HTMLElement;
  let categoryLegend: HTMLElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div class="parts-tray">
        <h3>Parts Tray</h3>
        <div id="parts-tray-components"></div>
        <div class="category-legend"></div>
      </div>
    `;

    container = document.querySelector('#parts-tray-components')!;
    categoryLegend = document.querySelector('.category-legend')!;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should initialize with valid container', () => {
      const renderer = new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      expect(renderer).toBeDefined();
      expect(renderer.getComponentTypes()).toEqual([]);
    });

    it('should handle missing container gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const renderer = new PartsTrayRenderer({
        containerSelector: '#non-existent',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('container not found')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Plugin Registration Events', () => {
    it('should add component item on PLUGIN_REGISTERED event', () => {
      new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      // Emit plugin registered event
      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'test-component',
        metadata: {
          displayName: 'Test Component',
          icon: '🧪',
          category: 'processing',
        },
        timestamp: Date.now(),
      });

      // Check DOM was updated
      const item = container.querySelector('[data-component="test-component"]');
      expect(item).not.toBeNull();
      expect(item?.textContent).toContain('Test Component');
      expect(item?.querySelector('.component-icon')?.textContent).toBe('🧪');
    });

    it('should append component to container', () => {
      new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'test-component',
        metadata: {
          displayName: 'Test Component',
          icon: '🧪',
          category: 'processing',
        },
        timestamp: Date.now(),
      });

      const item = container.querySelector('[data-component="test-component"]');
      expect(item).not.toBeNull();
      expect(item?.parentElement).toBe(container);
    });

    it('should make component items draggable', () => {
      new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'test-component',
        metadata: {
          displayName: 'Test Component',
          icon: '🧪',
          category: 'processing',
        },
        timestamp: Date.now(),
      });

      const item = container.querySelector('[data-component="test-component"]') as HTMLElement;
      expect(item?.draggable).toBe(true);
    });

    it('should set correct context hint based on category', () => {
      new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'task',
        metadata: {
          displayName: 'Task',
          icon: '🔧',
          category: 'processing',
        },
        timestamp: Date.now(),
      });

      const hint = container.querySelector('.context-hint');
      expect(hint?.textContent).toBe('Individual tasks');
    });

    it('should remove component on PLUGIN_UNREGISTERED event', () => {
      const renderer = new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      // Add component
      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'test-component',
        metadata: {
          displayName: 'Test Component',
          icon: '🧪',
          category: 'processing',
        },
        timestamp: Date.now(),
      });

      expect(renderer.getComponentTypes()).toContain('test-component');

      // Remove component
      eventBus.emit(Events.PLUGIN_UNREGISTERED, {
        pluginType: 'test-component',
        timestamp: Date.now(),
      });

      expect(renderer.getComponentTypes()).not.toContain('test-component');
      expect(container.querySelector('[data-component="test-component"]')).toBeNull();
    });
  });

  describe('Drag and Drop', () => {
    it('should setup dragstart handler with correct data', () => {
      new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'test-component',
        metadata: {
          displayName: 'Test Component',
          icon: '🧪',
          category: 'processing',
        },
        timestamp: Date.now(),
      });

      const item = container.querySelector('[data-component="test-component"]') as HTMLElement;

      // Create mock drag event
      const mockDataTransfer = {
        effectAllowed: '',
        setData: vi.fn(),
      };

      const dragEvent = new Event('dragstart') as any;
      dragEvent.dataTransfer = mockDataTransfer;

      item?.dispatchEvent(dragEvent);

      expect(mockDataTransfer.setData).toHaveBeenCalledWith('text/plain', 'test-component');
      expect(mockDataTransfer.effectAllowed).toBe('copy');
    });
  });

  describe('Component Tracking', () => {
    it('should track all registered components', () => {
      const renderer = new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'component-1',
        metadata: { displayName: 'C1', icon: '1', category: 'source' },
        timestamp: Date.now(),
      });

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'component-2',
        metadata: { displayName: 'C2', icon: '2', category: 'processing' },
        timestamp: Date.now(),
      });

      const types = renderer.getComponentTypes();
      expect(types).toContain('component-1');
      expect(types).toContain('component-2');
      expect(types.length).toBe(2);
    });

    it('should prevent duplicate component registration', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const renderer = new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      const metadata = { displayName: 'Test', icon: '🧪', category: 'processing' };

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'duplicate',
        metadata,
        timestamp: Date.now(),
      });

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'duplicate',
        metadata,
        timestamp: Date.now(),
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already in tray')
      );
      expect(renderer.getComponentTypes().length).toBe(1);

      consoleSpy.mockRestore();
    });

    it('should clear all components', () => {
      const renderer = new PartsTrayRenderer({
        containerSelector: '#parts-tray-components',
      });

      eventBus.emit(Events.PLUGIN_REGISTERED, {
        pluginType: 'component-1',
        metadata: { displayName: 'C1', icon: '1', category: 'source' },
        timestamp: Date.now(),
      });

      expect(renderer.getComponentTypes().length).toBe(1);

      renderer.clear();

      expect(renderer.getComponentTypes().length).toBe(0);
      expect(container.children.length).toBe(0);
    });
  });
});

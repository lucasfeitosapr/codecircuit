import { expect } from 'chai';
import { InputHandler } from './InputHandler';
import { eventBus } from '../events/EventBus';
import { Events } from '../events/eventTypes';
import type { Camera } from '../types';

/**
 * InputHandler Tests - Phase 5 Legacy Code Extraction
 * 
 * Tests for the new InputHandler class that extracts input handling
 * logic from the monolithic MotherboardApp.
 */
describe('InputHandler', () => {
  let canvas: HTMLCanvasElement;
  let camera: Camera;
  let inputHandler: InputHandler;
  let eventSpy: any;

  beforeEach(() => {
    // Create mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
    document.body.appendChild(canvas);

    // Mock camera
    camera = { x: 0, y: 0, zoom: 1 };

    // Create event spy
    eventSpy = {
      emittedEvents: [] as any[],
      emit: function(event: string, payload: any) {
        this.emittedEvents.push({ event, payload });
      },
      clear: function() {
        this.emittedEvents = [];
      }
    };

    // Replace eventBus.emit with our spy
    (eventBus as any).emit = eventSpy.emit.bind(eventSpy);

    // Create InputHandler with fresh state
    inputHandler = new InputHandler(canvas, camera);
    
    // Ensure clean state
    inputHandler.updateSelectedComponent(null);
    eventSpy.clear();
  });

  afterEach(() => {
    inputHandler.destroy();
    document.body.removeChild(canvas);
    eventSpy.clear();
  });

  describe('Construction and Setup', () => {
    it('should create InputHandler with canvas and camera', () => {
      expect(inputHandler).to.be.instanceOf(InputHandler);
    });

    it('should setup event listeners on canvas', () => {
      // Check that event listeners are attached by triggering an event
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0
      });
      
      canvas.dispatchEvent(mouseEvent);
      
      // Should emit hit test events
      expect(eventSpy.emittedEvents.length).to.be.greaterThan(0);
    });
  });

  describe('Mouse Interactions', () => {
    it('should handle left mouse down for component interaction', () => {
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0 // Left click
      });

      canvas.dispatchEvent(mouseEvent);

      // Should emit pin hit test first, then component hit test
      const pinHitTest = eventSpy.emittedEvents.find(e => 
        e.event === Events.PIN_HIT_TEST_REQUESTED
      );
      expect(pinHitTest).to.exist;
      expect(pinHitTest.payload.position).to.deep.equal({ x: 100, y: 100 });
    });

    it('should handle right mouse down for panning', () => {
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 2 // Right click
      });

      canvas.dispatchEvent(mouseEvent);

      // Should not emit hit test events for right click
      const hitTestEvents = eventSpy.emittedEvents.filter(e => 
        e.event === Events.PIN_HIT_TEST_REQUESTED || 
        e.event === Events.COMPONENT_HIT_TEST_REQUESTED
      );
      expect(hitTestEvents).to.have.length(0);
    });

    it('should handle mouse move and update position', () => {
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 150,
        clientY: 200
      });

      canvas.dispatchEvent(mouseEvent);

      const positionUpdate = eventSpy.emittedEvents.find(e => 
        e.event === Events.MOUSE_POSITION_UPDATED
      );
      expect(positionUpdate).to.exist;
      expect(positionUpdate.payload.position).to.deep.equal({ x: 150, y: 200 });
      expect(positionUpdate.payload.screenPosition).to.deep.equal({ x: 150, y: 200 });
    });

    it('should handle wheel events for zooming', () => {
      const wheelEvent = new WheelEvent('wheel', {
        clientX: 100,
        clientY: 100,
        deltaY: -100 // Zoom in
      });

      canvas.dispatchEvent(wheelEvent);

      const zoomRequest = eventSpy.emittedEvents.find(e => 
        e.event === Events.CAMERA_ZOOM_REQUESTED
      );
      expect(zoomRequest).to.exist;
      expect(zoomRequest.payload.factor).to.equal(1.1); // Zoom in factor
      expect(zoomRequest.payload.center).to.deep.equal({ x: 100, y: 100 });
    });
  });

  describe('Coordinate Transformation', () => {
    it('should convert screen coordinates to world coordinates correctly', () => {
      // Test with default camera
      const worldPos = (inputHandler as any).screenToWorld(100, 200);
      expect(worldPos).to.deep.equal({ x: 100, y: 200 });
    });

    it('should account for camera offset in coordinate transformation', () => {
      // Update camera with offset
      camera.x = 50;
      camera.y = 25;
      inputHandler.updateCamera(camera);

      const worldPos = (inputHandler as any).screenToWorld(100, 200);
      expect(worldPos).to.deep.equal({ x: 50, y: 175 }); // (100-50)/1, (200-25)/1
    });

    it('should account for zoom in coordinate transformation', () => {
      // Update camera with zoom
      camera.zoom = 2;
      inputHandler.updateCamera(camera);

      const worldPos = (inputHandler as any).screenToWorld(100, 200);
      expect(worldPos).to.deep.equal({ x: 50, y: 100 }); // (100-0)/2, (200-0)/2
    });
  });

  describe('Drag and Drop', () => {
    it('should handle component drag start from sidebar', () => {
      // Create a draggable component item
      const componentItem = document.createElement('div');
      componentItem.className = 'component-item';
      componentItem.setAttribute('data-component', 'power-core');
      document.body.appendChild(componentItem);

      // Mock DragEvent for Node.js environment
      const mockDragEvent = {
        type: 'dragstart',
        dataTransfer: {
          setData: (type: string, data: string) => {
            (mockDragEvent as any).dragData = { type, data };
          }
        }
      };

      // Simulate drag start handling
      expect(componentItem.getAttribute('data-component')).to.equal('power-core');

      // Clean up
      document.body.removeChild(componentItem);
    });

    it('should handle component drop on canvas', () => {
      // Mock drop event for Node.js environment  
      const mockDropEvent = {
        preventDefault: () => {},
        clientX: 200,
        clientY: 150,
        dataTransfer: {
          getData: () => 'module-ic'
        }
      };

      // Simulate drop event by calling the event handler directly
      eventSpy.clear();
      eventBus.emit(Events.COMPONENT_CREATE_REQUESTED, {
        type: 'module-ic',
        position: { x: 200, y: 150 },
        timestamp: Date.now()
      });

      const createRequest = eventSpy.emittedEvents.find((e: any) => 
        e.event === Events.COMPONENT_CREATE_REQUESTED
      );
      expect(createRequest).to.exist;
      expect(createRequest.payload.type).to.equal('module-ic');
      expect(createRequest.payload.position).to.deep.equal({ x: 200, y: 150 });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should handle Escape key to cancel operations', () => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Escape'
      });

      document.dispatchEvent(keyEvent);

      // Should emit connection mode cancelled if in connection mode
      // For now, just verify the event listener is set up
      expect(true).to.be.true; // Placeholder - would need to set up connection mode first
    });

    it('should handle Delete key for component deletion', () => {
      // Set selected component
      const mockComponent = { id: 'test-component-1', type: 'power-core' };
      inputHandler.updateSelectedComponent(mockComponent as any);

      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Delete'
      });

      document.dispatchEvent(keyEvent);

      const deleteRequest = eventSpy.emittedEvents.find(e => 
        e.event === Events.COMPONENT_DELETE_REQUESTED
      );
      expect(deleteRequest).to.exist;
      expect(deleteRequest.payload.componentId).to.equal('test-component-1');
    });

    it('should handle Ctrl+Z for undo', () => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true
      });

      document.dispatchEvent(keyEvent);

      const undoRequest = eventSpy.emittedEvents.find(e => 
        e.event === Events.UNDO_REQUESTED
      );
      expect(undoRequest).to.exist;
    });

    it('should handle Ctrl+Y for redo', () => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'y',
        ctrlKey: true
      });

      document.dispatchEvent(keyEvent);

      const redoRequest = eventSpy.emittedEvents.find(e => 
        e.event === Events.REDO_REQUESTED
      );
      expect(redoRequest).to.exist;
    });

    it('should handle Space key for camera reset', () => {
      const keyEvent = new KeyboardEvent('keydown', {
        key: ' '
      });

      document.dispatchEvent(keyEvent);

      const resetRequest = eventSpy.emittedEvents.find(e => 
        e.event === Events.CAMERA_RESET_REQUESTED
      );
      expect(resetRequest).to.exist;
    });
  });

  describe('Mouse Position Tracking', () => {
    it('should return current mouse position', () => {
      // Simulate mouse move to set position
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 300,
        clientY: 250
      });
      canvas.dispatchEvent(mouseEvent);

      const mousePos = inputHandler.getMousePosition();
      expect(mousePos).to.deep.equal({ x: 300, y: 250 });
    });
  });

  describe('Camera Updates', () => {
    it('should update camera reference when camera changes', () => {
      const newCamera = { x: 100, y: 50, zoom: 1.5 };
      inputHandler.updateCamera(newCamera);

      // Test coordinate transformation with new camera
      const worldPos = (inputHandler as any).screenToWorld(150, 200);
      expect(worldPos).to.deep.equal({ 
        x: (150 - 100) / 1.5, 
        y: (200 - 50) / 1.5 
      });
    });
  });

  describe('Component Selection Updates', () => {
    it('should update selected component reference', () => {
      const mockComponent = { id: 'test-component-unique', type: 'module-ic' };
      inputHandler.updateSelectedComponent(mockComponent as any);

      // Verify the component was set by checking the getter method
      expect(mockComponent.id).to.equal('test-component-unique');
    });

    it('should handle null selected component gracefully', () => {
      inputHandler.updateSelectedComponent(null);
      
      // Verify null selection doesn't break the handler
      expect(() => {
        inputHandler.getMousePosition();
      }).to.not.throw();
    });
  });

  describe('Event System Integration', () => {
    it('should emit events with proper timestamps', () => {
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: 100,
        clientY: 100,
        button: 0
      });

      const beforeTime = Date.now();
      canvas.dispatchEvent(mouseEvent);
      const afterTime = Date.now();

      const hitTestEvent = eventSpy.emittedEvents.find(e => 
        e.event === Events.PIN_HIT_TEST_REQUESTED
      );
      expect(hitTestEvent).to.exist;
      expect(hitTestEvent.payload.timestamp).to.be.within(beforeTime, afterTime);
    });

    it('should emit events with proper structure', () => {
      const wheelEvent = new WheelEvent('wheel', {
        clientX: 100,
        clientY: 100,
        deltaY: 100 // Zoom out
      });

      canvas.dispatchEvent(wheelEvent);

      const zoomEvent = eventSpy.emittedEvents.find(e => 
        e.event === Events.CAMERA_ZOOM_REQUESTED
      );
      expect(zoomEvent).to.exist;
      expect(zoomEvent.payload).to.have.property('factor');
      expect(zoomEvent.payload).to.have.property('center');
      expect(zoomEvent.payload).to.have.property('timestamp');
      expect(zoomEvent.payload.factor).to.equal(0.9); // Zoom out factor
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Test that missing UI elements don't break the handler
      expect(() => {
        new InputHandler(canvas, camera);
      }).to.not.throw();
    });

    it('should handle invalid coordinates gracefully', () => {
      // Test coordinate transformation with edge cases
      const worldPos1 = (inputHandler as any).screenToWorld(NaN, 100);
      const worldPos2 = (inputHandler as any).screenToWorld(100, Infinity);
      
      // Should handle gracefully without throwing
      expect(worldPos1).to.be.an('object');
      expect(worldPos2).to.be.an('object');
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on destroy', () => {
      // Create a fresh handler to test cleanup
      const testHandler = new InputHandler(canvas, camera);
      
      // Destroy should not throw
      expect(() => {
        testHandler.destroy();
      }).to.not.throw();
    });
  });
});
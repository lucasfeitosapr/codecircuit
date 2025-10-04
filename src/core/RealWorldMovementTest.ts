/**
 * RealWorldMovementTest - Manual testing for imported component movement
 *
 * This provides console commands to test the movement bug fix in the browser
 */

export class RealWorldMovementTest {
  /**
   * Create a test project with components
   */
  static createTestProject() {
    return {
      version: '1.0.0',
      name: 'Movement Test Project',
      createdAt: new Date().toISOString(),
      components: [
        {
          id: 'test-power-1',
          type: 'power-core',
          x: 100,
          y: 100,
          width: 60,
          height: 60,
          status: 'done',
          category: 'backend',
          name: 'Test Power Core',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'test-task-1',
          type: 'task-resistor',
          x: 250,
          y: 150,
          width: 60,
          height: 30,
          status: 'todo',
          category: 'frontend',
          name: 'Test Task',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'test-decision-1',
          type: 'decision-point',
          x: 400,
          y: 200,
          width: 60,
          height: 60,
          status: 'in-progress',
          category: 'flow-control',
          name: 'Test Decision',
          createdAt: new Date().toISOString(),
        },
      ],
      connections: [
        {
          id: 'test-conn-1',
          from: { component: { id: 'test-power-1' }, pinIndex: 0 },
          to: { component: { id: 'test-task-1' }, pinIndex: 0 },
          category: 'frontend',
        },
      ],
      views: {},
    };
  }

  /**
   * Test import and movement workflow
   */
  static async testImportAndMovement(): Promise<void> {
    const app = (window as any).app;
    if (!app) {
      console.error('❌ App not found. Make sure you run this in the browser console.');
      return;
    }

    console.log('🧪 Starting real-world movement test...');

    try {
      // Create test project
      const testProject = this.createTestProject();
      console.log('📦 Created test project with components:', testProject.components.length);

      // Import project
      console.log('📥 Importing project...');
      await app.exportImportManager.importProjectData(testProject);
      console.log('✅ Project imported successfully');

      // Wait a moment for event processing
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get current components
      const components = app.getCurrentViewComponents();
      console.log('🔍 Found components in view:', components.length);

      if (components.length === 0) {
        console.error('❌ No components found after import!');
        return;
      }

      // Test hit detection on imported components
      console.log('🎯 Testing hit detection...');
      for (const comp of components) {
        const hitComp = app.getComponentAt(comp.x + 10, comp.y + 10);
        if (hitComp?.id === comp.id) {
          console.log(`✅ Hit detection works for ${comp.id} at (${comp.x}, ${comp.y})`);
        } else {
          console.error(`❌ Hit detection failed for ${comp.id} at (${comp.x}, ${comp.y})`);
        }
      }

      // Test movement
      console.log('🚚 Testing component movement...');
      const testComponent = components[0];
      const originalX = testComponent.x;
      const originalY = testComponent.y;
      const newX = originalX + 100;
      const newY = originalY + 50;

      console.log(`📍 Moving ${testComponent.id} from (${originalX}, ${originalY}) to (${newX}, ${newY})`);

      // Simulate drag operation by updating component
      app.componentLifecycleManager.updateComponent(testComponent, {
        x: newX,
        y: newY,
      });

      // Verify movement
      if (testComponent.x === newX && testComponent.y === newY) {
        console.log('✅ Component position updated successfully');
      } else {
        console.error('❌ Component position not updated');
        return;
      }

      // Test hit detection at new position
      const hitAtNew = app.getComponentAt(newX + 10, newY + 10);
      const hitAtOld = app.getComponentAt(originalX + 10, originalY + 10);

      if (hitAtNew?.id === testComponent.id) {
        console.log('✅ Hit detection works at new position');
      } else {
        console.error('❌ Hit detection failed at new position');
      }

      if (!hitAtOld) {
        console.log('✅ Hit detection correctly removed from old position');
      } else {
        console.error('❌ Hit detection still active at old position');
      }

      // Test spatial index stats
      const spatialStats = app.componentLifecycleManager.getSpatialIndexStats();
      console.log('🗂️ Spatial index stats:', spatialStats);

      console.log('🎉 Real-world movement test completed successfully!');

    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  /**
   * Test extreme movement scenarios
   */
  static async testExtremeMovement(): Promise<void> {
    const app = (window as any).app;
    if (!app) {
      console.error('❌ App not found.');
      return;
    }

    console.log('🌟 Testing extreme movement scenarios...');

    const components = app.getCurrentViewComponents();
    if (components.length === 0) {
      console.error('❌ No components found. Run testImportAndMovement() first.');
      return;
    }

    const testComponent = components[0];
    const extremePositions = [
      { x: -500, y: -300, name: 'Far negative' },
      { x: 2000, y: 1500, name: 'Far positive' },
      { x: 0, y: 0, name: 'Origin' },
      { x: -100, y: 500, name: 'Mixed coordinates' },
    ];

    for (const pos of extremePositions) {
      console.log(`📍 Testing ${pos.name} position: (${pos.x}, ${pos.y})`);

      app.componentLifecycleManager.updateComponent(testComponent, pos);

      const hitTest = app.getComponentAt(pos.x + 10, pos.y + 10);
      if (hitTest?.id === testComponent.id) {
        console.log(`✅ ${pos.name} position works correctly`);
      } else {
        console.error(`❌ ${pos.name} position failed hit detection`);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log('🎉 Extreme movement test completed!');
  }

  /**
   * Performance benchmark for movement
   */
  static benchmarkMovement(): void {
    const app = (window as any).app;
    if (!app) {
      console.error('❌ App not found.');
      return;
    }

    console.log('⏱️ Benchmarking movement performance...');

    const components = app.getCurrentViewComponents();
    if (components.length === 0) {
      console.error('❌ No components found. Run testImportAndMovement() first.');
      return;
    }

    const moveCount = 100;
    const testComponent = components[0];

    // Benchmark movement operations
    const moveStart = performance.now();
    for (let i = 0; i < moveCount; i++) {
      app.componentLifecycleManager.updateComponent(testComponent, {
        x: 100 + i,
        y: 100 + (i % 10),
      });
    }
    const moveTime = performance.now() - moveStart;

    // Benchmark hit testing
    const hitStart = performance.now();
    for (let i = 0; i < moveCount; i++) {
      app.getComponentAt(100 + Math.random() * 500, 100 + Math.random() * 300);
    }
    const hitTime = performance.now() - hitStart;

    console.log(`📊 Movement Performance Results:`);
    console.log(`   • ${moveCount} movements: ${moveTime.toFixed(2)}ms (${(moveTime/moveCount).toFixed(3)}ms each)`);
    console.log(`   • ${moveCount} hit tests: ${hitTime.toFixed(2)}ms (${(hitTime/moveCount).toFixed(3)}ms each)`);

    const spatialStats = app.componentLifecycleManager.getSpatialIndexStats();
    console.log(`🗂️ Spatial index efficiency:`, spatialStats);

    console.log('🎉 Performance benchmark completed!');
  }
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).RealWorldMovementTest = RealWorldMovementTest;

  // Add convenience methods
  (window as any).testMovement = RealWorldMovementTest.testImportAndMovement;
  (window as any).testExtreme = RealWorldMovementTest.testExtremeMovement;
  (window as any).benchmarkMovement = RealWorldMovementTest.benchmarkMovement;
}
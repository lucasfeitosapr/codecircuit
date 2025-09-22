// Debug script to test V2 integration in browser console
// Copy and paste this into browser console to debug

console.log('🔍 Debugging V2 Plugin Integration');

// Check if componentTypes are populated
console.log('ComponentTypes:', window.app?.componentTypes);

// Check if V2 plugins are working
if (window.app?.componentRegistry) {
  console.log('ComponentRegistry plugins:', window.app.componentRegistry.list().map(p => ({
    type: p.type,
    name: p.metadata.displayName
  })));
} else {
  console.log('❌ ComponentRegistry not found');
}

// Try to create a decision point
try {
  const component = window.app?.addComponent('decision-point', 100, 100);
  console.log('✅ Decision point created:', component);
  console.log('Pin structure:', component?.pins);
} catch (error) {
  console.log('❌ Error creating decision point:', error);
}
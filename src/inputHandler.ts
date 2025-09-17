export function setupInputListeners(app: any) {
  document.querySelectorAll('.component-item').forEach((item: any) => {
    item.addEventListener('dragstart', (e: any) => {
      e.dataTransfer.setData('text/plain', item.dataset.component);
    });
    item.setAttribute('draggable', 'true');
  });

  // Canvas drop zone
  app.canvas.addEventListener('dragover', (e: any) => {
    e.preventDefault();
  });
  app.canvas.addEventListener('drop', (e: any) => {
    e.preventDefault();
    const componentType = e.dataTransfer.getData('text/plain');
    const rect = app.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - app.camera.x) / app.camera.zoom;
    const y = (e.clientY - rect.top - app.camera.y) / app.camera.zoom;
    app.addComponent(componentType, x, y);
  });

  // Canvas interaction
  app.canvas.addEventListener('mousedown', app.onMouseDown.bind(app));
  app.canvas.addEventListener('mousemove', app.onMouseMove.bind(app));
  app.canvas.addEventListener('mouseup', app.onMouseUp.bind(app));
  app.canvas.addEventListener('wheel', app.onWheel.bind(app));
  app.canvas.addEventListener('contextmenu', (e: any) => e.preventDefault());

  // Track mouse position for connection drawing
  app.canvas.addEventListener('mousemove', (e: any) => {
    const rect = app.canvas.getBoundingClientRect();
    app.mousePos = {
      x: (e.clientX - rect.left - app.camera.x) / app.camera.zoom,
      y: (e.clientY - rect.top - app.camera.y) / app.camera.zoom,
    };
  });

  // UI controls
  const backBtn = document.getElementById('back-btn');
  if (backBtn) backBtn.addEventListener('click', () => app.exitSchematicView());

  const helpBtn = document.getElementById('help-btn');
  if (helpBtn)
    helpBtn.addEventListener('click', () => {
      const overlay = document.getElementById('help-overlay');
      if (overlay) overlay.classList.add('active');
    });

  const resetBtn = document.getElementById('reset-btn');
  if (resetBtn)
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset the entire board? This cannot be undone.')) {
        app.components = [];
        app.connections = [];
        app.selectedComponent = null;
        app.hideDatasheet();
      }
    });

  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) exportBtn.addEventListener('click', () => app.exportProject());
}

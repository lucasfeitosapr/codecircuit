// Project: Motherboard MVP - Main Application
// A visual task management system using circuit board metaphors

class MotherboardApp {
  constructor() {
    this.canvas = document.getElementById('circuit-board');
    this.ctx = this.canvas.getContext('2d');
    this.components = [];
    this.connections = [];
    this.selectedComponent = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.lastTime = 0;
    this.fps = 0;
    this.isConnecting = false;
    this.connectionStart = null;
    this.mousePos = { x: 0, y: 0 };

    // View management for schematic navigation
    this.viewStack = []; // Stack of views for navigation
    this.currentView = {
      type: 'main', // 'main' or 'schematic'
      component: null, // For schematic views, which module we're inside
      camera: { x: 0, y: 0, zoom: 1 },
      components: [], // Components visible in this view
      connections: [], // Connections visible in this view
    };
    this.isTransitioning = false;

    this.componentTypes = {
      'power-core': {
        name: 'Power Core',
        icon: '✨',
        color: '#ffaa00',
        width: 80,
        height: 40,
        pins: { output: [{ x: 80, y: 20, type: 'energy' }] },
      },
      'module-ic': {
        name: 'Module IC',
        icon: '⬛',
        color: '#4444ff',
        width: 100,
        height: 60,
        pins: {
          input: [{ x: 0, y: 30, type: 'energy' }],
          output: [{ x: 100, y: 30, type: 'energy' }],
        },
      },
      'task-resistor': {
        name: 'Task Resistor',
        icon: '▬▬',
        color: '#ff4444',
        width: 60,
        height: 20,
        pins: {
          input: [{ x: 0, y: 10, type: 'energy' }],
          output: [{ x: 60, y: 10, type: 'energy' }],
        },
      },
    };

    this.categories = {
      frontend: { name: 'Frontend', color: '#00ff88' },
      backend: { name: 'Backend', color: '#4488ff' },
      database: { name: 'Database', color: '#ffaa00' },
      security: { name: 'Security', color: '#ff0088' },
      testing: { name: 'Testing', color: '#88ff00' },
      devops: { name: 'DevOps', color: '#ff8800' },
      design: { name: 'Design', color: '#aa44ff' },
      research: { name: 'Research', color: '#00aaff' },
    };

    this.init();
    this.initializeMainView();
  }

  initializeMainView() {
    // Set up the main board view
    this.currentView = {
      type: 'main',
      component: null,
      camera: { x: 0, y: 0, zoom: 1 },
      components: this.components,
      connections: this.connections,
    };
    this.updateViewIndicator();
  }

  init() {
    this.setupCanvas();
    this.setupEventListeners();
    this.setupUI();
    this.animate();
  }

  setupCanvas() {
    const resizeCanvas = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * window.devicePixelRatio;
      this.canvas.height = rect.height * window.devicePixelRatio;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  setupEventListeners() {
    // Component dragging from parts tray
    document.querySelectorAll('.component-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', item.dataset.component);
      });
      item.setAttribute('draggable', 'true');
    });

    // Canvas drop zone
    this.canvas.addEventListener('dragover', e => {
      e.preventDefault();
    });

    this.canvas.addEventListener('drop', e => {
      e.preventDefault();
      const componentType = e.dataTransfer.getData('text/plain');
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
      const y = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;
      this.addComponent(componentType, x, y);
    });

    // Canvas interaction
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this));
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Track mouse position for connection drawing
    this.canvas.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePos = {
        x: (e.clientX - rect.left - this.camera.x) / this.camera.zoom,
        y: (e.clientY - rect.top - this.camera.y) / this.camera.zoom,
      };
    });

    // UI controls
    document.getElementById('back-btn').addEventListener('click', () => {
      this.exitSchematicView();
    });

    document.getElementById('help-btn').addEventListener('click', () => {
      document.getElementById('help-overlay').classList.add('active');
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('Reset the entire board? This cannot be undone.')) {
        this.components = [];
        this.connections = [];
        this.selectedComponent = null;
        this.hideDatasheet();
      }
    });

    document.getElementById('export-btn').addEventListener('click', () => {
      this.exportProject();
    });
  }

  setupUI() {
    // Close help overlay when clicking outside
    document.getElementById('help-overlay').addEventListener('click', e => {
      if (e.target.id === 'help-overlay') {
        e.target.classList.remove('active');
      }
    });
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
    const mouseY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

    if (e.button === 2) {
      // Right click - panning
      this.isPanning = true;
      this.panStart = { x: e.clientX - this.camera.x, y: e.clientY - this.camera.y };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Check if clicking on a pin first
    const pinHit = this.getPinAt(mouseX, mouseY);
    if (pinHit) {
      if (this.isConnecting && this.connectionStart) {
        // End connection
        this.createConnection(this.connectionStart, pinHit);
        this.isConnecting = false;
        this.connectionStart = null;
        this.canvas.style.cursor = 'grab';
        this.updateConnectionModeUI();
      } else {
        // Start connection
        this.isConnecting = true;
        this.connectionStart = pinHit;
        this.canvas.style.cursor = 'crosshair';
        this.updateConnectionModeUI();
      }
      return;
    }

    // Check if clicking on a component
    const clickedComponent = this.getComponentAt(mouseX, mouseY);

    if (clickedComponent) {
      if (e.detail === 2) {
        // Double click
        if (clickedComponent.type === 'module-ic') {
          // Enter schematic view
          this.enterSchematicView(clickedComponent);
        } else {
          // Toggle status for other components
          this.toggleComponentStatus(clickedComponent);
        }
      } else {
        // Single click - select
        this.selectedComponent = clickedComponent;
        this.showDatasheet(clickedComponent);
        this.isDragging = true;
        this.dragOffset = {
          x: mouseX - clickedComponent.x,
          y: mouseY - clickedComponent.y,
        };
      }
    } else {
      this.selectedComponent = null;
      this.hideDatasheet();
      // Cancel connection if clicking on empty space
      if (this.isConnecting) {
        this.isConnecting = false;
        this.connectionStart = null;
        this.canvas.style.cursor = 'grab';
        this.updateConnectionModeUI();
      }
    }
  }

  onMouseMove(e) {
    if (this.isPanning) {
      this.camera.x = e.clientX - this.panStart.x;
      this.camera.y = e.clientY - this.panStart.y;
      return;
    }

    if (this.isDragging && this.selectedComponent) {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
      const mouseY = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

      this.selectedComponent.x = mouseX - this.dragOffset.x;
      this.selectedComponent.y = mouseY - this.dragOffset.y;
    }
  }

  onMouseUp(e) {
    if (this.isPanning) {
      this.isPanning = false;
      this.canvas.style.cursor = 'grab';
    }
    this.isDragging = false;
  }

  onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - this.camera.x) / this.camera.zoom;
    const worldY = (mouseY - this.camera.y) / this.camera.zoom;

    this.camera.zoom = Math.max(0.1, Math.min(3, this.camera.zoom * zoomFactor));

    this.camera.x = mouseX - worldX * this.camera.zoom;
    this.camera.y = mouseY - worldY * this.camera.zoom;
  }

  addComponent(type, x, y) {
    const template = this.componentTypes[type];
    if (!template) return;

    // In schematic view, only allow Task Resistors
    if (this.currentView.type === 'schematic' && type !== 'task-resistor') {
      console.log('Only Task Resistors allowed in schematic view');
      return;
    }

    const components = this.getCurrentViewComponents();
    const component = {
      id: this.generateId(),
      type: type,
      x: x,
      y: y,
      ...template,
      status: 'todo', // todo, in-progress, done
      title: `${template.name} ${components.length + 1}`,
      description: '',
      category: 'frontend', // Default category
      createdAt: new Date(),
    };

    // Add internal components and connections for Module ICs
    if (type === 'module-ic') {
      component.internalComponents = [];
      component.internalConnections = [];
    }

    components.push(component);
    this.selectedComponent = component;
    this.showDatasheet(component);
  }

  getComponentAt(x, y) {
    const components = this.getCurrentViewComponents();
    for (let i = components.length - 1; i >= 0; i--) {
      const comp = components[i];
      if (x >= comp.x && x <= comp.x + comp.width && y >= comp.y && y <= comp.y + comp.height) {
        return comp;
      }
    }
    return null;
  }

  getPinAt(x, y) {
    const pinRadius = 8; // Hit detection radius
    const components = this.getCurrentViewComponents();

    for (const component of components) {
      // Check input pins
      if (component.pins.input) {
        for (let i = 0; i < component.pins.input.length; i++) {
          const pin = component.pins.input[i];
          const pinX = component.x + pin.x;
          const pinY = component.y + pin.y;

          if (Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2) < pinRadius) {
            return {
              component: component,
              pinType: 'input',
              pinIndex: i,
              x: pinX,
              y: pinY,
              category: component.category || 'frontend',
            };
          }
        }
      }

      // Check output pins
      if (component.pins.output) {
        for (let i = 0; i < component.pins.output.length; i++) {
          const pin = component.pins.output[i];
          const pinX = component.x + pin.x;
          const pinY = component.y + pin.y;

          if (Math.sqrt((x - pinX) ** 2 + (y - pinY) ** 2) < pinRadius) {
            return {
              component: component,
              pinType: 'output',
              pinIndex: i,
              x: pinX,
              y: pinY,
              category: component.category || 'frontend',
            };
          }
        }
      }
    }
    return null;
  }

  getCurrentViewComponents() {
    return this.currentView.components;
  }

  getCurrentViewConnections() {
    return this.currentView.connections;
  }

  createConnection(startPin, endPin) {
    // Prevent connecting to the same component
    if (startPin.component === endPin.component) return;

    // Prevent output to output or input to input connections
    if (startPin.pinType === endPin.pinType) return;

    // Ensure we're connecting output to input
    let outputPin, inputPin;
    if (startPin.pinType === 'output') {
      outputPin = startPin;
      inputPin = endPin;
    } else {
      outputPin = endPin;
      inputPin = startPin;
    }

    const connections = this.getCurrentViewConnections();

    // Check for existing connection
    const existingConnection = connections.find(
      conn =>
        conn.from.component === outputPin.component &&
        conn.from.pinIndex === outputPin.pinIndex &&
        conn.to.component === inputPin.component &&
        conn.to.pinIndex === inputPin.pinIndex
    );

    if (existingConnection) return;

    // Create new connection
    const connection = {
      id: this.generateId(),
      from: outputPin,
      to: inputPin,
      category: outputPin.category, // Connection inherits category from output
      createdAt: new Date(),
    };

    connections.push(connection);
  }

  toggleComponentStatus(component) {
    const statusCycle = ['todo', 'in-progress', 'done'];
    const currentIndex = statusCycle.indexOf(component.status);
    const nextIndex = (currentIndex + 1) % statusCycle.length;
    component.status = statusCycle[nextIndex];

    if (this.selectedComponent === component) {
      this.showDatasheet(component);
    }
  }

  showDatasheet(component) {
    const panel = document.getElementById('datasheet-panel');
    const title = document.getElementById('datasheet-title');
    const content = document.getElementById('datasheet-content');

    title.textContent = `${component.icon} ${component.name}`;

    const statusOptions = ['todo', 'in-progress', 'done'];
    const statusLabels = {
      todo: 'TODO',
      'in-progress': 'IN PROGRESS',
      done: 'DONE',
    };

    const categoryOptions = Object.entries(this.categories)
      .map(
        ([key, cat]) =>
          `<option value="${key}" ${component.category === key ? 'selected' : ''} style="color: ${
            cat.color
          }">
                ${cat.name}
            </option>`
      )
      .join('');

    content.innerHTML = `
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="comp-title" value="${component.title}" />
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="comp-status">
                    ${statusOptions
                      .map(
                        status =>
                          `<option value="${status}" ${
                            component.status === status ? 'selected' : ''
                          }>
                            ${statusLabels[status]}
                        </option>`
                      )
                      .join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Category <span style="font-size: 10px; opacity: 0.7;">(affects pin color)</span></label>
                <select id="comp-category" style="color: ${
                  this.categories[component.category].color
                };">
                    ${categoryOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea id="comp-description" rows="4">${component.description}</textarea>
            </div>
            <div style="margin-top: 20px; font-size: 12px; opacity: 0.7;">
                Created: ${component.createdAt.toLocaleString()}
            </div>
            <button class="control-btn" id="delete-component" style="width: 100%; margin-top: 15px; background: rgba(255, 0, 0, 0.2); border-color: #ff4444;">
                Delete Component
            </button>
        `;

    // Add event listeners
    document.getElementById('comp-title').addEventListener('input', e => {
      component.title = e.target.value;
    });

    document.getElementById('comp-status').addEventListener('change', e => {
      component.status = e.target.value;
    });

    document.getElementById('comp-category').addEventListener('change', e => {
      component.category = e.target.value;
      // Update select color
      e.target.style.color = this.categories[component.category].color;
    });

    document.getElementById('comp-description').addEventListener('input', e => {
      component.description = e.target.value;
    });

    document.getElementById('delete-component').addEventListener('click', () => {
      if (confirm('Delete this component? This will also remove all connected traces.')) {
        // Remove connections involving this component
        this.connections = this.connections.filter(
          conn => conn.from.component !== component && conn.to.component !== component
        );
        // Remove component
        this.components = this.components.filter(c => c.id !== component.id);
        this.hideDatasheet();
        this.selectedComponent = null;
      }
    });

    panel.classList.add('active');
  }

  hideDatasheet() {
    document.getElementById('datasheet-panel').classList.remove('active');
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  exportProject() {
    const projectData = {
      name: 'Motherboard Project',
      created: new Date().toISOString(),
      components: this.components,
      connections: this.connections,
      version: '1.0.0',
    };

    const dataStr = JSON.stringify(projectData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'motherboard-project.json';
    link.click();

    URL.revokeObjectURL(url);
  }

  drawGrid() {
    const gridSize = 50 * this.camera.zoom;
    const startX = -this.camera.x % gridSize;
    const startY = -this.camera.y % gridSize;

    this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = startX; x < this.canvas.width / window.devicePixelRatio; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height / window.devicePixelRatio);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y < this.canvas.height / window.devicePixelRatio; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width / window.devicePixelRatio, y);
      this.ctx.stroke();
    }
  }

  drawSchematicBackground() {
    // Different grid pattern for schematic view
    const gridSize = 40 * this.camera.zoom;
    const startX = -this.camera.x % gridSize;
    const startY = -this.camera.y % gridSize;

    this.ctx.strokeStyle = 'rgba(100, 150, 255, 0.15)';
    this.ctx.lineWidth = 1;

    // Draw a finer grid for schematic view
    for (let x = startX; x < this.canvas.width / window.devicePixelRatio; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height / window.devicePixelRatio);
      this.ctx.stroke();
    }

    for (let y = startY; y < this.canvas.height / window.devicePixelRatio; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width / window.devicePixelRatio, y);
      this.ctx.stroke();
    }

    // Add subtle background tint for schematic view
    this.ctx.fillStyle = 'rgba(50, 100, 150, 0.02)';
    this.ctx.fillRect(
      0,
      0,
      this.canvas.width / window.devicePixelRatio,
      this.canvas.height / window.devicePixelRatio
    );
  }

  drawTransitionOverlay() {
    // Simple overlay during transitions
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    this.ctx.fillRect(
      0,
      0,
      this.canvas.width / window.devicePixelRatio,
      this.canvas.height / window.devicePixelRatio
    );
  }

  drawComponent(component) {
    const screenX = component.x * this.camera.zoom + this.camera.x;
    const screenY = component.y * this.camera.zoom + this.camera.y;
    const screenWidth = component.width * this.camera.zoom;
    const screenHeight = component.height * this.camera.zoom;

    // Component body
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(screenX, screenY, screenWidth, screenHeight);

    // Component border based on status
    let borderColor = component.color;
    let glowIntensity = 0;

    switch (component.status) {
      case 'todo':
        borderColor = component.color + '66'; // Semi-transparent
        break;
      case 'in-progress':
        borderColor = '#ff00ff';
        glowIntensity = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
        break;
      case 'done':
        borderColor = '#00ff88';
        glowIntensity = 0.8;
        break;
    }

    this.ctx.strokeStyle = borderColor;
    this.ctx.lineWidth = 2;

    if (glowIntensity > 0) {
      this.ctx.shadowColor = borderColor;
      this.ctx.shadowBlur = 15 * glowIntensity;
    }

    this.ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
    this.ctx.shadowBlur = 0;

    // Selection highlight
    if (this.selectedComponent === component) {
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(screenX - 2, screenY - 2, screenWidth + 4, screenHeight + 4);
      this.ctx.setLineDash([]);
    }

    // Component icon and text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `${16 * this.camera.zoom}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    const centerX = screenX + screenWidth / 2;
    const centerY = screenY + screenHeight / 2;

    this.ctx.fillText(component.icon, centerX, centerY - 5 * this.camera.zoom);

    // Component title (if there's space)
    if (screenHeight > 40) {
      this.ctx.font = `${10 * this.camera.zoom}px monospace`;
      this.ctx.fillText(component.title, centerX, centerY + 15 * this.camera.zoom);
    }

    // Draw pins
    this.drawPins(component, screenX, screenY);

    // Energy particles for in-progress components
    if (component.status === 'in-progress') {
      this.drawEnergyParticles(component, screenX, screenY, screenWidth, screenHeight);
    }
  }

  drawPins(component, screenX, screenY) {
    const pinSize = 4 * this.camera.zoom;
    const categoryColor = this.categories[component.category]?.color || '#ffaa00';
    const isActive = component.status === 'in-progress' || component.status === 'done';

    this.ctx.fillStyle = categoryColor;

    // Enhanced glow effect for active components
    if (isActive) {
      this.ctx.shadowColor = categoryColor;
      this.ctx.shadowBlur =
        component.status === 'done' ? 10 * this.camera.zoom : 6 * this.camera.zoom;
    } else {
      this.ctx.shadowBlur = 3 * this.camera.zoom;
      this.ctx.shadowColor = categoryColor;
    }

    // Draw input pins
    if (component.pins.input) {
      component.pins.input.forEach((pin, index) => {
        const pinX = screenX + pin.x * this.camera.zoom;
        const pinY = screenY + pin.y * this.camera.zoom;

        // Check if this pin has incoming active connections
        const connections = this.getCurrentViewConnections();
        const hasActiveInput = connections.some(
          conn =>
            conn.to.component === component &&
            conn.to.pinIndex === index &&
            (conn.from.component.status === 'in-progress' || conn.from.component.status === 'done')
        );

        if (hasActiveInput) {
          // Draw pulsing effect for pins receiving data (smoother pulse)
          const pulseIntensity = 0.7 + 0.3 * Math.sin(Date.now() * 0.004);
          this.ctx.shadowBlur = 10 * this.camera.zoom * pulseIntensity;

          // Draw larger glowing pin
          this.ctx.fillRect(
            pinX - pinSize * 0.6,
            pinY - pinSize * 0.6,
            pinSize * 1.2,
            pinSize * 1.2
          );
        } else {
          this.ctx.fillRect(pinX - pinSize / 2, pinY - pinSize / 2, pinSize, pinSize);
        }
      });
    }

    // Draw output pins
    if (component.pins.output) {
      component.pins.output.forEach((pin, index) => {
        const pinX = screenX + pin.x * this.camera.zoom;
        const pinY = screenY + pin.y * this.camera.zoom;

        // Check if this pin has outgoing active connections
        const connections = this.getCurrentViewConnections();
        const hasActiveOutput =
          connections.some(
            conn => conn.from.component === component && conn.from.pinIndex === index
          ) && isActive;

        if (hasActiveOutput) {
          // Draw enhanced effect for pins sending data (smoother pulse)
          const pulseIntensity =
            component.status === 'done' ? 1.0 : 0.6 + 0.4 * Math.sin(Date.now() * 0.003);
          this.ctx.shadowBlur = 12 * this.camera.zoom * pulseIntensity;

          // Draw larger glowing pin with gentler pulse effect
          const size = pinSize * (1.1 + 0.05 * Math.sin(Date.now() * 0.005));
          this.ctx.fillRect(pinX - size / 2, pinY - size / 2, size, size);
        } else {
          this.ctx.fillRect(pinX - pinSize / 2, pinY - pinSize / 2, pinSize, pinSize);
        }
      });
    }

    this.ctx.shadowBlur = 0;
  }

  drawEnergyParticles(component, screenX, screenY, screenWidth, screenHeight) {
    const time = Date.now() * 0.0008; // Slower internal particle movement
    const particleCount = 3;
    const categoryColor = this.categories[component.category]?.color || '#ff00ff';

    for (let i = 0; i < particleCount; i++) {
      const phase = (time + i * 0.6) % 2; // More spaced out timing
      let x, y, alpha;

      if (phase < 1.2) {
        // Particles flowing horizontally with smooth motion
        const progress = phase / 1.2;
        const smoothProgress = progress * progress * (3 - 2 * progress); // Smooth curve
        x = screenX + screenWidth * smoothProgress;
        y = screenY + screenHeight / 2 + Math.sin(time * 2 + i) * 2; // Gentler wave
        alpha = 0.8 - progress * 0.2;
      } else {
        // Particles fading out more gradually
        const fadePhase = (phase - 1.2) / 0.8;
        x = screenX + screenWidth;
        y = screenY + screenHeight / 2;
        alpha = 0.6 * (1 - fadePhase);
      }

      this.ctx.fillStyle = `rgba(${this.hexToRgb(categoryColor)}, ${alpha})`;
      this.ctx.shadowColor = categoryColor;
      this.ctx.shadowBlur = 4 * this.camera.zoom * alpha;

      const size = (2 + Math.sin(time * 3 + i) * 0.3) * this.camera.zoom;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.shadowBlur = 0;
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(
      0,
      0,
      this.canvas.width / window.devicePixelRatio,
      this.canvas.height / window.devicePixelRatio
    );

    // Draw different background for schematic view
    if (this.currentView.type === 'schematic') {
      this.drawSchematicBackground();
    } else {
      this.drawGrid();
    }

    // Draw connections
    this.drawConnections();

    // Draw temporary connection line
    if (this.isConnecting && this.connectionStart) {
      this.drawTempConnection();
    }

    // Draw components from current view
    const components = this.getCurrentViewComponents();
    components.forEach(component => {
      this.drawComponent(component);
    });

    // Draw transition overlay if transitioning
    if (this.isTransitioning) {
      this.drawTransitionOverlay();
    }
  }

  drawConnections() {
    const connections = this.getCurrentViewConnections();
    connections.forEach(connection => {
      // Dynamically calculate pin positions based on current component positions
      const fromPin = connection.from;
      const toPin = connection.to;

      // Get current pin positions
      const fromComponent = fromPin.component;
      const toComponent = toPin.component;

      const fromPinDef = fromComponent.pins.output[fromPin.pinIndex];
      const toPinDef = toComponent.pins.input[toPin.pinIndex];

      const fromX = (fromComponent.x + fromPinDef.x) * this.camera.zoom + this.camera.x;
      const fromY = (fromComponent.y + fromPinDef.y) * this.camera.zoom + this.camera.y;
      const toX = (toComponent.x + toPinDef.x) * this.camera.zoom + this.camera.x;
      const toY = (toComponent.y + toPinDef.y) * this.camera.zoom + this.camera.y;

      const categoryColor = this.categories[connection.category]?.color || '#00ff88';

      // Check if connection should be active (source is in-progress or done)
      const isActive =
        connection.from.component.status === 'in-progress' ||
        connection.from.component.status === 'done';
      const isPowered = connection.from.component.status === 'done';

      // Draw background trace (always visible)
      this.drawTraceBackground(fromX, fromY, toX, toY, categoryColor, isActive);

      if (isActive) {
        // Draw glowing active trace
        this.drawActiveTrace(fromX, fromY, toX, toY, categoryColor, isPowered);

        // Draw data flow particles
        this.drawDataFlow(connection, fromX, fromY, toX, toY, categoryColor, isPowered);
      }
    });
  }

  drawTempConnection() {
    const fromX = this.connectionStart.x * this.camera.zoom + this.camera.x;
    const fromY = this.connectionStart.y * this.camera.zoom + this.camera.y;
    const toX = this.mousePos.x * this.camera.zoom + this.camera.x;
    const toY = this.mousePos.y * this.camera.zoom + this.camera.y;

    const categoryColor = this.categories[this.connectionStart.category]?.color || '#00ff88';

    this.ctx.strokeStyle = categoryColor + '80'; // Semi-transparent
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.drawOrthogonalTrace(fromX, fromY, toX, toY);

    this.ctx.setLineDash([]);
  }

  drawOrthogonalTrace(fromX, fromY, toX, toY) {
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);

    // Create 90-degree routing (like PCB traces)
    const midX = fromX + (toX - fromX) * 0.7;

    this.ctx.lineTo(midX, fromY);
    this.ctx.lineTo(midX, toY);
    this.ctx.lineTo(toX, toY);

    this.ctx.stroke();
  }

  drawTraceBackground(fromX, fromY, toX, toY, color, isActive) {
    // Draw the background trace
    this.ctx.strokeStyle = isActive ? color + '40' : color + '20'; // More transparent when inactive
    this.ctx.lineWidth = 2;
    this.ctx.shadowBlur = 0;

    this.drawOrthogonalTrace(fromX, fromY, toX, toY);
  }

  drawActiveTrace(fromX, fromY, toX, toY, color, isPowered) {
    // Draw the glowing active trace with smoother pulsing
    const glowIntensity = isPowered ? 1.0 : 0.6;
    const pulseEffect = isPowered ? 1.0 : 0.7 + 0.3 * Math.sin(Date.now() * 0.003); // Slower pulse

    // Multiple glow layers for better effect
    for (let i = 0; i < 3; i++) {
      this.ctx.strokeStyle =
        color +
        Math.floor((70 - i * 15) * glowIntensity * pulseEffect)
          .toString(16)
          .padStart(2, '0');
      this.ctx.lineWidth = (3 - i * 0.5) * this.camera.zoom; // Gentler width variation
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = (12 - i * 3) * glowIntensity * pulseEffect; // Softer glow

      this.drawOrthogonalTrace(fromX, fromY, toX, toY);
    }

    this.ctx.shadowBlur = 0;
  }

  drawDataFlow(connection, fromX, fromY, toX, toY, color, isPowered) {
    const time = Date.now() * 0.0015; // Slower base speed
    const speed = isPowered ? 0.6 : 0.3; // Much slower flow rates
    const particleCount = isPowered ? 4 : 3; // Fewer particles for cleaner look
    const particleSize = isPowered ? 2.5 : 2;

    // Calculate path points (same as orthogonal trace)
    const midX = fromX + (toX - fromX) * 0.7;
    const pathPoints = [
      { x: fromX, y: fromY },
      { x: midX, y: fromY },
      { x: midX, y: toY },
      { x: toX, y: toY },
    ];

    // Draw flowing data packets with smoother spacing
    for (let i = 0; i < particleCount; i++) {
      const offset = (time * speed + i * 0.35) % 1; // More spaced out
      const pos = this.getPointOnPath(pathPoints, offset);

      // Smooth alpha transition
      const alpha = 0.9 * (1 - Math.pow(offset, 1.5)); // Smoother fade
      this.ctx.fillStyle = `rgba(${this.hexToRgb(color)}, ${alpha})`;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 6 * this.camera.zoom * alpha;

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, particleSize * this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();

      // Smoother trailing effect
      for (let j = 1; j <= 2; j++) {
        // Fewer trail particles
        const trailOffset = Math.max(0, offset - j * 0.08); // More spaced trails
        if (trailOffset > 0) {
          const trailPos = this.getPointOnPath(pathPoints, trailOffset);
          const trailAlpha = alpha * (0.5 - j * 0.2);
          const trailSize = particleSize * (0.8 - j * 0.2);

          this.ctx.fillStyle = `rgba(${this.hexToRgb(color)}, ${trailAlpha})`;
          this.ctx.shadowBlur = 3 * this.camera.zoom * trailAlpha;

          this.ctx.beginPath();
          this.ctx.arc(trailPos.x, trailPos.y, trailSize * this.camera.zoom, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }

    // Less frequent data bursts for smoother look
    if (isPowered && Math.random() < 0.03) {
      // Reduced from 0.1 to 0.03
      const burstOffset = Math.random();
      const burstPos = this.getPointOnPath(pathPoints, burstOffset);

      this.ctx.fillStyle = `rgba(${this.hexToRgb(color)}, 0.6)`;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 12 * this.camera.zoom;

      this.ctx.beginPath();
      this.ctx.arc(burstPos.x, burstPos.y, 4 * this.camera.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.shadowBlur = 0;
  }

  getPointOnPath(points, ratio) {
    // Calculate total length
    const lengths = [];
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const length = Math.sqrt(dx * dx + dy * dy);
      lengths.push(length);
      totalLength += length;
    }

    // Find target distance
    const targetDistance = ratio * totalLength;

    // Find which segment contains the target point
    let currentDistance = 0;
    for (let i = 0; i < lengths.length; i++) {
      if (currentDistance + lengths[i] >= targetDistance) {
        const segmentRatio = (targetDistance - currentDistance) / lengths[i];
        return {
          x: points[i].x + (points[i + 1].x - points[i].x) * segmentRatio,
          y: points[i].y + (points[i + 1].y - points[i].y) * segmentRatio,
        };
      }
      currentDistance += lengths[i];
    }

    return points[points.length - 1];
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 255, 136';
  }

  updateConnectionModeUI() {
    const indicator = document.getElementById('connection-mode');
    if (this.isConnecting) {
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }

  // Schematic View Navigation Methods
  enterSchematicView(moduleComponent) {
    if (this.isTransitioning) return;

    // Save current view state
    const currentViewState = {
      type: this.currentView.type,
      component: this.currentView.component,
      camera: { ...this.camera },
      selectedComponent: this.selectedComponent,
    };
    this.viewStack.push(currentViewState);

    // Initialize internal components if they don't exist
    if (!moduleComponent.internalComponents) {
      moduleComponent.internalComponents = [];
      moduleComponent.internalConnections = [];
    }

    // Switch to schematic view
    this.isTransitioning = true;
    this.hideDatasheet();
    this.selectedComponent = null;

    // Animate transition
    this.animateToSchematicView(moduleComponent, () => {
      this.currentView = {
        type: 'schematic',
        component: moduleComponent,
        camera: { x: 0, y: 0, zoom: 1 },
        components: moduleComponent.internalComponents,
        connections: moduleComponent.internalConnections,
      };

      // Update camera to schematic view
      this.camera = { ...this.currentView.camera };
      this.isTransitioning = false;
      this.updateBreadcrumbs();
    });
  }

  exitSchematicView() {
    if (this.isTransitioning || this.viewStack.length === 0) return;

    // Save current schematic state
    if (this.currentView.type === 'schematic' && this.currentView.component) {
      this.currentView.component.internalComponents = [...this.currentView.components];
      this.currentView.component.internalConnections = [...this.currentView.connections];
    }

    // Restore previous view
    const previousView = this.viewStack.pop();
    this.isTransitioning = true;
    this.hideDatasheet();
    this.selectedComponent = null;

    this.animateToMainView(() => {
      this.currentView = {
        type: previousView.type,
        component: previousView.component,
        camera: { ...previousView.camera },
        components:
          previousView.type === 'main'
            ? this.components
            : previousView.component.internalComponents,
        connections:
          previousView.type === 'main'
            ? this.connections
            : previousView.component.internalConnections,
      };

      this.camera = { ...previousView.camera };
      this.selectedComponent = previousView.selectedComponent;
      this.isTransitioning = false;
      this.updateBreadcrumbs();
    });
  }

  animateToSchematicView(moduleComponent, callback) {
    // Simple transition for now - could be enhanced with smooth camera movement
    const targetX = this.canvas.width / (2 * window.devicePixelRatio);
    const targetY = this.canvas.height / (2 * window.devicePixelRatio);

    // Quick fade-like effect by adjusting camera
    let steps = 10;
    let currentStep = 0;

    const animate = () => {
      currentStep++;
      const progress = currentStep / steps;

      // Simple zoom out then in effect
      if (progress < 0.5) {
        this.camera.zoom = 1 - progress;
      } else {
        this.camera.zoom = (progress - 0.5) * 2;
      }

      if (currentStep < steps) {
        requestAnimationFrame(animate);
      } else {
        this.camera.zoom = 1;
        this.camera.x = 0;
        this.camera.y = 0;
        callback();
      }
    };

    requestAnimationFrame(animate);
  }

  animateToMainView(callback) {
    // Simple transition back to main view
    let steps = 10;
    let currentStep = 0;

    const animate = () => {
      currentStep++;
      const progress = currentStep / steps;

      // Simple fade effect
      if (progress < 0.5) {
        this.camera.zoom = 1 - progress * 0.5;
      } else {
        this.camera.zoom = 0.5 + (progress - 0.5);
      }

      if (currentStep < steps) {
        requestAnimationFrame(animate);
      } else {
        callback();
      }
    };

    requestAnimationFrame(animate);
  }

  updateBreadcrumbs() {
    // Update the breadcrumb navigation in the UI
    this.updateViewIndicator();
  }

  updateViewIndicator() {
    // Update UI to show current view context
    const logo = document.querySelector('.logo');
    const backBtn = document.getElementById('back-btn');

    if (this.currentView.type === 'main') {
      logo.textContent = '⚡ Project: Motherboard';
      backBtn.style.display = 'none';
    } else if (this.currentView.type === 'schematic') {
      logo.textContent = `⚡ ${this.currentView.component.title} [Schematic]`;
      backBtn.style.display = 'inline-block';
    }
  }

  updateFPS(currentTime) {
    if (this.lastTime) {
      const delta = currentTime - this.lastTime;
      this.fps = Math.round(1000 / delta);
      document.getElementById('fps-counter').textContent = `FPS: ${this.fps}`;
    }
    this.lastTime = currentTime;
  }

  animate(currentTime) {
    this.updateFPS(currentTime);
    this.render();
    requestAnimationFrame(this.animate.bind(this));
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new MotherboardApp();
  console.log('🚀 Project: Motherboard MVP initialized');
  console.log('💡 Drag components from the Parts Tray to get started!');
});

// Export for potential module use
window.MotherboardApp = MotherboardApp;

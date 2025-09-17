export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getCurrentViewComponents(app: any) {
  return app.currentView.components;
}

export function getCurrentViewConnections(app: any) {
  return app.currentView.connections;
}

export function addComponent(app: any, type: string, x: number, y: number) {
  const template = app.componentTypes[type];
  if (!template) return;
  if (app.currentView.type === 'schematic' && type !== 'task-resistor') {
    console.log('Only Task Resistors allowed in schematic view');
    return;
  }

  const components = getCurrentViewComponents(app);
  const component: any = {
    id: generateId(),
    type,
    x,
    y,
    ...template,
    status: 'todo',
    title: `${template.name} ${components.length + 1}`,
    description: '',
    category: 'frontend',
    createdAt: new Date(),
  };

  if (type === 'module-ic') {
    component.internalComponents = [];
    component.internalConnections = [];
  }

  components.push(component);
  app.selectedComponent = component;
  if (typeof app.showDatasheet === 'function') app.showDatasheet(component);
}

export function getComponentAt(app: any, x: number, y: number) {
  const components = getCurrentViewComponents(app);
  for (let i = components.length - 1; i >= 0; i--) {
    const comp = components[i];
    if (x >= comp.x && x <= comp.x + comp.width && y >= comp.y && y <= comp.y + comp.height) {
      return comp;
    }
  }
  return null;
}

export function getPinAt(app: any, x: number, y: number) {
  const pinRadius = 8;
  const components = getCurrentViewComponents(app);

  for (const component of components) {
    if (component.pins?.input) {
      for (let i = 0; i < component.pins.input.length; i++) {
        const pin = component.pins.input[i];
        const pinX = component.x + pin.x;
        const pinY = component.y + pin.y;
        if (Math.hypot(x - pinX, y - pinY) < pinRadius) {
          return {
            component,
            pinType: 'input',
            pinIndex: i,
            x: pinX,
            y: pinY,
            category: component.category || 'frontend',
          };
        }
      }
    }

    if (component.pins?.output) {
      for (let i = 0; i < component.pins.output.length; i++) {
        const pin = component.pins.output[i];
        const pinX = component.x + pin.x;
        const pinY = component.y + pin.y;
        if (Math.hypot(x - pinX, y - pinY) < pinRadius) {
          return {
            component,
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

export function exportProject(app: any) {
  const projectData = {
    name: 'Motherboard Project',
    created: new Date().toISOString(),
    components: app.components,
    connections: app.connections,
    version: '1.0.0',
  };
  return JSON.stringify(projectData, null, 2);
}

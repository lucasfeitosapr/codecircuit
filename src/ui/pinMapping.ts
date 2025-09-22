// Extracted Pin Mapping UI and handlers from main.ts
// Minimal typing used to avoid coupling; these can be tightened later.

export function showPinMappingUI(app: any, moduleComponent: any) {
  const panel = document.getElementById('datasheet-panel') as HTMLElement | null;
  const titleEl = document.getElementById('datasheet-title') as HTMLElement | null;
  const content = document.getElementById('datasheet-content') as HTMLElement | null;

  if (!panel || !titleEl || !content) return;

  titleEl.textContent = `🔌 Pin Mapping: ${moduleComponent.title || moduleComponent.name}`;

  // Initialize pinMap if it doesn't exist
  if (!moduleComponent.pinMap) {
    moduleComponent.pinMap = { input: [], output: [] };
  }

  const inputPins = moduleComponent.pins.input || [];
  const outputPins = moduleComponent.pins.output || [];
  const internalComponents = moduleComponent.internalComponents || [];

  content.innerHTML = `
      <div class="pin-mapping-container">
        <div class="pin-section">
          <h4>🔵 Input Pins</h4>
          <div id="input-pins">
            ${inputPins
              .map(
                (pin: any, index: number) => `
              <div class="pin-config" data-pin-type="input" data-pin-index="${index}">
                <div class="pin-header">
                  <span>Input ${index + 1}</span>
                  <button class="pin-remove-btn">×</button>
                </div>
                <label>Label:</label>
                <input type="text" class="pin-label" value="${pin.label || ''}" placeholder="Pin label">
                <label>Type:</label>
                <select class="pin-type">
                  <option value="energy" ${pin.type === 'energy' ? 'selected' : ''}>Energy</option>
                  <option value="data" ${pin.type === 'data' ? 'selected' : ''}>Data</option>
                  <option value="control" ${pin.type === 'control' ? 'selected' : ''}>Control</option>
                </select>
                <label>Connect to internal:</label>
                <select class="pin-mapping">
                  <option value="">-- Not connected --</option>
                  ${internalComponents
                    .map(
                      (comp: any) =>
                        comp.pins.input
                          ?.map(
                            (internalPin: any, internalIndex: number) =>
                              `<option value="${comp.id}:input:${internalIndex}">${comp.title || comp.name} Input ${internalIndex + 1}</option>`
                          )
                          .join('') || ''
                    )
                    .join('')}
                </select>
              </div>
            `
              )
              .join('')}
          </div>
          <button class="control-btn add-pin-btn" id="add-input-pin">+ Add Input Pin</button>
        </div>

        <div class="pin-section">
          <h4>🔴 Output Pins</h4>
          <div id="output-pins">
            ${outputPins
              .map(
                (pin: any, index: number) => `
              <div class="pin-config" data-pin-type="output" data-pin-index="${index}">
                <div class="pin-header">
                  <span>Output ${index + 1}</span>
                  <button class="pin-remove-btn">×</button>
                </div>
                <label>Label:</label>
                <input type="text" class="pin-label" value="${pin.label || ''}" placeholder="Pin label">
                <label>Type:</label>
                <select class="pin-type">
                  <option value="energy" ${pin.type === 'energy' ? 'selected' : ''}>Energy</option>
                  <option value="data" ${pin.type === 'data' ? 'selected' : ''}>Data</option>
                  <option value="control" ${pin.type === 'control' ? 'selected' : ''}>Control</option>
                </select>
                <label>Connect from internal:</label>
                <select class="pin-mapping">
                  <option value="">-- Not connected --</option>
                  ${internalComponents
                    .map(
                      (comp: any) =>
                        comp.pins.output
                          ?.map(
                            (internalPin: any, internalIndex: number) =>
                              `<option value="${comp.id}:output:${internalIndex}">${comp.title || comp.name} Output ${internalIndex + 1}</option>`
                          )
                          .join('') || ''
                    )
                    .join('')}
                </select>
              </div>
            `
              )
              .join('')}
          </div>
          <button class="control-btn add-pin-btn" id="add-output-pin">+ Add Output Pin</button>
        </div>

        <div class="pin-actions">
          <button class="control-btn" id="apply-pin-config">Apply Changes</button>
          <button class="control-btn" id="cancel-pin-config">Cancel</button>
        </div>
      </div>

      <style>
        .pin-mapping-container {
          max-height: 70vh;
          overflow-y: auto;
        }
        .pin-section {
          margin-bottom: 20px;
          padding: 15px;
          background: rgba(0, 255, 136, 0.05);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 8px;
        }
        .pin-section h4 {
          margin-bottom: 10px;
          color: #00ff88;
        }
        .pin-config {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(0, 255, 136, 0.3);
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 10px;
        }
        .pin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-weight: bold;
        }
        .pin-remove-btn {
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid #ff4444;
          color: #ff4444;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 14px;
        }
        .pin-config label {
          display: block;
          margin: 8px 0 4px 0;
          font-size: 12px;
          opacity: 0.8;
        }
        .pin-config input, .pin-config select {
          width: 100%;
          padding: 6px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(0, 255, 136, 0.3);
          color: #00ff88;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .add-pin-btn {
          width: 100%;
          margin-top: 10px;
          background: rgba(0, 255, 136, 0.1);
          border-color: #00ff88;
        }
        .pin-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
        .pin-actions button {
          flex: 1;
        }
      </style>
    `;

  // Set up event listeners
  setupPinMappingHandlers(app, moduleComponent);

  panel.classList.add('active');
}

export function setupPinMappingHandlers(app: any, moduleComponent: any) {
  const addInputBtn = document.getElementById('add-input-pin');
  if (addInputBtn) {
    addInputBtn.addEventListener('click', () => addPinToUI('input', moduleComponent));
  }

  const addOutputBtn = document.getElementById('add-output-pin');
  if (addOutputBtn) {
    addOutputBtn.addEventListener('click', () => addPinToUI('output', moduleComponent));
  }

  const applyBtn = document.getElementById('apply-pin-config');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => applyPinConfiguration(app, moduleComponent));
  }

  const cancelBtn = document.getElementById('cancel-pin-config');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      const panel = document.getElementById('datasheet-panel');
      panel?.classList.remove('active');
    });
  }
}

export function addPinToUI(pinType: 'input' | 'output', moduleComponent: any) {
  const container = document.getElementById(`${pinType}-pins`);
  if (!container) return;

  const pinIndex = container.children.length;
  const internalComponents = moduleComponent.internalComponents || [];

  const pinElement = document.createElement('div');
  pinElement.className = 'pin-config';
  pinElement.setAttribute('data-pin-type', pinType);
  pinElement.setAttribute('data-pin-index', pinIndex.toString());

  const oppositeType = pinType === 'input' ? 'output' : 'input';
  const oppositeLabel = pinType === 'input' ? 'from internal' : 'to internal';

  pinElement.innerHTML = `
      <div class="pin-header">
        <span>${pinType.charAt(0).toUpperCase() + pinType.slice(1)} ${pinIndex + 1}</span>
        <button class="pin-remove-btn">×</button>
      </div>
      <label>Label:</label>
      <input type="text" class="pin-label" placeholder="Pin label">
      <label>Type:</label>
      <select class="pin-type">
        <option value="energy">Energy</option>
        <option value="data">Data</option>
        <option value="control">Control</option>
      </select>
      <label>Connect ${oppositeLabel}:</label>
      <select class="pin-mapping">
        <option value="">-- Not connected --</option>
        ${internalComponents
          .map(
            (comp: any) =>
              comp.pins[oppositeType]
                ?.map(
                  (internalPin: any, internalIndex: number) =>
                    `<option value="${comp.id}:${oppositeType}:${internalIndex}">${comp.title || comp.name} ${oppositeType.charAt(0).toUpperCase() + oppositeType.slice(1)} ${internalIndex + 1}</option>`
                )
                .join('') || ''
          )
          .join('')}
      </select>
    `;

  container.appendChild(pinElement);
}

export function applyPinConfiguration(app: any, moduleComponent: any) {
  try {
    const panel = document.getElementById('datasheet-panel');
    if (!panel) return;

    const pinConfigs = panel.querySelectorAll('.pin-config');
    if (!moduleComponent.pinMap) moduleComponent.pinMap = { input: [], output: [] };

    const newPinMap = { input: [], output: [] } as any;

    pinConfigs.forEach((el) => {
      const el2 = el as HTMLElement;
      const type = el2.getAttribute('data-pin-type') as 'input' | 'output';
      const indexStr = el2.getAttribute('data-pin-index') || '0';
      const index = parseInt(indexStr, 10);

      const labelEl = el2.querySelector('.pin-label') as HTMLInputElement | null;
      const typeEl = el2.querySelector('.pin-type') as HTMLSelectElement | null;
      const mappingEl = el2.querySelector('.pin-mapping') as HTMLSelectElement | null;

      const pinEntry: any = {
        label: labelEl?.value || '',
        type: typeEl?.value || 'energy',
        mapping: mappingEl?.value || '',
      };

      newPinMap[type].push(pinEntry);
    });

    moduleComponent.pinMap = newPinMap;

    // Close panel
    panel.classList.remove('active');

    // Notify app that mapping changed (if app listens)
    if (app && app.showTemporaryMessage) {
      app.showTemporaryMessage('Pin mapping applied', 1500);
    }
  } catch (error) {
    console.error('Failed to apply pin configuration', error);
  }
}

import type { ComponentBase } from './types';
import { eventBus } from './events/EventBus';
import { Events } from './events/eventTypes';

/**
 * Datasheet UI module
 * Exposes showDatasheet(app, component) and hideDatasheet(app)
 * Main responsibilities:
 * - Render datasheet HTML into #datasheet-content
 * - Wire inputs to mutate the provided component object
 * - Provide a safe hide() that only manipulates DOM
 */

/**
 * Helper function to get health state colors for Gateway components
 */
function getHealthStateColor(healthState: string): string {
  const colors = {
    healthy: '#27AE60',
    degraded: '#F39C12',
    failed: '#E74C3C',
    unknown: '#95A5A6',
  };
  return colors[healthState as keyof typeof colors] || '#95A5A6';
}

export function showDatasheet(app: any, component: ComponentBase) {
  const panel = document.getElementById('datasheet-panel') as HTMLElement | null;
  const titleEl = document.getElementById('datasheet-title') as HTMLElement | null;
  const content = document.getElementById('datasheet-content') as HTMLElement | null;

  if (!panel || !titleEl || !content) return;

  titleEl.textContent = `${component.icon ?? ''} ${component.name ?? component.title ?? ''}`;

  const statusOptions = ['defined', 'todo', 'in-progress', 'done'];
  const statusLabels: Record<string, string> = {
    defined: 'DEFINED',
    todo: 'TODO',
    'in-progress': 'IN PROGRESS',
    done: 'DONE',
  };

  const categoryOptions = Object.entries(app.categories || {})
    .map(
      ([key, cat]: any) =>
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
      <input type="text" id="comp-title" value="${escapeHtml(component.title ?? '')}" />
    </div>

    <div class="form-group">
      <label>Status</label>
      <select id="comp-status">
        ${statusOptions
          .map(
            status =>
              `<option value="${status}" ${component.status === status ? 'selected' : ''}>${
                statusLabels[status]
              }</option>`
          )
          .join('')}
      </select>
    </div>

    <div class="form-group">
      <label>Category <span style="font-size: 10px; opacity: 0.7;">(affects pin color)</span></label>
      <select id="comp-category" style="color: ${
        app.categories?.[component.category ?? 'frontend']?.color || '#000'
      };">
        ${categoryOptions}
      </select>
    </div>

    <div class="form-group">
      <label>Description</label>
      <textarea id="comp-description" rows="4">${escapeHtml(component.description ?? '')}</textarea>
    </div>

    <div style="margin-top: 12px; font-size: 12px; opacity: 0.8;">
      Created: ${new Date(component.createdAt ?? Date.now()).toLocaleString()}
    </div>

    ${
      component.type === 'gateway'
        ? `<div class="gateway-config" style="border-top: 1px solid rgba(0,255,136,0.2); padding-top: 14px; margin-top: 14px;">
        <h4 style="color: #9B59B6; margin-bottom: 10px;">⬟ Gateway Configuration</h4>
        
        <div class="form-group">
          <label>External System Type</label>
          <select id="gateway-system-type" style="color: #9B59B6;">
            <option value="Database" ${
              (component as any).externalSystem === 'Database' ? 'selected' : ''
            }>🗄️ Database</option>
            <option value="REST API" ${
              (component as any).externalSystem === 'REST API' ? 'selected' : ''
            }>🌐 REST API</option>
            <option value="GraphQL API" ${
              (component as any).externalSystem === 'GraphQL API' ? 'selected' : ''
            }>📊 GraphQL API</option>
            <option value="File Storage" ${
              (component as any).externalSystem === 'File Storage' ? 'selected' : ''
            }>📁 File Storage</option>
            <option value="Message Queue" ${
              (component as any).externalSystem === 'Message Queue' ? 'selected' : ''
            }>📨 Message Queue</option>
            <option value="Cache" ${
              (component as any).externalSystem === 'Cache' ? 'selected' : ''
            }>⚡ Cache</option>
            <option value="External Service" ${
              (component as any).externalSystem === 'External Service' ? 'selected' : ''
            }>🔗 External Service</option>
          </select>
        </div>

        <div class="form-group">
          <label>Connection URL</label>
          <input type="text" id="gateway-connection-url" value="${escapeHtml(
            (component as any).connectionUrl ?? ''
          )}" 
                 placeholder="e.g., postgresql://localhost:5432/db, https://api.example.com" 
                 style="font-family: 'Courier New', monospace; font-size: 11px;" />
        </div>

        <div class="form-group">
          <label>Timeout (ms)</label>
          <input type="number" id="gateway-timeout" value="${
            (component as any).timeout ?? 5000
          }" min="1000" max="30000" step="1000" />
        </div>

        <div class="form-group">
          <label>Health State</label>
          <select id="gateway-health-state" style="color: ${getHealthStateColor(
            (component as any).healthState ?? 'unknown'
          )};">
            <option value="unknown" ${
              (component as any).healthState === 'unknown' ? 'selected' : ''
            }>🟤 Unknown</option>
            <option value="healthy" ${
              (component as any).healthState === 'healthy' ? 'selected' : ''
            }>🟢 Healthy</option>
            <option value="degraded" ${
              (component as any).healthState === 'degraded' ? 'selected' : ''
            }>🟡 Degraded</option>
            <option value="failed" ${
              (component as any).healthState === 'failed' ? 'selected' : ''
            }>🔴 Failed</option>
          </select>
        </div>

        <button class="control-btn" id="test-gateway-connection" style="width: 100%; margin-top: 10px; background: rgba(155,89,182,0.1); border-color: #9B59B6;">
          🔍 Test Connection
        </button>
      </div>`
        : ''
    }

    ${
      component.type === 'module-ic'
        ? `<button class="control-btn" id="configure-pins" style="width: 100%; margin-top: 14px; background: rgba(0,136,255,0.08); border-color: #0088ff;">
        🔌 Configure Pins
      </button>`
        : ''
    }

    <button class="control-btn" id="delete-component" style="width: 100%; margin-top: 14px; background: rgba(255,0,0,0.08); border-color: #ff4444;">
      Delete Component
    </button>
  `;

  // Attach listeners (idempotent: remove previous handlers by cloning)
  attachInputHandler('#comp-title', el => {
    component.title = (el as HTMLInputElement).value;
  });
  attachSelectHandler('#comp-status', el => {
    component.status = (el as HTMLSelectElement).value;
  });
  attachSelectHandler('#comp-category', el => {
    component.category = (el as HTMLSelectElement).value;
    // update select color inline
    (el as HTMLSelectElement).style.color =
      app.categories?.[component.category ?? 'frontend']?.color || '#000';
  });
  attachInputHandler('#comp-description', el => {
    component.description = (el as HTMLTextAreaElement).value;
  });

  // Gateway-specific handlers
  if (component.type === 'gateway') {
    attachSelectHandler('#gateway-system-type', el => {
      (component as any).externalSystem = (el as HTMLSelectElement).value;
      component.title = (component as any).externalSystem; // Update title to match system type
      const titleInput = document.getElementById('comp-title') as HTMLInputElement;
      if (titleInput) titleInput.value = component.title || '';
    });

    attachInputHandler('#gateway-connection-url', el => {
      (component as any).connectionUrl = (el as HTMLInputElement).value;
    });

    attachInputHandler('#gateway-timeout', el => {
      (component as any).timeout = parseInt((el as HTMLInputElement).value) || 5000;
    });

    attachSelectHandler('#gateway-health-state', el => {
      (component as any).healthState = (el as HTMLSelectElement).value;
      // Update select color to match health state
      (el as HTMLSelectElement).style.color = getHealthStateColor((component as any).healthState);
    });

    // Test connection button
    const testConnectionBtn = document.getElementById(
      'test-gateway-connection'
    ) as HTMLButtonElement | null;
    if (testConnectionBtn) {
      testConnectionBtn.addEventListener('click', () => {
        // Simulate connection test (in real implementation, would make actual HTTP request)
        const gatewayComponent = component as any;
        const systemType = gatewayComponent.externalSystem || 'Unknown';
        const connectionUrl = gatewayComponent.connectionUrl || 'No URL configured';

        testConnectionBtn.textContent = '🔄 Testing...';
        testConnectionBtn.disabled = true;

        setTimeout(() => {
          // Simulate random test result
          const testPassed = Math.random() > 0.3; // 70% success rate

          if (testPassed) {
            gatewayComponent.healthState = 'healthy';
            testConnectionBtn.textContent = '✅ Connection OK';
            testConnectionBtn.style.background = 'rgba(39,174,96,0.2)';
            testConnectionBtn.style.borderColor = '#27AE60';
          } else {
            gatewayComponent.healthState = 'failed';
            testConnectionBtn.textContent = '❌ Connection Failed';
            testConnectionBtn.style.background = 'rgba(231,76,60,0.2)';
            testConnectionBtn.style.borderColor = '#E74C3C';
          }

          // Update health state dropdown
          const healthSelect = document.getElementById('gateway-health-state') as HTMLSelectElement;
          if (healthSelect) {
            healthSelect.value = gatewayComponent.healthState;
            healthSelect.style.color = getHealthStateColor(gatewayComponent.healthState);
          }

          testConnectionBtn.disabled = false;

          // Reset button after 3 seconds
          setTimeout(() => {
            testConnectionBtn.textContent = '🔍 Test Connection';
            testConnectionBtn.style.background = 'rgba(155,89,182,0.1)';
            testConnectionBtn.style.borderColor = '#9B59B6';
          }, 3000);
        }, 1500); // Simulate network delay
      });
    }
  }

  const deleteBtn = document.getElementById('delete-component') as HTMLButtonElement | null;
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (!confirm('Delete this component? This will also remove all connected traces.')) return;

      // Use event-driven architecture to delete component
      // This will automatically handle connection cleanup via the event system
      eventBus.emit(Events.COMPONENT_DELETE_REQUESTED, {
        componentId: component.id,
        timestamp: Date.now(),
      });

      // Use app.hideDatasheet() which delegates to this module's hideDatasheet
      if (typeof app.hideDatasheet === 'function') {
        app.hideDatasheet();
      } else {
        hideDatasheet();
      }
    });
  }

  // Configure pins button for Module ICs
  const configurePinsBtn = document.getElementById('configure-pins') as HTMLButtonElement | null;
  if (configurePinsBtn && component.type === 'module-ic') {
    configurePinsBtn.addEventListener('click', () => {
      if (typeof app.showPinMappingUI === 'function') {
        app.showPinMappingUI(component);
      } else {
        console.warn('Pin mapping UI not available');
      }
    });
  }

  panel.classList.add('active');
}

export function hideDatasheet() {
  const panel = document.getElementById('datasheet-panel');
  if (panel) panel.classList.remove('active');
}

/* Helpers */

// Simple HTML escape for injected values
function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Attach input handler safely: look up element and bind listener
function attachInputHandler(
  selector: string,
  cb: (el: HTMLInputElement | HTMLTextAreaElement) => void
) {
  const el = document.querySelector(selector) as (HTMLInputElement | HTMLTextAreaElement) | null;
  if (!el) return;
  // Remove previous listeners by cloning
  const clone = el.cloneNode(true) as HTMLElement;
  el.parentNode?.replaceChild(clone, el);
  clone.addEventListener('input', (e: any) => cb(e.target));
}

// Attach select handler safely
function attachSelectHandler(selector: string, cb: (el: HTMLSelectElement) => void) {
  const el = document.querySelector(selector) as HTMLSelectElement | null;
  if (!el) return;
  const clone = el.cloneNode(true) as HTMLElement;
  el.parentNode?.replaceChild(clone, el);
  (clone as HTMLSelectElement).addEventListener('change', (e: any) => cb(e.target));
}

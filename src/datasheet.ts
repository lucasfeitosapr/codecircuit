import type { ComponentBase } from './types';

/**
 * Datasheet UI module
 * Exposes showDatasheet(app, component) and hideDatasheet(app)
 * Main responsibilities:
 * - Render datasheet HTML into #datasheet-content
 * - Wire inputs to mutate the provided component object
 * - Provide a safe hide() that only manipulates DOM
 */

export function showDatasheet(app: any, component: ComponentBase) {
  const panel = document.getElementById('datasheet-panel') as HTMLElement | null;
  const titleEl = document.getElementById('datasheet-title') as HTMLElement | null;
  const content = document.getElementById('datasheet-content') as HTMLElement | null;

  if (!panel || !titleEl || !content) return;

  titleEl.textContent = `${component.icon ?? ''} ${component.name ?? component.title ?? ''}`;

  const statusOptions = ['todo', 'in-progress', 'done'];
  const statusLabels: Record<string, string> = {
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

  const deleteBtn = document.getElementById('delete-component') as HTMLButtonElement | null;
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (!confirm('Delete this component? This will also remove all connected traces.')) return;

      // Remove connections involving this component
      app.connections = (app.connections || []).filter(
        (conn: any) => conn.from.component !== component && conn.to.component !== component
      );

      // Remove component from top-level list(s)
      app.components = (app.components || []).filter((c: any) => c.id !== component.id);

      // If we are inside a schematic view, also remove from current view arrays
      if (app.currentView?.components) {
        app.currentView.components = app.currentView.components.filter(
          (c: any) => c.id !== component.id
        );
      }
      if (app.currentView?.connections) {
        app.currentView.connections = app.currentView.connections.filter(
          (conn: any) => conn.from.component !== component && conn.to.component !== component
        );
      }

      app.selectedComponent = null;

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

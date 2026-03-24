/**
 * FormLayer — Renders interactive form field overlays on top of the PDF.
 * Manages HTML input elements positioned to match PDF form field locations.
 */

export class FormLayer {
  /**
   * @param {HTMLElement} container - The page-wrapper element to append overlays to
   * @param {function} onChange - Callback when any field value changes
   */
  constructor(container, onChange) {
    this._container = container;
    this._onChange = onChange;
    this._overlay = null;
    this._values = new Map();     // fieldName -> value
    this._visible = true;
    this._widgets = [];           // current page widget annotations
    this._viewport = null;        // current PDF.js viewport
    this._scale = 1;
  }

  /** Get the current form values map */
  get values() { return this._values; }

  /** Set initial values (e.g. from readFieldValues) */
  setValues(valuesMap) {
    for (const [k, v] of valuesMap) {
      this._values.set(k, v);
    }
  }

  /** Show/hide the form overlay */
  set visible(v) {
    this._visible = v;
    if (this._overlay) {
      this._overlay.style.display = v ? '' : 'none';
    }
  }
  get visible() { return this._visible; }

  /**
   * Render form fields for a given page.
   * @param {Array} widgets - PDF.js widget annotations for this page
   * @param {object} viewport - PDF.js viewport (scaled) for coordinate conversion
   * @param {number} scale - current zoom scale
   */
  render(widgets, viewport, scale) {
    this._widgets = widgets || [];
    this._viewport = viewport;
    this._scale = scale;

    // Remove existing overlay
    if (this._overlay) {
      this._overlay.remove();
    }

    this._overlay = document.createElement('div');
    this._overlay.className = 'form-overlay';
    this._overlay.style.display = this._visible ? '' : 'none';

    for (const widget of this._widgets) {
      this._buildField(widget);
    }

    this._container.appendChild(this._overlay);
  }

  /** Remove the overlay from the DOM */
  destroy() {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
    }
  }

  /** Snapshot current input values into the values map */
  snapshotValues() {
    if (!this._overlay) return;
    this._overlay.querySelectorAll('.form-field-input').forEach(el => {
      const name = el.dataset.fieldName;
      if (!name) return;
      if (el.type === 'checkbox') {
        this._values.set(name, el.checked ? 'on' : '');
      } else if (el.type === 'radio') {
        if (el.checked) this._values.set(name, el.value);
      } else {
        this._values.set(name, el.value);
      }
    });
  }

  /**
   * Build a single form field input element.
   * @param {object} widget - PDF.js annotation object
   */
  _buildField(widget) {
    const { fieldName, fieldType, rect, multiLine, checkBox, radioButton } = widget;
    if (!rect || !this._viewport) return;

    // Convert PDF coordinates to viewport (screen) coordinates
    const [x1, y1, x2, y2] = this._viewport.convertToViewportRectangle(rect);
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    if (width < 1 || height < 1) return;

    let el;

    if (fieldType === 'Tx') {
      // Text field
      if (multiLine) {
        el = document.createElement('textarea');
        el.rows = 1;
      } else {
        el = document.createElement('input');
        el.type = 'text';
      }
    } else if (fieldType === 'Btn') {
      // Checkbox or radio button
      el = document.createElement('input');
      el.type = checkBox ? 'checkbox' : 'radio';
      if (radioButton && fieldName) {
        el.name = `radio-${fieldName}`;
        el.value = widget.buttonValue || widget.exportValue || '';
      }
    } else if (fieldType === 'Ch') {
      // Dropdown / choice field
      el = document.createElement('select');
      const blank = document.createElement('option');
      blank.value = '';
      blank.textContent = '';
      el.appendChild(blank);
      if (widget.options) {
        for (const opt of widget.options) {
          const o = document.createElement('option');
          o.value = opt.exportValue ?? opt.displayValue;
          o.textContent = opt.displayValue;
          el.appendChild(o);
        }
      }
    } else {
      // Fallback to text input for unknown types
      el = document.createElement('input');
      el.type = 'text';
    }

    el.className = 'form-field-input';
    el.dataset.fieldName = fieldName ?? '';
    el.dataset.fieldType = fieldType ?? '';
    el.title = fieldName ?? '';

    // Position the element
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;

    // Font size: scale with field height
    if (el.type !== 'checkbox' && el.type !== 'radio' && el.tagName !== 'SELECT') {
      const pdfFontSize = widget.defaultAppearanceData?.fontSize;
      const fontSize = pdfFontSize && pdfFontSize > 0
        ? pdfFontSize * this._scale
        : Math.max(8, height * 0.6);
      el.style.fontSize = `${fontSize}px`;
      el.style.lineHeight = `${height}px`;
    }

    // Set current value
    const stored = this._values.get(fieldName) ?? widget.fieldValue ?? '';
    if (el.type === 'checkbox') {
      el.checked = stored === 'on' || stored === 'true';
    } else if (el.type === 'radio') {
      const radioVal = el.value;
      el.checked = stored === radioVal;
    } else {
      el.value = stored;
    }

    // Sync values on input
    el.addEventListener('input', () => {
      if (!fieldName) return;
      if (el.type === 'checkbox') {
        this._values.set(fieldName, el.checked ? 'on' : '');
      } else if (el.type === 'radio') {
        if (el.checked) this._values.set(fieldName, el.value);
      } else {
        this._values.set(fieldName, el.value);
      }
      this._onChange?.();
    });

    this._overlay.appendChild(el);
  }
}

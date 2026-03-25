/**
 * FormLayer — Renders interactive form field overlays on top of the PDF.
 * Manages HTML input elements positioned to match PDF form field locations.
 * Includes validation UI, error messages, and optional JavaScript support.
 */

import { validateField, enforceMaxLength } from '../utils/formValidation.js';
import {
  parseJavaScriptActions,
  classifyAction,
  SafetyLevel,
  executeSandboxed,
  runCalculations,
  getCalculationOrder,
} from '../utils/formJavaScript.js';

/**
 * @typedef {Object} FormLayerConfig
 * @property {boolean} [allowFormJavaScript=false] - Enable sandboxed JS execution
 * @property {boolean} [validateOnBlur=true] - Validate when field loses focus
 * @property {boolean} [validateOnSubmit=true] - Validate before export
 * @property {boolean} [showValidationErrors=true] - Show error messages below fields
 */

export class FormLayer {
  /**
   * @param {HTMLElement} container - The page-wrapper element to append overlays to
   * @param {function} onChange - Callback when any field value changes
   * @param {FormLayerConfig} [config] - Configuration options
   */
  constructor(container, onChange, config = {}) {
    this._container = container;
    this._onChange = onChange;
    this._overlay = null;
    this._values = new Map();     // fieldName -> value
    this._visible = true;
    this._widgets = [];           // current page widget annotations
    this._viewport = null;        // current PDF.js viewport
    this._scale = 1;

    // Enhanced state
    /** @type {Map<string, import('../utils/forms.js').EnhancedFieldMeta>} */
    this._enhancedMeta = new Map();
    /** @type {Map<string, string[]>} fieldName -> error messages */
    this._errors = new Map();
    /** @type {Map<string, HTMLElement>} fieldName -> error element */
    this._errorElements = new Map();
    /** @type {Map<string, import('../utils/formJavaScript.js').ParsedAction[]>} */
    this._fieldActions = new Map();
    /** @type {import('../utils/formJavaScript.js').CalculationEntry[]} */
    this._calculations = [];

    // Config
    this._config = {
      allowFormJavaScript: config.allowFormJavaScript ?? false,
      validateOnBlur: config.validateOnBlur ?? true,
      validateOnSubmit: config.validateOnSubmit ?? true,
      showValidationErrors: config.showValidationErrors ?? true,
    };
  }

  /** Get the current form values map */
  get values() { return this._values; }

  /** Get current validation errors */
  get errors() { return this._errors; }

  /** Check if all fields are currently valid */
  get isValid() { return this._errors.size === 0; }

  /** Set initial values (e.g. from readFieldValues) */
  setValues(valuesMap) {
    for (const [k, v] of valuesMap) {
      this._values.set(k, v);
    }
  }

  /**
   * Set enhanced metadata for all fields.
   * @param {Map<string, import('../utils/forms.js').EnhancedFieldMeta>} meta
   */
  setEnhancedMeta(meta) {
    this._enhancedMeta = meta;

    // Build field actions map and calculation order
    this._fieldActions.clear();
    console.log('[FormLayer] Loading field metadata, total fields:', meta.size);
    for (const [fieldName, fieldMeta] of meta) {
      if (fieldMeta.actions && fieldMeta.actions.length > 0) {
        console.log('[FormLayer] Field', fieldName, 'has', fieldMeta.actions.length, 'actions:', fieldMeta.actions);
        this._fieldActions.set(fieldName, fieldMeta.actions);
      }
    }
    this._calculations = getCalculationOrder(this._fieldActions);
    console.log('[FormLayer] Total fields with actions:', this._fieldActions.size);
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

    this._errorElements.clear();

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
    this._errorElements.clear();
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
   * Validate all fields and return overall result.
   * @returns {{ valid: boolean, errors: Map<string, string[]> }}
   */
  validateAll() {
    this._errors.clear();

    for (const [fieldName, meta] of this._enhancedMeta) {
      if (meta.parsedFlags?.readOnly) continue;
      if (!meta.validationRules || meta.validationRules.length === 0) continue;

      const value = this._values.get(fieldName) || '';
      const result = validateField(value, meta.validationRules);
      if (!result.valid) {
        this._errors.set(fieldName, result.errors);
      }
    }

    // Update error UI for visible fields
    if (this._config.showValidationErrors && this._overlay) {
      this._updateAllErrorUI();
    }

    return { valid: this._errors.size === 0, errors: new Map(this._errors) };
  }

  /**
   * Clear all validation errors.
   */
  clearErrors() {
    this._errors.clear();
    for (const [, errorEl] of this._errorElements) {
      errorEl.remove();
    }
    this._errorElements.clear();
    if (this._overlay) {
      this._overlay.querySelectorAll('.form-field-input.field-error').forEach(el => {
        el.classList.remove('field-error');
      });
    }
  }

  // ============================================================
  // Private: Field Building
  // ============================================================

  /**
   * Build a single form field input element with validation support.
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

    // Get enhanced metadata
    const meta = this._enhancedMeta.get(fieldName);
    const flags = meta?.parsedFlags || {};

    let el;

    if (fieldType === 'Tx') {
      // Text field
      if (multiLine) {
        el = document.createElement('textarea');
        el.rows = 1;
      } else {
        el = document.createElement('input');
        el.type = flags.password ? 'password' : 'text';
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
      blank.textContent = ''; // Empty placeholder
      blank.disabled = true; // Can't re-select blank
      blank.hidden = true; // Hide from dropdown list
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

    // Apply field flags
    if (flags.readOnly) {
      el.readOnly = true;
      el.disabled = true;
      el.classList.add('field-readonly');
    }

    // Apply maxLength
    if (meta?.maxLength && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      enforceMaxLength(el, meta.maxLength);
    }

    // Tooltip: show field name + validation hints
    const tooltipParts = [meta?.tooltip || fieldName || ''];
    if (flags.required) tooltipParts.push('(Required)');
    if (meta?.maxLength) tooltipParts.push(`Max ${meta.maxLength} chars`);
    el.title = tooltipParts.filter(Boolean).join(' — ');

    // Required indicator via data attribute
    if (flags.required) {
      el.dataset.required = 'true';
      el.classList.add('field-required');
    }

    // Position the element
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;

    // Font size: scale with field height
    if (el.type !== 'checkbox' && el.type !== 'radio') {
      const pdfFontSize = widget.defaultAppearanceData?.fontSize;
      const fontSize = pdfFontSize && pdfFontSize > 0
        ? pdfFontSize * this._scale
        : Math.max(10, Math.min(height * 0.5, 16)); // Better default sizing
      el.style.fontSize = `${fontSize}px`;
      
      // Line height: slightly less than field height for better vertical alignment
      if (el.tagName !== 'SELECT' && el.tagName !== 'TEXTAREA') {
        el.style.lineHeight = `${height - 4}px`;
        el.style.paddingTop = '2px';
      }
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

      // Run calculations if JS is enabled
      if (this._config.allowFormJavaScript && this._calculations.length > 0) {
        this._runCalculations();
      }

      this._onChange?.();
    });

    // Check if field has format actions
    const hasFormatAction = this._fieldActions.has(fieldName) && 
      this._fieldActions.get(fieldName).some(a => a.trigger === 'Format');
    
    // Check if field has validation
    const hasValidation = meta?.validationRules?.length > 0;

    // Validate on blur
    if ((this._config.validateOnBlur && hasValidation) || hasFormatAction) {
      if (!flags.readOnly) {
        el.addEventListener('blur', () => {
          // Run validation if configured
          if (this._config.validateOnBlur && hasValidation) {
            this._validateAndShowError(fieldName, el, left, top, width, height);
          }

          // Run format action if available
          if (hasFormatAction) {
            this._runFormatAction(fieldName, el);
          }
        });

        // Clear error on focus (only if validation exists)
        if (hasValidation) {
          el.addEventListener('focus', () => {
            this._clearFieldError(fieldName, el);
          });
        }
      }
    }

    // Show existing errors (from prior validation)
    if (this._errors.has(fieldName)) {
      el.classList.add('field-error');
      this._showErrorMessage(fieldName, left, top, width, height, this._errors.get(fieldName));
    }

    this._overlay.appendChild(el);
  }

  // ============================================================
  // Private: Validation UI
  // ============================================================

  /**
   * Validate a single field and show/hide error UI.
   * @param {string} fieldName
   * @param {HTMLElement} el - The input element
   * @param {number} left
   * @param {number} top
   * @param {number} width
   * @param {number} height
   */
  _validateAndShowError(fieldName, el, left, top, width, height) {
    const meta = this._enhancedMeta.get(fieldName);
    if (!meta?.validationRules?.length) return;

    const value = el.type === 'checkbox' ? (el.checked ? 'on' : '') : el.value;
    const result = validateField(value, meta.validationRules);

    if (!result.valid) {
      this._errors.set(fieldName, result.errors);
      el.classList.add('field-error');
      if (this._config.showValidationErrors) {
        this._showErrorMessage(fieldName, left, top, width, height, result.errors);
      }
    } else {
      this._clearFieldError(fieldName, el);
    }
  }

  /**
   * Clear error state for a single field.
   * @param {string} fieldName
   * @param {HTMLElement} el
   */
  _clearFieldError(fieldName, el) {
    this._errors.delete(fieldName);
    el.classList.remove('field-error');
    const errorEl = this._errorElements.get(fieldName);
    if (errorEl) {
      errorEl.remove();
      this._errorElements.delete(fieldName);
    }
  }

  /**
   * Show error message below a field.
   * @param {string} fieldName
   * @param {number} left
   * @param {number} top
   * @param {number} width
   * @param {number} height
   * @param {string[]} errors
   */
  _showErrorMessage(fieldName, left, top, width, height, errors) {
    // Remove existing error element
    const existing = this._errorElements.get(fieldName);
    if (existing) existing.remove();

    const errorEl = document.createElement('div');
    errorEl.className = 'form-field-error';
    errorEl.textContent = errors[0]; // Show first error
    errorEl.style.left = `${left}px`;
    errorEl.style.top = `${top + height + 2}px`;
    errorEl.style.maxWidth = `${Math.max(width, 150)}px`;

    this._overlay.appendChild(errorEl);
    this._errorElements.set(fieldName, errorEl);
  }

  /**
   * Update error UI for all visible fields after validateAll().
   */
  _updateAllErrorUI() {
    if (!this._overlay) return;

    this._overlay.querySelectorAll('.form-field-input').forEach(el => {
      const fieldName = el.dataset.fieldName;
      if (!fieldName) return;

      if (this._errors.has(fieldName)) {
        el.classList.add('field-error');
        // Recompute position for error message
        const left = parseFloat(el.style.left);
        const top = parseFloat(el.style.top);
        const width = parseFloat(el.style.width);
        const height = parseFloat(el.style.height);
        this._showErrorMessage(fieldName, left, top, width, height, this._errors.get(fieldName));
      } else {
        el.classList.remove('field-error');
        const errorEl = this._errorElements.get(fieldName);
        if (errorEl) {
          errorEl.remove();
          this._errorElements.delete(fieldName);
        }
      }
    });
  }

  // ============================================================
  // Private: JavaScript Execution (Feature-Gated)
  // ============================================================

  /**
   * Run format action for a field (on blur).
   * @param {string} fieldName
   * @param {HTMLElement} el
   */
  _runFormatAction(fieldName, el) {
    console.log('[FormLayer] _runFormatAction called for:', fieldName, 'value:', el.value);
    const actions = this._fieldActions.get(fieldName);
    if (!actions) {
      console.log('[FormLayer] No actions found for field:', fieldName);
      return;
    }

    const formatAction = actions.find(a => a.trigger === 'Format');
    if (!formatAction) {
      console.log('[FormLayer] No format action found for field:', fieldName);
      return;
    }

    console.log('[FormLayer] Format action:', formatAction);

    // Safe format actions always run; unsafe only if explicitly allowed
    if (formatAction.safety === SafetyLevel.UNSAFE && !this._config.allowFormJavaScript) {
      console.log('[FormLayer] Format action is UNSAFE and JS is disabled');
      return;
    }

    console.log('[FormLayer] Executing format action:', formatAction.code);
    const result = executeSandboxed(formatAction.code, {
      fieldValues: this._values,
      currentFieldName: fieldName,
      currentValue: el.value,
    });

    console.log('[FormLayer] Format result:', result);

    if (result.success && result.event) {
      const formatted = String(result.event.value ?? el.value);
      console.log('[FormLayer] Formatted value:', formatted);
      if (formatted !== el.value) {
        el.value = formatted;
        this._values.set(fieldName, formatted);
      }
    }
  }

  /**
   * Run all calculations and update computed fields.
   */
  _runCalculations() {
    if (this._calculations.length === 0) return;

    const { updates } = runCalculations(
      this._calculations,
      this._values,
      this._config.allowFormJavaScript,
    );

    // Update visible input elements for computed fields
    if (updates.size > 0 && this._overlay) {
      this._overlay.querySelectorAll('.form-field-input').forEach(el => {
        const name = el.dataset.fieldName;
        if (name && updates.has(name)) {
          el.value = updates.get(name);
        }
      });
    }
  }
}

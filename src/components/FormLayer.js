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

    // Execute Focus actions on initial render (applies styling immediately)
    if (this._config.allowFormJavaScript) {
      this._runInitialActions();
    }
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

    // Apply maxLength / charLimit
    const charLimit = meta?.maxLength || meta?.charLimit || 0;
    if (charLimit > 0 && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      enforceMaxLength(el, charLimit);
    }

    // Comb mode: each character in its own cell
    if (flags.comb && charLimit > 0 && el.tagName === 'INPUT') {
      const cellWidth = width / charLimit;
      el.style.letterSpacing = `${cellWidth - (parseFloat(el.style.fontSize) || 10) * 0.6}px`;
      el.style.fontFamily = 'monospace';
      el.classList.add('field-comb');
    }

    // Tooltip: show field name + validation hints
    const tooltipParts = [meta?.tooltip || fieldName || ''];
    if (flags.required) tooltipParts.push('(Required)');
    if (charLimit > 0) tooltipParts.push(`Max ${charLimit} chars`);
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

    // Dropdown change: sync value, run Blur + Validate actions and calculations
    if (el.tagName === 'SELECT') {
      el.addEventListener('change', () => {
        if (!fieldName) return;
        this._values.set(fieldName, el.value);

        if (this._config.allowFormJavaScript) {
          const actions = this._fieldActions.get(fieldName) || [];
          
          // Run Blur actions (cross-field updates)
          const blurAction = actions.find(a => a.trigger === 'Blur');
          if (blurAction) {
            this._runTriggerAction(fieldName, el, 'Blur');
          }
          
          // Run Validate actions (often used for cross-field updates in dropdowns)
          const validateAction = actions.find(a => a.trigger === 'Validate');
          if (validateAction) {
            this._runTriggerAction(fieldName, el, 'Validate');
          }
          
          // Run calculations
          if (this._calculations.length > 0) {
            this._runCalculations();
          }
        }

        this._onChange?.();
      });
    }

    // Check field actions
    const fieldActions = this._fieldActions.get(fieldName) || [];
    const hasFormatAction = fieldActions.some(a => a.trigger === 'Format');
    const hasFocusAction = fieldActions.some(a => a.trigger === 'Focus');
    const hasBlurAction = fieldActions.some(a => a.trigger === 'Blur');

    // Check if field has validation
    const hasValidation = meta?.validationRules?.length > 0;

    // Blur handler: validation + Format + Blur actions
    if ((this._config.validateOnBlur && hasValidation) || hasFormatAction || hasBlurAction) {
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

          // Run Blur trigger action
          if (hasBlurAction && this._config.allowFormJavaScript) {
            this._runTriggerAction(fieldName, el, 'Blur');
          }
        });
      }
    }

    // Focus handler: clear errors + Focus actions
    if (hasValidation || hasFocusAction) {
      if (!flags.readOnly) {
        el.addEventListener('focus', () => {
          if (hasValidation) {
            this._clearFieldError(fieldName, el);
          }
          if (hasFocusAction && this._config.allowFormJavaScript) {
            this._runTriggerAction(fieldName, el, 'Focus');
          }
        });
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
    errorEl.style.top = `${top + height + 4}px`;
    // No maxWidth - let CSS handle it (allows 350px)

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

  /**
   * Run a trigger action (Focus, Blur, etc.) for a field.
   * Applies field metadata changes (styling, readonly, etc.) from the script result.
   * @param {string} fieldName
   * @param {HTMLElement} el
   * @param {string} trigger - 'Focus', 'Blur', etc.
   */
  _runTriggerAction(fieldName, el, trigger) {
    const actions = this._fieldActions.get(fieldName);
    if (!actions) return;

    const action = actions.find(a => a.trigger === trigger);
    if (!action) return;

    if (action.safety === SafetyLevel.UNSAFE && !this._config.allowFormJavaScript) {
      return;
    }

    console.log(`[FormLayer] Running ${trigger} action for ${fieldName}:`, action.code);

    const result = executeSandboxed(action.code, {
      fieldValues: this._values,
      currentFieldName: fieldName,
      currentValue: el.value,
    });

    if (result.success) {
      // Apply value changes
      if (result.event && result.event.value !== undefined) {
        const newValue = String(result.event.value);
        if (newValue !== el.value) {
          el.value = newValue;
          this._values.set(fieldName, newValue);
        }
      }

      // Apply field metadata changes (colors, readonly, etc.)
      if (result.fieldMeta) {
        this._applyFieldMeta(result.fieldMeta);
      }

      // Sync any cross-field value updates back to DOM
      this._syncFieldValues();

      // Log script output
      if (result.logs?.length) {
        result.logs.forEach(log => console.log(`[JS:${fieldName}]`, log));
      }
    } else if (result.error) {
      console.warn(`[FormLayer] ${trigger} action error for ${fieldName}:`, result.error);
    }
  }

  /**
   * Run Focus actions on initial page render to apply ONLY permanent styling.
   * Permanent properties (textColor, textFont, textSize, alignment, readonly, display)
   * are applied immediately so fields look correct without user interaction.
   * Interactive properties (fillColor, borderColor) are NOT applied here — they only
   * take effect when the user actually focuses the field.
   */
  _runInitialActions() {
    if (!this._overlay) return;

    console.log('[FormLayer] Running initial actions for all fields');

    // Properties that are permanent/static and should apply on load
    const PERMANENT_PROPS = ['textColor', 'textFont', 'textSize', 'alignment', 'readonly', 'display', 'required', 'multiline', 'password', 'charLimit', 'comb'];

    // Collect all field metadata from Focus actions first
    const combinedFieldMeta = new Map();

    this._overlay.querySelectorAll('.form-field-input').forEach(el => {
      const fieldName = el.dataset.fieldName;
      if (!fieldName) return;

      const actions = this._fieldActions.get(fieldName);
      if (!actions) return;

      // Run Focus actions to extract initial styling
      const focusAction = actions.find(a => a.trigger === 'Focus');
      if (focusAction) {
        if (focusAction.safety === SafetyLevel.UNSAFE && !this._config.allowFormJavaScript) {
          return;
        }

        console.log(`[FormLayer] Initial Focus action for ${fieldName}:`, focusAction.code);

        const result = executeSandboxed(focusAction.code, {
          fieldValues: this._values,
          currentFieldName: fieldName,
          currentValue: el.value,
        });

        if (result.success) {
          if (result.event && result.event.value !== undefined) {
            const newValue = String(result.event.value);
            if (newValue !== el.value) {
              el.value = newValue;
              this._values.set(fieldName, newValue);
            }
          }
          // Merge field metadata — but only permanent properties
          if (result.fieldMeta) {
            for (const [name, meta] of result.fieldMeta) {
              const filteredMeta = {};
              let hasPermanent = false;
              for (const prop of PERMANENT_PROPS) {
                if (meta[prop] !== undefined) {
                  filteredMeta[prop] = meta[prop];
                  hasPermanent = true;
                }
              }
              if (hasPermanent) {
                combinedFieldMeta.set(name, filteredMeta);
              }
            }
          }
          if (result.logs?.length) {
            result.logs.forEach(log => console.log(`[JS:init:${fieldName}]`, log));
          }
        }
      }
    });

    // Apply only permanent field metadata at once
    if (combinedFieldMeta.size > 0) {
      this._applyFieldMeta(combinedFieldMeta);
    }

    // Sync any cross-field value updates
    this._syncFieldValues();

    // Run initial calculations
    if (this._calculations.length > 0) {
      this._runCalculations();
    }
  }

  /**
   * Apply field metadata (from JavaScript execution) to DOM elements.
   * Converts Acrobat color arrays to CSS and applies styling.
   * @param {Map<string, Object>} fieldMeta - Field name -> metadata map
   */
  _applyFieldMeta(fieldMeta) {
    if (!this._overlay || !fieldMeta || fieldMeta.size === 0) return;

    this._overlay.querySelectorAll('.form-field-input').forEach(el => {
      const name = el.dataset.fieldName;
      if (!name || !fieldMeta.has(name)) return;

      const meta = fieldMeta.get(name);
      console.log(`[FormLayer] Applying metadata to ${name}:`, meta);

      // Text color
      if (meta.textColor) {
        el.style.color = this._acrobatColorToCSS(meta.textColor);
      }

      // Fill/background color
      if (meta.fillColor) {
        el.style.backgroundColor = this._acrobatColorToCSS(meta.fillColor);
      }

      // Border color
      if (meta.borderColor) {
        const borderCSS = this._acrobatColorToCSS(meta.borderColor);
        if (borderCSS !== 'transparent') {
          el.style.borderColor = borderCSS;
          el.style.borderWidth = '2px';
          el.style.borderStyle = 'solid';
        }
      }

      // Text size
      if (meta.textSize && meta.textSize > 0) {
        el.style.fontSize = `${meta.textSize * this._scale}px`;
      }

      // Font
      if (meta.textFont) {
        el.style.fontFamily = meta.textFont;
      }

      // Alignment
      if (meta.alignment) {
        el.style.textAlign = meta.alignment;
      }

      // Readonly
      if (meta.readonly !== undefined) {
        el.readOnly = meta.readonly;
        el.disabled = meta.readonly;
        if (meta.readonly) {
          el.classList.add('field-readonly');
        } else {
          el.classList.remove('field-readonly');
        }
      }

      // Character limit (from JavaScript)
      if (meta.charLimit !== undefined && meta.charLimit > 0) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.maxLength = meta.charLimit;
        }
      }

      // Comb mode (from JavaScript)
      if (meta.comb !== undefined && meta.comb && el.tagName === 'INPUT') {
        const limit = meta.charLimit || el.maxLength || 0;
        if (limit > 0) {
          const fieldWidth = parseFloat(el.style.width) || 100;
          const cellWidth = fieldWidth / limit;
          el.style.letterSpacing = `${cellWidth - (parseFloat(el.style.fontSize) || 10) * 0.6}px`;
          el.style.fontFamily = 'monospace';
          el.classList.add('field-comb');
        }
      }

      // Display
      if (meta.display !== undefined) {
        switch (meta.display) {
          case 0: // visible
            el.style.visibility = 'visible';
            el.style.display = '';
            break;
          case 1: // hidden
            el.style.visibility = 'hidden';
            break;
          case 2: // noPrint (visible on screen)
            el.style.visibility = 'visible';
            el.style.display = '';
            break;
          case 3: // noView (hidden on screen)
            el.style.display = 'none';
            break;
        }
      }
    });
  }

  /**
   * Convert an Acrobat color array to a CSS color string.
   * @param {Array} colorArr - Acrobat color: ['G', gray], ['RGB', r, g, b], ['CMYK', c, m, y, k], ['T']
   * @returns {string} CSS color string
   */
  _acrobatColorToCSS(colorArr) {
    if (!Array.isArray(colorArr) || colorArr.length === 0) return 'inherit';

    const type = colorArr[0];
    switch (type) {
      case 'T':
        return 'transparent';
      case 'G': {
        const g = Math.round((colorArr[1] ?? 0) * 255);
        return `rgb(${g}, ${g}, ${g})`;
      }
      case 'RGB': {
        const r = Math.round((colorArr[1] ?? 0) * 255);
        const g = Math.round((colorArr[2] ?? 0) * 255);
        const b = Math.round((colorArr[3] ?? 0) * 255);
        return `rgb(${r}, ${g}, ${b})`;
      }
      case 'CMYK': {
        const c = colorArr[1] ?? 0;
        const m = colorArr[2] ?? 0;
        const y = colorArr[3] ?? 0;
        const k = colorArr[4] ?? 0;
        const r = Math.round(255 * (1 - c) * (1 - k));
        const g = Math.round(255 * (1 - m) * (1 - k));
        const b = Math.round(255 * (1 - y) * (1 - k));
        return `rgb(${r}, ${g}, ${b})`;
      }
      default:
        return 'inherit';
    }
  }

  /**
   * Sync field values from the internal map back to DOM elements.
   * Used after cross-field JavaScript updates values of other fields.
   */
  _syncFieldValues() {
    if (!this._overlay) return;

    this._overlay.querySelectorAll('.form-field-input').forEach(el => {
      const name = el.dataset.fieldName;
      if (!name) return;

      const storedValue = this._values.get(name);
      if (storedValue === undefined) return;

      if (el.type === 'checkbox') {
        el.checked = storedValue === 'on' || storedValue === 'true';
      } else if (el.type === 'radio') {
        el.checked = storedValue === el.value;
      } else if (el.value !== storedValue) {
        el.value = storedValue;
      }
    });
  }
}

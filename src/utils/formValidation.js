/**
 * Form Validation Engine
 * Provides declarative, safe validation for PDF form fields.
 * Always enabled — no feature flag needed.
 *
 * @module formValidation
 */

// ============================================================
// Built-in Format Validators
// ============================================================

/** @type {Record<string, { pattern: RegExp, message: string }>} */
const FORMAT_VALIDATORS = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address',
  },
  phone: {
    pattern: /^\+?[\d\s\-().]{7,20}$/,
    message: 'Please enter a valid phone number',
  },
  ssn: {
    pattern: /^\d{3}-?\d{2}-?\d{4}$/,
    message: 'Please enter a valid SSN (XXX-XX-XXXX)',
  },
  date: {
    pattern: /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/,
    message: 'Please enter a valid date (MM/DD/YYYY)',
  },
  currency: {
    pattern: /^\$?\d{1,3}(,?\d{3})*(\.\d{0,2})?$/,
    message: 'Please enter a valid currency amount',
  },
  zipcode: {
    pattern: /^\d{5}(-\d{4})?$/,
    message: 'Please enter a valid ZIP code',
  },
};

// ============================================================
// PDF Field Flag Constants (from PDF spec Table 221, 226, 228)
// ============================================================

/** @enum {number} */
const FieldFlags = {
  READ_ONLY:     1 << 0,   // 1
  REQUIRED:      1 << 1,   // 2
  NO_EXPORT:     1 << 2,   // 4
  MULTILINE:     1 << 12,  // Tx
  PASSWORD:      1 << 13,  // Tx
  NO_SCROLL:     1 << 23,  // Tx
  COMB:          1 << 24,  // Tx
  FILE_SELECT:   1 << 20,  // Tx
  DO_NOT_SPELL:  1 << 22,  // Tx
  COMBO:         1 << 17,  // Ch
  EDIT:          1 << 18,  // Ch
  SORT:          1 << 19,  // Ch
  MULTI_SELECT:  1 << 21,  // Ch
  NO_TOGGLE_OFF: 1 << 14,  // Btn
  RADIO:         1 << 15,  // Btn
  PUSHBUTTON:    1 << 16,  // Btn
};

/**
 * Parse raw PDF field flags integer into a structured object.
 *
 * @param {number} flags - Raw flags integer from PDF annotation
 * @returns {{ readOnly: boolean, required: boolean, noExport: boolean, password: boolean, multiline: boolean, comb: boolean, noScroll: boolean, fileSelect: boolean, doNotSpell: boolean, combo: boolean, editable: boolean, sorted: boolean, multiSelect: boolean, noToggleOff: boolean, radio: boolean, pushButton: boolean }}
 */
export function parseFieldFlags(flags) {
  const f = flags || 0;
  return {
    readOnly:     !!(f & FieldFlags.READ_ONLY),
    required:     !!(f & FieldFlags.REQUIRED),
    noExport:     !!(f & FieldFlags.NO_EXPORT),
    password:     !!(f & FieldFlags.PASSWORD),
    multiline:    !!(f & FieldFlags.MULTILINE),
    comb:         !!(f & FieldFlags.COMB),
    noScroll:     !!(f & FieldFlags.NO_SCROLL),
    fileSelect:   !!(f & FieldFlags.FILE_SELECT),
    doNotSpell:   !!(f & FieldFlags.DO_NOT_SPELL),
    combo:        !!(f & FieldFlags.COMBO),
    editable:     !!(f & FieldFlags.EDIT),
    sorted:       !!(f & FieldFlags.SORT),
    multiSelect:  !!(f & FieldFlags.MULTI_SELECT),
    noToggleOff:  !!(f & FieldFlags.NO_TOGGLE_OFF),
    radio:        !!(f & FieldFlags.RADIO),
    pushButton:   !!(f & FieldFlags.PUSHBUTTON),
  };
}

// ============================================================
// Validation Rule Builder
// ============================================================

/**
 * @typedef {Object} ValidationRule
 * @property {'required'|'maxLength'|'pattern'|'range'|'format'} type
 * @property {*} [value] - Rule parameter (maxLength number, pattern string, etc.)
 * @property {string} message - Human-readable error message
 */

/**
 * @typedef {Object} FieldValidationConfig
 * @property {string} fieldName
 * @property {string} fieldType
 * @property {ValidationRule[]} rules
 * @property {boolean} readOnly
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid
 * @property {string[]} errors - Error messages for this field
 */

/**
 * Build validation rules from enhanced field metadata.
 *
 * @param {Object} fieldMeta - Enhanced field metadata from extractEnhancedFieldMeta
 * @returns {ValidationRule[]}
 */
export function buildValidationRules(fieldMeta) {
  /** @type {ValidationRule[]} */
  const rules = [];
  const flags = fieldMeta.parsedFlags || {};

  // Required field
  if (flags.required) {
    rules.push({
      type: 'required',
      message: `${fieldMeta.displayName || fieldMeta.fieldName} is required`,
    });
  }

  // MaxLength (text fields only)
  if (fieldMeta.maxLength && fieldMeta.maxLength > 0) {
    rules.push({
      type: 'maxLength',
      value: fieldMeta.maxLength,
      message: `Maximum ${fieldMeta.maxLength} characters`,
    });
  }

  // Format validation from field name heuristics or tooltip
  const format = detectFormat(fieldMeta);
  if (format && FORMAT_VALIDATORS[format]) {
    rules.push({
      type: 'format',
      value: format,
      message: FORMAT_VALIDATORS[format].message,
    });
  }

  // Pattern from PDF JavaScript (safe declarative patterns)
  if (fieldMeta.validationPattern) {
    rules.push({
      type: 'pattern',
      value: fieldMeta.validationPattern,
      message: fieldMeta.validationMessage || 'Invalid format',
    });
  }

  // Number range
  if (fieldMeta.rangeMin !== undefined || fieldMeta.rangeMax !== undefined) {
    rules.push({
      type: 'range',
      value: { min: fieldMeta.rangeMin, max: fieldMeta.rangeMax },
      message: buildRangeMessage(fieldMeta.rangeMin, fieldMeta.rangeMax),
    });
  }

  return rules;
}

/**
 * Detect format type from field name, tooltip, or format action.
 *
 * @param {Object} fieldMeta - Field metadata
 * @returns {string|null} Format name or null
 */
function detectFormat(fieldMeta) {
  const name = (fieldMeta.fieldName || '').toLowerCase();
  const tooltip = (fieldMeta.tooltip || '').toLowerCase();
  const formatAction = (fieldMeta.formatAction || '').toLowerCase();

  // Check format action first (most reliable)
  if (formatAction.includes('afnumber_format')) return 'currency';
  if (formatAction.includes('afdate_format')) return 'date';
  if (formatAction.includes('afspecial_format')) {
    if (formatAction.includes('0')) return 'zipcode';
    if (formatAction.includes('1')) return 'zipcode';
    if (formatAction.includes('2')) return 'phone';
    if (formatAction.includes('3')) return 'ssn';
  }

  // Check field name patterns
  if (/e[-_]?mail/i.test(name)) return 'email';
  if (/phone|tel|mobile|fax/i.test(name)) return 'phone';
  if (/ssn|social/i.test(name)) return 'ssn';
  if (/date|dob|birth/i.test(name)) return 'date';
  if (/zip|postal/i.test(name)) return 'zipcode';
  if (/amount|price|cost|total|salary|income|currency/i.test(name)) return 'currency';

  // Check tooltip
  if (/e[-_]?mail/i.test(tooltip)) return 'email';
  if (/phone/i.test(tooltip)) return 'phone';
  if (/ssn|social security/i.test(tooltip)) return 'ssn';

  return null;
}

/**
 * Build a human-readable range message.
 *
 * @param {number|undefined} min
 * @param {number|undefined} max
 * @returns {string}
 */
function buildRangeMessage(min, max) {
  if (min !== undefined && max !== undefined) return `Value must be between ${min} and ${max}`;
  if (min !== undefined) return `Value must be at least ${min}`;
  if (max !== undefined) return `Value must be at most ${max}`;
  return 'Value out of range';
}

// ============================================================
// Validation Execution
// ============================================================

/**
 * Validate a single field value against its rules.
 *
 * @param {string} value - Current field value
 * @param {ValidationRule[]} rules - Validation rules for this field
 * @returns {ValidationResult}
 */
export function validateField(value, rules) {
  const errors = [];
  const trimmed = (value || '').trim();

  for (const rule of rules) {
    switch (rule.type) {
      case 'required':
        if (!trimmed) {
          errors.push(rule.message);
        }
        break;

      case 'maxLength':
        if (trimmed.length > rule.value) {
          errors.push(rule.message);
        }
        break;

      case 'pattern': {
        if (trimmed && rule.value) {
          try {
            const re = new RegExp(rule.value);
            if (!re.test(trimmed)) {
              errors.push(rule.message);
            }
          } catch {
            // Invalid regex — skip silently
          }
        }
        break;
      }

      case 'range': {
        if (trimmed) {
          const num = parseFloat(trimmed.replace(/[$,]/g, ''));
          if (isNaN(num)) {
            errors.push('Please enter a valid number');
          } else {
            const { min, max } = rule.value;
            if (min !== undefined && num < min) errors.push(rule.message);
            if (max !== undefined && num > max) errors.push(rule.message);
          }
        }
        break;
      }

      case 'format': {
        if (trimmed && rule.value) {
          const validator = FORMAT_VALIDATORS[rule.value];
          if (validator && !validator.pattern.test(trimmed)) {
            errors.push(rule.message);
          }
        }
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all form fields and return a map of field errors.
 *
 * @param {Map<string, string>} values - Field name -> value map
 * @param {Map<string, FieldValidationConfig>} validationConfigs - Field name -> validation config map
 * @returns {{ valid: boolean, errors: Map<string, string[]> }}
 */
export function validateAllFields(values, validationConfigs) {
  const errors = new Map();
  let allValid = true;

  for (const [fieldName, config] of validationConfigs) {
    if (config.readOnly) continue;
    const value = values.get(fieldName) || '';
    const result = validateField(value, config.rules);
    if (!result.valid) {
      allValid = false;
      errors.set(fieldName, result.errors);
    }
  }

  return { valid: allValid, errors };
}

// ============================================================
// MaxLength Enforcement (preventive, not just validation)
// ============================================================

/**
 * Enforce maxLength on an input element by truncating input.
 *
 * @param {HTMLInputElement|HTMLTextAreaElement} el - Input element
 * @param {number} maxLength - Maximum characters allowed
 */
export function enforceMaxLength(el, maxLength) {
  if (!maxLength || maxLength <= 0) return;
  el.maxLength = maxLength;
}

// ============================================================
// Exports
// ============================================================

export { FORMAT_VALIDATORS, FieldFlags };

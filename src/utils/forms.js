/**
 * PDF Form Detection & Export Utilities
 * Detects AcroForm fields and exports filled PDFs using pdf-lib.
 * Enhanced with field metadata extraction for validation and JS support.
 */
import { PDFDocument } from 'pdf-lib';
import { parseFieldFlags, buildValidationRules } from './formValidation.js';
import { parseJavaScriptActions, parseFormatFunction, parseRangeValidation } from './formJavaScript.js';

/**
 * @typedef {Object} EnhancedFieldMeta
 * @property {string} fieldName
 * @property {string} fieldType
 * @property {number} rawFlags - Raw PDF field flags integer
 * @property {Object} parsedFlags - Structured flags from parseFieldFlags
 * @property {number|null} maxLength - Maximum text length (Tx fields)
 * @property {string} tooltip - Field tooltip / alternate name
 * @property {string} displayName - Human-readable display name
 * @property {Object[]} actions - Parsed JavaScript actions
 * @property {string|null} formatAction - Format action code (if any)
 * @property {string|null} validationPattern - Regex pattern from validation action
 * @property {string|null} validationMessage - Custom validation message
 * @property {number|undefined} rangeMin - Minimum numeric value
 * @property {number|undefined} rangeMax - Maximum numeric value
 * @property {Object|null} formatInfo - Parsed format function metadata
 * @property {import('./formValidation.js').ValidationRule[]} validationRules - Computed validation rules
 */

/**
 * Extract enhanced metadata from a PDF.js widget annotation.
 *
 * @param {Object} widget - PDF.js annotation object
 * @returns {EnhancedFieldMeta}
 */
export function extractEnhancedFieldMeta(widget) {
  const fieldName = widget.fieldName || '';
  const fieldType = widget.fieldType || '';
  const rawFlags = widget.fieldFlags || 0;
  const parsedFlags = parseFieldFlags(rawFlags);

  // MaxLength for text fields
  const maxLength = widget.maxLen > 0 ? widget.maxLen : null;

  // Tooltip / alternate name
  const tooltip = widget.alternativeText || widget.TU || '';

  // Display name: prefer tooltip, fall back to cleaned field name
  const displayName = tooltip || fieldName.replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Parse JavaScript actions
  const actions = parseJavaScriptActions(widget);

  // Extract format action
  const formatActionObj = actions.find(a => a.trigger === 'Format');
  const formatAction = formatActionObj?.code || null;

  // Parse format info
  const formatInfo = formatAction ? parseFormatFunction(formatAction) : null;

  // Extract validation pattern from Validate action
  let validationPattern = null;
  let validationMessage = null;
  const validateAction = actions.find(a => a.trigger === 'Validate');
  if (validateAction) {
    // Try to extract regex from AFRegex_Validate or custom validate
    const regexMatch = validateAction.code.match(/AFRegex_Validate\("([^"]+)"\)/);
    if (regexMatch) {
      validationPattern = regexMatch[1];
      validationMessage = 'Invalid format';
    }

    // Try to extract range from AFRange_Validate
    const range = parseRangeValidation(validateAction.code);
    if (range) {
      validationPattern = null; // Range, not pattern
    }
  }

  // Range validation
  let rangeMin, rangeMax;
  if (validateAction) {
    const range = parseRangeValidation(validateAction.code);
    if (range) {
      rangeMin = range.min;
      rangeMax = range.max;
    }
  }

  const meta = {
    fieldName,
    fieldType,
    rawFlags,
    parsedFlags,
    maxLength,
    tooltip,
    displayName,
    actions,
    formatAction,
    validationPattern,
    validationMessage,
    rangeMin,
    rangeMax,
    formatInfo,
    validationRules: [],
  };

  // Build validation rules from metadata
  meta.validationRules = buildValidationRules(meta);

  return meta;
}

/**
 * Detect form fields in a PDF using PDF.js annotations.
 * Returns per-page widget annotations with enhanced field metadata.
 *
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdfJsDoc - PDF.js document
 * @returns {Promise<{ hasForm: boolean, fieldsByPage: Map<number, Array>, fieldCount: number, enhancedMeta: Map<string, EnhancedFieldMeta> }>}
 */
export async function detectFormFields(pdfJsDoc) {
  const fieldsByPage = new Map();
  /** @type {Map<string, EnhancedFieldMeta>} */
  const enhancedMeta = new Map();
  let fieldCount = 0;

  for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
    const page = await pdfJsDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();
    const widgets = annotations.filter(a => a.subtype === 'Widget');

    if (widgets.length > 0) {
      fieldsByPage.set(pageNum, widgets);
      fieldCount += widgets.length;

      // Extract enhanced metadata for each widget
      for (const widget of widgets) {
        if (widget.fieldName && !enhancedMeta.has(widget.fieldName)) {
          enhancedMeta.set(widget.fieldName, extractEnhancedFieldMeta(widget));
        }
      }
    }

    page.cleanup();
  }

  return {
    hasForm: fieldCount > 0,
    fieldsByPage,
    fieldCount,
    enhancedMeta,
  };
}

/**
 * Read existing field values from a PDF using pdf-lib.
 *
 * @param {Uint8Array} pdfBytes - Original PDF bytes
 * @returns {Promise<Map<string, string>>} Field name -> value map
 */
export async function readFieldValues(pdfBytes) {
  const values = new Map();

  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    for (const field of form.getFields()) {
      const name = field.getName();
      const typeName = field.constructor.name;

      try {
        if (typeName.startsWith('PDFTextField')) {
          values.set(name, field.getText() ?? '');
        } else if (typeName.startsWith('PDFCheckBox')) {
          values.set(name, field.isChecked() ? 'on' : '');
        } else if (typeName.startsWith('PDFDropdown') || typeName.startsWith('PDFOptionList')) {
          values.set(name, field.getSelected()?.[0] ?? '');
        } else if (typeName.startsWith('PDFRadioGroup')) {
          values.set(name, field.getSelected() ?? '');
        } else {
          values.set(name, '');
        }
      } catch {
        values.set(name, '');
      }
    }
  } catch (e) {
    console.warn('Could not read form field values:', e.message);
  }

  return values;
}

/**
 * Export a filled PDF with form values applied.
 *
 * @param {Uint8Array} originalBytes - Original PDF bytes
 * @param {Map<string, string>} formValues - Field name -> value map
 * @returns {Promise<Uint8Array>} Modified PDF bytes
 */
export async function exportFilledPDF(originalBytes, formValues) {
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  for (const field of fields) {
    const name = field.getName();
    const value = formValues.get(name);
    if (value === undefined) continue;

    try {
      const typeName = field.constructor.name;

      if (typeName.startsWith('PDFTextField')) {
        field.setText(value || undefined);
      } else if (typeName.startsWith('PDFCheckBox')) {
        value === 'on' ? field.check() : field.uncheck();
      } else if (typeName.startsWith('PDFRadioGroup')) {
        if (value) field.select(value);
      } else if (typeName.startsWith('PDFDropdown')) {
        if (value) field.select(value);
      }
    } catch (e) {
      console.warn(`Failed to fill field "${name}":`, e.message);
    }
  }

  return pdfDoc.save();
}

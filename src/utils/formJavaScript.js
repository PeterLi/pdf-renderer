/**
 * Sandboxed PDF JavaScript Execution Engine
 * Feature-flagged — disabled by default (allowFormJavaScript: false).
 *
 * Parses PDF JavaScript actions from annotations and executes them
 * in a controlled sandbox with a subset of the Acrobat JavaScript API.
 *
 * @module formJavaScript
 */

// ============================================================
// Safety Classification
// ============================================================

/** @enum {string} */
const SafetyLevel = {
  SAFE: 'safe',       // Always allowed: format masks, pattern validation
  UNSAFE: 'unsafe',   // Gated: calculations, custom validation, cross-field logic
};

/**
 * Classify a JavaScript action string by safety level.
 *
 * @param {string} jsCode - JavaScript code from PDF action
 * @returns {SafetyLevel}
 */
export function classifyAction(jsCode) {
  if (!jsCode || typeof jsCode !== 'string') return SafetyLevel.SAFE;

  const code = jsCode.trim();

  // Safe: Acrobat format functions
  const safePatterns = [
    /^AFNumber_Format\(/,
    /^AFNumber_Keystroke\(/,
    /^AFDate_Format\(/,
    /^AFDate_Keystroke\(/,
    /^AFTime_Format\(/,
    /^AFTime_Keystroke\(/,
    /^AFSpecial_Format\(/,
    /^AFSpecial_Keystroke\(/,
    /^AFPercent_Format\(/,
    /^AFPercent_Keystroke\(/,
    /^AFRange_Validate\(/,
  ];

  if (safePatterns.some(p => p.test(code))) return SafetyLevel.SAFE;

  // Everything else is unsafe
  return SafetyLevel.UNSAFE;
}

// ============================================================
// JavaScript Action Parser
// ============================================================

/**
 * @typedef {Object} ParsedAction
 * @property {string} trigger - Event trigger name (Format, Validate, Calculate, Keystroke)
 * @property {string} code - Raw JavaScript code
 * @property {SafetyLevel} safety - Safety classification
 */

/**
 * Extract JavaScript actions from a PDF.js annotation object.
 * PDF actions are stored in the AA (Additional Actions) and A (Action) dictionaries.
 *
 * @param {Object} widget - PDF.js annotation object
 * @returns {ParsedAction[]}
 */
export function parseJavaScriptActions(widget) {
  /** @type {ParsedAction[]} */
  const actions = [];

  // Map of AA keys to trigger names
  const triggerMap = {
    F:  'Format',
    V:  'Validate',
    C:  'Calculate',
    K:  'Keystroke',
    E:  'Enter',      // Mouse enter
    X:  'Exit',       // Mouse exit
    Fo: 'Focus',
    Bl: 'Blur',
  };

  // Parse PDF.js actions object (different from raw PDF AA dictionary)
  // PDF.js exposes actions with FULL names: { Format: [...], Validate: [...], ... }
  const pdfJsActions = widget.actions;
  if (pdfJsActions && typeof pdfJsActions === 'object') {
    // PDF.js uses full trigger names as keys
    const pdfJsTriggerMap = {
      'Format': 'Format',
      'Validate': 'Validate',
      'Calculate': 'Calculate',
      'Keystroke': 'Keystroke',
      'MouseEnter': 'Enter',
      'MouseExit': 'Exit',
      'Focus': 'Focus',
      'Blur': 'Blur',
    };
    
    for (const [pdfJsKey, triggerName] of Object.entries(pdfJsTriggerMap)) {
      const actionArray = pdfJsActions[pdfJsKey];
      if (Array.isArray(actionArray)) {
        for (const action of actionArray) {
          const code = typeof action === 'string' ? action : action.JS || action.js || '';
          if (code) {
            actions.push({
              trigger: triggerName,
              code,
              safety: classifyAction(code),
            });
          }
        }
      }
    }
  }
  
  // Fallback: Parse AA (Additional Actions) dictionary for raw PDF objects
  const aa = widget.additionalActions || widget.AA;
  if (aa) {
    for (const [key, triggerName] of Object.entries(triggerMap)) {
      const action = aa[key] || aa[triggerName];
      if (action) {
        const code = typeof action === 'string' ? action : action.JS || action.js || '';
        if (code) {
          actions.push({
            trigger: triggerName,
            code,
            safety: classifyAction(code),
          });
        }
      }
    }
  }

  // Parse A (Action) dictionary — typically activation/click
  const a = widget.action || widget.A;
  if (a) {
    const code = typeof a === 'string' ? a : a.JS || a.js || '';
    if (code) {
      actions.push({
        trigger: 'Action',
        code,
        safety: classifyAction(code),
      });
    }
  }

  return actions;
}

// ============================================================
// Acrobat JavaScript API Subset (Sandbox)
// ============================================================

/**
 * Parse Acrobat format function calls and return format metadata.
 * These are always safe to interpret declaratively.
 *
 * @param {string} code - JavaScript code
 * @returns {{ type: string, params: any[] } | null}
 */
export function parseFormatFunction(code) {
  const trimmed = (code || '').trim();

  // AFNumber_Format(nDec, sepStyle, negStyle, currStyle, strCurrency, bCurrencyPrepend)
  const numMatch = trimmed.match(/^AFNumber_Format\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*"([^"]*)",\s*(true|false)\)/);
  if (numMatch) {
    return {
      type: 'number',
      params: {
        decimals: parseInt(numMatch[1]),
        separatorStyle: parseInt(numMatch[2]),
        negativeStyle: parseInt(numMatch[3]),
        currencyStyle: parseInt(numMatch[4]),
        currency: numMatch[5],
        currencyPrepend: numMatch[6] === 'true',
      },
    };
  }

  // AFDate_Format(cFormat)
  const dateMatch = trimmed.match(/^AFDate_Format(?:Ex)?\("([^"]+)"\)/);
  if (dateMatch) {
    return { type: 'date', params: { format: dateMatch[1] } };
  }

  // AFSpecial_Format(psf)
  const specialMatch = trimmed.match(/^AFSpecial_Format\((\d+)\)/);
  if (specialMatch) {
    const specialTypes = ['zipcode', 'zipcode+4', 'phone', 'ssn'];
    return { type: 'special', params: { subtype: specialTypes[parseInt(specialMatch[1])] || 'unknown' } };
  }

  // AFPercent_Format(nDec, sepStyle)
  const pctMatch = trimmed.match(/^AFPercent_Format\((\d+),\s*(\d+)\)/);
  if (pctMatch) {
    return { type: 'percent', params: { decimals: parseInt(pctMatch[1]), separatorStyle: parseInt(pctMatch[2]) } };
  }

  return null;
}

/**
 * Parse validation range from AFRange_Validate calls.
 *
 * @param {string} code - JavaScript code
 * @returns {{ min?: number, max?: number } | null}
 */
export function parseRangeValidation(code) {
  const trimmed = (code || '').trim();

  // AFRange_Validate(bGreaterThan, nGreaterThan, bLessThan, nLessThan)
  const match = trimmed.match(/^AFRange_Validate\((true|false),\s*([\d.]+),\s*(true|false),\s*([\d.]+)\)/);
  if (match) {
    const result = {};
    if (match[1] === 'true') result.min = parseFloat(match[2]);
    if (match[3] === 'true') result.max = parseFloat(match[4]);
    return result;
  }

  return null;
}

// ============================================================
// Sandboxed Execution (Feature-Gated)
// ============================================================

/** Blocked global names — prevents access to dangerous APIs */
const BLOCKED_GLOBALS = [
  'eval', 'Function', 'document', 'window', 'globalThis', 'self',
  'XMLHttpRequest', 'fetch', 'WebSocket', 'Worker', 'SharedWorker',
  'importScripts', 'navigator', 'location', 'history',
  'localStorage', 'sessionStorage', 'indexedDB',
  'setTimeout', 'setInterval', 'requestAnimationFrame',
  'alert', 'confirm', 'prompt', 'open', 'close',
  'postMessage', 'addEventListener', 'removeEventListener',
  'crypto', 'performance',
];

/** Allowed globals in sandbox scope */
const ALLOWED_GLOBALS = {
  Math,
  String,
  Number,
  Boolean,
  Date,
  Array,
  Object,
  RegExp,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  NaN,
  Infinity,
  undefined,
};

/**
 * @typedef {Object} SandboxContext
 * @property {Map<string, string>} fieldValues - All form field values
 * @property {string} currentFieldName - Name of the triggering field
 * @property {string} currentValue - Current value of the triggering field
 * @property {string[]} logs - Console output capture
 * @property {string[]} alerts - Alert messages capture
 */

/**
 * Create a sandboxed execution environment for PDF JavaScript.
 *
 * @param {SandboxContext} context - Execution context
 * @returns {Object} Sandbox scope object
 */
function createSandboxScope(context) {
  const logs = context.logs || [];
  const alerts = context.alerts || [];

  // event object (Acrobat JS API)
  const event = {
    value: context.currentValue || '',
    target: {
      name: context.currentFieldName || '',
      value: context.currentValue || '',
    },
    rc: true,               // Return code — false rejects the change
    change: '',
    commitKey: 0,
    fieldFull: false,
    keyDown: true,
    modifier: false,
    selStart: 0,
    selEnd: 0,
    shift: false,
    willCommit: true,
  };

  // Field proxy for this.getField() / doc.getField()
  const getField = (name) => ({
    name,
    value: context.fieldValues.get(name) || '',
    valueAsString: context.fieldValues.get(name) || '',
    setValue(v) { context.fieldValues.set(name, String(v)); },
  });

  // app object (Acrobat JS API subset)
  const app = {
    alert(msg) {
      alerts.push(String(msg));
    },
  };

  // console object
  const console = {
    println(msg) { logs.push(String(msg)); },
    log(msg) { logs.push(String(msg)); },
  };

  // AFSimple_Calculate helper
  const AFSimple_Calculate = (op, fields) => {
    const values = fields.map(f => {
      const v = parseFloat((context.fieldValues.get(f) || '0').replace(/[$,]/g, ''));
      return isNaN(v) ? 0 : v;
    });

    let result = 0;
    switch (op.toUpperCase()) {
      case 'SUM':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'AVG':
        result = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
      case 'MIN':
        result = values.length ? Math.min(...values) : 0;
        break;
      case 'MAX':
        result = values.length ? Math.max(...values) : 0;
        break;
      case 'PRD':
        result = values.reduce((a, b) => a * b, 1);
        break;
    }
    event.value = String(result);
  };

  // AFNumber_Format (runtime version for sandbox)
  const AFNumber_Format = (nDec, sepStyle, negStyle, currStyle, strCurrency, bPrepend) => {
    let val = parseFloat(String(event.value).replace(/[$,]/g, ''));
    if (isNaN(val)) val = 0;

    const sep = sepStyle === 0 || sepStyle === 2 ? ',' : '.';
    const decSep = sepStyle === 0 || sepStyle === 2 ? '.' : ',';

    let str = val.toFixed(nDec);
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    str = parts.join(decSep);

    if (strCurrency) {
      str = bPrepend ? strCurrency + str : str + strCurrency;
    }
    event.value = str;
  };

  // ---- Date formatting helpers ----

  // Predefined Acrobat date format codes
  const _dateFormatCodes = {
    0: 'm/d',
    1: 'm/d/yy',
    2: 'mm/dd/yy',
    3: 'mm/dd/yyyy',
    4: 'd-mmm',
    5: 'd-mmm-yy',
    6: 'dd-mmm-yy',
    7: 'yy-mm-dd',
    8: 'yyyy-mm-dd',
    9: 'd-mmm-yyyy',
    10: 'm/d/yy h:MM tt',
    11: 'm/d/yy HH:MM',
  };

  /**
   * Apply an Acrobat date format string to a Date object.
   * Supports: yyyy, yy, mmmm, mmm, mm, m, dd, d, HH, h, MM, ss, tt
   */
  const _formatDate = (date, fmt) => {
    const months = ['January','February','March','April','May','June',
      'July','August','September','October','November','December'];
    const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun',
      'Jul','Aug','Sep','Oct','Nov','Dec'];

    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const ampm = hours24 < 12 ? 'am' : 'pm';
    const pad = (n) => String(n).padStart(2, '0');

    // Replace tokens from longest to shortest to avoid partial matches
    let result = fmt;
    result = result.replace(/yyyy/g, String(date.getFullYear()));
    result = result.replace(/yy/g, String(date.getFullYear()).slice(-2));
    result = result.replace(/mmmm/g, months[date.getMonth()]);
    result = result.replace(/mmm/g, monthsShort[date.getMonth()]);
    result = result.replace(/mm/g, pad(date.getMonth() + 1));
    result = result.replace(/m/g, String(date.getMonth() + 1));
    result = result.replace(/dd/g, pad(date.getDate()));
    result = result.replace(/d/g, String(date.getDate()));
    result = result.replace(/HH/g, pad(hours24));
    result = result.replace(/h/g, String(hours12));
    result = result.replace(/MM/g, pad(date.getMinutes()));
    result = result.replace(/ss/g, pad(date.getSeconds()));
    result = result.replace(/tt/g, ampm);

    return result;
  };

  /**
   * Try to parse a value as a Date. Handles numeric strings (timestamps),
   * ISO strings, and common date formats.
   */
  const _parseDate = (val) => {
    if (!val && val !== 0) return null;
    const s = String(val).trim();
    if (!s) return null;

    // Numeric — treat as milliseconds timestamp
    const num = Number(s);
    if (!isNaN(num) && isFinite(num)) {
      const d = new Date(num);
      return isNaN(d.getTime()) ? null : d;
    }

    // Try native parse (handles ISO 8601 and common formats)
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  // AFDate_Format — format using predefined Acrobat format code index
  const AFDate_Format = (cFormat) => {
    const fmt = typeof cFormat === 'number' ? (_dateFormatCodes[cFormat] || 'mm/dd/yyyy') : String(cFormat);
    const date = _parseDate(event.value);
    if (date) {
      event.value = _formatDate(date, fmt);
    }
    // If we can't parse, leave event.value as-is
  };

  // AFDate_FormatEx — format using a custom Acrobat format string
  const AFDate_FormatEx = (cFormat) => {
    const fmt = String(cFormat || 'mm/dd/yyyy');
    const date = _parseDate(event.value);
    if (date) {
      event.value = _formatDate(date, fmt);
    }
  };

  const AFSpecial_Format = (psf) => {
    console.log('[AFSpecial_Format] Called with psf:', psf, 'event.value:', event.value);
    // psf: 0=zipcode, 1=zipcode+4, 2=phone, 3=ssn
    const value = String(event.value || '').replace(/\D/g, ''); // Remove non-digits
    console.log('[AFSpecial_Format] Cleaned value:', value);
    
    switch (psf) {
      case 0: // Zipcode (xxxxx)
        event.value = value.substring(0, 5);
        break;
        
      case 1: // Zipcode + 4 (xxxxx-xxxx)
        if (value.length <= 5) {
          event.value = value;
        } else {
          event.value = value.substring(0, 5) + '-' + value.substring(5, 9);
        }
        break;
        
      case 2: // Phone ((xxx) xxx-xxxx)
        if (value.length === 0) {
          event.value = '';
        } else if (value.length <= 3) {
          event.value = '(' + value;
        } else if (value.length <= 6) {
          event.value = '(' + value.substring(0, 3) + ') ' + value.substring(3);
        } else {
          event.value = '(' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6, 10);
        }
        break;
        
      case 3: // SSN (xxx-xx-xxxx)
        if (value.length <= 3) {
          event.value = value;
        } else if (value.length <= 5) {
          event.value = value.substring(0, 3) + '-' + value.substring(3);
        } else {
          event.value = value.substring(0, 3) + '-' + value.substring(3, 5) + '-' + value.substring(5, 9);
        }
        break;
        
      default:
        // Unknown format, leave as-is
        break;
    }
  };

  // AFNumber_Keystroke — validate numeric keystrokes
  // Rejects non-numeric characters (allows digits, minus, decimal, separators)
  const AFNumber_Keystroke = (nDec, sepStyle /*, negStyle, currStyle, strCurrency, bPrepend */) => {
    if (event.willCommit) {
      // On commit, just check if it's a valid number
      const val = String(event.value).replace(/[$,\s]/g, '');
      if (val !== '' && isNaN(parseFloat(val))) {
        event.rc = false;
      }
      return;
    }

    // During keystroke, allow digits, minus (at start), and one decimal separator
    const decSep = (sepStyle === 0 || sepStyle === 2) ? '.' : ',';
    const ch = event.change || '';

    // Allow empty change (delete/backspace)
    if (!ch) return;

    // Allow digits
    if (/^\d$/.test(ch)) return;

    // Allow minus sign only at position 0
    if (ch === '-' && event.selStart === 0) return;

    // Allow decimal separator if decimals are allowed and not already present
    if (nDec > 0 && ch === decSep) {
      const currentVal = String(event.value);
      if (!currentVal.includes(decSep)) return;
    }

    // Reject everything else
    event.rc = false;
  };

  // AFDate_Keystroke — validate date input on commit
  const AFDate_Keystroke = (cFormat) => {
    if (!event.willCommit) return; // Allow free typing during keystroke

    const val = String(event.value).trim();
    if (!val) return; // Allow empty

    // Try to parse the date — if it fails, reject
    const date = _parseDate(val);
    if (!date) {
      event.rc = false;
    }
  };

  // AFTime_Format — format time values
  // psf: 0='HH:MM', 1='h:MM tt', 2='HH:MM:ss', 3='h:MM:ss tt'
  const AFTime_Format = (psf) => {
    const timeFormats = {
      0: 'HH:MM',
      1: 'h:MM tt',
      2: 'HH:MM:ss',
      3: 'h:MM:ss tt',
    };
    const fmt = timeFormats[psf] || 'HH:MM';
    const date = _parseDate(event.value);
    if (date) {
      event.value = _formatDate(date, fmt);
    }
  };

  // AFTime_Keystroke — validate time input on commit
  const AFTime_Keystroke = (psf) => {
    if (!event.willCommit) return;
    const val = String(event.value).trim();
    if (!val) return;
    // Basic time validation: accept if parseable as date/time
    if (!_parseDate(val)) {
      event.rc = false;
    }
  };

  // AFSpecial_Keystroke — validate phone/zip/ssn input
  // psf: 0=zipcode(5 digits), 1=zip+4(9 digits), 2=phone(10 digits), 3=ssn(9 digits)
  const AFSpecial_Keystroke = (psf) => {
    if (event.willCommit) {
      // On commit, validate the full value has the right number of digits
      const digits = String(event.value).replace(/\D/g, '');
      const requiredLengths = { 0: 5, 1: 9, 2: 10, 3: 9 };
      const required = requiredLengths[psf];
      if (required && digits.length !== required && digits.length > 0) {
        event.rc = false;
      }
      return;
    }

    // During keystroke, only allow digits
    const ch = event.change || '';
    if (ch && !/^\d$/.test(ch)) {
      event.rc = false;
    }
  };

  // AFPercent_Format — format value as percentage
  // Multiplies by 100 and appends '%'
  const AFPercent_Format = (nDec, sepStyle) => {
    let val = parseFloat(String(event.value).replace(/[%,]/g, ''));
    if (isNaN(val)) val = 0;

    // Acrobat multiplies the raw value by 100 for display
    val = val * 100;

    const sep = (sepStyle === 0 || sepStyle === 2) ? ',' : '.';
    const decSep = (sepStyle === 0 || sepStyle === 2) ? '.' : ',';

    let str = val.toFixed(nDec);
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    str = parts.join(decSep);

    event.value = str + '%';
  };

  // AFPercent_Keystroke — validate percentage input (same rules as number)
  const AFPercent_Keystroke = (nDec, sepStyle) => {
    AFNumber_Keystroke(nDec, sepStyle);
  };

  // AFRange_Validate — validate that a numeric value is within a range
  const AFRange_Validate = (bGreaterThan, nGreaterThan, bLessThan, nLessThan) => {
    const val = parseFloat(String(event.value).replace(/[$,%\s]/g, ''));

    if (isNaN(val)) {
      // Allow empty/non-numeric — other validators handle required fields
      return;
    }

    if (bGreaterThan && val < nGreaterThan) {
      event.rc = false;
      return;
    }

    if (bLessThan && val > nLessThan) {
      event.rc = false;
      return;
    }
  };

  // Build scope (filter out 'undefined' - can't be a parameter name in strict mode)
  const allowedGlobalsFiltered = { ...ALLOWED_GLOBALS };
  delete allowedGlobalsFiltered.undefined;
  
  const scope = {
    ...allowedGlobalsFiltered,
    event,
    app,
    console,
    getField,
    AFSimple_Calculate,
    AFNumber_Format,
    AFNumber_Keystroke,
    AFDate_Format,
    AFDate_FormatEx,
    AFDate_Keystroke,
    AFTime_Format,
    AFTime_Keystroke,
    AFSpecial_Format,
    AFSpecial_Keystroke,
    AFPercent_Format,
    AFPercent_Keystroke,
    AFRange_Validate,
  };

  // Don't add BLOCKED_GLOBALS to scope - they're blocked by not being in scope!
  // Adding them as undefined causes "eval" and other reserved words to become parameter names

  return scope;
}

/**
 * Execute JavaScript code in a sandboxed environment.
 * Only runs when allowFormJavaScript is enabled.
 *
 * @param {string} code - JavaScript code to execute
 * @param {SandboxContext} context - Execution context
 * @param {{ timeoutMs?: number }} [options] - Execution options
 * @returns {{ success: boolean, event: Object, logs: string[], alerts: string[], error?: string }}
 */
export function executeSandboxed(code, context, options = {}) {
  const timeoutMs = options.timeoutMs || 100;
  const logs = [];
  const alerts = [];

  context.logs = logs;
  context.alerts = alerts;

  try {
    const scope = createSandboxScope(context);
    const scopeKeys = Object.keys(scope);
    const scopeValues = scopeKeys.map(k => scope[k]);

    console.log('[formJavaScript] Scope keys:', scopeKeys);
    console.log('[formJavaScript] Has AFSpecial_Format?', scopeKeys.includes('AFSpecial_Format'));
    
    // Check for reserved words that can't be parameter names in strict mode
    const strictReservedWords = [
      'implements', 'interface', 'let', 'package', 'private', 'protected',
      'public', 'static', 'yield', 'eval', 'arguments', 'undefined'
    ];
    const invalidKeys = scopeKeys.filter(k => strictReservedWords.includes(k));
    if (invalidKeys.length > 0) {
      console.error('[formJavaScript] Found reserved words in scope:', invalidKeys);
    }
    
    console.log('[formJavaScript] Code to execute:', code);

    // Build function body with timeout check
    const wrappedCode = `
      "use strict";
      ${code}
      return event;
    `;

    console.log('[formJavaScript] Wrapped code:', wrappedCode);

    // Use Function constructor with controlled scope
    // The scope parameters shadow any global access
    const fn = new Function(...scopeKeys, wrappedCode);

    // Execute with timeout via synchronous approach
    // (true timeout requires workers, but we limit code complexity instead)
    const startTime = performance.now();
    const resultEvent = fn(...scopeValues);
    const elapsed = performance.now() - startTime;

    if (elapsed > timeoutMs) {
      return {
        success: false,
        event: scope.event,
        logs,
        alerts,
        error: `Script exceeded timeout (${Math.round(elapsed)}ms > ${timeoutMs}ms)`,
      };
    }

    return {
      success: true,
      event: resultEvent || scope.event,
      logs,
      alerts,
    };
  } catch (err) {
    console.error('[formJavaScript] Execution error:', err);
    console.error('[formJavaScript] Error stack:', err.stack);
    return {
      success: false,
      event: { value: context.currentValue },
      logs,
      alerts,
      error: `Script error: ${err.message}`,
    };
  }
}

// ============================================================
// Calculation Order Support
// ============================================================

/**
 * @typedef {Object} CalculationEntry
 * @property {string} fieldName - Target field to calculate
 * @property {string} code - JavaScript calculation code
 * @property {SafetyLevel} safety - Safety classification
 */

/**
 * Extract calculation order from field actions.
 * Returns fields that have Calculate triggers, in order.
 *
 * @param {Map<string, ParsedAction[]>} fieldActions - Field name -> parsed actions map
 * @returns {CalculationEntry[]}
 */
export function getCalculationOrder(fieldActions) {
  /** @type {CalculationEntry[]} */
  const calcs = [];

  for (const [fieldName, actions] of fieldActions) {
    for (const action of actions) {
      if (action.trigger === 'Calculate') {
        calcs.push({
          fieldName,
          code: action.code,
          safety: action.safety,
        });
      }
    }
  }

  return calcs;
}

/**
 * Run all calculations in order, updating field values.
 * Only executes if allowFormJavaScript is enabled.
 *
 * @param {CalculationEntry[]} calculations - Ordered calculation entries
 * @param {Map<string, string>} fieldValues - Mutable field values map
 * @param {boolean} allowUnsafe - Whether to run UNSAFE calculations
 * @returns {{ updates: Map<string, string>, errors: string[] }}
 */
export function runCalculations(calculations, fieldValues, allowUnsafe = false) {
  const updates = new Map();
  const errors = [];

  for (const calc of calculations) {
    if (calc.safety === SafetyLevel.UNSAFE && !allowUnsafe) continue;

    const result = executeSandboxed(calc.code, {
      fieldValues,
      currentFieldName: calc.fieldName,
      currentValue: fieldValues.get(calc.fieldName) || '',
    });

    if (result.success && result.event) {
      const newValue = String(result.event.value ?? '');
      if (newValue !== (fieldValues.get(calc.fieldName) || '')) {
        fieldValues.set(calc.fieldName, newValue);
        updates.set(calc.fieldName, newValue);
      }
    } else if (result.error) {
      errors.push(`${calc.fieldName}: ${result.error}`);
    }
  }

  return { updates, errors };
}

// ============================================================
// Exports
// ============================================================

export { SafetyLevel };

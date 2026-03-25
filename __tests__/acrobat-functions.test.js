/**
 * Tests for Acrobat JavaScript API — Phase 1, 2, and 3
 *
 * Uses the sandboxed execution engine to verify all implemented functions.
 */
import { describe, it, expect } from 'vitest';
import { executeSandboxed, classifyAction, parseFormatFunction, parseRangeValidation } from '../src/utils/formJavaScript.js';

// Helper: run JS in sandbox and return the result
function run(code, value = '', fieldValues = new Map()) {
  return executeSandboxed(code, {
    fieldValues,
    currentFieldName: 'testField',
    currentValue: value,
  });
}

// Helper: run and return just event.value
function runValue(code, value = '', fieldValues = new Map()) {
  const result = run(code, value, fieldValues);
  expect(result.success).toBe(true);
  return result.event.value;
}

// ============================================================
// Phase 1: Format & Validation Functions
// ============================================================

describe('Phase 1: Format & Validation', () => {
  describe('AFSpecial_Format', () => {
    it('formats ZIP code (5 digits)', () => {
      expect(runValue('AFSpecial_Format(0);', '12345')).toBe('12345');
    });

    it('formats ZIP+4', () => {
      expect(runValue('AFSpecial_Format(1);', '123456789')).toBe('12345-6789');
    });

    it('formats phone number', () => {
      expect(runValue('AFSpecial_Format(2);', '5551234567')).toBe('(555) 123-4567');
    });

    it('formats SSN', () => {
      expect(runValue('AFSpecial_Format(3);', '123456789')).toBe('123-45-6789');
    });
  });

  describe('AFNumber_Format', () => {
    it('formats with 2 decimals and dollar sign', () => {
      expect(runValue('AFNumber_Format(2, 0, 0, 0, "$", true);', '1234.5')).toBe('$1,234.50');
    });

    it('formats zero', () => {
      expect(runValue('AFNumber_Format(2, 0, 0, 0, "", true);', '0')).toBe('0.00');
    });
  });

  describe('AFDate_Format', () => {
    it('formats date with code 2 (mm/dd/yy)', () => {
      const result = runValue('AFDate_Format(2);', '2024-03-15');
      expect(result).toBe('03/15/24');
    });

    it('formats date with code 8 (yyyy-mm-dd)', () => {
      const result = runValue('AFDate_Format(8);', '03/15/2024');
      expect(result).toBe('2024-03-15');
    });
  });

  describe('AFTime_Format', () => {
    it('formats 24h time', () => {
      const result = runValue('AFTime_Format(0);', '2024-01-01T14:30:00');
      expect(result).toBe('14:30');
    });
  });

  describe('AFPercent_Format', () => {
    it('formats as percentage', () => {
      expect(runValue('AFPercent_Format(2, 0);', '0.25')).toBe('25.00%');
    });
  });

  describe('AFRange_Validate', () => {
    it('accepts value within range', () => {
      const result = run('AFRange_Validate(true, 1, true, 100);', '50');
      expect(result.event.rc).toBe(true);
    });

    it('rejects value below minimum', () => {
      const result = run('AFRange_Validate(true, 1, true, 100);', '0');
      expect(result.event.rc).toBe(false);
    });

    it('rejects value above maximum', () => {
      const result = run('AFRange_Validate(true, 1, true, 100);', '150');
      expect(result.event.rc).toBe(false);
    });
  });
});

// ============================================================
// Phase 2: Advanced Form Functions
// ============================================================

describe('Phase 2: Advanced Form Functions', () => {
  describe('AFDate_FormatEx', () => {
    it('formats with custom format string', () => {
      const result = runValue('AFDate_FormatEx("yyyy/mm/dd");', '2024-03-15');
      expect(result).toBe('2024/03/15');
    });
  });

  describe('AFSimple_Calculate', () => {
    it('calculates SUM of fields', () => {
      const fields = new Map([['a', '10'], ['b', '20'], ['c', '30']]);
      const result = runValue('AFSimple_Calculate("SUM", ["a", "b", "c"]);', '', fields);
      expect(result).toBe('60');
    });

    it('calculates AVG of fields', () => {
      const fields = new Map([['a', '10'], ['b', '20']]);
      const result = runValue('AFSimple_Calculate("AVG", ["a", "b"]);', '', fields);
      expect(result).toBe('15');
    });

    it('calculates PRD of fields', () => {
      const fields = new Map([['a', '3'], ['b', '4']]);
      const result = runValue('AFSimple_Calculate("PRD", ["a", "b"]);', '', fields);
      expect(result).toBe('12');
    });

    it('calculates MIN of fields', () => {
      const fields = new Map([['a', '30'], ['b', '10'], ['c', '20']]);
      const result = runValue('AFSimple_Calculate("MIN", ["a", "b", "c"]);', '', fields);
      expect(result).toBe('10');
    });

    it('calculates MAX of fields', () => {
      const fields = new Map([['a', '30'], ['b', '10'], ['c', '20']]);
      const result = runValue('AFSimple_Calculate("MAX", ["a", "b", "c"]);', '', fields);
      expect(result).toBe('30');
    });
  });

  describe('AFRegex_Validate', () => {
    it('accepts matching value', () => {
      const result = run('AFRegex_Validate("^[A-Z]{3}$");', 'ABC');
      expect(result.event.rc).toBe(true);
    });

    it('rejects non-matching value', () => {
      const result = run('AFRegex_Validate("^[A-Z]{3}$");', 'abc');
      expect(result.event.rc).toBe(false);
    });
  });

  describe('util.printd', () => {
    it('formats date with custom format', () => {
      const result = run('event.value = util.printd("yyyy-mm-dd", new Date(2024, 2, 15));', '');
      expect(result.event.value).toBe('2024-03-15');
    });
  });

  describe('util.scand', () => {
    it('parses date string with format', () => {
      const result = run(`
        var d = util.scand("mm/dd/yyyy", "03/15/2024");
        event.value = d ? d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate() : "null";
      `, '');
      expect(result.event.value).toBe('2024-3-15');
    });
  });
});

// ============================================================
// Phase 3: Field Object API
// ============================================================

describe('Phase 3: Field Object API', () => {

  describe('Field Properties', () => {
    describe('field.value', () => {
      it('gets field value', () => {
        const fields = new Map([['myField', 'hello']]);
        const result = run('var f = getField("myField"); event.value = f.value;', '', fields);
        expect(result.event.value).toBe('hello');
      });

      it('sets field value', () => {
        const fields = new Map([['myField', '']]);
        run('var f = getField("myField"); f.value = "world";', '', fields);
        expect(fields.get('myField')).toBe('world');
      });
    });

    describe('field.display', () => {
      it('defaults to visible (0)', () => {
        const result = run('var f = getField("myField"); event.value = String(f.display);', '');
        expect(result.event.value).toBe('0');
      });

      it('can be set to hidden (1)', () => {
        const result = run(`
          var f = getField("myField");
          f.display = 1;
          event.value = String(f.display);
        `, '');
        expect(result.event.value).toBe('1');
      });

      it('rejects invalid values', () => {
        const result = run(`
          var f = getField("myField");
          f.display = 5;
          event.value = String(f.display);
        `, '');
        expect(result.event.value).toBe('0');
      });
    });

    describe('field.readonly', () => {
      it('defaults to false', () => {
        const result = run('var f = getField("myField"); event.value = String(f.readonly);', '');
        expect(result.event.value).toBe('false');
      });

      it('can be set to true', () => {
        const result = run(`
          var f = getField("myField");
          f.readonly = true;
          event.value = String(f.readonly);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });

    describe('field.required', () => {
      it('defaults to false', () => {
        const result = run('var f = getField("myField"); event.value = String(f.required);', '');
        expect(result.event.value).toBe('false');
      });

      it('can be toggled', () => {
        const result = run(`
          var f = getField("myField");
          f.required = true;
          event.value = String(f.required);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });

    describe('field.borderColor', () => {
      it('can be set to a color array', () => {
        const result = run(`
          var f = getField("myField");
          f.borderColor = color.red;
          event.value = f.borderColor.join(",");
        `, '');
        expect(result.event.value).toBe('RGB,1,0,0');
      });
    });

    describe('field.fillColor', () => {
      it('defaults to transparent', () => {
        const result = run(`
          var f = getField("myField");
          event.value = f.fillColor.join(",");
        `, '');
        expect(result.event.value).toBe('T');
      });

      it('can be set to a color', () => {
        const result = run(`
          var f = getField("myField");
          f.fillColor = color.yellow;
          event.value = f.fillColor.join(",");
        `, '');
        expect(result.event.value).toBe('CMYK,0,0,1,0');
      });
    });

    describe('field.textColor', () => {
      it('can be set to blue', () => {
        const result = run(`
          var f = getField("myField");
          f.textColor = color.blue;
          event.value = f.textColor.join(",");
        `, '');
        expect(result.event.value).toBe('RGB,0,0,1');
      });
    });

    describe('field.textSize', () => {
      it('defaults to 0 (auto)', () => {
        const result = run('var f = getField("myField"); event.value = String(f.textSize);', '');
        expect(result.event.value).toBe('0');
      });

      it('can be set to a number', () => {
        const result = run(`
          var f = getField("myField");
          f.textSize = 14;
          event.value = String(f.textSize);
        `, '');
        expect(result.event.value).toBe('14');
      });

      it('rejects negative values', () => {
        const result = run(`
          var f = getField("myField");
          f.textSize = -5;
          event.value = String(f.textSize);
        `, '');
        expect(result.event.value).toBe('0');
      });
    });

    describe('field.textFont', () => {
      it('defaults to Helvetica', () => {
        const result = run('var f = getField("myField"); event.value = f.textFont;', '');
        expect(result.event.value).toBe('Helvetica');
      });

      it('can be set to a font name', () => {
        const result = run(`
          var f = getField("myField");
          f.textFont = "Courier";
          event.value = f.textFont;
        `, '');
        expect(result.event.value).toBe('Courier');
      });
    });

    describe('field.alignment', () => {
      it('defaults to left', () => {
        const result = run('var f = getField("myField"); event.value = f.alignment;', '');
        expect(result.event.value).toBe('left');
      });

      it('accepts center and right', () => {
        const result = run(`
          var f = getField("myField");
          f.alignment = "center";
          var c = f.alignment;
          f.alignment = "right";
          event.value = c + "," + f.alignment;
        `, '');
        expect(result.event.value).toBe('center,right');
      });

      it('rejects invalid values', () => {
        const result = run(`
          var f = getField("myField");
          f.alignment = "justify";
          event.value = f.alignment;
        `, '');
        expect(result.event.value).toBe('left');
      });
    });

    describe('field.multiline', () => {
      it('defaults to false', () => {
        const result = run('var f = getField("myField"); event.value = String(f.multiline);', '');
        expect(result.event.value).toBe('false');
      });

      it('can be toggled', () => {
        const result = run(`
          var f = getField("myField");
          f.multiline = true;
          event.value = String(f.multiline);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });

    describe('field.password', () => {
      it('can be set', () => {
        const result = run(`
          var f = getField("myField");
          f.password = true;
          event.value = String(f.password);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });

    describe('field.fileSelect', () => {
      it('can be toggled', () => {
        const result = run(`
          var f = getField("myField");
          f.fileSelect = true;
          event.value = String(f.fileSelect);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });

    describe('field.charLimit', () => {
      it('defaults to 0 (no limit)', () => {
        const result = run('var f = getField("myField"); event.value = String(f.charLimit);', '');
        expect(result.event.value).toBe('0');
      });

      it('can be set to a positive integer', () => {
        const result = run(`
          var f = getField("myField");
          f.charLimit = 50;
          event.value = String(f.charLimit);
        `, '');
        expect(result.event.value).toBe('50');
      });
    });

    describe('field.comb', () => {
      it('can be set', () => {
        const result = run(`
          var f = getField("myField");
          f.comb = true;
          event.value = String(f.comb);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });

    describe('field.doNotScroll', () => {
      it('can be toggled', () => {
        const result = run(`
          var f = getField("myField");
          f.doNotScroll = true;
          event.value = String(f.doNotScroll);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });

    describe('field.doNotSpellCheck', () => {
      it('can be toggled', () => {
        const result = run(`
          var f = getField("myField");
          f.doNotSpellCheck = true;
          event.value = String(f.doNotSpellCheck);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });
  });

  describe('Field Methods', () => {
    describe('field.setFocus()', () => {
      it('records focus request in context', () => {
        const fields = new Map();
        const context = {
          fieldValues: fields,
          currentFieldName: 'testField',
          currentValue: '',
        };
        const result = executeSandboxed('var f = getField("targetField"); f.setFocus();', context);
        expect(result.success).toBe(true);
        expect(result.focusRequest).toBe('targetField');
      });
    });

    describe('field.setAction()', () => {
      it('sets an action for a valid trigger', () => {
        const result = run(`
          var f = getField("myField");
          f.setAction("MouseUp", "app.alert('clicked');");
          event.value = "ok";
        `, '');
        expect(result.success).toBe(true);
        expect(result.fieldMeta.get('myField').actions.MouseUp).toBe("app.alert('clicked');");
      });

      it('ignores invalid triggers', () => {
        const result = run(`
          var f = getField("myField");
          f.setAction("InvalidTrigger", "code");
          event.value = String(Object.keys(getField("myField")).length > 0);
        `, '');
        expect(result.success).toBe(true);
        expect(result.fieldMeta.get('myField').actions).not.toHaveProperty('InvalidTrigger');
      });
    });

    describe('field.clearItems()', () => {
      it('clears all items', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems([["A", "a"], ["B", "b"], ["C", "c"]]);
          f.clearItems();
          event.value = String(f.numItems);
        `, '');
        expect(result.event.value).toBe('0');
      });
    });

    describe('field.insertItemAt()', () => {
      it('inserts item at end by default', () => {
        const result = run(`
          var f = getField("dropdown");
          f.insertItemAt("Apple", "apple");
          f.insertItemAt("Banana", "banana");
          event.value = f.numItems + ":" + f.getItemAt(0) + "," + f.getItemAt(1);
        `, '');
        expect(result.event.value).toBe('2:Apple,Banana');
      });

      it('inserts item at specific index', () => {
        const result = run(`
          var f = getField("dropdown");
          f.insertItemAt("First", "first");
          f.insertItemAt("Third", "third");
          f.insertItemAt("Second", "second", 1);
          event.value = f.getItemAt(0) + "," + f.getItemAt(1) + "," + f.getItemAt(2);
        `, '');
        expect(result.event.value).toBe('First,Second,Third');
      });

      it('uses label as export value when cExport is omitted', () => {
        const result = run(`
          var f = getField("dropdown");
          f.insertItemAt("Display");
          event.value = f.getItemAt(0, true);
        `, '');
        expect(result.event.value).toBe('Display');
      });
    });

    describe('field.deleteItemAt()', () => {
      it('deletes item at index', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems(["A", "B", "C"]);
          f.deleteItemAt(1);
          event.value = f.numItems + ":" + f.getItemAt(0) + "," + f.getItemAt(1);
        `, '');
        expect(result.event.value).toBe('2:A,C');
      });

      it('ignores out-of-range index', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems(["A", "B"]);
          f.deleteItemAt(5);
          event.value = String(f.numItems);
        `, '');
        expect(result.event.value).toBe('2');
      });
    });

    describe('field.getItemAt()', () => {
      it('returns label by default', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems([["Apple", "a"], ["Banana", "b"]]);
          event.value = f.getItemAt(0);
        `, '');
        expect(result.event.value).toBe('Apple');
      });

      it('returns export value when bExportValue is true', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems([["Apple", "a"], ["Banana", "b"]]);
          event.value = f.getItemAt(1, true);
        `, '');
        expect(result.event.value).toBe('b');
      });

      it('returns empty string for invalid index', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems(["A"]);
          event.value = f.getItemAt(99);
        `, '');
        expect(result.event.value).toBe('');
      });
    });

    describe('field.setItems()', () => {
      it('sets items from [label, value] pairs', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems([["Red", "r"], ["Green", "g"], ["Blue", "b"]]);
          event.value = f.numItems + ":" + f.getItemAt(0) + "=" + f.getItemAt(0, true);
        `, '');
        expect(result.event.value).toBe('3:Red=r');
      });

      it('sets items from simple strings', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems(["Option1", "Option2", "Option3"]);
          event.value = f.numItems + ":" + f.getItemAt(1) + "=" + f.getItemAt(1, true);
        `, '');
        expect(result.event.value).toBe('3:Option2=Option2');
      });

      it('replaces existing items', () => {
        const result = run(`
          var f = getField("dropdown");
          f.setItems(["A", "B", "C"]);
          f.setItems(["X", "Y"]);
          event.value = String(f.numItems);
        `, '');
        expect(result.event.value).toBe('2');
      });
    });
  });

  describe('Color Object', () => {
    it('provides named color constants', () => {
      const result = run(`
        event.value = [
          color.black.join(","),
          color.red.join(","),
          color.transparent.join(",")
        ].join("|");
      `, '');
      expect(result.event.value).toBe('G,0|RGB,1,0,0|T');
    });
  });

  describe('Cross-field Manipulation', () => {
    it('can modify another field via getField', () => {
      const fields = new Map([['fieldA', 'original'], ['fieldB', '']]);
      run('var f = getField("fieldA"); f.value = "modified";', '', fields);
      expect(fields.get('fieldA')).toBe('modified');
    });

    it('can read and write multiple fields', () => {
      const fields = new Map([['price', '100'], ['qty', '5'], ['total', '']]);
      const result = run(`
        var price = getField("price");
        var qty = getField("qty");
        var total = getField("total");
        total.value = String(parseFloat(price.value) * parseFloat(qty.value));
        event.value = total.value;
      `, '', fields);
      expect(result.event.value).toBe('500');
      expect(fields.get('total')).toBe('500');
    });

    it('can set field properties across fields', () => {
      const fields = new Map([['name', 'John'], ['email', '']]);
      const result = run(`
        var name = getField("name");
        var email = getField("email");
        name.readonly = true;
        email.required = true;
        email.fillColor = color.ltGray;
        event.value = String(name.readonly) + "," + String(email.required);
      `, '', fields);
      expect(result.event.value).toBe('true,true');
      expect(result.fieldMeta.get('name').readonly).toBe(true);
      expect(result.fieldMeta.get('email').required).toBe(true);
      expect(result.fieldMeta.get('email').fillColor).toEqual(['G', 0.75]);
    });
  });

  describe('Edge Cases', () => {
    it('getField returns null for invalid name', () => {
      const result = run('event.value = String(getField("") === null);', '');
      expect(result.event.value).toBe('true');
    });

    it('field metadata persists across getField calls', () => {
      const result = run(`
        var f1 = getField("myField");
        f1.textSize = 18;
        f1.alignment = "center";
        var f2 = getField("myField");
        event.value = f2.textSize + "," + f2.alignment;
      `, '');
      expect(result.event.value).toBe('18,center');
    });

    it('display constants are available', () => {
      const result = run(`
        event.value = [
          display.visible,
          display.hidden,
          display.noPrint,
          display.noView
        ].join(",");
      `, '');
      expect(result.event.value).toBe('0,1,2,3');
    });
  });
});

// ============================================================
// Safety & Parser Tests
// ============================================================

describe('Safety Classification', () => {
  it('classifies format functions as safe', () => {
    expect(classifyAction('AFSpecial_Format(0);')).toBe('safe');
    expect(classifyAction('AFNumber_Format(2, 0, 0, 0, "$", true);')).toBe('safe');
    expect(classifyAction('AFDate_FormatEx("yyyy-mm-dd");')).toBe('safe');
  });

  it('classifies unknown code as unsafe', () => {
    expect(classifyAction('this.getField("x").value = "hack";')).toBe('unsafe');
  });
});

describe('parseFormatFunction', () => {
  it('parses AFNumber_Format', () => {
    const result = parseFormatFunction('AFNumber_Format(2, 0, 0, 0, "$", true)');
    expect(result.type).toBe('number');
    expect(result.params.decimals).toBe(2);
    expect(result.params.currency).toBe('$');
  });

  it('parses AFSpecial_Format', () => {
    const result = parseFormatFunction('AFSpecial_Format(2)');
    expect(result.type).toBe('special');
    expect(result.params.subtype).toBe('phone');
  });
});

describe('parseRangeValidation', () => {
  it('parses range with both bounds', () => {
    const result = parseRangeValidation('AFRange_Validate(true, 0, true, 100)');
    expect(result.min).toBe(0);
    expect(result.max).toBe(100);
  });

  it('parses range with only min', () => {
    const result = parseRangeValidation('AFRange_Validate(true, 5, false, 0)');
    expect(result.min).toBe(5);
    expect(result.max).toBeUndefined();
  });
});

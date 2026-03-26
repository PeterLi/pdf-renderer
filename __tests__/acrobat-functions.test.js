/**
 * Tests for Acrobat JavaScript API — Phase 1, 2, and 3
 *
 * Uses the sandboxed execution engine to verify all implemented functions.
 */
import { describe, it, expect } from 'vitest';
import { executeSandboxed, classifyAction, parseFormatFunction, parseRangeValidation } from '../src/utils/formJavaScript.js';

// Helper: run JS in sandbox and return the result
function run(code, value = '', fieldValues = new Map(), extraContext = {}) {
  return executeSandboxed(code, {
    fieldValues,
    currentFieldName: 'testField',
    currentValue: value,
    ...extraContext,
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
// Phase 4: Document Object API
// ============================================================

describe('Phase 4: Document Object API', () => {

  describe('Document Properties', () => {
    describe('this.numPages', () => {
      it('returns configured page count', () => {
        const result = run('event.value = String(this.numPages);', '', new Map(), { numPages: 5 });
        expect(result.event.value).toBe('5');
      });

      it('defaults to 1', () => {
        const result = run('event.value = String(this.numPages);', '');
        expect(result.event.value).toBe('1');
      });

      it('is accessible via doc object', () => {
        const result = run('event.value = String(doc.numPages);', '', new Map(), { numPages: 10 });
        expect(result.event.value).toBe('10');
      });

      it('is accessible as top-level variable', () => {
        const result = run('event.value = String(numPages);', '', new Map(), { numPages: 3 });
        expect(result.event.value).toBe('3');
      });
    });

    describe('this.pageNum', () => {
      it('returns current page number', () => {
        const result = run('event.value = String(this.pageNum);', '', new Map(), { pageNum: 2 });
        expect(result.event.value).toBe('2');
      });

      it('can be set to navigate pages', () => {
        const result = run(`
          this.pageNum = 3;
          event.value = String(this.pageNum);
        `, '', new Map(), { numPages: 5, pageNum: 0 });
        expect(result.event.value).toBe('3');
      });

      it('rejects out-of-range page numbers', () => {
        const result = run(`
          this.pageNum = 10;
          event.value = String(this.pageNum);
        `, '', new Map(), { numPages: 5, pageNum: 0 });
        expect(result.event.value).toBe('0');
      });
    });

    describe('this.path', () => {
      it('returns document path', () => {
        const result = run('event.value = this.path;', '', new Map(), { path: '/C/Documents/form.pdf' });
        expect(result.event.value).toBe('/C/Documents/form.pdf');
      });
    });

    describe('this.URL', () => {
      it('returns document URL', () => {
        const result = run('event.value = this.URL;', '', new Map(), { url: 'https://example.com/form.pdf' });
        expect(result.event.value).toBe('https://example.com/form.pdf');
      });
    });

    describe('this.documentFileName', () => {
      it('returns file name from path', () => {
        const result = run('event.value = this.documentFileName;', '', new Map(), { path: '/C/Documents/form.pdf' });
        expect(result.event.value).toBe('form.pdf');
      });

      it('uses explicit documentFileName', () => {
        const result = run('event.value = this.documentFileName;', '', new Map(), { documentFileName: 'my-form.pdf' });
        expect(result.event.value).toBe('my-form.pdf');
      });
    });

    describe('this.filesize', () => {
      it('returns file size in bytes', () => {
        const result = run('event.value = String(this.filesize);', '', new Map(), { filesize: 1048576 });
        expect(result.event.value).toBe('1048576');
      });
    });

    describe('this.info', () => {
      it('returns document metadata', () => {
        const info = { Title: 'Test Form', Author: 'Test Author' };
        const result = run('event.value = this.info.Title + " by " + this.info.Author;', '', new Map(), { info });
        expect(result.event.value).toBe('Test Form by Test Author');
      });

      it('has default info object', () => {
        const result = run('event.value = this.info.Creator;', '');
        expect(result.event.value).toBe('PDF Renderer');
      });
    });

    describe('this.dirty', () => {
      it('defaults to false', () => {
        const result = run('event.value = String(this.dirty);', '');
        expect(result.event.value).toBe('false');
      });

      it('can be set to true', () => {
        const result = run(`
          this.dirty = true;
          event.value = String(this.dirty);
        `, '');
        expect(result.event.value).toBe('true');
        expect(result.dirty).toBe(true);
      });
    });
  });

  describe('Document Methods', () => {
    describe('this.getField()', () => {
      it('returns field object via this', () => {
        const fields = new Map([['myField', 'hello']]);
        const result = run('var f = this.getField("myField"); event.value = f.value;', '', fields);
        expect(result.event.value).toBe('hello');
      });
    });

    describe('this.getNthFieldName()', () => {
      it('returns field name by index (sorted)', () => {
        const fields = new Map([['zebra', '1'], ['alpha', '2'], ['middle', '3']]);
        const result = run(`
          event.value = this.getNthFieldName(0) + "," + this.getNthFieldName(1) + "," + this.getNthFieldName(2);
        `, '', fields);
        expect(result.event.value).toBe('alpha,middle,zebra');
      });

      it('returns empty string for invalid index', () => {
        const fields = new Map([['a', '1']]);
        const result = run('event.value = this.getNthFieldName(5);', '', fields);
        expect(result.event.value).toBe('');
      });

      it('is accessible as top-level function', () => {
        const fields = new Map([['field1', 'a'], ['field2', 'b']]);
        const result = run('event.value = getNthFieldName(0);', '', fields);
        expect(result.event.value).toBe('field1');
      });
    });

    describe('this.numFields', () => {
      it('returns total number of fields', () => {
        const fields = new Map([['a', '1'], ['b', '2'], ['c', '3']]);
        const result = run('event.value = String(this.numFields);', '', fields);
        expect(result.event.value).toBe('3');
      });
    });

    describe('this.resetForm()', () => {
      it('resets all fields when called without arguments', () => {
        const fields = new Map([['name', 'John'], ['email', 'john@test.com'], ['age', '30']]);
        run('this.resetForm();', '', fields);
        expect(fields.get('name')).toBe('');
        expect(fields.get('email')).toBe('');
        expect(fields.get('age')).toBe('');
      });

      it('resets only specified fields', () => {
        const fields = new Map([['name', 'John'], ['email', 'john@test.com'], ['age', '30']]);
        run('this.resetForm(["name", "email"]);', '', fields);
        expect(fields.get('name')).toBe('');
        expect(fields.get('email')).toBe('');
        expect(fields.get('age')).toBe('30');
      });

      it('sets dirty flag after reset', () => {
        const fields = new Map([['name', 'John']]);
        const result = run('this.resetForm(); event.value = String(this.dirty);', '', fields);
        expect(result.event.value).toBe('true');
      });
    });

    describe('this.submitForm()', () => {
      it('records submit request', () => {
        const result = run('this.submitForm("https://example.com/submit");', '');
        expect(result.docRequests).toHaveLength(1);
        expect(result.docRequests[0].type).toBe('submitForm');
        expect(result.docRequests[0].url).toBe('https://example.com/submit');
      });
    });

    describe('this.mailForm()', () => {
      it('records mail request with all fields', () => {
        const result = run(`
          this.mailForm(true, "user@test.com", "cc@test.com", "", "Form Data", "Please review");
        `, '');
        expect(result.docRequests).toHaveLength(1);
        expect(result.docRequests[0].type).toBe('mailForm');
        expect(result.docRequests[0].to).toBe('user@test.com');
        expect(result.docRequests[0].subject).toBe('Form Data');
      });
    });

    describe('this.exportAsText()', () => {
      it('exports field data as tab-separated text', () => {
        const fields = new Map([['name', 'John'], ['age', '30']]);
        const result = run('event.value = this.exportAsText("/tmp/data.txt");', '', fields);
        expect(result.event.value).toContain('name');
        expect(result.event.value).toContain('John');
        expect(result.docRequests[0].type).toBe('exportAsText');
      });
    });

    describe('this.exportAsFDF()', () => {
      it('exports field data as FDF object', () => {
        const fields = new Map([['name', 'John'], ['age', '30']]);
        const result = run('var fdf = this.exportAsFDF("/tmp/data.fdf"); event.value = "ok";', '', fields);
        expect(result.docRequests[0].type).toBe('exportAsFDF');
        expect(result.docRequests[0].data.name).toBe('John');
      });
    });

    describe('this.importAnFDF()', () => {
      it('records import request', () => {
        const result = run('this.importAnFDF("/tmp/data.fdf");', '');
        expect(result.docRequests[0].type).toBe('importAnFDF');
        expect(result.docRequests[0].path).toBe('/tmp/data.fdf');
      });
    });

    describe('this.calculateNow()', () => {
      it('records calculation request', () => {
        const fields = new Map([['total', '0']]);
        const result = run(`
          var f = this.getField("total");
          f.setAction("Calculate", "event.value = '100';");
          this.calculateNow();
          event.value = "triggered";
        `, '', fields);
        expect(result.success).toBe(true);
        expect(result.docRequests.some(r => r.type === 'calculateNow')).toBe(true);
      });
    });

    describe('this.print()', () => {
      it('records print request with defaults', () => {
        const result = run('this.print();', '', new Map(), { numPages: 5 });
        expect(result.docRequests[0].type).toBe('print');
        expect(result.docRequests[0].startPage).toBe(0);
        expect(result.docRequests[0].endPage).toBe(4);
      });

      it('records print request with page range', () => {
        const result = run('this.print(true, 2, 5);', '', new Map(), { numPages: 10 });
        expect(result.docRequests[0].startPage).toBe(2);
        expect(result.docRequests[0].endPage).toBe(5);
      });
    });

    describe('this.addField()', () => {
      it('adds a new text field', () => {
        const fields = new Map();
        const result = run(`
          var f = this.addField("newField", "text", 0, [100, 700, 300, 680]);
          f.value = "Hello";
          event.value = f.value + "," + f.name;
        `, '', fields);
        expect(result.event.value).toBe('Hello,newField');
        expect(fields.get('newField')).toBe('Hello');
        expect(result.docRequests[0].type).toBe('addField');
        expect(result.docRequests[0].fieldType).toBe('text');
      });

      it('returns null for empty name', () => {
        const result = run('event.value = String(this.addField("", "text") === null);', '');
        expect(result.event.value).toBe('true');
      });

      it('sets dirty flag', () => {
        const result = run(`
          this.addField("newField", "text", 0);
          event.value = String(this.dirty);
        `, '');
        expect(result.event.value).toBe('true');
      });
    });

    describe('this.removeField()', () => {
      it('removes a field', () => {
        const fields = new Map([['removeMe', 'value'], ['keepMe', 'keep']]);
        run('this.removeField("removeMe");', '', fields);
        expect(fields.has('removeMe')).toBe(false);
        expect(fields.has('keepMe')).toBe(true);
      });

      it('records remove request', () => {
        const fields = new Map([['target', 'val']]);
        const result = run('this.removeField("target");', '', fields);
        expect(result.docRequests[0].type).toBe('removeField');
        expect(result.docRequests[0].name).toBe('target');
      });
    });
  });

  describe('Document Cross-feature Tests', () => {
    it('iterates all fields using numFields and getNthFieldName', () => {
      const fields = new Map([['a', '1'], ['b', '2'], ['c', '3']]);
      const result = run(`
        var names = [];
        for (var i = 0; i < this.numFields; i++) {
          names.push(this.getNthFieldName(i));
        }
        event.value = names.join(",");
      `, '', fields);
      expect(result.event.value).toBe('a,b,c');
    });

    it('adds field then reads it back', () => {
      const fields = new Map();
      const result = run(`
        this.addField("dynamic", "text", 0, [0, 0, 100, 20]);
        var f = this.getField("dynamic");
        f.value = "dynamic value";
        f.readonly = true;
        event.value = f.value + "," + String(f.readonly);
      `, '', fields);
      expect(result.event.value).toBe('dynamic value,true');
    });

    it('resets form then verifies fields are empty', () => {
      const fields = new Map([['x', '10'], ['y', '20']]);
      const result = run(`
        this.resetForm();
        event.value = this.getField("x").value + "," + this.getField("y").value;
      `, '', fields);
      expect(result.event.value).toBe(',');
    });

    it('doc object has same getField as top-level', () => {
      const fields = new Map([['test', 'val']]);
      const result = run(`
        var f1 = getField("test");
        var f2 = doc.getField("test");
        var f3 = this.getField("test");
        event.value = f1.value + "," + f2.value + "," + f3.value;
      `, '', fields);
      expect(result.event.value).toBe('val,val,val');
    });
  });
});

// ============================================================
// Phase 5: App Object API
// ============================================================

describe('Phase 5: App Object API', () => {

  describe('App Properties', () => {
    it('app.viewerType returns Reader', () => {
      const result = run('event.value = app.viewerType;', '');
      expect(result.event.value).toBe('Reader');
    });

    it('app.viewerVersion returns a number', () => {
      const result = run('event.value = String(typeof app.viewerVersion === "number");', '');
      expect(result.event.value).toBe('true');
    });

    it('app.platform returns WIN, MAC, or UNIX', () => {
      const result = run('event.value = app.platform;', '');
      expect(['WIN', 'MAC', 'UNIX']).toContain(result.event.value);
    });

    it('app.language returns a string', () => {
      const result = run('event.value = String(typeof app.language);', '');
      expect(result.event.value).toBe('string');
    });
  });

  describe('app.alert()', () => {
    it('captures alert message', () => {
      const result = run('app.alert("Hello World");', '');
      expect(result.alerts).toContain('Hello World');
    });

    it('returns 1 (OK)', () => {
      const result = run('event.value = String(app.alert("test"));', '');
      expect(result.event.value).toBe('1');
    });
  });

  describe('app.response()', () => {
    it('records response request with all parameters', () => {
      const result = run('var r = app.response("Enter name:", "Input", "John", false);', '');
      expect(result.docRequests.some(r => r.type === 'response')).toBe(true);
      const req = result.docRequests.find(r => r.type === 'response');
      expect(req.question).toBe('Enter name:');
      expect(req.title).toBe('Input');
      expect(req.default).toBe('John');
      expect(req.password).toBe(false);
    });

    it('returns default value', () => {
      const result = run('event.value = app.response("Question?", "Title", "default");', '');
      expect(result.event.value).toBe('default');
    });

    it('returns null when no default provided', () => {
      const result = run('event.value = String(app.response("Question?") === null);', '');
      expect(result.event.value).toBe('true');
    });

    it('records password flag', () => {
      const result = run('app.response("Password:", "Auth", "", true);', '');
      const req = result.docRequests.find(r => r.type === 'response');
      expect(req.password).toBe(true);
    });
  });

  describe('app.beep()', () => {
    it('records beep request', () => {
      const result = run('app.beep(0);', '');
      const req = result.docRequests.find(r => r.type === 'beep');
      expect(req).toBeDefined();
      expect(req.beepType).toBe(0);
    });

    it('defaults to type 0 for invalid input', () => {
      const result = run('app.beep(99);', '');
      const req = result.docRequests.find(r => r.type === 'beep');
      expect(req.beepType).toBe(0);
    });

    it('accepts valid beep types 0-4', () => {
      const result = run('app.beep(3);', '');
      const req = result.docRequests.find(r => r.type === 'beep');
      expect(req.beepType).toBe(3);
    });
  });

  describe('app.setInterval() / app.clearInterval()', () => {
    it('creates an interval timer', () => {
      const result = run(`
        var t = app.setInterval("event.value = 'tick';", 1000);
        event.value = String(t.id);
      `, '');
      expect(result.success).toBe(true);
      expect(Number(result.event.value)).toBeGreaterThan(0);
      const req = result.docRequests.find(r => r.type === 'setInterval');
      expect(req).toBeDefined();
      expect(req.interval).toBe(1000);
    });

    it('clearInterval records cancellation', () => {
      const result = run(`
        var t = app.setInterval("x", 500);
        app.clearInterval(t);
        event.value = "cleared";
      `, '');
      expect(result.success).toBe(true);
      expect(result.docRequests.some(r => r.type === 'clearInterval')).toBe(true);
    });
  });

  describe('app.setTimeOut() / app.clearTimeOut()', () => {
    it('creates a timeout timer', () => {
      const result = run(`
        var t = app.setTimeOut("app.alert('done');", 2000);
        event.value = String(t.id);
      `, '');
      expect(result.success).toBe(true);
      expect(Number(result.event.value)).toBeGreaterThan(0);
      const req = result.docRequests.find(r => r.type === 'setTimeOut');
      expect(req).toBeDefined();
      expect(req.timeout).toBe(2000);
    });

    it('clearTimeOut records cancellation', () => {
      const result = run(`
        var t = app.setTimeOut("x", 500);
        app.clearTimeOut(t);
        event.value = "cleared";
      `, '');
      expect(result.success).toBe(true);
      expect(result.docRequests.some(r => r.type === 'clearTimeOut')).toBe(true);
    });
  });

  describe('app.execMenuItem()', () => {
    it('records menu item execution', () => {
      const result = run('app.execMenuItem("SaveAs");', '');
      const req = result.docRequests.find(r => r.type === 'execMenuItem');
      expect(req).toBeDefined();
      expect(req.menuItem).toBe('SaveAs');
    });

    it('ignores empty menu item', () => {
      const result = run('app.execMenuItem(""); event.value = "ok";', '');
      expect(result.docRequests.filter(r => r.type === 'execMenuItem')).toHaveLength(0);
    });
  });

  describe('app.getNthPlugInName()', () => {
    it('returns plugin name by index', () => {
      const result = run('event.value = app.getNthPlugInName(0);', '');
      expect(result.event.value).toBe('Acrobat Forms');
    });

    it('returns empty string for out-of-range index', () => {
      const result = run('event.value = app.getNthPlugInName(99);', '');
      expect(result.event.value).toBe('');
    });

    it('returns empty string for negative index', () => {
      const result = run('event.value = app.getNthPlugInName(-1);', '');
      expect(result.event.value).toBe('');
    });
  });

  describe('app.popUpMenu()', () => {
    it('records menu items and returns first item', () => {
      const result = run('event.value = app.popUpMenu("Cut", "Copy", "Paste");', '');
      expect(result.event.value).toBe('Cut');
      const req = result.docRequests.find(r => r.type === 'popUpMenu');
      expect(req.items).toEqual(['Cut', 'Copy', 'Paste']);
    });

    it('skips separators when returning selection', () => {
      const result = run('event.value = String(app.popUpMenu("-", "First"));', '');
      expect(result.event.value).toBe('First');
    });

    it('returns null for empty menu', () => {
      const result = run('event.value = String(app.popUpMenu() === null);', '');
      expect(result.event.value).toBe('true');
    });
  });

  describe('app.launchURL()', () => {
    it('records URL launch request', () => {
      const result = run('app.launchURL("https://example.com", true);', '');
      const req = result.docRequests.find(r => r.type === 'launchURL');
      expect(req).toBeDefined();
      expect(req.url).toBe('https://example.com');
      expect(req.newFrame).toBe(true);
    });

    it('defaults newFrame to true', () => {
      const result = run('app.launchURL("https://example.com");', '');
      const req = result.docRequests.find(r => r.type === 'launchURL');
      expect(req.newFrame).toBe(true);
    });

    it('ignores empty URL', () => {
      const result = run('app.launchURL(""); event.value = "ok";', '');
      expect(result.docRequests.filter(r => r.type === 'launchURL')).toHaveLength(0);
    });
  });

  describe('App Cross-feature Tests', () => {
    it('can combine alert and response', () => {
      const result = run(`
        var name = app.response("Name?", "Input", "User");
        app.alert("Hello " + name);
        event.value = name;
      `, '');
      expect(result.event.value).toBe('User');
      expect(result.alerts).toContain('Hello User');
    });

    it('can create and clear multiple timers', () => {
      const result = run(`
        var t1 = app.setInterval("a", 100);
        var t2 = app.setTimeOut("b", 200);
        var t3 = app.setInterval("c", 300);
        app.clearInterval(t1);
        app.clearTimeOut(t2);
        event.value = String(t1.id) + "," + String(t2.id) + "," + String(t3.id);
      `, '');
      expect(result.success).toBe(true);
      const ids = result.event.value.split(',').map(Number);
      expect(ids[0]).toBeLessThan(ids[1]);
      expect(ids[1]).toBeLessThan(ids[2]);
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

# Acrobat JavaScript API Implementation Roadmap

**Goal:** Implement ALL Acrobat JavaScript functions with visual demos

**Status:** 🚀 Phase 4 - Document Object API Complete (50/800+ done)

---

## ✅ Phase 1: Form Formatting & Validation (DONE)

### Implemented Functions (8):
- [x] `AFSpecial_Format(psf)` - Phone, ZIP, SSN
- [x] `AFSpecial_Keystroke(psf)` - Validation for above
- [x] `AFDate_Format(cFormat)` - 12 date formats
- [x] `AFDate_Keystroke(cFormat)` - Date validation
- [x] `AFTime_Format(psf)` - Time formatting
- [x] `AFTime_Keystroke(psf)` - Time validation
- [x] `AFPercent_Format(nDec, sepStyle)` - Percentage
- [x] `AFNumber_Format(...)` - Currency/numbers
- [x] `AFNumber_Keystroke(...)` - Number validation
- [x] `AFRange_Validate(...)` - Min/max validation

**Demo:** Page 7 - 8 test fields

---

## ✅ Phase 2: Advanced Form Functions (DONE)

### Format Functions:
- [x] `AFDate_FormatEx(cFormat)` - Custom date format strings (yyyy, yy, mm, m, dd, d, HH, H, MM, M, SS, S)
- [x] `util.printd(cFormat, oDate)` - Advanced date formatting
- [x] `util.scand(cFormat, cDate)` - Date parsing with format-aware extraction

### Calculation Functions:
- [x] `AFSimple_Calculate(cFunction, cFields)` - Enhanced with error handling, field name resolution, string/array fields
- [ ] Field calculation order & dependencies
- [ ] Cross-field calculations

### Validation Functions:
- [x] `AFRegex_Validate(cRegex)` - Pattern matching with event.rc and error messages
- [ ] Custom validation scripts
- [ ] `event.rc` handling improvements

**Demo Goal:** Page 8 - Advanced form calculations

---

## ✅ Phase 3: Field Object API (DONE)

### Field Properties:
- [x] `field.value` - Get/set field values with cross-field support
- [x] `field.display` - Show/hide fields (0=visible, 1=hidden, 2=noPrint, 3=noView)
- [x] `field.readonly` - Make fields read-only
- [x] `field.required` - Mark as required
- [x] `field.borderColor` - Set border color (Acrobat color arrays)
- [x] `field.fillColor` - Set background color
- [x] `field.textColor` - Set text color
- [x] `field.textSize` - Set font size
- [x] `field.textFont` - Set font family
- [x] `field.alignment` - Text alignment (left/center/right)
- [x] `field.multiline` - Multi-line text
- [x] `field.password` - Password field
- [x] `field.fileSelect` - File selection
- [x] `field.charLimit` - Character limit
- [x] `field.comb` - Comb formatting
- [x] `field.doNotScroll` - Disable scrolling
- [x] `field.doNotSpellCheck` - Disable spell check

### Field Methods:
- [x] `field.setFocus()` - Focus field (records request for host)
- [x] `field.setAction(cTrigger, cScript)` - Set JavaScript action (10 trigger types)
- [x] `field.clearItems()` - Clear dropdown items
- [x] `field.insertItemAt(cName, cExport, nIdx)` - Add dropdown item at index
- [x] `field.deleteItemAt(nIdx)` - Remove dropdown item
- [x] `field.getItemAt(nIdx, bExportValue)` - Get dropdown item label or export value
- [x] `field.setItems(aItems)` - Set all items (arrays or strings)

### Bonus:
- [x] `color` object — Named constants (black, white, red, green, blue, cyan, magenta, yellow, etc.)
- [x] `display` constants — visible(0), hidden(1), noPrint(2), noView(3)
- [x] `field.numItems` - Item count for choice fields
- [x] `fieldMeta` — Persistent metadata store returned from sandbox execution

**Demo:** Page 8 - 5 cards, 11 interactive fields showing dynamic field manipulation

---

## ✅ Phase 4: Document Object API (DONE)

### Document Properties:
- [x] `this.numPages` - Page count (configurable via context)
- [x] `this.pageNum` - Current page (get/set with bounds checking)
- [x] `this.path` - Document path
- [x] `this.URL` - Document URL
- [x] `this.documentFileName` - File name (auto-derived from path)
- [x] `this.filesize` - File size in bytes
- [x] `this.info` - Document metadata (Title, Author, Subject, Keywords, Creator, Producer)
- [x] `this.dirty` - Modified flag (get/set, auto-set by mutations)

### Document Methods:
- [x] `this.getField(cName)` - Get field by name (also via `doc.getField` and top-level `getField`)
- [x] `this.getNthFieldName(nIndex)` - Get field name by sorted index
- [x] `this.resetForm(aFields)` - Reset form fields (all or specified subset)
- [x] `this.submitForm(cURL)` - Submit form data (records request for host)
- [x] `this.mailForm(bUI, cTo, cCc, cBcc, cSubject, cMsg)` - Email form (records request)
- [x] `this.exportAsText(cPath)` - Export as tab-separated text
- [x] `this.exportAsFDF(cPath)` - Export form data as FDF object
- [x] `this.importAnFDF(cPath)` - Import form data (records request)
- [x] `this.calculateNow()` - Trigger all field calculations
- [x] `this.print(bUI, nStart, nEnd, bSilent, bShrinkToFit, bPrintAsImage)` - Print (records request)
- [x] `this.addField(cName, cFieldType, nPageNum, oCoords)` - Add field dynamically
- [x] `this.removeField(cName)` - Remove field from document

### Bonus:
- [x] `this.numFields` - Total field count property
- [x] `doc` object — Full document reference accessible in sandbox
- [x] `this` binding — Document object bound as `this` in sandbox (Acrobat compatibility)
- [x] `docRequests` — Operation tracking for host integration (submit, mail, print, export)

**Demo:** Pages 9-10 - 9 cards, 26 interactive fields showing document operations

---

## 💬 Phase 5: App Object API

### App Properties:
- [ ] `app.viewerType` - Viewer type (Reader/Acrobat/etc.)
- [ ] `app.viewerVersion` - Version number
- [ ] `app.platform` - Platform (WIN/MAC/UNIX)
- [ ] `app.language` - UI language

### App Methods:
- [x] `app.alert(cMsg, nIcon, nType, cTitle)` - Alert dialog ✅ Captured to array
- [ ] `app.response(cQuestion, cTitle, cDefault, bPassword)` - Prompt dialog
- [ ] `app.beep(nType)` - System beep
- [ ] `app.setInterval(cExpr, nMilliseconds)` - Timer
- [ ] `app.setTimeOut(cExpr, nMilliseconds)` - Timeout
- [ ] `app.clearInterval(oInterval)` - Clear timer
- [ ] `app.clearTimeOut(oTime)` - Clear timeout
- [ ] `app.execMenuItem(cMenuItem)` - Execute menu command
- [ ] `app.getNthPlugInName(nIndex)` - Get plugin name
- [ ] `app.popUpMenu(...)` - Context menu
- [ ] `app.launchURL(cURL, bNewFrame)` - Open URL

**Demo Goal:** Page 11 - Interactive dialogs

---

## 📐 Phase 6: Util Object API

### Date/Time:
- [ ] `util.printd(cFormat, oDate)` - Format date
- [ ] `util.scand(cFormat, cDate)` - Parse date
- [ ] `util.printx(cFormat, cSource)` - Format with mask

### String Functions:
- [ ] `util.printf(cFormat, ...)` - Printf formatting
- [ ] `util.spansToXML(oSpans)` - Spans to XML

### Math Functions:
- [ ] `util.crackURL(cURL)` - Parse URL

**Demo Goal:** Page 12 - Utility functions

---

## 🎯 Phase 7: Event Object (Enhanced)

### Event Properties:
- [x] `event.value` - Field value ✅
- [x] `event.rc` - Return code ✅
- [ ] `event.change` - Changed text
- [ ] `event.changeEx` - Export value of change
- [ ] `event.keyDown` - Key down flag
- [ ] `event.modifier` - Modifier keys
- [ ] `event.shift` - Shift key
- [ ] `event.source` - Source object
- [ ] `event.target` - Target field ✅ Basic
- [ ] `event.targetName` - Target name
- [ ] `event.type` - Event type
- [ ] `event.willCommit` - Will commit flag
- [ ] `event.selStart` - Selection start
- [ ] `event.selEnd` - Selection end

**Demo Goal:** Enhanced event handling across all demos

---

## 🔢 Phase 8: Color Object

### Color Methods:
- [ ] `color.convert(aColor, cColorSpace)` - Convert colors
- [ ] `color.equal(aColor1, aColor2)` - Compare colors
- [ ] `color.transparent` - Transparent color
- [ ] `color.black`, `color.white`, `color.red`, etc. - Named colors

**Demo Goal:** Page 13 - Dynamic color changes

---

## 📊 Implementation Strategy

### For Each Phase:
1. **Implement** - Claude Code writes the functions
2. **Test** - I verify in browser with demo PDF
3. **Demo** - Add visual test cases to demo PDF
4. **Document** - Update this roadmap

### Testing Checklist:
- ✅ Function executes without errors
- ✅ Correct output/behavior
- ✅ Scales with zoom
- ✅ Works with multiple fields
- ✅ Edge cases handled
- ✅ Visual demo looks professional

---

## 📈 Progress Tracking

**Functions Implemented:** 50 / ~800
**Demo Pages:** 4 / 13+
**Phase:** 4 / 8
**Tests:** 122 passing (vitest)

**Next Up:** Phase 5 - App Object API

---

## 🎨 Demo PDF Philosophy

Each page should be:
- **Beautiful** - Professional card layout
- **Clear** - Obvious what to test
- **Interactive** - Immediate feedback
- **Complete** - Tests all aspects of the feature

**Current Best:** Page 7 (Phase 1 demo)

---

*Last Updated: March 26, 2026 — Phase 4 Complete*

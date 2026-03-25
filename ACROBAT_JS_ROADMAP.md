# Acrobat JavaScript API Implementation Roadmap

**Goal:** Implement ALL Acrobat JavaScript functions with visual demos

**Status:** 🚀 Phase 2 - Advanced Form Functions (14/800+ done)

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

## 🎨 Phase 3: Field Object API

### Field Properties:
- [ ] `field.value` - Get/set field values
- [ ] `field.display` - Show/hide fields (0=visible, 1=hidden, 2=noPrint, 3=noView)
- [ ] `field.readonly` - Make fields read-only
- [ ] `field.required` - Mark as required
- [ ] `field.borderColor` - Set border color
- [ ] `field.fillColor` - Set background color
- [ ] `field.textColor` - Set text color
- [ ] `field.textSize` - Set font size
- [ ] `field.textFont` - Set font family
- [ ] `field.alignment` - Text alignment (left/center/right)
- [ ] `field.multiline` - Multi-line text
- [ ] `field.password` - Password field
- [ ] `field.fileSelect` - File selection
- [ ] `field.charLimit` - Character limit
- [ ] `field.comb` - Comb formatting
- [ ] `field.doNotScroll` - Disable scrolling
- [ ] `field.doNotSpellCheck` - Disable spell check

### Field Methods:
- [ ] `field.setFocus()` - Focus field
- [ ] `field.setAction(cTrigger, cScript)` - Set JavaScript action
- [ ] `field.clearItems()` - Clear dropdown items
- [ ] `field.insertItemAt(cName, cExport, nIdx)` - Add dropdown item
- [ ] `field.deleteItemAt(nIdx)` - Remove dropdown item
- [ ] `field.getItemAt(nIdx)` - Get dropdown item
- [ ] `field.setItems(aItems)` - Set all items

**Demo Goal:** Page 9 - Dynamic field manipulation

---

## 📄 Phase 4: Document Object API

### Document Properties:
- [ ] `this.numPages` - Page count
- [ ] `this.pageNum` - Current page
- [ ] `this.path` - Document path
- [ ] `this.URL` - Document URL
- [ ] `this.documentFileName` - File name
- [ ] `this.filesize` - File size
- [ ] `this.info` - Document metadata (title, author, etc.)
- [ ] `this.dirty` - Modified flag

### Document Methods:
- [ ] `this.getField(cName)` - Get field by name ✅ Basic done
- [ ] `this.getNthFieldName(nIndex)` - Get field name by index
- [ ] `this.resetForm(aFields)` - Reset form fields
- [ ] `this.submitForm(cURL)` - Submit form data
- [ ] `this.mailForm(bUI, cTo, cCc, cBcc, cSubject, cMsg)` - Email form
- [ ] `this.exportAsText(cPath)` - Export as text
- [ ] `this.exportAsFDF(cPath)` - Export form data
- [ ] `this.importAnFDF(cPath)` - Import form data
- [ ] `this.calculateNow()` - Trigger calculations ✅ Basic done
- [ ] `this.print(bUI, nStart, nEnd, bSilent, bShrinkToFit, bPrintAsImage)` - Print
- [ ] `this.addField(cName, cFieldType, nPageNum, oCoords)` - Add field
- [ ] `this.removeField(cName)` - Remove field

**Demo Goal:** Page 10 - Document operations

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

**Functions Implemented:** 14 / ~800
**Demo Pages:** 1 / 13+
**Phase:** 2 / 8

**Next Up:** Phase 3 - Field Object API

---

## 🎨 Demo PDF Philosophy

Each page should be:
- **Beautiful** - Professional card layout
- **Clear** - Obvious what to test
- **Interactive** - Immediate feedback
- **Complete** - Tests all aspects of the feature

**Current Best:** Page 7 (Phase 1 demo)

---

*Last Updated: March 26, 2026*

# Task: Add PDF Form Filling Support

**Project:** PDF Renderer  
**Goal:** Support filling PDF forms (AcroForms) and exporting filled PDFs

---

## Requirements

### Core Features
1. **Detect PDF forms** - Check if loaded PDF has AcroForm fields
2. **Show form mode toggle** - Button to switch between annotation mode and form mode
3. **Render form fields** - Display form field overlays on top of PDF
4. **Field types to support:**
   - Text fields (single line + multiline)
   - Checkboxes
   - Radio buttons
   - Dropdowns (if possible)
5. **Fill forms** - Click fields to enter values
6. **Export filled PDF** - Save PDF with filled values

---

## Inspiration from pdf-form-tool

**Project:** `~/Documents/Projects/pdf-form-tool/`

**Key files to reference:**
- `src/main.js` - Form field detection and rendering
- `src/main.js` lines 186-340 - Field filling with pdf-lib
- Field detection: `form.getFields()` loop

**Code patterns:**
```javascript
// Detect form
const form = pdfDoc.getForm();
const fields = form.getFields();

// Read field info
fields.forEach(field => {
  const name = field.getName();
  const type = field.constructor.name; // PDFTextField, PDFCheckBox, etc.
  
  // Get widget (position on page)
  const widgets = field.acroField.getWidgets();
  widgets.forEach(widget => {
    const rect = widget.getRectangle(); // { x, y, width, height }
    const pageRef = widget.P(); // Page reference
  });
});

// Fill field
const textField = form.getTextField('fieldName');
textField.setText('value');

const checkbox = form.getCheckBox('checkboxName');
checkbox.check(); // or .uncheck()

const radio = form.getRadioGroup('radioName');
radio.select('optionValue');

// Save filled PDF
const pdfBytes = await pdfDoc.save();
```

---

## Implementation Approach

### 1. Add Form Mode Toggle

**UI Changes:**
- Add "Form Mode" button next to existing tools
- Toggle between annotation mode and form mode
- Disable annotation tools when in form mode

### 2. Form Field Detection

When PDF is loaded:
```javascript
async function detectFormFields(pdfDoc) {
  try {
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    if (fields.length === 0) {
      return { hasForm: false, fields: [] };
    }
    
    const formFields = [];
    for (const field of fields) {
      const name = field.getName();
      const type = field.constructor.name;
      
      // Get position on each page
      const widgets = field.acroField.getWidgets();
      for (const widget of widgets) {
        const rect = widget.getRectangle();
        const pageRef = widget.P();
        const pageIndex = getPageIndex(pdfDoc, pageRef);
        
        formFields.push({
          name,
          type,
          field,
          page: pageIndex,
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      }
    }
    
    return { hasForm: true, fields: formFields };
  } catch (error) {
    return { hasForm: false, fields: [] };
  }
}
```

### 3. Render Form Field Overlays

**Create FormLayer component** (similar to AnnotationLayer):
```javascript
class FormLayer {
  constructor(canvas, formFields, onFieldChange) {
    this.canvas = canvas;
    this.fields = formFields;
    this.values = new Map(); // fieldName -> value
    this.onFieldChange = onFieldChange;
  }
  
  render() {
    // Draw field outlines (blue borders)
    // Add input overlays for text fields
    // Add checkbox/radio button overlays
  }
  
  fillField(fieldName, value) {
    this.values.set(fieldName, value);
    this.onFieldChange();
  }
}
```

### 4. Field Input Handling

**Text fields:**
- Render HTML `<input>` or `<textarea>` overlays at field positions
- Style with light blue background
- Update value map on change

**Checkboxes:**
- Render clickable div with checkmark icon
- Toggle on click

**Radio buttons:**
- Group by field name
- Ensure only one selected per group

### 5. Export Filled PDF

```javascript
async function exportFilledPDF(pdfBytes, formValues) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  
  for (const [fieldName, value] of formValues.entries()) {
    try {
      const field = form.getField(fieldName);
      
      if (field.constructor.name === 'PDFTextField') {
        field.setText(String(value));
      } else if (field.constructor.name === 'PDFCheckBox') {
        if (value) field.check();
        else field.uncheck();
      } else if (field.constructor.name === 'PDFRadioGroup') {
        field.select(String(value));
      }
    } catch (error) {
      console.warn(`Failed to fill field ${fieldName}:`, error);
    }
  }
  
  // Optional: Flatten form to prevent further editing
  // form.flatten();
  
  return await pdfDoc.save();
}
```

---

## UI Design

### Toolbar Addition
```
[Open] [Save PDF] [Form Mode] [Annotations] ... existing tools
```

**Form Mode active:**
- Highlight "Form Mode" button
- Show form field count: "Form Mode (12 fields)"
- Disable annotation tools
- Show "Export Filled PDF" button

### Field Rendering
- Light blue border around fields (2px)
- Text fields: White background with cursor
- Checkboxes: Blue square with checkmark when checked
- Radio buttons: Blue circle with dot when selected
- Field labels (if available): Small text above field

---

## Testing Checklist

- [ ] Detect PDFs with forms
- [ ] Detect PDFs without forms (hide form mode)
- [ ] Render text fields at correct positions
- [ ] Render checkboxes
- [ ] Render radio buttons
- [ ] Fill text fields and see values
- [ ] Toggle checkboxes
- [ ] Select radio buttons (mutual exclusion works)
- [ ] Export filled PDF
- [ ] Open exported PDF and verify values persist
- [ ] Switch between annotation mode and form mode
- [ ] Form mode disables annotation tools
- [ ] Zoom works in form mode
- [ ] Page navigation works in form mode

---

## Sample PDFs for Testing

**From pdf-form-tool:**
```bash
~/Documents/Projects/pdf-form-tool/samples/
- medibank_private_pump_form_blank.pdf (18 fields)
- insulin_pump_replacement_or_upgrade_application_form.pdf (24 fields)
```

---

## Integration Points

**main.js changes:**
1. After loading PDF, call `detectFormFields(pdfLibDoc)`
2. If hasForm, show "Form Mode" button
3. Create FormLayer when form mode activated
4. Add "Export Filled PDF" button handler

**New files:**
- `src/components/FormLayer.js` - Form rendering and interaction
- `src/utils/forms.js` - Form detection and export helpers

**CSS additions:**
- Form field overlay styles
- Form mode button styles
- Input field styles

---

## Success Criteria

✅ Can detect PDFs with forms  
✅ Can switch to form mode  
✅ Form fields render at correct positions  
✅ Can fill text fields  
✅ Can toggle checkboxes  
✅ Can select radio buttons  
✅ Can export filled PDF  
✅ Filled values persist in exported PDF  
✅ Form mode and annotation mode work independently  

---

**Please implement PDF form filling support with clean, production-quality code!** 📝✨

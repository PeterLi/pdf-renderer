# PDF Form Testing Guide

This guide explains how to create and test PDFs with full form validation and JavaScript features.

## Current Limitations

**pdf-lib** (used in `generate-demo-pdf.js`) can create form fields with:
- ✅ Field types (text, checkbox, radio, dropdown)
- ✅ Basic properties (required, readonly, maxLength)
- ✅ Multiline, password flags
- ❌ **JavaScript actions** (AFSpecial_Format, AFRange_Validate, etc.)

To test JavaScript features, we need a two-step process:

## Two-Step Workflow

### Step 1: Generate Base PDF (pdf-lib)

```bash
node scripts/generate-demo-pdf.js
```

This creates `public/sample.pdf` with form fields and validation notes.

### Step 2: Add JavaScript Actions (pikepdf)

Install pikepdf (Python library for low-level PDF manipulation):

```bash
pip3 install pikepdf
```

Then enhance the PDF with JavaScript:

```bash
python3 scripts/add-form-javascript.py public/sample.pdf public/sample-enhanced.pdf
```

This adds JavaScript actions like:
- Phone formatting: `AFSpecial_Format(2)`
- Range validation: `AFRange_Validate(true, min, true, max)`
- Number formatting: `AFNumber_Format(decimals, ...)`
- Date formatting: `AFDate_FormatEx("mm/dd/yyyy")`

### Step 3: Load Enhanced PDF

1. Copy `sample-enhanced.pdf` to the public folder (or serve it)
2. Open the PDF renderer with `allowFormJavaScript: true`:

```javascript
// In index.html or PDFRenderer.js config
const renderer = new PDFRenderer(container, {
  allowFormJavaScript: true,  // Enable JavaScript execution
  validateOnBlur: true,
  validateOnSubmit: true,
});
```

3. Load the enhanced PDF
4. Test JavaScript features:
   - Type in phone field → auto-formats to (xxx) xxx-xxxx
   - Fill number fields → range validation
   - Enter dates → format validation

## What Gets Validated

### Current Demo PDF (sample.pdf)

**Page 4: Text Inputs**
- Full Name: Plain text (no validation)
- Comments: Multiline textarea
- Password: Password field (hidden text)
- Email: **Required** + email pattern validation
- Username: **MaxLength** (10 chars) validation
- Phone: Phone pattern validation (**NO auto-format**)

**Page 5: Checkboxes & Radios**
- Agree terms: Optional checkbox
- Privacy policy: **Required** checkbox
- Interests: Multiple checkboxes
- Contact method: Radio group
- T-shirt size: **Required** radio group

**Page 6: Dropdowns**
- Country: Dropdown (optional)
- Department: **Required** dropdown
- Programming Language: Dropdown
- Job Title: Editable combo box

### Enhanced PDF (sample-enhanced.pdf)

Same as above, PLUS:
- Phone field: **Auto-formats** as you type → (555) 123-4567

## Adding More JavaScript Actions

Edit `scripts/add-form-javascript.py` to add more actions:

```python
# Add range validation (ages 18-100)
age_field = find_field_by_name(pdf, 'age')
if age_field:
    add_range_validation(age_field, 18, 100)

# Add currency formatting
salary_field = find_field_by_name(pdf, 'salary')
if salary_field:
    add_number_format(salary_field, decimals=2, currency='$')

# Add date formatting
dob_field = find_field_by_name(pdf, 'dateOfBirth')
if dob_field:
    add_date_format(dob_field, "mm/dd/yyyy")
```

## Alternative: Adobe Acrobat

If you have **Adobe Acrobat Pro**, you can:
1. Open `sample.pdf` in Acrobat
2. Go to **Tools → Prepare Form**
3. Click on a field → **Properties**
4. Go to **Format** or **Validate** tab
5. Add JavaScript actions via the UI
6. Save as `sample-acrobat.pdf`

This is easier but requires a paid subscription ($239.88/year).

## Testing Checklist

- [ ] Load demo PDF
- [ ] Try required fields (leave empty, click validate)
- [ ] Test maxLength (type 11 chars in username)
- [ ] Test email validation (enter invalid email)
- [ ] Test phone validation (enter letters)
- [ ] Load enhanced PDF with `allowFormJavaScript: true`
- [ ] Test phone auto-formatting
- [ ] Test range validation (if added)
- [ ] Test currency formatting (if added)
- [ ] Test cross-field validation (if added)

## Security Note

JavaScript execution is **disabled by default** (`allowFormJavaScript: false`).

Only enable it for trusted PDFs, as PDF JavaScript has full access to form data and can potentially be malicious.

Our sandbox blocks:
- `eval()`, `Function()` (except our own controlled version)
- `document`, `window`, `XMLHttpRequest`
- Network requests
- File system access

But it's still safer to keep it disabled for untrusted PDFs.

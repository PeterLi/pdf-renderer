# PDF Generation Scripts

## Generating Demo PDFs

### 1. Generate Base PDF (Pages 1-6)

```bash
node scripts/generate-demo-pdf.js
```

Creates `public/sample.pdf` with:
- Pages 1-3: Viewer & annotation features demo
- Pages 4-6: Form fields (text, checkboxes, radio, dropdowns)

### 2. Enhance with JavaScript Actions

```bash
python3 scripts/enhance-demo-pdf.py
```

Creates `public/sample-enhanced.pdf` from `sample.pdf`:
- Adds phone field formatting (AFSpecial_Format)
- Adds page 7 with JavaScript function tests
  - ZIP, SSN, Date, Time, Percentage, Range validation, Currency

## Full Rebuild

```bash
# Regenerate everything from scratch
node scripts/generate-demo-pdf.js && python3 scripts/enhance-demo-pdf.py
```

## Files

- `generate-demo-pdf.js` - Creates base PDF with form fields
- `enhance-demo-pdf.py` - Adds JavaScript actions and test page
- `FORM_TESTING.md` - Documentation on PDF form testing

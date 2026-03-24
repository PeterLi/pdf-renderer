/**
 * PDF Form Detection & Export Utilities
 * Detects AcroForm fields and exports filled PDFs using pdf-lib.
 */
import { PDFDocument } from 'pdf-lib';

/**
 * Detect form fields in a PDF using PDF.js annotations.
 * Returns per-page widget annotations with field metadata.
 *
 * @param {import('pdfjs-dist').PDFDocumentProxy} pdfJsDoc - PDF.js document
 * @returns {Promise<{ hasForm: boolean, fieldsByPage: Map<number, Array>, fieldCount: number }>}
 */
export async function detectFormFields(pdfJsDoc) {
  const fieldsByPage = new Map();
  let fieldCount = 0;

  for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
    const page = await pdfJsDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();
    const widgets = annotations.filter(a => a.subtype === 'Widget');

    if (widgets.length > 0) {
      fieldsByPage.set(pageNum, widgets);
      fieldCount += widgets.length;
    }

    page.cleanup();
  }

  return {
    hasForm: fieldCount > 0,
    fieldsByPage,
    fieldCount,
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

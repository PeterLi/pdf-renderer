/**
 * Generate a PDF specifically for testing all Acrobat JavaScript features
 * Includes date, time, percentage, range validation, etc.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function generateJSTestPDF() {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const page = doc.addPage([612, 792]);
  const { width, height } = page.getSize();
  let y = height - 60;

  // Header
  page.drawRectangle({
    x: 0, y: y,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page.drawText('JavaScript Functions Test Form', {
    x: 60, y: y + 18,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Test all Acrobat JavaScript formatting and validation', {
    x: 60, y: y - 5,
    size: 11,
    font: helvetica,
    color: rgb(0.8, 0.8, 0.8),
  });

  const form = doc.getForm();
  y -= 100;

  // Helper to add field with label
  const addField = (label, fieldName, yPos, width = 250) => {
    page.drawText(label, {
      x: 60, y: yPos + 5,
      size: 11,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    return yPos - 5;
  };

  // 1. Phone (AFSpecial_Format - already works!)
  y = addField('Phone (auto-format):', 'phone', y);
  const phoneField = form.createTextField('phone');
  phoneField.addToPage(page, { x: 60, y: y - 25, width: 250, height: 25 });
  phoneField.setFontSize(12);
  y -= 55;

  // 2. ZIP Code (AFSpecial_Format)
  y = addField('ZIP Code:', 'zipcode', y);
  const zipField = form.createTextField('zipcode');
  zipField.addToPage(page, { x: 60, y: y - 25, width: 100, height: 25 });
  zipField.setFontSize(12);
  y -= 55;

  // 3. SSN (AFSpecial_Format)
  y = addField('SSN:', 'ssn', y);
  const ssnField = form.createTextField('ssn');
  ssnField.addToPage(page, { x: 60, y: y - 25, width: 150, height: 25 });
  ssnField.setFontSize(12);
  y -= 55;

  // 4. Date (mm/dd/yy)
  y = addField('Date (mm/dd/yy):', 'date1', y);
  const date1Field = form.createTextField('date1');
  date1Field.addToPage(page, { x: 60, y: y - 25, width: 150, height: 25 });
  date1Field.setFontSize(12);
  y -= 55;

  // 5. Date (yyyy-mm-dd)
  y = addField('Date (yyyy-mm-dd):', 'date2', y);
  const date2Field = form.createTextField('date2');
  date2Field.addToPage(page, { x: 60, y: y - 25, width: 150, height: 25 });
  date2Field.setFontSize(12);
  y -= 55;

  // 6. Time (HH:MM)
  y = addField('Time (24-hour):', 'time1', y);
  const time1Field = form.createTextField('time1');
  time1Field.addToPage(page, { x: 60, y: y - 25, width: 100, height: 25 });
  time1Field.setFontSize(12);
  y -= 55;

  // 7. Percentage
  y = addField('Percentage (enter 0.25 for 25%):', 'percent', y);
  const percentField = form.createTextField('percent');
  percentField.addToPage(page, { x: 60, y: y - 25, width: 150, height: 25 });
  percentField.setFontSize(12);
  y -= 55;

  // 8. Number with range (1-100)
  y = addField('Age (1-100):', 'age', y);
  const ageField = form.createTextField('age');
  ageField.addToPage(page, { x: 60, y: y - 25, width: 100, height: 25 });
  ageField.setFontSize(12);
  y -= 55;

  // 9. Currency
  y = addField('Price (with currency formatting):', 'price', y);
  const priceField = form.createTextField('price');
  priceField.addToPage(page, { x: 60, y: y - 25, width: 150, height: 25 });
  priceField.setFontSize(12);
  y -= 55;

  // Footer
  page.drawText('Enable JavaScript (JS: ON button) to test formatting!', {
    x: 60, y: 60,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText('Tab out of each field to trigger formatting.', {
    x: 60, y: 45,
    size: 10,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Save
  const pdfBytes = await doc.save();
  fs.writeFileSync('public/js-test-form.pdf', pdfBytes);
  console.log('✅ Created: public/js-test-form.pdf (base form, no JavaScript yet)');
  console.log('   Next: Run add-form-javascript.py to add JavaScript actions');
}

generateJSTestPDF().catch(console.error);

import { PDFDocument, rgb } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'fs';

async function removeBranding() {
  // Load the original PDF
  const existingPdfBytes = readFileSync('/tmp/original-sample.pdf');
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  
  // Draw a white rectangle over where "Interact Technology" text appears
  // This effectively "blanks out" the text without regenerating the PDF
  // The exact position might need adjustment - covering common footer area
  firstPage.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 50,  // Cover bottom 50 pixels where footer usually is
    color: rgb(1, 1, 1),  // White
  });
  
  const pdfBytes = await pdfDoc.save();
  writeFileSync('./public/sample.pdf', pdfBytes);
  console.log('✅ Removed branding from original sample.pdf');
}

removeBranding().catch(console.error);

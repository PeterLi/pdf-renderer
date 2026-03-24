import { PDFDocument, rgb } from 'pdf-lib';
import { writeFileSync } from 'fs';

async function createSamplePDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { height } = page.getSize();

  // Add title
  page.drawText('PDF Renderer Demo', {
    x: 50,
    y: height - 50,
    size: 24,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Add description
  page.drawText('This is a sample PDF for testing the annotation features.', {
    x: 50,
    y: height - 100,
    size: 12,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Add some sample text
  const sampleText = [
    'You can try the following features:',
    '',
    '• Draw with the pen tool',
    '• Highlight text with the highlighter',
    '• Add text annotations',
    '• Draw shapes (rectangles, circles, arrows)',
    '• Use the eraser to remove annotations',
    '• Select and move annotations',
    '• Export your annotated PDF',
    '',
    'This PDF renderer supports:',
    '- Multiple annotation types',
    '- Undo/Redo functionality',
    '- Form filling (for PDFs with forms)',
    '- Color customization',
    '- Export to JSON',
    '',
    'Built with PDF.js and pdf-lib for accurate rendering',
    'and professional-quality annotations.'
  ];

  let yPos = height - 150;
  for (const line of sampleText) {
    page.drawText(line, {
      x: 50,
      y: yPos,
      size: 11,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPos -= 20;
  }

  // Add footer
  page.drawText('PDF Renderer - Peter Li', {
    x: 50,
    y: 30,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();
  writeFileSync('./public/sample.pdf', pdfBytes);
  console.log('✅ Created clean sample.pdf');
}

createSamplePDF().catch(console.error);

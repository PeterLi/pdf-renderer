import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'fs';

async function generateDemoPDF() {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await doc.embedFont(StandardFonts.TimesRoman);

  // --- Page 1: Title Page ---
  const page1 = doc.addPage([612, 792]);
  const { width, height } = page1.getSize();

  // Background accent bar
  page1.drawRectangle({
    x: 0, y: height - 180,
    width, height: 180,
    color: rgb(0.15, 0.23, 0.37),
  });

  page1.drawText('PDF Renderer', {
    x: 60, y: height - 90,
    size: 42,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Demo Document', {
    x: 60, y: height - 130,
    size: 24,
    font: helvetica,
    color: rgb(0.7, 0.8, 0.95),
  });


  // Body text
  const bodyY = height - 240;
  page1.drawText('Welcome to the PDF Renderer demo!', {
    x: 60, y: bodyY,
    size: 18,
    font: helveticaBold,
    color: rgb(0.15, 0.23, 0.37),
  });

  const introLines = [
    'This document demonstrates the capabilities of the PDF Renderer component.',
    'You can use the toolbar above to navigate pages, zoom in/out, and access',
    'annotation tools to draw, highlight, and add text notes.',
    '',
    'Try these features:',
    '',
    '  •  Zoom in and out using the toolbar or Ctrl +/-',
    '  •  Navigate pages with the arrow buttons or Page Up/Down',
    '  •  Open the annotation toolbar to draw freehand',
    '  •  Use the highlighter to mark important text',
    '  •  Add text annotations anywhere on the page',
    '  •  Draw shapes like rectangles, circles, and arrows',
    '  •  Export your annotations as JSON or save them into the PDF',
    '',
    'The viewer supports keyboard shortcuts for quick access to common actions.',
    'Press ? or click the help icon to see all available shortcuts.',
  ];

  introLines.forEach((line, i) => {
    page1.drawText(line, {
      x: 60, y: bodyY - 35 - i * 22,
      size: 12,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
  });

  // --- Page 2: Features ---
  const page2 = doc.addPage([612, 792]);

  page2.drawRectangle({
    x: 0, y: height - 60,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page2.drawText('Features & Capabilities', {
    x: 60, y: height - 42,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  const features = [
    { title: 'PDF Viewing', desc: 'High-quality rendering powered by Mozilla PDF.js with smooth zoom, pan, and page navigation.' },
    { title: 'Freehand Drawing', desc: 'Draw directly on the PDF with configurable pen colors and stroke widths. Perfect for markups.' },
    { title: 'Highlighter', desc: 'Semi-transparent highlighting tool to emphasize important sections of your documents.' },
    { title: 'Text Annotations', desc: 'Add text boxes anywhere on the page. Resize and reposition them freely.' },
    { title: 'Shape Tools', desc: 'Draw rectangles, circles, and arrows to call attention to specific areas.' },
    { title: 'Undo / Redo', desc: 'Full undo/redo support so you can experiment freely with your annotations.' },
    { title: 'Export & Save', desc: 'Export annotations as JSON for later use, or embed them directly into the PDF file.' },
    { title: 'Thumbnail Sidebar', desc: 'Quick page overview with thumbnail navigation for large documents.' },
    { title: 'Keyboard Shortcuts', desc: 'Efficient workflow with keyboard shortcuts for all major actions.' },
    { title: 'Embeddable Component', desc: 'Designed as a reusable component that can be integrated into any web project.' },
  ];

  features.forEach((f, i) => {
    const yPos = height - 100 - i * 60;
    page2.drawText(f.title, {
      x: 60, y: yPos,
      size: 14,
      font: helveticaBold,
      color: rgb(0.15, 0.23, 0.37),
    });
    page2.drawText(f.desc, {
      x: 60, y: yPos - 18,
      size: 11,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
  });

  // --- Page 3: Sample content ---
  const page3 = doc.addPage([612, 792]);

  page3.drawRectangle({
    x: 0, y: height - 60,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page3.drawText('Sample Content for Annotation', {
    x: 60, y: height - 42,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page3.drawText('Use this page to practice your annotation skills!', {
    x: 60, y: height - 100,
    size: 14,
    font: helveticaBold,
    color: rgb(0.15, 0.23, 0.37),
  });

  // Draw some sample content to annotate
  const loremLines = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor',
    'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud',
    'exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    '',
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu',
    'fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa',
    'qui officia deserunt mollit anim id est laborum.',
    '',
    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque',
    'laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi',
    'architecto beatae vitae dicta sunt explicabo.',
  ];

  loremLines.forEach((line, i) => {
    page3.drawText(line, {
      x: 60, y: height - 140 - i * 20,
      size: 11,
      font: timesRoman,
      color: rgb(0.15, 0.15, 0.15),
    });
  });

  // Draw sample shapes area
  page3.drawText('Shapes & Diagrams Area', {
    x: 60, y: height - 420,
    size: 14,
    font: helveticaBold,
    color: rgb(0.15, 0.23, 0.37),
  });

  // Sample boxes
  page3.drawRectangle({
    x: 60, y: height - 540,
    width: 140, height: 80,
    borderColor: rgb(0.3, 0.5, 0.8),
    borderWidth: 2,
    color: rgb(0.9, 0.93, 0.98),
  });
  page3.drawText('Component A', {
    x: 85, y: height - 508,
    size: 11,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  page3.drawRectangle({
    x: 260, y: height - 540,
    width: 140, height: 80,
    borderColor: rgb(0.3, 0.5, 0.8),
    borderWidth: 2,
    color: rgb(0.9, 0.93, 0.98),
  });
  page3.drawText('Component B', {
    x: 285, y: height - 508,
    size: 11,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  page3.drawRectangle({
    x: 160, y: height - 660,
    width: 140, height: 80,
    borderColor: rgb(0.8, 0.4, 0.2),
    borderWidth: 2,
    color: rgb(0.98, 0.94, 0.9),
  });
  page3.drawText('Service Layer', {
    x: 185, y: height - 628,
    size: 11,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Footer
  page3.drawText('Try drawing arrows between the components above!', {
    x: 60, y: 60,
    size: 12,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await doc.save();
  writeFileSync('public/sample.pdf', pdfBytes);
  console.log('Demo PDF created: public/sample.pdf');
}

generateDemoPDF();

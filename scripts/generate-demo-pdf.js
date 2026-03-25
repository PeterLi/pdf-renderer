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

  // --- Page 4: Form Fields - Text Inputs ---
  const form = doc.getForm();
  const page4 = doc.addPage([612, 792]);
  let y = height - 60;

  page4.drawRectangle({
    x: 0, y: y,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page4.drawText('Form Features: Text Inputs', {
    x: 60, y: y + 18,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 50;
  page4.drawText('The renderer supports interactive PDF forms with validation:', {
    x: 60, y,
    size: 12,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  y -= 40;
  page4.drawText('Full Name:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page4.drawText('(Plain text field)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const nameField = form.createTextField('fullName');
  nameField.addToPage(page4, { x: 60, y, width: 300, height: 25 });
  nameField.setFontSize(12);

  y -= 50;
  page4.drawText('Comments (multiline):', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page4.drawText('(Multiline textarea)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const commentsField = form.createTextField('comments');
  commentsField.addToPage(page4, { x: 60, y: y - 50, width: 400, height: 80 });
  commentsField.enableMultiline();
  commentsField.setFontSize(11);

  y -= 80;
  page4.drawText('Password:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page4.drawText('(Password field - text hidden)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const passwordField = form.createTextField('password');
  passwordField.addToPage(page4, { x: 60, y, width: 250, height: 25 });
  passwordField.enablePassword();
  passwordField.setFontSize(12);

  y -= 50;
  page4.drawText('Email (required):*', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0.8, 0, 0) });
  page4.drawText('(Required + email pattern validation)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const emailField = form.createTextField('email');
  emailField.addToPage(page4, { x: 60, y, width: 300, height: 25 });
  emailField.enableRequired();
  emailField.setFontSize(12);

  y -= 50;
  page4.drawText('Username (max 10 chars):', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page4.drawText('(MaxLength validation)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const usernameField = form.createTextField('username');
  usernameField.addToPage(page4, { x: 60, y, width: 200, height: 25 });
  usernameField.setMaxLength(10);
  usernameField.setFontSize(12);

  y -= 50;
  page4.drawText('Phone (xxx) xxx-xxxx:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page4.drawText('(Phone pattern validation - NO auto-format)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const phoneField = form.createTextField('phone');
  phoneField.addToPage(page4, { x: 60, y, width: 250, height: 25 });
  phoneField.setFontSize(12);

  page4.drawText('* Required fields', { x: 60, y: 60, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

  // --- Page 5: Form Fields - Checkboxes & Radio Buttons ---
  const page5 = doc.addPage([612, 792]);
  y = height - 60;

  page5.drawRectangle({
    x: 0, y: y,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page5.drawText('Form Features: Checkboxes & Radios', {
    x: 60, y: y + 18,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 60;
  page5.drawText('Checkboxes:', { x: 60, y, size: 14, font: helveticaBold, color: rgb(0.15, 0.23, 0.37) });
  page5.drawText('(Optional and required checkboxes)', { x: 200, y, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  
  y -= 30;
  const agreeBox = form.createCheckBox('agreeTerms');
  agreeBox.addToPage(page5, { x: 60, y, width: 20, height: 20 });
  page5.drawText('I agree to the terms and conditions', { x: 90, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });

  y -= 30;
  const privacyBox = form.createCheckBox('privacyPolicy');
  privacyBox.addToPage(page5, { x: 60, y, width: 20, height: 20 });
  privacyBox.enableRequired();
  page5.drawText('I have read the privacy policy (required)*', { x: 90, y: y + 5, size: 11, font: helvetica, color: rgb(0.8, 0, 0) });
  page5.drawText('(Required checkbox)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

  y -= 40;
  page5.drawText('Interests:', { x: 60, y, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  const interests = ['Sports', 'Music', 'Reading', 'Gaming'];
  interests.forEach((interest, i) => {
    const checkbox = form.createCheckBox(`interest_${interest.toLowerCase()}`);
    checkbox.addToPage(page5, { x: 60, y: y - 30 - (i * 30), width: 20, height: 20 });
    page5.drawText(interest, { x: 90, y: y - 25 - (i * 30), size: 11, font: helvetica, color: rgb(0, 0, 0) });
  });

  y -= 160;
  page5.drawText('Radio Buttons:', { x: 60, y, size: 14, font: helveticaBold, color: rgb(0.15, 0.23, 0.37) });
  
  y -= 30;
  page5.drawText('Preferred contact method:', { x: 60, y, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  const contactGroup = form.createRadioGroup('contactMethod');
  const methods = ['Email', 'Phone', 'SMS'];
  methods.forEach((method, i) => {
    contactGroup.addOptionToPage(method, page5, { x: 60, y: y - 30 - (i * 30), width: 20, height: 20 });
    page5.drawText(method, { x: 90, y: y - 25 - (i * 30), size: 11, font: helvetica, color: rgb(0, 0, 0) });
  });

  y -= 120;
  page5.drawText('T-shirt size (required):*', { x: 60, y, size: 11, font: helvetica, color: rgb(0.8, 0, 0) });
  page5.drawText('(Required radio group)', { x: 370, y, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const sizeGroup = form.createRadioGroup('tshirtSize');
  sizeGroup.enableRequired();
  const sizes = ['S', 'M', 'L', 'XL'];
  sizes.forEach((size, i) => {
    sizeGroup.addOptionToPage(size, page5, { x: 60 + (i * 80), y: y - 30, width: 20, height: 20 });
    page5.drawText(size, { x: 90 + (i * 80), y: y - 25, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  });

  page5.drawText('* Required fields', { x: 60, y: 60, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

  // --- Page 6: Form Fields - Dropdowns ---
  const page6 = doc.addPage([612, 792]);
  y = height - 60;

  page6.drawRectangle({
    x: 0, y: y,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page6.drawText('Form Features: Dropdowns', {
    x: 60, y: y + 18,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 60;
  page6.drawText('Country:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  y -= 30;
  const countryDropdown = form.createDropdown('country');
  countryDropdown.addOptions(['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Japan', 'Other']);
  countryDropdown.addToPage(page6, { x: 60, y, width: 300, height: 25 });
  countryDropdown.select('United States');

  y -= 50;
  page6.drawText('Department (required):*', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0.8, 0, 0) });
  y -= 30;
  const deptDropdown = form.createDropdown('department');
  deptDropdown.addOptions(['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations']);
  deptDropdown.addToPage(page6, { x: 60, y, width: 300, height: 25 });
  deptDropdown.enableRequired();

  y -= 60;
  page6.drawText('Programming Language:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  y -= 30;
  const langDropdown = form.createDropdown('language');
  langDropdown.addOptions(['JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'TypeScript', 'Ruby', 'PHP']);
  langDropdown.addToPage(page6, { x: 60, y, width: 300, height: 25 });
  langDropdown.select('JavaScript');

  y -= 60;
  page6.drawText('Job Title (editable dropdown):', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  y -= 30;
  const jobCombo = form.createDropdown('jobTitle');
  jobCombo.addOptions(['Software Engineer', 'Product Manager', 'Designer', 'Data Scientist', 'DevOps Engineer']);
  jobCombo.enableEditing();
  jobCombo.addToPage(page6, { x: 60, y, width: 350, height: 25 });

  y -= 80;
  page6.drawText('Try these interactive features:', { x: 60, y, size: 12, font: helveticaBold, color: rgb(0.15, 0.23, 0.37) });
  const tips = [
    '  •  Fill out the form fields above',
    '  •  Required fields are marked with *',
    '  •  Try the validation (required fields, maxLength)',
    '  •  Export the filled PDF with your data',
    '  •  Use stamps and annotations on form pages',
  ];
  tips.forEach((tip, i) => {
    page6.drawText(tip, { x: 60, y: y - 25 - (i * 20), size: 11, font: helvetica, color: rgb(0.2, 0.2, 0.2) });
  });

  page6.drawText('* Required fields', { x: 60, y: 60, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

  const pdfBytes = await doc.save();
  writeFileSync('public/sample.pdf', pdfBytes);
  console.log('✅ Demo PDF created: public/sample.pdf (6 pages)');
  console.log('   Pages 1-3: PDF viewer & annotation features');
  console.log('   Pages 4-6: Interactive form fields with validation');
  
  // Step 2: Enhance with Python script (adds Acrobat JavaScript actions)
  console.log('\n🔧 Running Python enhancement script...');
  const { execSync } = await import('child_process');
  try {
    execSync('python3 scripts/enhance-demo-pdf.py', { stdio: 'inherit' });
    console.log('✅ PDF enhanced with JavaScript actions: public/sample-enhanced.pdf');
  } catch (error) {
    console.error('❌ Python enhancement failed:', error.message);
  }
}

generateDemoPDF();

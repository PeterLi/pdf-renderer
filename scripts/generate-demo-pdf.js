import { PDFDocument, rgb, StandardFonts, PDFName, PDFDict, PDFString, PDFArray, PDFHexString } from 'pdf-lib';
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

  // ============================================================
  // Helper: Add JavaScript action to a field widget
  // ============================================================
  function addJSAction(field, trigger, jsCode) {
    // Get the widget annotation (first one)
    const widgets = field.acroField.getWidgets();
    if (widgets.length === 0) return;
    const widget = widgets[0];

    // Get or create AA (Additional Actions) dictionary
    let aa = widget.dict.get(PDFName.of('AA'));
    if (!aa) {
      aa = doc.context.obj({});
      widget.dict.set(PDFName.of('AA'), aa);
    }

    // Create the action dictionary: { S: /JavaScript, JS: (code) }
    const actionDict = doc.context.obj({});
    actionDict.set(PDFName.of('S'), PDFName.of('JavaScript'));
    actionDict.set(PDFName.of('JS'), PDFString.of(jsCode));
    aa.set(PDFName.of(trigger), actionDict);
  }

  // --- Page 7: JavaScript Text Styling ---
  const page7 = doc.addPage([612, 792]);
  y = height - 60;

  page7.drawRectangle({
    x: 0, y: y,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page7.drawText('JavaScript: Text Styling', {
    x: 60, y: y + 18,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 50;
  page7.drawText('Fields below use Focus/Blur JavaScript to apply dynamic styling.', {
    x: 60, y,
    size: 12,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Field 1: Red text on focus
  y -= 40;
  page7.drawText('Red Text Field:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page7.drawText('(Focus: sets red text color)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const redTextField = form.createTextField('jsRedText');
  redTextField.addToPage(page7, { x: 60, y, width: 300, height: 25 });
  redTextField.setFontSize(12);
  redTextField.setText('I should be red!');
  addJSAction(redTextField, 'Fo',
    'var f = this.getField("jsRedText"); f.textColor = color.red;'
  );

  // Field 2: Blue text, yellow background
  y -= 50;
  page7.drawText('Blue on Yellow:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page7.drawText('(Focus: blue text + yellow fill)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const blueYellowField = form.createTextField('jsBlueYellow');
  blueYellowField.addToPage(page7, { x: 60, y, width: 300, height: 25 });
  blueYellowField.setFontSize(12);
  blueYellowField.setText('Blue on yellow');
  addJSAction(blueYellowField, 'Fo',
    'var f = this.getField("jsBlueYellow"); f.textColor = color.blue; f.fillColor = color.yellow;'
  );

  // Field 3: Green border + centered text
  y -= 50;
  page7.drawText('Green Border + Centered:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page7.drawText('(Focus: green border, center align)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const greenBorderField = form.createTextField('jsGreenBorder');
  greenBorderField.addToPage(page7, { x: 60, y, width: 300, height: 25 });
  greenBorderField.setFontSize(12);
  greenBorderField.setText('Centered green');
  addJSAction(greenBorderField, 'Fo',
    'var f = this.getField("jsGreenBorder"); f.borderColor = color.green; f.textColor = ["RGB", 0, 0.5, 0]; f.alignment = "center";'
  );

  // Field 4: Large magenta text
  y -= 50;
  page7.drawText('Large Magenta Text:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page7.drawText('(Focus: magenta, 18pt size)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const magentaField = form.createTextField('jsMagenta');
  magentaField.addToPage(page7, { x: 60, y, width: 300, height: 30 });
  magentaField.setFontSize(12);
  magentaField.setText('Big magenta!');
  addJSAction(magentaField, 'Fo',
    'var f = this.getField("jsMagenta"); f.textColor = color.magenta; f.textSize = 18;'
  );

  // Field 5: Readonly field set by Focus
  y -= 55;
  page7.drawText('Read-Only After Focus:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page7.drawText('(Focus: sets readonly + gray bg)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const readonlyField = form.createTextField('jsReadonly');
  readonlyField.addToPage(page7, { x: 60, y, width: 300, height: 25 });
  readonlyField.setFontSize(12);
  readonlyField.setText('This becomes read-only');
  addJSAction(readonlyField, 'Fo',
    'var f = this.getField("jsReadonly"); f.readonly = true; f.fillColor = color.ltGray; f.textColor = color.dkGray;'
  );

  page7.drawText('All styling is applied via JavaScript on Focus trigger (/Fo)', {
    x: 60, y: 60, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5),
  });

  // --- Page 8: JavaScript Blur Actions ---
  const page8 = doc.addPage([612, 792]);
  y = height - 60;

  page8.drawRectangle({
    x: 0, y: y,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page8.drawText('JavaScript: Blur Actions & Validation', {
    x: 60, y: y + 18,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 50;
  page8.drawText('Fields below run JavaScript on Blur (losing focus).', {
    x: 60, y,
    size: 12,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Field 1: Auto-uppercase on blur
  y -= 40;
  page8.drawText('Auto-Uppercase:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page8.drawText('(Blur: converts to UPPERCASE)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const upperField = form.createTextField('jsUppercase');
  upperField.addToPage(page8, { x: 60, y, width: 300, height: 25 });
  upperField.setFontSize(12);
  addJSAction(upperField, 'Bl',
    'var f = this.getField("jsUppercase"); f.value = f.value.toUpperCase();'
  );

  // Field 2: Blur colors the field based on content
  y -= 50;
  page8.drawText('Color by Length:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page8.drawText('(Blur: red if <3 chars, green if >=3)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const colorLenField = form.createTextField('jsColorLen');
  colorLenField.addToPage(page8, { x: 60, y, width: 300, height: 25 });
  colorLenField.setFontSize(12);
  addJSAction(colorLenField, 'Bl',
    'var f = this.getField("jsColorLen"); if (f.value.length < 3) { f.textColor = color.red; } else { f.textColor = ["RGB", 0, 0.6, 0]; }'
  );

  // Field 3: Blur sets another field's value
  y -= 50;
  page8.drawText('Mirror Field (type here):', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page8.drawText('(Blur: copies value to field below)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const mirrorSrc = form.createTextField('jsMirrorSrc');
  mirrorSrc.addToPage(page8, { x: 60, y, width: 300, height: 25 });
  mirrorSrc.setFontSize(12);
  addJSAction(mirrorSrc, 'Bl',
    'var src = this.getField("jsMirrorSrc"); var dest = this.getField("jsMirrorDest"); dest.value = "Mirror: " + src.value;'
  );

  y -= 30;
  page8.drawText('Mirror Output (auto-filled):', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  y -= 30;
  const mirrorDest = form.createTextField('jsMirrorDest');
  mirrorDest.addToPage(page8, { x: 60, y, width: 300, height: 25 });
  mirrorDest.setFontSize(12);
  addJSAction(mirrorDest, 'Fo',
    'var f = this.getField("jsMirrorDest"); f.fillColor = ["RGB", 0.95, 0.95, 1]; f.textColor = color.blue;'
  );

  // Field 4: Blur with app.alert (logged)
  y -= 55;
  page8.drawText('Alert on Blur:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page8.drawText('(Blur: logs a message via console)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  y -= 30;
  const alertField = form.createTextField('jsAlert');
  alertField.addToPage(page8, { x: 60, y, width: 300, height: 25 });
  alertField.setFontSize(12);
  addJSAction(alertField, 'Bl',
    'console.println("Blur fired for jsAlert field, value: " + event.value);'
  );

  page8.drawText('Blur actions fire when you click away from the field', {
    x: 60, y: 60, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5),
  });

  // --- Page 9: JavaScript Calculations ---
  const page9 = doc.addPage([612, 792]);
  y = height - 60;

  page9.drawRectangle({
    x: 0, y: y,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page9.drawText('JavaScript: Calculations', {
    x: 60, y: y + 18,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 50;
  page9.drawText('Cross-field calculations using the Calculate trigger.', {
    x: 60, y,
    size: 12,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Price x Quantity = Total
  y -= 45;
  page9.drawText('Order Calculator:', { x: 60, y, size: 14, font: helveticaBold, color: rgb(0.15, 0.23, 0.37) });
  page9.drawText('(Price x Quantity with tax)', { x: 220, y, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

  y -= 40;
  page9.drawText('Price ($):', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page9.drawText('(Focus: blue text)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const priceField = form.createTextField('calcPrice');
  priceField.addToPage(page9, { x: 160, y, width: 180, height: 25 });
  priceField.setFontSize(12);
  priceField.setText('25.00');
  addJSAction(priceField, 'Fo',
    'var f = this.getField("calcPrice"); f.textColor = color.blue;'
  );

  y -= 40;
  page9.drawText('Quantity:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page9.drawText('(Focus: blue text)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const qtyField = form.createTextField('calcQty');
  qtyField.addToPage(page9, { x: 160, y, width: 180, height: 25 });
  qtyField.setFontSize(12);
  qtyField.setText('4');
  addJSAction(qtyField, 'Fo',
    'var f = this.getField("calcQty"); f.textColor = color.blue;'
  );

  y -= 40;
  page9.drawText('Total:', { x: 60, y: y + 5, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  page9.drawText('(Calculated: Price x Qty)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const totalField = form.createTextField('calcTotal');
  totalField.addToPage(page9, { x: 160, y, width: 180, height: 25 });
  totalField.setFontSize(12);
  addJSAction(totalField, 'C',
    'var price = this.getField("calcPrice").value; var qty = this.getField("calcQty").value; var p = parseFloat(price) || 0; var q = parseFloat(qty) || 0; event.value = (p * q).toFixed(2);'
  );
  addJSAction(totalField, 'Fo',
    'var f = this.getField("calcTotal"); f.readonly = true; f.fillColor = color.ltGray; f.textColor = ["RGB", 0, 0.5, 0]; f.textSize = 14;'
  );

  // Tax and Grand Total
  y -= 50;
  page9.drawText('Tax Rate (%):', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page9.drawText('(Focus: blue text)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const taxRateField = form.createTextField('calcTaxRate');
  taxRateField.addToPage(page9, { x: 160, y, width: 180, height: 25 });
  taxRateField.setFontSize(12);
  taxRateField.setText('8.5');
  addJSAction(taxRateField, 'Fo',
    'var f = this.getField("calcTaxRate"); f.textColor = color.blue;'
  );

  y -= 40;
  page9.drawText('Tax Amount:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page9.drawText('(Calculated: Total x Rate)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const taxAmtField = form.createTextField('calcTaxAmt');
  taxAmtField.addToPage(page9, { x: 160, y, width: 180, height: 25 });
  taxAmtField.setFontSize(12);
  addJSAction(taxAmtField, 'C',
    'var total = parseFloat(this.getField("calcTotal").value) || 0; var rate = parseFloat(this.getField("calcTaxRate").value) || 0; event.value = (total * rate / 100).toFixed(2);'
  );
  addJSAction(taxAmtField, 'Fo',
    'var f = this.getField("calcTaxAmt"); f.readonly = true; f.fillColor = color.ltGray; f.textColor = color.dkGray;'
  );

  y -= 45;
  page9.drawText('Grand Total:', { x: 60, y: y + 5, size: 11, font: helveticaBold, color: rgb(0.15, 0.23, 0.37) });
  page9.drawText('(Calculated: Total + Tax)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const grandTotalField = form.createTextField('calcGrandTotal');
  grandTotalField.addToPage(page9, { x: 160, y, width: 180, height: 28 });
  grandTotalField.setFontSize(14);
  addJSAction(grandTotalField, 'C',
    'var total = parseFloat(this.getField("calcTotal").value) || 0; var tax = parseFloat(this.getField("calcTaxAmt").value) || 0; event.value = "$" + (total + tax).toFixed(2);'
  );
  addJSAction(grandTotalField, 'Fo',
    'var f = this.getField("calcGrandTotal"); f.readonly = true; f.fillColor = ["RGB", 0.9, 1, 0.9]; f.textColor = ["RGB", 0, 0.4, 0]; f.textSize = 16; f.borderColor = ["RGB", 0, 0.6, 0];'
  );

  // Sum example
  y -= 60;
  page9.drawText('Sum Calculator:', { x: 60, y, size: 14, font: helveticaBold, color: rgb(0.15, 0.23, 0.37) });
  page9.drawText('(Uses AFSimple_Calculate)', { x: 220, y, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

  y -= 40;
  page9.drawText('Value A:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  const valA = form.createTextField('calcA');
  valA.addToPage(page9, { x: 160, y, width: 120, height: 25 });
  valA.setFontSize(12);
  valA.setText('10');

  page9.drawText('Value B:', { x: 320, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  const valB = form.createTextField('calcB');
  valB.addToPage(page9, { x: 400, y, width: 120, height: 25 });
  valB.setFontSize(12);
  valB.setText('20');

  y -= 40;
  page9.drawText('Sum (A+B):', { x: 60, y: y + 5, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  page9.drawText('(Calculated: auto-sum)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const sumField = form.createTextField('calcSum');
  sumField.addToPage(page9, { x: 160, y, width: 120, height: 25 });
  sumField.setFontSize(12);
  addJSAction(sumField, 'C',
    'AFSimple_Calculate("SUM", ["calcA", "calcB"]);'
  );
  addJSAction(sumField, 'Fo',
    'var f = this.getField("calcSum"); f.readonly = true; f.fillColor = color.ltGray;'
  );

  page9.drawText('Change Price or Quantity to see automatic recalculation', {
    x: 60, y: 60, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5),
  });

  // --- Page 10: JavaScript Format + Combined Features ---
  const page10 = doc.addPage([612, 792]);
  y = height - 60;

  page10.drawRectangle({
    x: 0, y: y,
    width, height: 60,
    color: rgb(0.15, 0.23, 0.37),
  });

  page10.drawText('JavaScript: Format & Combined', {
    x: 60, y: y + 18,
    size: 22,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  y -= 50;
  page10.drawText('Format actions + combined Focus/Blur/Calculate examples.', {
    x: 60, y,
    size: 12,
    font: helvetica,
    color: rgb(0.2, 0.2, 0.2),
  });

  // Format Fields section
  y -= 45;
  page10.drawText('Format Fields:', { x: 60, y, size: 14, font: helveticaBold, color: rgb(0.15, 0.23, 0.37) });
  page10.drawText('(Auto-format on blur)', { x: 220, y, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

  // Currency format
  y -= 40;
  page10.drawText('Currency:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page10.drawText('(Format: $X,XXX.XX)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const currencyField = form.createTextField('fmtCurrency');
  currencyField.addToPage(page10, { x: 160, y, width: 180, height: 25 });
  currencyField.setFontSize(12);
  currencyField.setText('1234.5');
  addJSAction(currencyField, 'F',
    'AFNumber_Format(2, 0, 0, 0, "$", true);'
  );
  addJSAction(currencyField, 'Fo',
    'var f = this.getField("fmtCurrency"); f.textColor = ["RGB", 0, 0.4, 0];'
  );

  // Date format
  y -= 40;
  page10.drawText('Date:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page10.drawText('(Format: mm/dd/yyyy)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const dateField = form.createTextField('fmtDate');
  dateField.addToPage(page10, { x: 160, y, width: 180, height: 25 });
  dateField.setFontSize(12);
  addJSAction(dateField, 'F',
    'AFDate_Format(3);'
  );
  addJSAction(dateField, 'Fo',
    'var f = this.getField("fmtDate"); f.textColor = color.blue; f.fillColor = ["RGB", 0.95, 0.95, 1];'
  );

  // Phone format
  y -= 40;
  page10.drawText('Phone:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page10.drawText('(Format: (xxx) xxx-xxxx)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const phoneFmtField = form.createTextField('fmtPhone');
  phoneFmtField.addToPage(page10, { x: 160, y, width: 180, height: 25 });
  phoneFmtField.setFontSize(12);
  addJSAction(phoneFmtField, 'F',
    'AFSpecial_Format(2);'
  );

  // Combined Triggers section
  y -= 60;
  page10.drawText('Combined Triggers:', { x: 60, y, size: 14, font: helveticaBold, color: rgb(0.15, 0.23, 0.37) });
  page10.drawText('(Multiple actions per field)', { x: 240, y, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });

  y -= 40;
  page10.drawText('Uppercase:', { x: 60, y: y + 5, size: 11, font: helvetica, color: rgb(0, 0, 0) });
  page10.drawText('(Focus: blue bg, Blur: uppercase)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const combinedField = form.createTextField('jsCombined');
  combinedField.addToPage(page10, { x: 160, y, width: 180, height: 25 });
  combinedField.setFontSize(12);
  addJSAction(combinedField, 'Fo',
    'var f = this.getField("jsCombined"); f.fillColor = ["RGB", 0.9, 0.95, 1]; f.borderColor = color.blue;'
  );
  addJSAction(combinedField, 'Bl',
    'var f = this.getField("jsCombined"); f.value = f.value.toUpperCase(); f.fillColor = color.white; f.textColor = ["RGB", 0, 0.4, 0];'
  );

  // Status display field
  y -= 45;
  page10.drawText('Status:', { x: 60, y: y + 5, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  page10.drawText('(Focus: styled readonly status)', { x: 370, y: y + 5, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) });
  const statusField = form.createTextField('jsStatus');
  statusField.addToPage(page10, { x: 160, y, width: 180, height: 28 });
  statusField.setFontSize(14);
  statusField.setText('JavaScript Active');
  addJSAction(statusField, 'Fo',
    'var f = this.getField("jsStatus"); f.readonly = true; f.fillColor = ["RGB", 0.9, 1, 0.9]; f.textColor = ["RGB", 0, 0.5, 0]; f.borderColor = ["RGB", 0, 0.7, 0]; f.alignment = "center"; f.textSize = 16;'
  );

  page10.drawText('Pages 7-10 demonstrate Focus, Blur, Calculate, and Format triggers', {
    x: 60, y: 60, size: 10, font: helvetica, color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await doc.save();
  writeFileSync('public/sample.pdf', pdfBytes);
  console.log('✅ Demo PDF created: public/sample.pdf');
  console.log('   Pages 1-3: PDF viewer & annotation features');
  console.log('   Pages 4-6: Interactive form fields with validation');
  console.log('   Pages 7-10: JavaScript actions (Focus, Blur, Calculate, Format)');
}

generateDemoPDF();

#!/usr/bin/env python3
"""
Enhance sample.pdf with JavaScript actions and test page.
Takes sample.pdf -> creates sample-enhanced.pdf

Usage:
  python3 scripts/enhance-demo-pdf.py
"""
import pikepdf
from pikepdf import Dictionary, Name
import sys
from pathlib import Path

def add_phone_js_action(pdf):
    """Add AFSpecial_Format(2) to phone field"""
    def find_field(pdf, name):
        if '/AcroForm' not in pdf.Root or '/Fields' not in pdf.Root['/AcroForm']:
            return None
        for field in pdf.Root['/AcroForm']['/Fields']:
            if '/T' in field and str(field['/T']) == name:
                return field
            if '/Kids' in field:
                for kid in field['/Kids']:
                    if '/T' in kid and str(kid['/T']) == name:
                        return kid
        return None
    
    phone = find_field(pdf, 'phone')
    if phone:
        if '/AA' not in phone:
            phone['/AA'] = Dictionary({})
        
        phone['/AA']['/F'] = Dictionary({
            '/S': Name('/JavaScript'),
            '/JS': 'AFSpecial_Format(2);'
        })
        print('  + Phone formatting (AFSpecial_Format)')
    else:
        print('  ! Phone field not found')

def create_text_field(pdf, page, name, x, y, width, height, js_actions=None):
    """Create a text field annotation"""
    field = Dictionary({
        '/FT': Name('/Tx'),
        '/T': name,
        '/V': '',
        '/Rect': [x, y, x + width, y + height],
        '/Subtype': Name('/Widget'),
        '/Type': Name('/Annot'),
        '/F': 4,
        '/P': page.obj,
    })
    
    if js_actions:
        field['/AA'] = Dictionary()
        for trigger, code in js_actions.items():
            field['/AA'][trigger] = Dictionary({
                '/S': Name('/JavaScript'),
                '/JS': code
            })
    
    return field

def add_js_test_page(pdf):
    """Add page 7 with JavaScript function tests - clean, wide layout"""
    page = pdf.add_blank_page(page_size=(612, 792))
    
    # Simplified config: name, label, y_pos, js_actions, example_text
    # All fields are 250px wide for consistency
    field_width = 250
    field_x = 70
    
    fields = [
        ('test_zip', 'ZIP Code', 620,
         {'/F': 'AFSpecial_Format(0);', '/K': 'AFSpecial_Keystroke(0);'},
         'Type 12345'),
        
        ('test_ssn', 'SSN', 555,
         {'/F': 'AFSpecial_Format(3);', '/K': 'AFSpecial_Keystroke(3);'},
         'Type 123456789 -> 123-45-6789'),
        
        ('test_date1', 'Date (mm/dd/yy)', 490,
         {'/F': 'AFDate_Format(2);', '/K': 'AFDate_Keystroke(2);'},
         'Type 03/15/2024 -> 03/15/24'),
        
        ('test_date2', 'Date (ISO)', 425,
         {'/F': 'AFDate_Format(8);', '/K': 'AFDate_Keystroke(8);'},
         'Type 03/15/2024 -> 2024-03-15'),
        
        ('test_time', 'Time (24h)', 360,
         {'/F': 'AFTime_Format(0);', '/K': 'AFTime_Keystroke(0);'},
         'Type 14:30'),
        
        ('test_pct', 'Percentage', 295,
         {'/F': 'AFPercent_Format(2, 0);'},
         'Type 0.25 -> 25.00%'),
        
        ('test_age', 'Age (1-100)', 230,
         {'/V': 'AFRange_Validate(true, 1, true, 100);', '/K': 'AFNumber_Keystroke(0, 0, 0, 0, "", true);'},
         'Type 150 -> REJECTED'),
        
        ('test_price', 'Currency', 165,
         {'/F': 'AFNumber_Format(2, 0, 0, 0, "$", true);', '/K': 'AFNumber_Keystroke(2, 0, 0, 0, "$", true);'},
         'Type 1234.56 -> $1,234.56'),
    ]
    
    # Create form fields
    created_fields = []
    for name, label, y_pos, actions, example in fields:
        field = create_text_field(pdf, page, name, field_x, y_pos, field_width, 28, actions)
        created_fields.append(field)
    
    # Add fields to page and form
    if '/Annots' not in page:
        page['/Annots'] = []
    
    for field in created_fields:
        page['/Annots'].append(pdf.make_indirect(field))
        pdf.Root['/AcroForm']['/Fields'].append(pdf.make_indirect(field))
    
    # Build content stream
    content = b"""
q
% Dark blue header
0.15 0.23 0.37 rg
0 720 612 72 re f

BT
/Helvetica-Bold 22 Tf
1 1 1 rg
50 755 Td
(JavaScript Function Tests) Tj
ET

BT
/Helvetica 10 Tf
0.8 0.85 0.9 rg
50 735 Td
(Enable Form Mode + JS: ON, then TAB out of fields to trigger formatting) Tj
ET
Q

"""
    
    # Add labels and examples for each field (to the RIGHT of the field box)
    for name, label, y_pos, actions, example in fields:
        # Gray row background
        content += f"""
q
0.97 0.98 0.99 rg
40 {y_pos - 8} 532 44 re f
0.88 0.90 0.92 RG
0.3 w
40 {y_pos - 8} 532 44 re S
Q
""".encode('latin-1')
        
        # Label above field
        content += f"""
BT
/Helvetica-Bold 11 Tf
0.2 0.3 0.4 rg
{field_x} {y_pos + 30} Td
({label}) Tj
ET
""".encode('latin-1')
        
        # Example text to the right of field
        content += f"""
BT
/Helvetica 9 Tf
0.3 0.5 0.7 rg
{field_x + field_width + 20} {y_pos + 8} Td
({example}) Tj
ET
""".encode('latin-1')
        
        # Visible field border
        content += f"""
q
0.4 0.6 0.9 RG
1.5 w
{field_x} {y_pos} {field_width} 28 re S
Q
""".encode('latin-1')
    
    # Footer
    content += b"""
q
0.95 0.96 0.97 rg
0 0 612 80 re f

BT
/Helvetica-Bold 10 Tf
0.3 0.35 0.4 rg
50 55 Td
(Acrobat JavaScript Functions:) Tj
/Helvetica 9 Tf
0.5 0.55 0.6 rg
210 0 Td
(AFSpecial_Format, AFDate_Format, AFTime_Format,) Tj
0 -14 Td
(AFPercent_Format, AFNumber_Format, AFRange_Validate) Tj
ET
Q
"""
    
    page.Contents = pdf.make_stream(content)
    print('  + Page 7 with 8 JavaScript test fields')

def create_choice_field(pdf, page, name, x, y, width, height, options=None, js_actions=None):
    """Create a dropdown/combo field annotation"""
    field = Dictionary({
        '/FT': Name('/Ch'),
        '/T': name,
        '/V': '',
        '/Rect': [x, y, x + width, y + height],
        '/Subtype': Name('/Widget'),
        '/Type': Name('/Annot'),
        '/F': 4,
        '/Ff': 131072,  # combo box flag
        '/P': page.obj,
    })

    if options:
        opt_array = []
        for opt in options:
            if isinstance(opt, (list, tuple)):
                opt_array.append([opt[1], opt[0]])  # [export, display]
            else:
                opt_array.append(opt)
        field['/Opt'] = opt_array

    if js_actions:
        field['/AA'] = Dictionary()
        for trigger, code in js_actions.items():
            field['/AA'][trigger] = Dictionary({
                '/S': Name('/JavaScript'),
                '/JS': code
            })

    return field


def add_field_api_demo_page(pdf):
    """Add page 8 with Field Object API demos - professional card layout"""
    page = pdf.add_blank_page(page_size=(612, 792))

    created_fields = []
    field_x = 50
    col2_x = 320

    # --- Section 1: Field Properties Demo ---
    # Text field that gets styled via JS
    demo_fields = [
        # Card 1: Value & Display
        ('demo_name', field_x + 10, 618, 220, 24, {
            '/Fo': 'var f = getField("demo_name"); f.textSize = 14; f.textColor = color.blue;'
        }),
        ('demo_toggle', col2_x + 10, 618, 220, 24, {
            '/Fo': 'var f = getField("demo_toggle"); f.fillColor = ["RGB", 0.95, 1, 0.95];'
        }),

        # Card 2: Text Styling
        ('demo_styled', field_x + 10, 498, 220, 24, {
            '/Fo': 'var f = getField("demo_styled"); f.textSize = 16; f.textFont = "Courier"; f.alignment = "center"; f.textColor = color.red;'
        }),
        ('demo_readonly', col2_x + 10, 498, 220, 24, {
            '/Fo': 'var f = getField("demo_readonly"); f.readonly = true; f.fillColor = ["RGB", 0.93, 0.93, 0.93]; f.textColor = ["RGB", 0.5, 0.5, 0.5];'
        }),

        # Card 3: Input Constraints
        ('demo_charlimit', field_x + 10, 378, 220, 24, {
            '/Fo': 'var f = getField("demo_charlimit"); f.charLimit = 10; f.comb = true; f.borderColor = color.blue;'
        }),
        ('demo_required', col2_x + 10, 378, 220, 24, {
            '/Fo': 'var f = getField("demo_required"); f.required = true; f.borderColor = color.red; f.fillColor = ["RGB", 1, 0.97, 0.97];'
        }),

        # Card 4: Cross-field manipulation
        ('demo_price', field_x + 10, 258, 100, 24, {
            '/Bl': 'var p = getField("demo_price"); var q = getField("demo_qty"); var t = getField("demo_total"); var pv = parseFloat(p.value) || 0; var qv = parseFloat(q.value) || 0; t.value = "$" + (pv * qv).toFixed(2); if (pv * qv > 100) { t.textColor = color.red; } else { t.textColor = color.black; }'
        }),
        ('demo_qty', field_x + 125, 258, 100, 24, {
            '/Bl': 'var p = getField("demo_price"); var q = getField("demo_qty"); var t = getField("demo_total"); var pv = parseFloat(p.value) || 0; var qv = parseFloat(q.value) || 0; t.value = "$" + (pv * qv).toFixed(2); if (pv * qv > 100) { t.textColor = color.red; } else { t.textColor = color.black; }'
        }),
        ('demo_total', col2_x + 10, 258, 220, 24, {
            '/Fo': 'var f = getField("demo_total"); f.readonly = true; f.textSize = 14; f.fillColor = ["RGB", 0.96, 0.98, 1]; f.alignment = "right";'
        }),
    ]

    for name, x, y, w, h, actions in demo_fields:
        field = create_text_field(pdf, page, name, x, y, w, h, actions)
        created_fields.append(field)

    # Card 5: Dropdown with dynamic items
    dropdown = create_choice_field(
        pdf, page, 'demo_dropdown', field_x + 10, 148, 220, 24,
        options=[['Select a color...', ''], ['Red', 'red'], ['Green', 'green'], ['Blue', 'blue']],
        js_actions={
            '/V': 'var dd = getField("demo_dropdown"); var preview = getField("demo_color_preview"); if (dd.value == "red") { preview.fillColor = color.red; } else if (dd.value == "green") { preview.fillColor = color.green; } else if (dd.value == "blue") { preview.fillColor = color.blue; } else { preview.fillColor = color.white; } preview.value = dd.value || "(none)";'
        }
    )
    created_fields.append(dropdown)

    color_preview = create_text_field(
        pdf, page, 'demo_color_preview', col2_x + 10, 148, 220, 24,
        {'/Fo': 'var f = getField("demo_color_preview"); f.readonly = true; f.alignment = "center";'}
    )
    created_fields.append(color_preview)

    # Add all fields to page and form
    if '/Annots' not in page:
        page['/Annots'] = []

    for field in created_fields:
        ref = pdf.make_indirect(field)
        page['/Annots'].append(ref)
        pdf.Root['/AcroForm']['/Fields'].append(ref)

    # Build content stream
    content = b""

    # === HEADER ===
    content += b"""
q
% Teal gradient header
0.13 0.55 0.55 rg
0 720 612 72 re f

BT
/Helvetica-Bold 22 Tf
1 1 1 rg
50 755 Td
(Field Object API Demo) Tj
ET

BT
/Helvetica 10 Tf
0.75 0.95 0.95 rg
50 735 Td
(Phase 3: Dynamic field properties, methods, and cross-field manipulation) Tj
ET
Q
"""

    # === CARD 1: Value & Display ===
    content += _card(40, 598, 252, 120,
                     'Value & Display',
                     'field.value, field.display,\nfield.fillColor on focus')
    content += _card(308, 598, 262, 120,
                     'Focus Highlighting',
                     'field.fillColor changes\non focus event')

    # Field labels
    content += _label(field_x + 10, 646, 'Name (styled on focus)')
    content += _label(col2_x + 10, 646, 'Toggle Field (highlight on focus)')

    # === CARD 2: Text Styling ===
    content += _card(40, 478, 252, 120,
                     'Text Styling',
                     'field.textSize, textFont,\nalignment, textColor')
    content += _card(308, 478, 262, 120,
                     'Read-Only State',
                     'field.readonly = true,\nfield.fillColor = gray')

    content += _label(field_x + 10, 526, 'Styled Text (Courier, center, red)')
    content += _label(col2_x + 10, 526, 'Read-Only Field (locked on focus)')

    # === CARD 3: Input Constraints ===
    content += _card(40, 358, 252, 120,
                     'Character Limit & Comb',
                     'field.charLimit = 10,\nfield.comb = true')
    content += _card(308, 358, 262, 120,
                     'Required Field',
                     'field.required = true,\nred border + pink fill')

    content += _label(field_x + 10, 406, 'Char Limit: 10, Comb mode')
    content += _label(col2_x + 10, 406, 'Required (red border on focus)')

    # === CARD 4: Cross-Field Calculation ===
    content += _card(40, 238, 530, 120,
                     'Cross-Field Manipulation',
                     'getField() reads/writes across fields. Total turns red when > $100')

    content += _label(field_x + 10, 286, 'Price')
    content += _label(field_x + 125, 286, 'Quantity')
    content += _label(col2_x + 10, 286, 'Total (auto-calculated, read-only)')
    # Multiplication sign between price and qty
    content += f"""
BT
/Helvetica-Bold 14 Tf
0.3 0.4 0.5 rg
{field_x + 113} 262 Td
(x) Tj
ET
""".encode('latin-1')

    # === CARD 5: Dropdown & Dynamic Items ===
    content += _card(40, 128, 530, 120,
                     'Dropdown & Color Preview',
                     'field.setItems(), choice field selection updates preview color via getField()')

    content += _label(field_x + 10, 176, 'Select Color')
    content += _label(col2_x + 10, 176, 'Color Preview (auto-updated)')

    # === FOOTER ===
    content += b"""
q
0.95 0.96 0.97 rg
0 0 612 80 re f

BT
/Helvetica-Bold 10 Tf
0.3 0.35 0.4 rg
50 55 Td
(Field Object API:) Tj
/Helvetica 9 Tf
0.5 0.55 0.6 rg
150 0 Td
(field.value, display, readonly, required, borderColor, fillColor, textColor, textSize,) Tj
0 -14 Td
(textFont, alignment, charLimit, comb, setFocus\\(\\), setAction\\(\\), setItems\\(\\), getItemAt\\(\\)) Tj
ET
Q
"""

    page.Contents = pdf.make_stream(content)
    print('  + Page 8 with Field Object API demo (5 cards, 11 interactive fields)')


def _card(x, y, w, h, title, subtitle):
    """Generate PDF content stream for a card with title and subtitle"""
    lines = subtitle.split('\n')
    result = f"""
q
% Card background
1 1 1 rg
{x} {y} {w} {h} re f

% Card border
0.82 0.85 0.88 RG
0.5 w
{x} {y} {w} {h} re S

% Card accent bar (left)
0.13 0.55 0.55 rg
{x} {y} 4 {h} re f
Q

BT
/Helvetica-Bold 11 Tf
0.15 0.2 0.3 rg
{x + 14} {y + h - 20} Td
({title}) Tj
ET

""".encode('latin-1')

    # Subtitle lines
    for i, line in enumerate(lines):
        result += f"""
BT
/Helvetica 8 Tf
0.45 0.5 0.55 rg
{x + 14} {y + h - 35 - i * 12} Td
({line}) Tj
ET
""".encode('latin-1')

    return result


def _label(x, y, text):
    """Generate a field label"""
    return f"""
BT
/Helvetica-Bold 9 Tf
0.25 0.35 0.45 rg
{x} {y} Td
({text}) Tj
ET
""".encode('latin-1')

def _hint(x, y, text):
    """Generate a hint/instruction text (smaller, lighter, non-bold)"""
    return f"""
BT
/Helvetica 8 Tf
0.4 0.5 0.6 rg
{x} {y} Td
({text}) Tj
ET
""".encode('latin-1')


def add_document_api_demo_pages(pdf):
    """Add pages 9-10 with Document Object API demos - professional card layout"""

    # ============================================================
    # PAGE 9: Document Properties & Field Enumeration
    # ============================================================
    page9 = pdf.add_blank_page(page_size=(612, 792))
    created_fields_9 = []
    field_x = 50
    col2_x = 320

    # --- Fields for Page 9 ---
    demo_fields_9 = [
        # Card 1: Document Info display
        ('doc_info_display', field_x + 10, 618, 510, 24, {
            '/Fo': 'var f = getField("doc_info_display"); f.readonly = true; f.fillColor = ["RGB", 0.96, 0.98, 1]; f.textSize = 10; f.value = "Pages: " + this.numPages + " | File: " + this.documentFileName + " | Size: " + this.filesize + " bytes";'
        }),

        # Card 2: Field enumeration
        ('doc_field_count', field_x + 10, 498, 220, 24, {
            '/Fo': 'var f = getField("doc_field_count"); f.readonly = true; f.fillColor = ["RGB", 0.96, 1, 0.96]; f.textSize = 12; f.alignment = "center"; f.value = this.numFields + " fields";'
        }),
        ('doc_field_list', col2_x + 10, 498, 220, 24, {
            '/Fo': 'var f = getField("doc_field_list"); f.readonly = true; f.fillColor = ["RGB", 1, 0.98, 0.96]; f.textSize = 9; var names = []; for (var i = 0; i < Math.min(this.numFields, 5); i++) { names.push(this.getNthFieldName(i)); } f.value = names.join(", ") + (this.numFields > 5 ? "..." : "");'
        }),

        # Card 3: Add/Remove fields demo
        ('doc_new_name', field_x + 10, 368, 220, 24, {}),
        ('doc_add_result', col2_x + 10, 368, 220, 24, {
            '/Fo': 'var f = getField("doc_add_result"); f.readonly = true; f.fillColor = ["RGB", 0.96, 0.96, 1];'
        }),

        # Card 4: Reset form demo
        ('doc_reset_field1', field_x + 10, 248, 150, 24, {}),
        ('doc_reset_field2', field_x + 175, 248, 150, 24, {}),
        ('doc_reset_status', col2_x + 10, 248, 220, 24, {
            '/Fo': 'var f = getField("doc_reset_status"); f.readonly = true; f.fillColor = ["RGB", 1, 0.96, 0.96]; f.alignment = "center";'
        }),
    ]

    for name, x, y, w, h, actions in demo_fields_9:
        field = create_text_field(pdf, page9, name, x, y, w, h, actions)
        created_fields_9.append(field)

    # Button-like field: Add Field
    add_btn = create_text_field(pdf, page9, 'doc_add_btn', field_x + 10, 340, 220, 24, {
        '/Fo': 'var f = getField("doc_add_btn"); f.fillColor = ["RGB", 0.13, 0.55, 0.55]; f.textColor = color.white; f.alignment = "center"; f.textSize = 11; f.value = "Click to Add Field";',
        '/Bl': 'var nameF = getField("doc_new_name"); var name = nameF.value; if (name) { this.addField(name, "text", 0, [0,0,100,20]); getField("doc_add_result").value = "Added: " + name; } else { getField("doc_add_result").value = "Enter a name first!"; }'
    })
    created_fields_9.append(add_btn)

    # Button-like field: Reset Form
    reset_btn = create_text_field(pdf, page9, 'doc_reset_btn', col2_x + 10, 220, 220, 24, {
        '/Fo': 'var f = getField("doc_reset_btn"); f.fillColor = ["RGB", 0.8, 0.2, 0.2]; f.textColor = color.white; f.alignment = "center"; f.textSize = 11; f.value = "Reset These Fields";',
        '/Bl': 'this.resetForm(["doc_reset_field1", "doc_reset_field2"]); getField("doc_reset_status").value = "Fields reset!";'
    })
    created_fields_9.append(reset_btn)

    # Add fields to page
    if '/Annots' not in page9:
        page9['/Annots'] = []
    for field in created_fields_9:
        ref = pdf.make_indirect(field)
        page9['/Annots'].append(ref)
        pdf.Root['/AcroForm']['/Fields'].append(ref)

    # Build content stream for Page 9
    content9 = b""

    # === HEADER ===
    content9 += b"""
q
% Deep blue header
0.12 0.18 0.33 rg
0 720 612 72 re f

BT
/Helvetica-Bold 22 Tf
1 1 1 rg
50 755 Td
(Document Object API Demo) Tj
ET

BT
/Helvetica 10 Tf
0.7 0.78 0.92 rg
50 735 Td
(Phase 4: Document properties, field enumeration, and document operations) Tj
ET
Q
"""

    # === CARD 1: Document Properties ===
    content9 += _card(40, 598, 530, 120,
                      'Document Properties',
                      'this.numPages, this.documentFileName,\nthis.filesize, this.info, this.path')
    content9 += _label(field_x + 10, 646, 'Document Info (auto-populated on focus)')

    # === CARD 2: Field Enumeration ===
    content9 += _card(40, 478, 252, 120,
                      'Field Count',
                      'this.numFields returns\ntotal form field count')
    content9 += _card(308, 478, 262, 120,
                      'Field Names',
                      'this.getNthFieldName(n)\niterates sorted field names')
    content9 += _label(field_x + 10, 526, 'Total Fields')
    content9 += _label(col2_x + 10, 526, 'First 5 Field Names')

    # === CARD 3: Add Field ===
    content9 += _card(40, 328, 530, 120,
                      'Dynamic Field Creation',
                      'this.addField(name, type, page, coords) creates fields at runtime')
    content9 += _label(field_x + 10, 396, 'New Field Name')
    content9 += _hint(field_x + 150, 396, '(click button below to trigger addField)')
    content9 += _label(col2_x + 10, 396, 'Result')

    # === CARD 4: Reset Form ===
    content9 += _card(40, 208, 530, 120,
                      'Reset Form',
                      'this.resetForm(fields) clears specified fields to defaults')
    content9 += _label(field_x + 10, 276, 'Field 1')
    content9 += _label(field_x + 175, 276, 'Field 2')
    content9 += _label(col2_x + 10, 276, 'Reset Status')
    content9 += _hint(col2_x + 120, 276, '(click button below to reset)')

    # === FOOTER ===
    content9 += b"""
q
0.94 0.95 0.97 rg
0 0 612 80 re f

BT
/Helvetica-Bold 10 Tf
0.3 0.35 0.4 rg
50 55 Td
(Document Properties:) Tj
/Helvetica 9 Tf
0.5 0.55 0.6 rg
150 0 Td
(this.numPages, pageNum, path, URL, documentFileName, filesize, info, dirty) Tj
0 -14 Td
(this.getField\\(\\), getNthFieldName\\(\\), numFields, addField\\(\\), removeField\\(\\), resetForm\\(\\)) Tj
ET
Q
"""

    page9.Contents = pdf.make_stream(content9)
    print('  + Page 9 with Document Properties & Field Enumeration (4 cards, 10 fields)')

    # ============================================================
    # PAGE 10: Document Operations (submit, mail, print, export)
    # ============================================================
    page10 = pdf.add_blank_page(page_size=(612, 792))
    created_fields_10 = []

    demo_fields_10 = [
        # Card 1: Submit Form
        ('doc_submit_url', field_x + 10, 618, 510, 24, {}),

        # Card 2: Mail Form
        ('doc_mail_to', field_x + 10, 498, 220, 24, {}),
        ('doc_mail_subject', col2_x + 10, 498, 220, 24, {}),

        # Card 3: Export Data
        ('doc_export_result', field_x + 10, 378, 510, 50, {
            '/Fo': 'var f = getField("doc_export_result"); f.readonly = true; f.multiline = true; f.fillColor = ["RGB", 0.97, 0.97, 1]; f.textSize = 9;'
        }),

        # Card 4: Print
        ('doc_print_start', field_x + 10, 258, 100, 24, {}),
        ('doc_print_end', field_x + 125, 258, 100, 24, {}),
        ('doc_print_status', col2_x + 10, 258, 220, 24, {
            '/Fo': 'var f = getField("doc_print_status"); f.readonly = true; f.fillColor = ["RGB", 0.96, 1, 0.96]; f.alignment = "center";'
        }),

        # Card 5: Dirty flag & calculateNow
        ('doc_dirty_display', field_x + 10, 148, 220, 24, {
            '/Fo': 'var f = getField("doc_dirty_display"); f.readonly = true; f.alignment = "center"; f.fillColor = this.dirty ? ["RGB", 1, 0.9, 0.9] : ["RGB", 0.9, 1, 0.9]; f.value = "dirty = " + String(this.dirty);'
        }),
        ('doc_calc_status', col2_x + 10, 148, 220, 24, {
            '/Fo': 'var f = getField("doc_calc_status"); f.readonly = true; f.fillColor = ["RGB", 0.96, 0.96, 1]; f.alignment = "center";'
        }),
    ]

    for name, x, y, w, h, actions in demo_fields_10:
        field = create_text_field(pdf, page10, name, x, y, w, h, actions)
        created_fields_10.append(field)

    # Submit button
    submit_btn = create_text_field(pdf, page10, 'doc_submit_btn', field_x + 10, 590, 510, 24, {
        '/Fo': 'var f = getField("doc_submit_btn"); f.fillColor = ["RGB", 0.13, 0.55, 0.13]; f.textColor = color.white; f.alignment = "center"; f.textSize = 11; f.value = "Submit Form";',
        '/Bl': 'var url = getField("doc_submit_url").value || "https://httpbin.org/post"; this.submitForm(url); app.alert("Form submitted to: " + url);'
    })
    created_fields_10.append(submit_btn)

    # Mail button
    mail_btn = create_text_field(pdf, page10, 'doc_mail_btn', field_x + 10, 470, 510, 24, {
        '/Fo': 'var f = getField("doc_mail_btn"); f.fillColor = ["RGB", 0.2, 0.4, 0.7]; f.textColor = color.white; f.alignment = "center"; f.textSize = 11; f.value = "Mail Form";',
        '/Bl': 'var to = getField("doc_mail_to").value || "user@example.com"; var subj = getField("doc_mail_subject").value || "Form Data"; this.mailForm(true, to, "", "", subj, "Please find attached form data."); app.alert("Mail prepared to: " + to);'
    })
    created_fields_10.append(mail_btn)

    # Export button
    export_btn = create_text_field(pdf, page10, 'doc_export_btn', field_x + 10, 350, 510, 24, {
        '/Fo': 'var f = getField("doc_export_btn"); f.fillColor = ["RGB", 0.6, 0.3, 0.6]; f.textColor = color.white; f.alignment = "center"; f.textSize = 11; f.value = "Export as Text";',
        '/Bl': 'var data = this.exportAsText("/tmp/form-data.txt"); getField("doc_export_result").value = data;'
    })
    created_fields_10.append(export_btn)

    # Print button
    print_btn = create_text_field(pdf, page10, 'doc_print_btn', field_x + 10, 230, 220, 24, {
        '/Fo': 'var f = getField("doc_print_btn"); f.fillColor = ["RGB", 0.55, 0.35, 0.13]; f.textColor = color.white; f.alignment = "center"; f.textSize = 11; f.value = "Print Document";',
        '/Bl': 'var s = parseInt(getField("doc_print_start").value) || 0; var e = parseInt(getField("doc_print_end").value) || (this.numPages - 1); this.print(true, s, e); getField("doc_print_status").value = "Print: pages " + s + "-" + e;'
    })
    created_fields_10.append(print_btn)

    # Calculate Now button
    calc_btn = create_text_field(pdf, page10, 'doc_calc_btn', col2_x + 10, 120, 220, 24, {
        '/Fo': 'var f = getField("doc_calc_btn"); f.fillColor = ["RGB", 0.13, 0.45, 0.55]; f.textColor = color.white; f.alignment = "center"; f.textSize = 11; f.value = "Calculate Now";',
        '/Bl': 'this.calculateNow(); getField("doc_calc_status").value = "Calculations triggered!"; this.dirty = true; getField("doc_dirty_display").fillColor = ["RGB", 1, 0.9, 0.9]; getField("doc_dirty_display").value = "dirty = true";'
    })
    created_fields_10.append(calc_btn)

    # Add fields to page
    if '/Annots' not in page10:
        page10['/Annots'] = []
    for field in created_fields_10:
        ref = pdf.make_indirect(field)
        page10['/Annots'].append(ref)
        pdf.Root['/AcroForm']['/Fields'].append(ref)

    # Build content stream for Page 10
    content10 = b""

    # === HEADER ===
    content10 += b"""
q
% Dark navy header
0.12 0.18 0.33 rg
0 720 612 72 re f

BT
/Helvetica-Bold 22 Tf
1 1 1 rg
50 755 Td
(Document Operations Demo) Tj
ET

BT
/Helvetica 10 Tf
0.7 0.78 0.92 rg
50 735 Td
(Phase 4: Submit, mail, export, print, and calculation operations) Tj
ET
Q
"""

    # === CARD 1: Submit Form ===
    content10 += _card(40, 578, 530, 140,
                       'Submit Form',
                       'this.submitForm(url) sends form\ndata to a server endpoint')
    content10 += _label(field_x + 10, 646, 'Submit URL:')
    content10 += _hint(field_x + 90, 646, '(leave blank for default \\267 green button submits)')

    # === CARD 2: Mail Form ===
    content10 += _card(40, 458, 530, 120,
                       'Mail Form',
                       'this.mailForm(ui, to, cc, bcc,\nsubject, message)')
    content10 += _label(field_x + 10, 526, 'To Email:')
    content10 += _label(col2_x + 10, 526, 'Subject:')
    content10 += _hint(col2_x + 80, 526, '(blue button sends mail)')

    # === CARD 3: Export Data ===
    content10 += _card(40, 338, 530, 120,
                       'Export Data',
                       'this.exportAsText(), exportAsFDF()\nexport form data in various formats')
    content10 += _label(field_x + 10, 432, 'Export Result:')
    content10 += _hint(field_x + 110, 432, '(auto-populated \\267 purple button exports)')

    # === CARD 4: Print ===
    content10 += _card(40, 218, 530, 120,
                       'Print Document',
                       'this.print(ui, start, end, silent,\nshrinkToFit, printAsImage)')
    content10 += _label(field_x + 10, 286, 'Start Page:')
    content10 += _label(field_x + 125, 286, 'End Page:')
    content10 += _label(col2_x + 10, 286, 'Print Status:')
    content10 += _hint(col2_x + 100, 286, '(brown button prints)')

    # === CARD 5: Dirty Flag & Calculations ===
    content10 += _card(40, 108, 530, 120,
                       'Dirty Flag & Calculations',
                       'this.dirty tracks modifications,\nthis.calculateNow() triggers recalc')
    content10 += _label(field_x + 10, 176, 'Modified Status:')
    content10 += _label(col2_x + 10, 176, 'Calc Status:')
    content10 += _hint(col2_x + 90, 176, '(button triggers recalculate)')

    # === FOOTER ===
    content10 += b"""
q
0.94 0.95 0.97 rg
0 0 612 80 re f

BT
/Helvetica-Bold 10 Tf
0.3 0.35 0.4 rg
50 55 Td
(Document Methods:) Tj
/Helvetica 9 Tf
0.5 0.55 0.6 rg
140 0 Td
(submitForm\\(\\), mailForm\\(\\), exportAsText\\(\\), exportAsFDF\\(\\), importAnFDF\\(\\)) Tj
0 -14 Td
(print\\(\\), calculateNow\\(\\), dirty, pageNum) Tj
ET
Q
"""

    page10.Contents = pdf.make_stream(content10)
    print('  + Page 10 with Document Operations (5 cards, 16 interactive fields)')


def main():
    input_pdf = Path('public/sample.pdf')
    output_pdf = Path('public/sample-enhanced.pdf')

    if not input_pdf.exists():
        print(f'Error: {input_pdf} not found')
        print('Run: node scripts/generate-demo-pdf.js first')
        sys.exit(1)

    print(f'Enhancing {input_pdf}...')
    pdf = pikepdf.Pdf.open(input_pdf)

    print('Adding:')
    add_phone_js_action(pdf)
    add_js_test_page(pdf)
    add_field_api_demo_page(pdf)
    add_document_api_demo_pages(pdf)

    print(f'Saving to {output_pdf}...')
    pdf.save(output_pdf)
    print('Done!')

if __name__ == '__main__':
    main()

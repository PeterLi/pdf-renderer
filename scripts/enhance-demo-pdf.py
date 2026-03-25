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
    
    print(f'Saving to {output_pdf}...')
    pdf.save(output_pdf)
    print('Done!')

if __name__ == '__main__':
    main()

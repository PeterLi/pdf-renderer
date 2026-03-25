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
    
    print(f'Saving to {output_pdf}...')
    pdf.save(output_pdf)
    print('Done!')

if __name__ == '__main__':
    main()

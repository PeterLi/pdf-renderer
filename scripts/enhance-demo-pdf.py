#!/usr/bin/env python3
"""
Enhance sample.pdf with JavaScript actions and test page.
Takes sample.pdf → creates sample-enhanced.pdf

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
        print('  ✓ Added phone formatting (AFSpecial_Format)')
    else:
        print('  ⚠ Phone field not found')

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
    """Add page 7 with JavaScript function tests"""
    page = pdf.add_blank_page(page_size=(612, 792))
    
    # Field configurations: (name, label, width, y_pos, js_actions, description, example)
    fields_config = [
        ('zipcode_test', 'ZIP Code', 120, 660, 
         {'/F': 'AFSpecial_Format(0);', '/K': 'AFSpecial_Keystroke(0);'},
         'US ZIP code formatting - 5 digits only',
         'Type: 12345'),
        
        ('ssn_test', 'Social Security Number', 150, 600,
         {'/F': 'AFSpecial_Format(3);', '/K': 'AFSpecial_Keystroke(3);'},
         'SSN formatting with dashes (xxx-xx-xxxx)',
         'Type: 123456789 -> 123-45-6789'),
        
        ('date_mmddyy', 'Date (Short Format)', 130, 540,
         {'/F': 'AFDate_Format(2);', '/K': 'AFDate_Keystroke(2);'},
         'Date in mm/dd/yy format',
         'Type: 03/15/2024 -> 03/15/24'),
        
        ('date_iso', 'Date (ISO Format)', 140, 480,
         {'/F': 'AFDate_Format(8);', '/K': 'AFDate_Keystroke(8);'},
         'Date in ISO yyyy-mm-dd format',
         'Type: 03/15/2024 -> 2024-03-15'),
        
        ('time_test', 'Time (24-hour)', 100, 420,
         {'/F': 'AFTime_Format(0);', '/K': 'AFTime_Keystroke(0);'},
         'Time in 24-hour HH:MM format',
         'Type: 14:30'),
        
        ('percent_test', 'Percentage', 120, 360,
         {'/F': 'AFPercent_Format(2, 0);'},
         'Converts decimal to percentage (0.25 -> 25.00%)',
         'Type: 0.25 -> 25.00%'),
        
        ('age_test', 'Age', 80, 300,
         {'/V': 'AFRange_Validate(true, 1, true, 100);', '/K': 'AFNumber_Keystroke(0, 0, 0, 0, "", true);'},
         'Number validation: must be between 1 and 100',
         'Type: 150 -> Rejects!'),
        
        ('price_test', 'Price', 140, 240,
         {'/F': 'AFNumber_Format(2, 0, 0, 0, "$", true);', '/K': 'AFNumber_Keystroke(2, 0, 0, 0, "$", true);'},
         'Currency formatting with thousand separators',
         'Type: 1234.56 -> $1,234.56'),
    ]
    
    # Create fields
    fields = []
    for name, label, width, y_pos, actions, description, example in fields_config:
        field = create_text_field(pdf, page, name, 60, y_pos, width, 25, actions)
        fields.append(field)
    
    # Add fields to page and form
    if '/Annots' not in page:
        page['/Annots'] = []
    
    for field in fields:
        page['/Annots'].append(pdf.make_indirect(field))
        pdf.Root['/AcroForm']['/Fields'].append(pdf.make_indirect(field))
    
    # Create beautiful content stream with boxes and detailed info
    content = b"""
q
% Header background
0.15 0.23 0.37 rg
0 732 612 60 re f

% Header text
BT
/Helvetica-Bold 22 Tf
1 1 1 rg
60 760 Td
(JavaScript Function Tests) Tj
ET

BT
/Helvetica 11 Tf
0.9 0.9 0.9 rg
60 740 Td
(Enable Form Mode + JS: ON, then tab out of fields to see live formatting!) Tj
ET
Q

"""
    
    # Add field boxes and labels
    for name, label, width, y_pos, actions, description, example in fields_config:
        # Light background box for each field group
        content += f"""
q
0.97 0.98 0.99 rg
50 {y_pos - 10} 512 50 re f
0.85 0.88 0.92 RG
0.5 w
50 {y_pos - 10} 512 50 re S
Q

""".encode('latin-1')
        
        # Label (bold)
        content += f"""
BT
/Helvetica-Bold 11 Tf
0.1 0.1 0.2 rg
60 {y_pos + 30} Td
({label}) Tj
ET

""".encode('latin-1')
        
        # Description (smaller, gray)
        content += f"""
BT
/Helvetica 9 Tf
0.4 0.4 0.5 rg
60 {y_pos + 17} Td
({description}) Tj
ET

""".encode('latin-1')
        
        # Example (italic, blue-ish)
        content += f"""
BT
/Helvetica-Oblique 9 Tf
0.2 0.4 0.7 rg
220 {y_pos + 5} Td
({example}) Tj
ET

""".encode('latin-1')
        
        # Field border box (so you can see it even without form mode)
        content += f"""
q
0.3 0.5 0.8 RG
1 w
60 {y_pos} {width} 25 re S
Q

""".encode('latin-1')
    
    # Footer with function reference
    content += b"""
q
0.96 0.97 0.98 rg
0 0 612 120 re f

BT
/Helvetica-Bold 10 Tf
0.2 0.2 0.3 rg
60 95 Td
(Acrobat JavaScript Functions Tested:) Tj
ET

BT
/Helvetica 9 Tf
0.4 0.4 0.5 rg
60 80 Td
(AFSpecial_Format, AFSpecial_Keystroke - Phone, ZIP, SSN formatting) Tj
0 -12 Td
(AFDate_Format, AFDate_Keystroke - Date parsing and formatting) Tj
0 -12 Td
(AFTime_Format, AFTime_Keystroke - Time validation) Tj
0 -12 Td
(AFPercent_Format, AFNumber_Format - Percentage and currency formatting) Tj
0 -12 Td
(AFRange_Validate, AFNumber_Keystroke - Number validation and constraints) Tj
ET
Q
"""
    
    page.Contents = pdf.make_stream(content)
    print('  ✓ Added page 7 with JavaScript test fields')

def main():
    input_pdf = Path('public/sample.pdf')
    output_pdf = Path('public/sample-enhanced.pdf')
    
    if not input_pdf.exists():
        print(f'❌ Input PDF not found: {input_pdf}')
        print(f'   Run: node scripts/generate-demo-pdf.js first')
        sys.exit(1)
    
    print(f'📄 Enhancing {input_pdf}...')
    pdf = pikepdf.Pdf.open(input_pdf)
    
    print('\n🔧 Adding JavaScript actions:')
    add_phone_js_action(pdf)
    add_js_test_page(pdf)
    
    print(f'\n💾 Saving to {output_pdf}...')
    pdf.save(output_pdf)
    
    print('\n✅ Done! Enhanced PDF ready.')
    print(f'   Pages 1-6: Original demo (with phone JS)')
    print(f'   Page 7: JavaScript function tests')
    print(f'\n🧪 Test: Load in PDF renderer with JS: ON')

if __name__ == '__main__':
    main()

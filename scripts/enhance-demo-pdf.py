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
    
    # Field configurations
    fields_config = [
        ('zipcode_test', 'ZIP Code:', 150, {'/F': 'AFSpecial_Format(0);', '/K': 'AFSpecial_Keystroke(0);'}),
        ('ssn_test', 'SSN:', 150, {'/F': 'AFSpecial_Format(3);', '/K': 'AFSpecial_Keystroke(3);'}),
        ('date_mmddyy', 'Date (mm/dd/yy):', 150, {'/F': 'AFDate_Format(2);', '/K': 'AFDate_Keystroke(2);'}),
        ('date_iso', 'Date (yyyy-mm-dd):', 150, {'/F': 'AFDate_Format(8);', '/K': 'AFDate_Keystroke(8);'}),
        ('time_test', 'Time (HH:MM):', 100, {'/F': 'AFTime_Format(0);', '/K': 'AFTime_Keystroke(0);'}),
        ('percent_test', 'Percentage (0.25):', 150, {'/F': 'AFPercent_Format(2, 0);'}),
        ('age_test', 'Age (1-100):', 100, {'/V': 'AFRange_Validate(true, 1, true, 100);', '/K': 'AFNumber_Keystroke(0, 0, 0, 0, "", true);'}),
        ('price_test', 'Price (currency):', 150, {'/F': 'AFNumber_Format(2, 0, 0, 0, "$", true);', '/K': 'AFNumber_Keystroke(2, 0, 0, 0, "$", true);'}),
    ]
    
    # Descriptions
    field_info = [
        ('ZIP Code:', 'Try: 12345 -> Validates 5 digits only', 680),
        ('SSN:', 'Try: 123456789 -> Formats to 123-45-6789', 640),
        ('Date (mm/dd/yy):', 'Try: 03/15/2024 -> Formats to 03/15/24', 600),
        ('Date (yyyy-mm-dd):', 'Try: 03/15/2024 -> Formats to 2024-03-15', 560),
        ('Time (HH:MM):', 'Try: 14:30 -> Validates time format', 520),
        ('Percentage (0.25):', 'Try: 0.25 -> Formats to 25.00%', 480),
        ('Age (1-100):', 'Try: 150 -> Rejects! Must be 1-100', 440),
        ('Price (currency):', 'Try: 1234.56 -> Formats to $1,234.56', 400),
    ]
    
    # Create fields
    fields = []
    y_pos = 680
    for name, label, width, actions in fields_config:
        field = create_text_field(pdf, page, name, 60, y_pos, width, 25, actions)
        fields.append(field)
        y_pos -= 40
    
    # Add fields to page and form
    if '/Annots' not in page:
        page['/Annots'] = []
    
    for field in fields:
        page['/Annots'].append(pdf.make_indirect(field))
        pdf.Root['/AcroForm']['/Fields'].append(pdf.make_indirect(field))
    
    # Create content stream
    content = b"BT\n/Helvetica-Bold 18 Tf\n60 732 Td\n(JavaScript Function Tests) Tj\nET\n"
    content += b"BT\n/Helvetica 10 Tf\n60 715 Td\n(Enable JS: ON button, then tab out of fields to test) Tj\nET\n"
    content += b"BT\n/Helvetica-Bold 11 Tf\n"
    
    for label, description, y in field_info:
        content += f"60 {y+5} Td ({label}) Tj\n".encode('latin-1')
        content += b"/Helvetica-Oblique 9 Tf\n"
        content += f"280 0 Td ({description}) Tj\n".encode('latin-1')
        content += b"/Helvetica-Bold 11 Tf\n"
        content += b"-280 0 Td\n"
    
    content += b"ET\n"
    
    # Footer
    content += b"""
BT
/Helvetica-Oblique 9 Tf
/DeviceRGB cs
0.5 0.5 0.5 sc
60 100 Td
(Functions tested: AFSpecial_Format, AFDate_Format, AFTime_Format, AFPercent_Format,) Tj
0 -12 Td
(AFNumber_Format, AFRange_Validate, AFNumber_Keystroke, AFSpecial_Keystroke) Tj
ET
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

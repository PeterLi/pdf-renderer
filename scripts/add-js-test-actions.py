#!/usr/bin/env python3
"""
Add Acrobat JavaScript actions to the test form
Tests all the newly implemented functions!
"""
import pikepdf
from pathlib import Path

def find_field(pdf, name):
    """Find a field by name in the PDF"""
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

def add_format_action(field, js_code):
    """Add a Format action to a field"""
    if '/AA' not in field:
        field['/AA'] = pikepdf.Dictionary({})
    
    field['/AA']['/F'] = pikepdf.Dictionary({
        '/S': pikepdf.Name('/JavaScript'),
        '/JS': js_code
    })

def add_validate_action(field, js_code):
    """Add a Validate action to a field"""
    if '/AA' not in field:
        field['/AA'] = pikepdf.Dictionary({})
    
    field['/AA']['/V'] = pikepdf.Dictionary({
        '/S': pikepdf.Name('/JavaScript'),
        '/JS': js_code
    })

def add_keystroke_action(field, js_code):
    """Add a Keystroke action to a field"""
    if '/AA' not in field:
        field['/AA'] = pikepdf.Dictionary({})
    
    field['/AA']['/K'] = pikepdf.Dictionary({
        '/S': pikepdf.Name('/JavaScript'),
        '/JS': js_code
    })

def main():
    input_pdf = Path('public/js-test-form.pdf')
    output_pdf = Path('public/js-test-form-enhanced.pdf')
    
    print(f'📄 Opening {input_pdf}...')
    pdf = pikepdf.Pdf.open(input_pdf)
    
    actions_added = []
    
    # 1. Phone - AFSpecial_Format(2) + AFSpecial_Keystroke(2)
    phone = find_field(pdf, 'phone')
    if phone:
        add_format_action(phone, 'AFSpecial_Format(2);')
        add_keystroke_action(phone, 'AFSpecial_Keystroke(2);')
        actions_added.append('phone: AFSpecial_Format(2) + Keystroke')
    
    # 2. ZIP Code - AFSpecial_Format(0) + AFSpecial_Keystroke(0)
    zipcode = find_field(pdf, 'zipcode')
    if zipcode:
        add_format_action(zipcode, 'AFSpecial_Format(0);')
        add_keystroke_action(zipcode, 'AFSpecial_Keystroke(0);')
        actions_added.append('zipcode: AFSpecial_Format(0) + Keystroke')
    
    # 3. SSN - AFSpecial_Format(3) + AFSpecial_Keystroke(3)
    ssn = find_field(pdf, 'ssn')
    if ssn:
        add_format_action(ssn, 'AFSpecial_Format(3);')
        add_keystroke_action(ssn, 'AFSpecial_Keystroke(3);')
        actions_added.append('ssn: AFSpecial_Format(3) + Keystroke')
    
    # 4. Date (mm/dd/yy) - AFDate_Format(2)
    date1 = find_field(pdf, 'date1')
    if date1:
        add_format_action(date1, 'AFDate_Format(2);')
        add_keystroke_action(date1, 'AFDate_Keystroke(2);')
        actions_added.append('date1: AFDate_Format(2)')
    
    # 5. Date (yyyy-mm-dd) - AFDate_Format(8)
    date2 = find_field(pdf, 'date2')
    if date2:
        add_format_action(date2, 'AFDate_Format(8);')
        add_keystroke_action(date2, 'AFDate_Keystroke(8);')
        actions_added.append('date2: AFDate_Format(8)')
    
    # 6. Time (24-hour) - AFTime_Format(0)
    time1 = find_field(pdf, 'time1')
    if time1:
        add_format_action(time1, 'AFTime_Format(0);')
        add_keystroke_action(time1, 'AFTime_Keystroke(0);')
        actions_added.append('time1: AFTime_Format(0)')
    
    # 7. Percentage - AFPercent_Format(2, 0)
    percent = find_field(pdf, 'percent')
    if percent:
        add_format_action(percent, 'AFPercent_Format(2, 0);')
        actions_added.append('percent: AFPercent_Format(2, 0)')
    
    # 8. Age (1-100) - AFRange_Validate(true, 1, true, 100)
    age = find_field(pdf, 'age')
    if age:
        add_validate_action(age, 'AFRange_Validate(true, 1, true, 100);')
        add_keystroke_action(age, 'AFNumber_Keystroke(0, 0, 0, 0, "", true);')
        actions_added.append('age: AFRange_Validate(1-100) + Number Keystroke')
    
    # 9. Price - AFNumber_Format(2, 0, 0, 0, "$", true)
    price = find_field(pdf, 'price')
    if price:
        add_format_action(price, 'AFNumber_Format(2, 0, 0, 0, "$", true);')
        add_keystroke_action(price, 'AFNumber_Keystroke(2, 0, 0, 0, "$", true);')
        actions_added.append('price: AFNumber_Format (currency)')
    
    # Save
    print(f'💾 Saving enhanced PDF to {output_pdf}...')
    pdf.save(output_pdf)
    
    print('✅ Done! Added JavaScript actions:')
    for action in actions_added:
        print(f'  • {action}')
    
    print(f'\n🧪 Test with: allowFormJavaScript: true in PDFRenderer config')
    print(f'   Or enable "JS: ON" button in the UI')

if __name__ == '__main__':
    main()

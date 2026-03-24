# Task: Implement Advanced Selection Tool + Fix Text Tool

**Project:** PDF Renderer  
**Location:** ~/Documents/Projects/pdf-renderer/

---

## Issues to Fix

### 1. Selection Tool Not Working
**Current state:** Button exists but does nothing (line 175: `if (this.tool === 'select') return;`)

**Required features:**
- ✅ Click annotation to select it
- ✅ Show selection outline/handles
- ✅ Drag to move selected annotation
- ✅ Resize handles (for shapes/text boxes)
- ✅ Double-click text to edit
- ✅ Multi-select with Shift+click
- ✅ Delete key to remove selected
- ✅ Escape to deselect

### 2. Text Tool Not Working
**Current state:** Text tool button exists but clicking on PDF does nothing

**Required:**
- Click PDF to place text box
- Type text directly
- Enter to finish, Escape to cancel
- Text should be editable later via select tool

---

## Implementation Guide

### Selection State
Add to AnnotationLayer:
```javascript
this.selected = null;           // Selected annotation ID
this.selectedMulti = new Set(); // Multi-select IDs
this.dragOffset = null;         // Drag offset for moving
this.resizeHandle = null;       // Active resize handle
```

### Hit Testing
Need function to check if point is inside annotation:
```javascript
_hitTest(x, y) {
  // Check current page annotations
  // Return annotation ID if hit, null otherwise
  // Check in reverse order (top to bottom)
}
```

### Selection Rendering
Draw selection UI on top of annotations:
```javascript
_drawSelection() {
  if (!this.selected) return;
  
  // Get annotation bounds
  // Draw selection outline (dashed blue line)
  // Draw resize handles (small squares at corners/edges)
  // For text: show edit cursor
}
```

### Mouse Events for Select Tool
```javascript
_onPointerDown(e) {
  if (this.tool !== 'select') { /* existing code */ }
  
  // Hit test at pointer location
  const hit = this._hitTest(x, y);
  
  if (hit) {
    // Check if clicking resize handle
    const handle = this._checkResizeHandle(x, y);
    
    if (handle) {
      this.resizeHandle = handle;
      // Start resize
    } else if (e.shiftKey) {
      // Multi-select
      this.selectedMulti.add(hit);
    } else {
      // Single select and start drag
      this.selected = hit;
      this.dragOffset = { /* calculate offset */ };
    }
  } else {
    // Clicked empty space - deselect
    this.selected = null;
    this.selectedMulti.clear();
  }
}

_onPointerMove(e) {
  if (this.tool !== 'select') { /* existing code */ }
  
  if (this.selected && this.dragOffset) {
    // Move annotation
    // Update annotation data with new position
  } else if (this.resizeHandle) {
    // Resize annotation
  }
  
  // Update cursor style (move, resize, default)
}
```

### Keyboard Events
```javascript
// Add to existing keyboard handler
if (e.key === 'Delete' || e.key === 'Backspace') {
  if (this.selected) {
    this.store.delete(this.page, this.selected);
    this.selected = null;
  }
  for (const id of this.selectedMulti) {
    this.store.delete(this.page, id);
  }
  this.selectedMulti.clear();
}

if (e.key === 'Escape') {
  this.selected = null;
  this.selectedMulti.clear();
}
```

### Double-Click for Text Editing
```javascript
_onDblClick(e) {
  if (this.tool !== 'select') return;
  
  const hit = this._hitTest(x, y);
  if (hit) {
    const ann = this.store.pages.get(this.page).find(a => a.id === hit);
    if (ann.type === 'text') {
      // Show text input at annotation position
      // Pre-fill with current text
      // Update annotation on change
    }
  }
}
```

---

## Text Tool Fix

### Current Issue
The text tool probably calls `_createTextInput()` but the function might not work correctly.

### Check These:
1. Is `_createTextInput(x, y)` properly creating an input element?
2. Is the input positioned correctly?
3. Is the input visible (z-index, styling)?
4. Does it capture keyboard events?
5. Does it save to store when done?

### Debug Steps:
1. Add console.log in `_onPointerDown` when tool === 'text'
2. Check if `_createTextInput` is called
3. Check if input element is created in DOM
4. Fix positioning, visibility, event handling

---

## Testing Checklist

**Selection tool:**
- [ ] Click annotation selects it (blue outline)
- [ ] Drag moves annotation
- [ ] Resize handles work (for rectangles/circles)
- [ ] Shift+click multi-selects
- [ ] Delete key removes selected
- [ ] Escape deselects
- [ ] Double-click text opens editor

**Text tool:**
- [ ] Click creates text input
- [ ] Type text shows in input
- [ ] Enter saves text to annotation
- [ ] Escape cancels
- [ ] Text appears in correct position
- [ ] Text is selectable/editable later

---

## Files to Modify

**Primary:**
- `src/components/AnnotationLayer.js` - Most changes here

**Secondary:**
- `src/main.js` - Add keyboard handlers if needed
- `src/styles.css` - Selection outline, resize handles styling

---

## Success Criteria

✅ Selection tool fully functional  
✅ Can move annotations by dragging  
✅ Can resize shapes  
✅ Can edit text annotations  
✅ Multi-select works  
✅ Text tool creates working text boxes  
✅ All keyboard shortcuts work  

---

**Please implement these features with clean, production-quality code!** 🎨

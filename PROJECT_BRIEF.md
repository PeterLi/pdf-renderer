# PDF Renderer - Project Brief

## Project: Beautiful PDF Renderer with Annotations

**Location:** ~/Documents/Interact Technology/pdf-renderer/

### Core Requirements

**1. PDF Viewer Component (Acrobat-like)**
- Beautiful, modern UI with glassmorphism/professional styling
- Embeddable component (can be imported into other projects)
- Acrobat-style controls:
  - Zoom in/out buttons
  - Zoom percentage display
  - Fit to width / Fit to page
  - Page navigation (prev/next, jump to page X)
  - Page counter (Page X of Y)
  - Thumbnail sidebar (optional enhancement)

**2. Annotation System**
- Drawing tools (pen, highlighter, shapes)
- Text annotations
- Custom annotations with URL support (clickable links)
- Annotation layers (can toggle on/off)
- Export/import annotations (JSON format)
- Save annotations with PDF or separately

**3. Tech Stack**
Use similar dependencies to pdf-form-tool:
- **PDF.js** (Mozilla) - PDF rendering
- **pdf-lib** - PDF modification/export
- **Vite** - Build tool
- **Vanilla JS** or React (your choice for elegance)

**4. Test/Demo Mode**
- File picker to open local PDFs
- Demo PDF included for testing
- Beautiful landing page when no PDF loaded
- Instructions/help overlay

### UI/UX Goals

**Style:**
- Modern, professional design
- Clean toolbar (top or side)
- Smooth animations
- Responsive layout
- Accessible (keyboard shortcuts)

**Color scheme:**
- Professional (grays, blues)
- OR match pdf-form-tool aesthetic
- High contrast for readability

**Controls:**
- Intuitive icons (Material/Lucide style)
- Tooltips on hover
- Keyboard shortcuts (Ctrl+/-, PageUp/Down, etc.)

### Annotation Features (Priority Order)

**Must Have:**
1. Freehand drawing tool (pen)
2. Highlighter
3. Text boxes
4. Save/export annotations

**Nice to Have:**
5. Shapes (rectangle, circle, arrow)
6. Custom URL annotations (clickable areas)
7. Undo/Redo
8. Color picker
9. Eraser

### Deliverables

1. **Working viewer** - Open PDF, navigate, zoom
2. **Annotation tools** - Draw, highlight, annotate
3. **Export** - Save annotated PDF
4. **Documentation** - README with:
   - How to run/build
   - How to embed in other projects
   - API/props documentation
   - Annotation format spec

### Architecture

**Component structure:**
```
pdf-renderer/
├── src/
│   ├── components/
│   │   ├── PDFViewer.js      (main component)
│   │   ├── Toolbar.js         (zoom, nav controls)
│   │   ├── AnnotationTools.js (drawing tools)
│   │   └── AnnotationLayer.js (overlay canvas)
│   ├── utils/
│   │   ├── pdf.js             (PDF.js helpers)
│   │   ├── annotations.js     (save/load logic)
│   │   └── export.js          (PDF export)
│   └── main.js
├── public/
│   └── sample.pdf             (demo file)
├── index.html
├── package.json
└── README.md
```

### Design Inspiration

Think:
- Adobe Acrobat Reader (professional, clean)
- Figma (modern, tool-focused)
- Google Drive PDF viewer (simple, elegant)

**Goal:** Production-ready component that could be used in SAM or other projects.

### Implementation Notes

- Use canvas for rendering (PDF.js)
- Separate canvas layer for annotations
- Event handling for drawing
- State management for annotations
- Export annotations as PDF annotations or overlay

### Success Criteria

✅ Opens any PDF
✅ Smooth zoom and navigation
✅ Draw/annotate works perfectly
✅ Export preserves annotations
✅ Beautiful, professional UI
✅ Clean, documented code
✅ Ready to embed in other projects

**Please build this with maximum elegance and attention to detail!** 🎨

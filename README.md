# PDF Renderer with Annotations

**A beautiful, production-grade PDF viewer and annotation tool built with Vite + PDF.js + pdf-lib.**

**Status:** ✅ **Working!** All features functional, now with proper library architecture!

**Last Updated:** March 25, 2026, 2:26 AM AEDT

**Live Demo:** [https://pdf-renderer-seven.vercel.app](https://pdf-renderer-seven.vercel.app)

---

## 📦 Quick Start

### Try the Demo

Open `index.html` - it's a complete working example!

**Load PDFs via URL:**
```
http://localhost:5175/?pdfUrl=https://example.com/doc.pdf
```

### Use in Your Project

**Now with clean library architecture!**

1. Copy these files to your project:
   - `src/PDFRenderer.js` - **Reusable library class** (722 lines)
   - `src/main.js` - **Clean 44-line demo** showing how to use it
   - `src/utils/` - PDF utilities
   - `src/components/` - Annotation & form layers
   - `src/styles.css` - Styling
   - `public/pdf.worker.min.mjs` - PDF.js worker
   - `index.html` - Full working UI example

2. Customize the HTML structure or embed in your own page (see `examples/README.md`)

3. Initialize the viewer:
   ```javascript
   import PDFRenderer from './src/PDFRenderer.js';
   
   const viewer = new PDFRenderer({
     pdfUrl: 'document.pdf', // or null
     onLoad: ({ pages, filename }) => console.log('Loaded!'),
     onError: (error) => console.error('Error:', error)
   });
   ```

**Query parameter support built-in:**
- `?pdfUrl=document.pdf`
- `?pdf=https://example.com/doc.pdf`
- `?url=/path/to/file.pdf`

### Programmatic API

```javascript
// Load PDF
await viewer.loadPDF('document.pdf');
await viewer.loadPDF(fileObject);
await viewer.loadPDF(arrayBuffer);

// Navigation
viewer.nextPage();
viewer.prevPage();
viewer.goToPage(5);

// Zoom
viewer.zoomIn();
viewer.zoomOut();
viewer.fitToWidth();
viewer.fitToPage();

// Annotations
viewer.toggleAnnotations();
viewer.savePDF();
viewer.exportAnnotations();

// Forms
viewer.toggleFormMode();
viewer.exportFilledPDF();
```

---

## 🎨 Features

### PDF Viewing
- ✅ **Open PDFs** - File picker or drag & drop
- ✅ **Zoom controls** - Zoom in/out, fit to width/page, Ctrl+scroll
- ✅ **Page navigation** - Prev/next, jump to page
- ✅ **Thumbnail sidebar** - Quick page preview
- ✅ **Keyboard shortcuts** - Full keyboard support (press `?` for help)
- ✅ **Color accuracy** - sRGB color management matches Adobe Acrobat rendering

### Annotation Tools
- ✅ **Pen** - Freehand drawing
- ✅ **Highlighter** - Transparent highlighting
- ✅ **Text boxes** - Add text annotations (with proper focus handling!)
- ✅ **Shapes** - Rectangle, circle, arrow
- ✅ **Eraser** - Remove annotations
- ✅ **Color picker** - 7 presets + custom color
- ✅ **Stroke width** - Adjustable line thickness
- ✅ **Undo/Redo** - Full history

### Advanced Editing
- ✅ **Selection tool** - Click to select annotations
- ✅ **Move annotations** - Drag selected annotation to reposition
- ✅ **Resize handles** - 8 handles (corners + edges) for shapes
- ✅ **Multi-select** - Shift+click to select multiple
- ✅ **Edit text** - Double-click text annotations to edit
- ✅ **Delete** - Press Delete/Backspace to remove selected
- ✅ **Deselect** - Press Escape or click empty space

### Export Features
- ✅ **Save annotated PDF** - Embed annotations in PDF
- ✅ **Export annotations JSON** - Save annotation data separately
- ✅ **Import annotations JSON** - Load saved annotations
- ✅ **Correct positioning** - Annotations export at exact positions

### UI/UX
- ✅ **Modern design** - Glassmorphism toolbar, navy theme
- ✅ **Responsive** - Works on different screen sizes
- ✅ **Toast notifications** - User feedback
- ✅ **Help overlay** - Keyboard shortcuts guide
- ✅ **Beautiful landing page** - Demo PDF included

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+ and npm

### Installation

```bash
cd ~/Documents/Projects/pdf-renderer
npm install
```

### Development

```bash
# Start dev server (localhost only)
npm run dev

# Start dev server (LAN accessible)
npm run dev -- --host --port 5175
```

**URLs:**
- Local: http://localhost:5175/
- LAN: http://192.168.1.20:5175/
- Tailscale: http://100.67.137.89:5175/

### Production Build

```bash
npm run build    # Build to dist/
npm run preview  # Preview production build
```

---

## 📖 Usage

### Opening PDFs

**Option 1:** Click "Open File" button  
**Option 2:** Drag & drop PDF onto the page  
**Option 3:** Click "Load Demo" to try sample PDF

### Annotation Tools

**Select a tool:**
- Click toolbar buttons
- Keyboard shortcuts (see Help with `?`)

**Draw:**
- Click and drag on PDF
- Release to complete

**Adjust:**
- Color: Click color swatches or use custom picker
- Width: Use stroke width slider

**Undo/Redo:**
- Ctrl+Z / Cmd+Z (undo)
- Ctrl+Shift+Z / Cmd+Shift+Z (redo)

### Saving

**Save annotated PDF:**
1. Click "Save PDF" button
2. Annotations embedded in new PDF
3. Download as `annotated.pdf`

**Export/Import annotations:**
- Export JSON: Save annotation data separately
- Import JSON: Load saved annotations on current PDF

---

## ⌨️ Keyboard Shortcuts

Press `?` to show help overlay.

| Key | Action |
|-----|--------|
| **V** | Select tool |
| **P** | Pen tool |
| **H** | Highlighter |
| **T** | Text tool |
| **R** | Rectangle |
| **C** | Circle |
| **A** | Arrow |
| **E** | Eraser |
| **Delete/Backspace** | Delete selected annotation |
| **Escape** | Deselect all |
| **Shift + Click** | Add to selection (multi-select) |
| **Double-click** | Edit text annotation |
| **Ctrl/Cmd + Z** | Undo |
| **Ctrl/Cmd + Shift + Z** | Redo |
| **Ctrl/Cmd + +** | Zoom in |
| **Ctrl/Cmd + -** | Zoom out |
| **Ctrl/Cmd + 0** | Reset zoom |
| **←/→** | Previous/Next page |
| **Home** | First page |
| **End** | Last page |
| **?** | Show help |

---

## 🔌 Embedding Guide

### Installation in Your Project

**Option 1: Copy files**
```bash
# Copy the entire src/ folder to your project
cp -r src/ your-project/pdf-renderer/
```

**Option 2: Use as git submodule**
```bash
git submodule add https://github.com/PeterLi/pdf-renderer.git
```

### HTML Setup

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="pdf-renderer/src/styles.css">
</head>
<body>
  <!-- Include the viewer HTML -->
  <div id="pdf-app">
    <!-- Copy the structure from index.html -->
  </div>
  
  <script type="module">
    import PDFRenderer from './pdf-renderer/src/PDFRenderer.js';
    
    const viewer = new PDFRenderer({
      container: '#pdf-container',
      pdfUrl: 'document.pdf'
    });
  </script>
</body>
</html>
```

### Configuration Options

```javascript
new PDFRenderer({
  // Required
  container: '#pdf-container',     // CSS selector for container
  
  // Optional
  pdfUrl: null,                    // Auto-load PDF on init
  showOpenButton: true,            // Show file picker button
  showDemoButton: true,            // Show demo button
  
  // Callbacks
  onLoad: (info) => {
    // Called when PDF loads
    // info: { pages: number, filename: string }
  },
  onError: (error) => {
    // Called on errors
  }
});
```

### Query Parameter Support

**Load PDF from URL:**
```
https://your-site.com/?pdfUrl=https://example.com/doc.pdf
```

**Alternative parameter names:**
- `?pdfUrl=...`
- `?pdf=...`
- `?url=...`

**URL encoding:**
```javascript
const pdfUrl = 'https://example.com/my doc.pdf';
const encoded = encodeURIComponent(pdfUrl);
window.location.href = `/?pdfUrl=${encoded}`;
```

### Examples

**1. Simple embed:**
```javascript
const viewer = new PDFRenderer({
  container: '#viewer',
  pdfUrl: 'document.pdf'
});
```

**2. Load from remote URL:**
```javascript
const viewer = new PDFRenderer({
  container: '#viewer',
  pdfUrl: 'https://example.com/doc.pdf',
  onLoad: (info) => {
    console.log(`Loaded ${info.pages} pages`);
  }
});
```

**3. Programmatic control:**
```javascript
const viewer = new PDFRenderer({ container: '#viewer' });

// Load PDF later
document.querySelector('#load-btn').addEventListener('click', async () => {
  await viewer.loadPDF('document.pdf');
  viewer.goToPage(5);
  viewer.zoomIn();
});
```

**4. Handle file upload:**
```javascript
const viewer = new PDFRenderer({ container: '#viewer' });

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  await viewer.loadPDF(file);
});
```

**5. Load from ArrayBuffer:**
```javascript
const viewer = new PDFRenderer({ container: '#viewer' });

fetch('document.pdf')
  .then(res => res.arrayBuffer())
  .then(buffer => viewer.loadPDF(buffer));
```

---

## 🛠️ Technical Details

### Tech Stack

**Frontend:**
- **Vite** - Build tool and dev server
- **PDF.js v4.0.379** - PDF rendering (Mozilla)
- **pdf-lib** - PDF modification and export
- **Vanilla JavaScript** - No framework overhead

**Why PDF.js v4?**  
v4 is stable with Vite. v5 has bundling issues that cause runtime errors.

### Architecture

```
pdf-renderer/
├── index.html              # Main app shell
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
├── public/
│   ├── sample.pdf          # Demo PDF (3 pages)
│   └── pdf.worker.min.mjs  # PDF.js worker
├── scripts/
│   └── generate-demo-pdf.js
└── src/
    ├── main.js             # App controller
    ├── styles.css          # All styles
    ├── components/
    │   └── AnnotationLayer.js  # Drawing engine
    └── utils/
        ├── pdf.js          # PDF.js helpers
        ├── annotations.js  # Annotation data model
        ├── export.js       # PDF export logic
        └── toast.js        # Notifications
```

### Key Implementation Details

**Coordinate System:**
- Canvas coordinates = PDF coordinates × zoom scale
- When exporting: divide by scale to get PDF coordinates
- Y-axis inverted: PDF origin is bottom-left, canvas is top-left

**Annotation Storage:**
- Stored in `AnnotationStore` (Map of page → annotations)
- Each annotation has: id, page, type, color, width, data
- Undo/redo uses stack-based history

**PDF Export:**
- Loads original PDF with pdf-lib
- Converts annotations to pdf-lib drawing commands
- Scales coordinates back to PDF space
- Saves modified PDF with annotations embedded

---

## 🐛 Known Issues

No known issues! All features are working as expected.

**If you find a bug:**
1. Check browser console for errors
2. Test with `sample.pdf` to rule out PDF-specific issues
3. Verify you're using the latest version from GitHub

---

## 🔮 Future Enhancements

### High Priority
- [ ] **Copy/paste** - Duplicate annotations
- [ ] **Rotation** - Rotate annotations (especially text)
- [ ] **Grouping** - Group multiple annotations together

### Nice to Have
- [ ] **Signature capture** - Draw signature and save as reusable stamp
- [ ] **Annotation layers** - Multiple annotation sets (show/hide layers)
- [ ] **Collaboration** - Real-time annotations (WebSocket)
- [ ] **Cloud storage** - Save/load from cloud services
- [ ] **More shapes** - Triangle, star, polygon
- [ ] **Custom URL annotations** - Clickable areas that link to URLs
- [ ] **Search annotations** - Find annotations by text/color/type

---

## 🤝 Embedding in Other Projects

This component is designed to be embeddable!

### As a Standalone Component

**Option 1:** Copy entire project folder  
**Option 2:** Use as npm dependency (if published)

### Integration Example

```javascript
import { loadPDF, renderPage } from './src/utils/pdf.js';
import { AnnotationLayer } from './src/components/AnnotationLayer.js';
import { AnnotationStore } from './src/utils/annotations.js';

// Your app can use these components independently
const store = new AnnotationStore();
const layer = new AnnotationLayer(canvas, store, onChanged);
```

### API Reference

**PDF Loading:**
```javascript
const pdfDoc = await loadPDF(pdfBytes); // ArrayBuffer or Uint8Array
const { width, height } = await renderPage(pdfDoc, pageNum, canvas, scale);
```

**Annotations:**
```javascript
store.add(pageNum, annotation);        // Add annotation
store.delete(pageNum, annotationId);   // Remove annotation
store.pages.get(pageNum);              // Get page annotations
store.undo();                          // Undo last change
store.redo();                          // Redo
```

**Export:**
```javascript
const bytes = await exportAnnotatedPDF(pdfBytes, store, scale);
// Returns Uint8Array of modified PDF
```

---

## 📝 Development Notes

### Git Workflow

```bash
git status                          # Check status
git add -A                          # Stage all changes
git commit -m "Your message"        # Commit
git log --oneline -10               # View history
```

### Testing Checklist

- [ ] Open different PDF types (forms, scanned, multi-page)
- [ ] Test all annotation tools
- [ ] Zoom in/out and draw
- [ ] Save PDF and verify annotations
- [ ] Export/import JSON
- [ ] Keyboard shortcuts
- [ ] Undo/redo
- [ ] Drag & drop

### Performance Tips

- PDF.js worker runs in background (non-blocking)
- Annotations stored efficiently (not re-rendering entire PDF)
- Canvas drawing uses requestAnimationFrame
- Large PDFs: use thumbnail navigation

---

## 📄 License

Created by Claude Code (Anthropic) + Yoyo + Peter Li  
March 24, 2026

---

## 🙏 Acknowledgments

- **PDF.js** (Mozilla) - Excellent PDF rendering library
- **pdf-lib** - Pure JS PDF manipulation
- **Vite** - Lightning-fast build tool
- **Claude Code** - AI coding agent that built 90% of this in 15 minutes!

---

**Enjoy annotating! 🎨📄**

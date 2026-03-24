# PDF Renderer - Embedding Guide

**How to embed the PDF viewer in your own projects.**

---

## 🎯 Three Ways to Use It

### 1. Standalone Page (Easiest)

Copy the entire project structure:
```
your-project/
  index.html          ← Working demo
  src/
    PDFRenderer.js    ← Library
    main.js           ← Demo wrapper
    utils/            ← Utilities
    components/       ← UI components
    styles.css        ← Styles
  public/
    pdf.worker.min.mjs
    sample.pdf
```

Open `index.html` - it works immediately!

---

### 2. Embed in Your Existing Page

**Copy these files only:**
- `src/PDFRenderer.js` + `src/utils/` + `src/components/` + `src/styles.css`
- `public/pdf.worker.min.mjs`

**In your HTML:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My App with PDF Viewer</title>
  
  <!-- Your styles -->
  <link rel="stylesheet" href="your-styles.css">
  
  <!-- PDF Renderer styles -->
  <link rel="stylesheet" href="src/styles.css">
</head>
<body>
  <div id="my-app">
    <h1>My Application</h1>
    
    <!-- PDF Viewer Container -->
    <div id="pdf-container">
      <!-- Landing page -->
      <div id="landing">
        <h2>PDF Viewer</h2>
        <button id="btn-open-landing">Open PDF</button>
        <button id="btn-demo">Load Demo</button>
      </div>
      
      <!-- Main viewer (hidden initially) -->
      <div id="app" class="hidden">
        <!-- Toolbar -->
        <div id="toolbar">
          <button id="btn-sidebar" title="Toggle Sidebar">☰</button>
          <button id="btn-open" title="Open PDF">📁 Open</button>
          <span id="filename">No file</span>
          
          <!-- Navigation -->
          <button id="btn-prev" title="Previous Page">◀</button>
          <input id="page-input" type="number" min="1" value="1">
          <span id="page-count">/ 0</span>
          <button id="btn-next" title="Next Page">▶</button>
          
          <!-- Zoom controls -->
          <button id="btn-zoom-out" title="Zoom Out">−</button>
          <span id="zoom-level">100%</span>
          <button id="btn-zoom-in" title="Zoom In">+</button>
          <button id="btn-fit-width" title="Fit Width">↔️</button>
          <button id="btn-fit-page" title="Fit Page">⛶</button>
          
          <!-- Tools -->
          <button id="btn-annotations" title="Toggle Annotations">✏️</button>
          <button id="btn-help" title="Keyboard Shortcuts">?</button>
        </div>
        
        <!-- Annotation toolbar (hidden initially) -->
        <div id="annotation-bar" class="hidden">
          <!-- Tool buttons -->
          <button id="btn-tool-select" class="tool-btn" data-tool="select" title="Select">⬚</button>
          <button id="btn-tool-pen" class="tool-btn" data-tool="pen" title="Pen (P)">✏️</button>
          <button id="btn-tool-highlighter" class="tool-btn" data-tool="highlighter" title="Highlighter (H)">🖍️</button>
          <button id="btn-tool-text" class="tool-btn" data-tool="text" title="Text (T)">T</button>
          <button id="btn-tool-rectangle" class="tool-btn" data-tool="rectangle" title="Rectangle (R)">▭</button>
          <button id="btn-tool-circle" class="tool-btn" data-tool="circle" title="Circle (C)">○</button>
          <button id="btn-tool-arrow" class="tool-btn" data-tool="arrow" title="Arrow (A)">➜</button>
          <button id="btn-tool-eraser" class="tool-btn" data-tool="eraser" title="Eraser (E)">🗑️</button>
          
          <!-- Color palette -->
          <div id="color-palette">
            <button class="color-btn" data-color="#000000" style="background: #000000"></button>
            <button class="color-btn" data-color="#ff0000" style="background: #ff0000"></button>
            <button class="color-btn active" data-color="#ffff00" style="background: #ffff00"></button>
            <button class="color-btn" data-color="#00ff00" style="background: #00ff00"></button>
            <button class="color-btn" data-color="#0000ff" style="background: #0000ff"></button>
            <button class="color-btn" data-color="#ff00ff" style="background: #ff00ff"></button>
            <button class="color-btn" data-color="#00ffff" style="background: #00ffff"></button>
            <input type="color" id="custom-color" value="#ffff00" title="Custom Color">
          </div>
          
          <!-- Stroke width -->
          <label>Width: <input id="stroke-width" type="range" min="1" max="20" value="3"> <span id="stroke-value">3</span></label>
          
          <!-- Actions -->
          <button id="btn-undo" title="Undo (Ctrl+Z)">↶</button>
          <button id="btn-redo" title="Redo (Ctrl+Shift+Z)">↷</button>
          <button id="btn-toggle-layer" title="Toggle Annotations">👁️</button>
          <button id="btn-clear" title="Clear All">🗑️ Clear</button>
          <button id="btn-export-json" title="Export Annotations">💾 JSON</button>
          <button id="btn-import-json" title="Import Annotations">📥 JSON</button>
          <button id="btn-save-pdf" title="Save PDF with Annotations">💾 PDF</button>
        </div>
        
        <!-- Form toolbar (hidden initially) -->
        <div id="form-bar" class="hidden">
          <span>📝 Form Mode: <span id="form-field-count">0</span> fields</span>
          <button id="btn-clear-form">Clear</button>
          <button id="btn-export-filled">💾 Export Filled PDF</button>
        </div>
        
        <!-- Layout -->
        <div class="layout">
          <!-- Sidebar -->
          <aside id="sidebar" class="hidden">
            <button id="btn-close-sidebar">✕</button>
            <h3>Pages</h3>
            <div id="thumbnail-list"></div>
          </aside>
          
          <!-- Main viewport -->
          <main id="viewport">
            <div id="page-wrapper">
              <canvas id="pdf-canvas"></canvas>
              <canvas id="annotation-canvas"></canvas>
            </div>
          </main>
        </div>
      </div>
      
      <!-- Help overlay -->
      <div id="help-overlay" class="hidden">
        <div class="overlay-content">
          <button id="btn-close-help">✕</button>
          <h2>Keyboard Shortcuts</h2>
          <!-- ... shortcuts table (see index.html for full list) ... -->
        </div>
      </div>
      
      <!-- Hidden file inputs -->
      <input type="file" id="file-input" accept=".pdf" style="display: none;">
      <input type="file" id="json-input" accept=".json" style="display: none;">
    </div>
  </div>

  <!-- Initialize PDF Renderer -->
  <script type="module">
    import PDFRenderer from './src/PDFRenderer.js';
    
    // Wait for DOM if needed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
    
    function init() {
      const params = new URLSearchParams(window.location.search);
      const pdfUrl = params.get('pdfUrl') || params.get('pdf') || params.get('url');
      
      const viewer = new PDFRenderer({
        pdfUrl: pdfUrl || null,
        onLoad: ({ pages, filename }) => {
          console.log(`Loaded: ${filename} (${pages} pages)`);
        },
        onError: (error) => {
          console.error('PDF Error:', error);
        }
      });
      
      window.pdfViewer = viewer;
    }
  </script>
</body>
</html>
```

**Key Requirements:**
- All element IDs must match what PDFRenderer expects (see `src/PDFRenderer.js` → `_cacheElements()`)
- Include both canvases: `#pdf-canvas` and `#annotation-canvas`
- Include hidden file inputs: `#file-input` and `#json-input`

---

### 3. Minimal Embed (Just the Viewer, No UI)

If you want to build your own UI and just use the rendering engine:

**Not recommended** - the PDFRenderer class expects specific HTML structure. Better to copy the full structure and hide/remove elements you don't need.

**Example: Hide toolbar**
```css
#toolbar { display: none; }
#annotation-bar { display: none; }
```

**Example: Remove sidebar**
```javascript
// After creating viewer:
viewer.els.sidebar.remove();
```

---

## 🔧 Configuration Options

```javascript
const viewer = new PDFRenderer({
  pdfUrl: 'document.pdf',  // URL/path to PDF, or null
  
  // Callbacks
  onLoad: ({ pages, filename }) => {
    console.log('PDF loaded!');
  },
  onError: (error) => {
    console.error('Failed:', error);
  }
});
```

---

## 📝 Programmatic API

Once initialized, control the viewer programmatically:

```javascript
// Load a PDF
await viewer.loadPDF('document.pdf');
await viewer.loadPDF('https://example.com/doc.pdf');

// Navigation
await viewer.goToPage(5);
await viewer.nextPage();
await viewer.prevPage();

// Zoom
viewer.zoomIn();
viewer.zoomOut();
viewer.fitToWidth();
viewer.fitToPage();

// Annotations
viewer.savePDF();                // Download with annotations baked in
viewer.exportAnnotationsJSON();   // Export just annotations
viewer.loadAnnotationsJSON();     // Import annotations

// Form filling (if PDF has forms)
viewer.exportFilledPDF();         // Download filled form
```

---

## 🎨 Customization

### Change Colors/Theme

Edit `src/styles.css`:

```css
:root {
  --primary: #263b5e;          /* Main color */
  --primary-hover: #3a4f73;    /* Hover state */
  --accent: #4a90e2;           /* Accent/active */
  --bg: #1a1a1a;               /* Background */
  --surface: #2a2a2a;          /* Cards/panels */
  --text: #e0e0e0;             /* Text */
  /* ... more colors ... */
}
```

### Modify Layout

The viewer expects a specific structure, but you can:
- Reorder toolbar buttons
- Hide elements with CSS
- Add your own controls alongside the viewer

**Example: Custom button**
```html
<button id="my-custom-btn">My Action</button>

<script type="module">
  // After creating viewer:
  document.getElementById('my-custom-btn').addEventListener('click', () => {
    viewer.zoomIn();
    alert('Zoomed!');
  });
</script>
```

---

## 🐛 Troubleshooting

### "Nothing happens when I click buttons"

**Cause:** PDFRenderer initialized before DOM was ready.

**Fix:**
```javascript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

### "Cannot find element #btn-open"

**Cause:** Missing required HTML elements.

**Fix:** Check `src/PDFRenderer.js` → `_cacheElements()` for the full list of required IDs. Copy the structure from `index.html`.

### "Module not found: PDFRenderer"

**Cause:** Wrong import path.

**Fix:** Use relative path from your HTML location to `src/PDFRenderer.js`:
```javascript
import PDFRenderer from './src/PDFRenderer.js';  // Same directory
import PDFRenderer from '../src/PDFRenderer.js'; // Parent directory
```

---

## 📦 What You Need

**Minimum files:**
```
your-project/
  src/
    PDFRenderer.js       ← Core library (722 lines)
    utils/
      pdf.js             ← PDF.js wrapper
      annotations.js     ← Annotation storage
      export.js          ← PDF export
      forms.js           ← Form handling
      toast.js           ← Notifications
    components/
      AnnotationLayer.js ← Canvas drawing
      FormLayer.js       ← Form overlays
    styles.css           ← All styles
  public/
    pdf.worker.min.mjs   ← PDF.js worker (required!)
```

**Optional:**
- `public/sample.pdf` - Demo PDF
- `index.html` - Full working example

---

## 🚀 Best Practices

1. **Always include the worker:** `public/pdf.worker.min.mjs` is required for PDF.js to work
2. **Use type="module":** PDFRenderer uses ES modules
3. **Wait for DOM:** Wrap initialization in readyState check
4. **Check element IDs:** PDFRenderer expects specific IDs - don't rename without updating the code
5. **Test with sample.pdf first:** Make sure basic functionality works before loading your own PDFs

---

## 💡 Need More Help?

- **See:** `index.html` for a complete working example
- **Check:** `src/PDFRenderer.js` → `_cacheElements()` for required element IDs
- **Read:** `src/main.js` for clean initialization example (44 lines)

The code is designed to be copied and customized. Start with `index.html` and modify from there!

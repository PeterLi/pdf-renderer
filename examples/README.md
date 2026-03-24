# PDF Renderer - Usage Examples

## 📖 How to Use

**The `index.html` in the project root is your reference implementation!**

It shows exactly how to embed the PDF Renderer in your project.

---

## Quick Start

### 1. Copy the Library Files

Copy these to your project:
```
src/PDFRenderer.js          ← Main library
src/utils/                  ← Helper utilities
src/components/             ← UI components
src/styles.css              ← Styling
public/pdf.worker.min.mjs   ← PDF.js worker
```

### 2. Include in Your HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My PDF Viewer</title>
  <link rel="stylesheet" href="src/styles.css">
</head>
<body>
  <!-- Your complete PDF viewer UI goes here -->
  <!-- See index.html for the full structure -->
  
  <div id="app">
    <div id="toolbar">
      <button id="btn-open">Open PDF</button>
      <!-- ... more toolbar buttons ... -->
    </div>
    
    <div id="pdf-container">
      <div id="viewport">
        <canvas id="pdf-canvas"></canvas>
        <canvas id="annotation-canvas"></canvas>
      </div>
    </div>
  </div>

  <script type="module" src="main.js"></script>
</body>
</html>
```

### 3. Initialize in JavaScript

```javascript
import PDFRenderer from './PDFRenderer.js';

document.addEventListener('DOMContentLoaded', () => {
  const viewer = new PDFRenderer({
    container: '#app',
    pdfUrl: null,              // Auto-load a PDF, or null
    showOpenButton: true,
    showDemoButton: true,
    
    onLoad: (info) => {
      console.log('Loaded:', info.filename, info.pages);
    },
    
    onError: (error) => {
      console.error('Error:', error);
    }
  });
  
  // Optional: Expose for debugging
  window.pdfViewer = viewer;
});
```

---

## Load PDFs via URL Parameter

Support query parameters in your viewer:

```javascript
const params = new URLSearchParams(window.location.search);
const pdfUrl = params.get('pdfUrl') || params.get('pdf') || params.get('url');

const viewer = new PDFRenderer({
  container: '#app',
  pdfUrl: pdfUrl,  // Auto-load from query param
  // ... other options
});
```

**Then use:**
```
https://yoursite.com/?pdfUrl=https://example.com/doc.pdf
https://yoursite.com/?pdf=document.pdf
```

---

## Programmatic API

```javascript
// Load a PDF
await viewer.loadPDF('document.pdf');

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
viewer.savePDF();              // Download with annotations
viewer.exportAnnotationsJSON(); // Export just annotations
viewer.loadAnnotationsJSON();   // Import annotations

// Form filling (if PDF has form fields)
viewer.exportFilledPDF();       // Download filled form
```

---

## Customization

### Colors & Theme

Edit `src/styles.css` to change the look:
```css
:root {
  --primary: #263b5e;
  --primary-hover: #3a4f73;
  --accent: #4a90e2;
  /* ... customize colors ... */
}
```

### Layout

The HTML structure must include these IDs (see `index.html`):
- `#btn-open`, `#btn-prev`, `#btn-next` - Navigation
- `#pdf-canvas`, `#annotation-canvas` - Display
- `#toolbar`, `#annotation-bar` - Controls
- See full list in `PDFRenderer.js` → `_cacheElements()`

---

## Need Help?

**Look at `index.html`** - it's a complete working example showing:
- Full HTML structure with all required IDs
- Proper initialization with query param support
- Clean minimal wrapper code

Copy that pattern and customize it for your needs!

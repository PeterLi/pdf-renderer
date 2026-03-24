# PDF Renderer - Embedding Examples

This folder contains examples of how to embed the PDF Renderer library in your projects.

---

## Examples

### 1. `embed-simple.html`

**Full-featured embedding example with custom controls.**

- Shows complete HTML structure
- Demonstrates programmatic API
- Custom control buttons
- Load PDFs from URLs
- Query parameter support

**Try it:**
```bash
# From project root
open examples/embed-simple.html

# Or with a PDF URL
open "examples/embed-simple.html?pdfUrl=https://example.com/doc.pdf"
```

**Key features:**
- Load remote PDFs
- Custom navigation buttons
- URL input field
- Event callbacks

---

## Quick Start

### Minimal Example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="../src/styles.css">
</head>
<body>
  <!-- Copy the entire #pdf-app div from index.html -->
  <div id="pdf-app">
    <!-- ... full structure ... -->
  </div>
  
  <script type="module">
    import PDFRenderer from '../src/PDFRenderer.js';
    
    const viewer = new PDFRenderer({
      container: '#pdf-container',
      pdfUrl: 'document.pdf'
    });
  </script>
</body>
</html>
```

---

## Configuration

```javascript
const viewer = new PDFRenderer({
  // Required
  container: '#pdf-container',
  
  // Optional
  pdfUrl: 'document.pdf',        // Auto-load on init
  showOpenButton: true,           // Show file picker
  showDemoButton: true,           // Show demo button
  
  // Callbacks
  onLoad: (info) => {
    console.log(`Loaded ${info.pages} pages`);
  },
  onError: (error) => {
    console.error('Error:', error);
  }
});
```

---

## Query Parameters

Load PDFs from URL:
```
?pdfUrl=https://example.com/doc.pdf
?pdf=./local-file.pdf
?url=data:application/pdf;base64,...
```

---

## Programmatic API

```javascript
// Load PDF
await viewer.loadPDF('doc.pdf');
await viewer.loadPDF(fileObject);
await viewer.loadPDF(arrayBuffer);
await viewer.loadPDF('https://example.com/doc.pdf');

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
viewer.undo();
viewer.redo();
viewer.clearAnnotations();
viewer.exportAnnotations();
viewer.savePDF();

// Forms
viewer.toggleFormMode();
viewer.clearForm();
viewer.exportFilledPDF();

// UI
viewer.toggleSidebar();
viewer.showHelp();
```

---

## Integration Tips

### React
```jsx
import { useEffect, useRef } from 'react';
import PDFRenderer from './PDFRenderer.js';

function PDFViewer({ pdfUrl }) {
  const viewerRef = useRef(null);
  
  useEffect(() => {
    const viewer = new PDFRenderer({
      container: '#pdf-container',
      pdfUrl
    });
    viewerRef.current = viewer;
    
    return () => {
      // Cleanup if needed
    };
  }, [pdfUrl]);
  
  return <div id="pdf-app">...</div>;
}
```

### Vue
```vue
<template>
  <div id="pdf-app">...</div>
</template>

<script>
import PDFRenderer from './PDFRenderer.js';

export default {
  mounted() {
    this.viewer = new PDFRenderer({
      container: '#pdf-container',
      pdfUrl: this.pdfUrl
    });
  },
  beforeUnmount() {
    // Cleanup if needed
  }
}
</script>
```

### Vanilla JS
```javascript
document.addEventListener('DOMContentLoaded', () => {
  const viewer = new PDFRenderer({
    container: '#pdf-container',
    pdfUrl: 'document.pdf'
  });
  
  // Expose to global scope if needed
  window.pdfViewer = viewer;
});
```

---

## Common Use Cases

### 1. Invoice Viewer
```javascript
const viewer = new PDFRenderer({
  container: '#invoice-viewer',
  pdfUrl: `/api/invoices/${invoiceId}/pdf`,
  showOpenButton: false,  // Hide open button
  showDemoButton: false,  // Hide demo button
  onLoad: () => {
    viewer.fitToWidth();  // Auto-fit
  }
});
```

### 2. Document Editor
```javascript
const viewer = new PDFRenderer({
  container: '#editor',
  onLoad: (info) => {
    viewer.toggleAnnotations();  // Open annotation toolbar
    document.getElementById('page-count').textContent = info.pages;
  }
});

// Auto-save annotations
setInterval(() => {
  const json = viewer.store.toJSON();
  localStorage.setItem('annotations', json);
}, 30000);
```

### 3. Form Filler
```javascript
const viewer = new PDFRenderer({
  container: '#form-viewer',
  pdfUrl: 'application-form.pdf',
  onLoad: async () => {
    // Check if it has forms
    if (viewer.hasForm) {
      await viewer.toggleFormMode();
    }
  }
});
```

---

## Troubleshooting

**PDF not loading?**
- Check CORS if loading from remote URL
- Ensure PDF is valid
- Check browser console for errors

**Annotations not saving?**
- Annotations are client-side only
- Use `exportAnnotations()` or `savePDF()` to persist

**Forms not showing?**
- Not all PDFs have form fields
- Check `viewer.hasForm` after loading

**Styling issues?**
- Make sure `styles.css` is loaded
- Check z-index conflicts
- Verify container has proper dimensions

---

## Need Help?

- 📖 [Main README](../README.md)
- 📝 [CHANGELOG](../CHANGELOG.md)
- 🐛 [Report Issues](https://github.com/PeterLi/pdf-renderer/issues)
- ⭐ [Star on GitHub](https://github.com/PeterLi/pdf-renderer)

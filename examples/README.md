# PDF Renderer - Usage Guide

## 📖 How to Use This in Your Project

**The simplest approach: Copy the working code!**

`index.html` + `src/main.js` contain everything you need - fully working PDF viewer with annotations, forms, and query parameter support.

---

## Quick Start

### 1. Copy These Files

```
index.html                   ← Complete UI structure
src/main.js                  ← All viewer logic
src/utils/                   ← PDF utilities
  ├── pdf.js                 ← PDF.js wrapper
  ├── annotations.js         ← Annotation storage
  ├── export.js              ← PDF export with annotations
  ├── forms.js               ← Form field detection/filling
  └── toast.js               ← Notifications
src/components/              ← UI components
  ├── AnnotationLayer.js     ← Canvas annotation drawing
  └── FormLayer.js           ← Form field overlays
src/styles.css               ← All styling
public/pdf.worker.min.mjs    ← PDF.js worker (required!)
public/sample.pdf            ← Demo PDF (optional)
```

### 2. That's It!

Open `index.html` in a browser and it works. No build step needed (though Vite dev server is recommended for development).

---

## Features Included

✅ **PDF Viewing**
- Open files, drag & drop
- Zoom in/out, fit to width/page
- Page navigation with thumbnails
- Query parameter loading (`?pdfUrl=...`)

✅ **Annotations**
- Pen, highlighter, shapes, text, arrow
- Color picker with presets
- Adjustable stroke width
- Undo/redo
- Export to PDF with annotations baked in
- Export/import JSON annotations

✅ **Form Filling**
- Auto-detect form fields
- Fill text fields, checkboxes, radio buttons
- Export filled PDF

✅ **Keyboard Shortcuts**
- Press `?` for help overlay
- Arrow keys for navigation
- Ctrl+Z/Shift+Z for undo/redo
- Tool hotkeys (P, H, E, R, C, A, T)

---

## Customization

### Change Colors/Theme

Edit `src/styles.css`:

```css
:root {
  --primary: #263b5e;
  --primary-hover: #3a4f73;
  --accent: #4a90e2;
  --bg: #1a1a1a;
  --surface: #2a2a2a;
  --text: #e0e0e0;
  /* ... customize all colors ... */
}
```

### Modify UI

Edit `index.html`:
- Rearrange toolbar buttons
- Add/remove controls
- Change layout

### Add Custom Logic

Edit `src/main.js`:
- Hook into PDF load events
- Add custom annotation types
- Integrate with your app's state management

---

## Query Parameters

Built-in support for loading PDFs from URLs:

```
https://yoursite.com/?pdfUrl=https://example.com/doc.pdf
https://yoursite.com/?pdf=document.pdf
https://yoursite.com/?url=/path/to/file.pdf
```

The code automatically checks for these params and loads the PDF on startup.

---

## Development

**With Vite (recommended):**
```bash
npm install
npm run dev -- --host --port 5175
```

**Or just open `index.html`** in a browser - it works as a standalone SPA.

---

## Production Deployment

**Option 1: Static hosting**
```bash
npm run build     # Builds to dist/
# Upload dist/ to any static host (Netlify, Vercel, S3, etc.)
```

**Option 2: Direct copy**
Just copy all the files to your server. No build needed!

---

## Why This Approach?

**We tried making a "library" version** with a clean PDFRenderer class, but it kept breaking because:
- The HTML structure is tightly coupled to the code
- Element IDs are hardcoded throughout
- Refactoring to support arbitrary containers added complexity

**Current approach is better:**
- ✅ Everything works out of the box
- ✅ Easy to customize by editing the code directly
- ✅ No mystery abstractions
- ✅ Query parameter support built-in

If you want to embed it, just **copy the whole thing** and customize as needed!

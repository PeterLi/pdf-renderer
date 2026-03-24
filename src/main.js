/**
 * PDF Renderer — Demo Application
 * Uses the PDFRenderer library to create a full-featured PDF viewer.
 * Peter Li
 */
console.log('[main.js] Script loaded');
import PDFRenderer from './PDFRenderer.js';
console.log('[main.js] PDFRenderer imported:', typeof PDFRenderer);

// Initialize viewer (runs immediately since DOM is ready for type="module" scripts)
function init() {
  console.log('[main.js] Initializing viewer...');
  
  // Check for PDF URL in query parameters
  const params = new URLSearchParams(window.location.search);
  const pdfUrl = params.get('pdfUrl') || params.get('pdf') || params.get('url');

  if (pdfUrl) {
    console.log('[main.js] Loading PDF from query parameter:', pdfUrl);
  } else {
    console.log('[main.js] No query parameter PDF URL found');
  }

  // Initialize the viewer
  console.log('[main.js] Creating PDFRenderer instance...');
  const viewer = new PDFRenderer({
    pdfUrl: pdfUrl || null,
    onLoad: ({ pages, filename }) => {
      console.log(`[main.js] onLoad callback: "${filename}" — ${pages} pages`);
    },
    onError: (error) => {
      console.error('[main.js] onError callback:', error);
    },
  });
  console.log('[main.js] PDFRenderer instance created');

  // Expose for debugging
  window.pdfRenderer = viewer;
  console.log('[main.js] Viewer exposed as window.pdfRenderer');
}

// Type="module" scripts are deferred by default, so DOM is already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

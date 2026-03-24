/**
 * PDF Renderer — Demo Application
 * Shows how to embed the PDF Renderer library
 * By Peter Li
 */
import PDFRenderer from './PDFRenderer.js';

// ============================================================
// Parse Query Parameters
// ============================================================

/**
 * Get PDF URL from query string
 * Supports: ?pdfUrl=https://example.com/doc.pdf
 */
function getPDFFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get('pdfUrl') || params.get('pdf') || params.get('url');
}

// ============================================================
// Initialize PDF Renderer
// ============================================================

// Create viewer instance
const viewer = new PDFRenderer({
  container: '#pdf-container',
  pdfUrl: getPDFFromQuery(), // Load from query param if present
  showOpenButton: true,
  showDemoButton: true,
  
  // Callbacks (optional)
  onLoad: (info) => {
    console.log('PDF loaded:', info);
  },
  
  onError: (error) => {
    console.error('PDF error:', error);
  }
});

// Expose viewer to window for debugging/external access
window.pdfViewer = viewer;

// ============================================================
// Example: Programmatic API Usage
// ============================================================

// You can control the viewer from anywhere:
// window.pdfViewer.loadPDF('document.pdf')
// window.pdfViewer.goToPage(5)
// window.pdfViewer.zoomIn()
// window.pdfViewer.savePDF()

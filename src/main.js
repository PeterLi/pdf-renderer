/**
 * PDF Renderer Demo
 * Shows how to use the PDFRenderer library
 * By Peter Li
 */
import PDFRenderer from './PDFRenderer.js';

// ============================================================
// Initialize
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Parse query parameters
  const params = new URLSearchParams(window.location.search);
  const pdfUrl = params.get('pdfUrl') || params.get('pdf') || params.get('url');

  // Create PDF viewer instance
  const viewer = new PDFRenderer({
    container: '#app',
    pdfUrl: pdfUrl, // Auto-load if URL param provided
    showOpenButton: true,
    showDemoButton: true,
    
    // Optional callbacks
    onLoad: (info) => {
      console.log('✅ PDF loaded:', info);
    },
    
    onError: (error) => {
      console.error('❌ Error:', error);
    }
  });

  // Expose to window for debugging
  window.pdfViewer = viewer;
  
  console.log('📄 PDF Viewer ready!');
  console.log('Try: window.pdfViewer.loadPDF("sample.pdf")');
});

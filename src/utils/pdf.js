/**
 * PDF.js helpers — loading, rendering, thumbnails.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use public folder copy (most reliable with Vite)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/**
 * Load a PDF document from a URL or ArrayBuffer.
 * @param {string|ArrayBuffer|Uint8Array} source
 * @returns {Promise<import('pdfjs-dist').PDFDocumentProxy>}
 */
export async function loadPDF(source) {
  const params = typeof source === 'string' ? { url: source } : { data: source };
  return pdfjsLib.getDocument(params).promise;
}

/**
 * Render a single page to a canvas.
 * @param {import('pdfjs-dist').PDFDocumentProxy} doc
 * @param {number} pageNum  1-based
 * @param {HTMLCanvasElement} canvas
 * @param {number} scale
 * @returns {Promise<{width: number, height: number}>}  CSS dimensions
 */
export async function renderPage(doc, pageNum, canvas, scale = 1) {
  const page = await doc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d', {
    // Enable color management for better color accuracy
    colorSpace: 'srgb',
    alpha: true
  });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Render with proper color intent and options
  await page.render({ 
    canvasContext: ctx, 
    viewport,
    // Use 'display' intent for screen viewing (better color accuracy)
    intent: 'display',
    // Enable annotations rendering
    annotationMode: pdfjsLib.AnnotationMode.ENABLE,
    // Render interactive forms if present
    renderInteractiveForms: true,
  }).promise;
  
  return { width: viewport.width, height: viewport.height };
}

/**
 * Render a thumbnail for the given page.
 * @param {import('pdfjs-dist').PDFDocumentProxy} doc
 * @param {number} pageNum
 * @param {number} maxWidth  max CSS width in px
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderThumbnail(doc, pageNum, maxWidth = 150) {
  const page = await doc.getPage(pageNum);
  const unscaledViewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d', {
    colorSpace: 'srgb',
    alpha: true
  });
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  
  await page.render({ 
    canvasContext: ctx, 
    viewport,
    intent: 'display',
    annotationMode: pdfjsLib.AnnotationMode.ENABLE,
  }).promise;
  
  return canvas;
}

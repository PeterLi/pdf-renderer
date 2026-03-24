/**
 * PDF.js helpers — loading, rendering, thumbnails.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use CDN for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

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

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  await page.render({ canvasContext: ctx, viewport }).promise;
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

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

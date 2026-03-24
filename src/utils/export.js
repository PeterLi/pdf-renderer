/**
 * Export annotations into a PDF using pdf-lib.
 */
import { PDFDocument, rgb } from 'pdf-lib';

/**
 * Embed annotations into the current PDF and return the modified bytes.
 * @param {ArrayBuffer|Uint8Array} originalPdfBytes
 * @param {import('./annotations').AnnotationStore} store
 * @returns {Promise<Uint8Array>}
 */
export async function exportAnnotatedPDF(originalPdfBytes, store, canvasScale = 1) {
  console.log('[export] Received bytes type:', originalPdfBytes?.constructor.name);
  console.log('[export] Bytes length:', originalPdfBytes?.length || originalPdfBytes?.byteLength);
  console.log('[export] Canvas scale:', canvasScale);
  
  if (!originalPdfBytes || (originalPdfBytes.length === 0 && originalPdfBytes.byteLength === 0)) {
    throw new Error('No PDF bytes provided');
  }
  
  const doc = await PDFDocument.load(originalPdfBytes);
  const pages = doc.getPages();

  for (const [pageNum, annotations] of store.pages) {
    if (!annotations.length) continue;
    const pageIdx = pageNum - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const page = pages[pageIdx];
    const { width: pdfWidth, height: pdfHeight } = page.getSize();
    
    console.log(`[export] Page ${pageNum}: PDF size ${pdfWidth}x${pdfHeight}, scale ${canvasScale}`);

    for (const ann of annotations) {
      const color = hexToRgb(ann.color);

      switch (ann.type) {
        case 'pen': {
          const points = ann.data.points;
          if (points.length < 2) break;
          for (let i = 1; i < points.length; i++) {
            page.drawLine({
              start: { x: points[i - 1].x / canvasScale, y: pdfHeight - points[i - 1].y / canvasScale },
              end: { x: points[i].x / canvasScale, y: pdfHeight - points[i].y / canvasScale },
              thickness: ann.width / canvasScale,
              color,
              opacity: 1,
            });
          }
          break;
        }

        case 'highlighter': {
          const points = ann.data.points;
          if (points.length < 2) break;
          for (let i = 1; i < points.length; i++) {
            page.drawLine({
              start: { x: points[i - 1].x / canvasScale, y: pdfHeight - points[i - 1].y / canvasScale },
              end: { x: points[i].x / canvasScale, y: pdfHeight - points[i].y / canvasScale },
              thickness: ann.width / canvasScale,
              color,
              opacity: 0.35,
            });
          }
          break;
        }

        case 'text': {
          const font = await doc.embedFont('Helvetica');
          page.drawText(ann.data.content, {
            x: ann.data.x / canvasScale,
            y: pdfHeight - ann.data.y / canvasScale,
            size: (ann.data.fontSize || 14) / canvasScale,
            font,
            color,
          });
          break;
        }

        case 'rect': {
          page.drawRectangle({
            x: ann.data.x / canvasScale,
            y: pdfHeight - (ann.data.y + ann.data.h) / canvasScale,
            width: ann.data.w / canvasScale,
            height: ann.data.h / canvasScale,
            borderColor: color,
            borderWidth: ann.width / canvasScale,
            opacity: 0,
          });
          break;
        }

        case 'circle': {
          // pdf-lib drawEllipse
          page.drawEllipse({
            x: ann.data.cx / canvasScale,
            y: pdfHeight - ann.data.cy / canvasScale,
            xScale: ann.data.rx / canvasScale,
            yScale: ann.data.ry / canvasScale,
            borderColor: color,
            borderWidth: ann.width / canvasScale,
            opacity: 0,
          });
          break;
        }

        case 'arrow': {
          const { x1, y1, x2, y2 } = ann.data;
          const sx1 = x1 / canvasScale;
          const sy1 = pdfHeight - y1 / canvasScale;
          const sx2 = x2 / canvasScale;
          const sy2 = pdfHeight - y2 / canvasScale;
          
          page.drawLine({
            start: { x: sx1, y: sy1 },
            end: { x: sx2, y: sy2 },
            thickness: ann.width / canvasScale,
            color,
          });
          
          // Arrowhead - calculate in scaled space
          const angle = Math.atan2(sy2 - sy1, sx2 - sx1);
          const headLen = (12 + ann.width * 2) / canvasScale;
          const a1 = angle + Math.PI / 6;
          const a2 = angle - Math.PI / 6;
          
          page.drawLine({
            start: { x: sx2, y: sy2 },
            end: { x: sx2 - headLen * Math.cos(a1), y: sy2 - headLen * Math.sin(a1) },
            thickness: ann.width / canvasScale,
            color,
          });
          page.drawLine({
            start: { x: sx2, y: sy2 },
            end: { x: sx2 - headLen * Math.cos(a2), y: sy2 - headLen * Math.sin(a2) },
            thickness: ann.width / canvasScale,
            color,
          });
          break;
        }

        case 'stamp': {
          try {
            const { x, y, width, height, stamp, rotation, customText, customColor } = ann.data;
            
            // Create canvas to rasterize stamp (with extra space for rotation)
            const maxDim = Math.max(width, height);
            const canvasSize = rotation ? maxDim * 2 : maxDim;
            const canvas = document.createElement('canvas');
            canvas.width = canvasSize;
            canvas.height = canvasSize;
            const ctx = canvas.getContext('2d');
            
            ctx.save();
            
            // Center and rotate if needed
            ctx.translate(canvasSize / 2, canvasSize / 2);
            if (rotation) {
              ctx.rotate((rotation * Math.PI) / 180);
            }
            
            // Draw custom or pre-made stamp
            if (stamp === 'custom' && customText) {
              // Draw custom stamp
              const borderRadius = 8;
              const strokeWidth = 4;
              
              ctx.strokeStyle = customColor;
              ctx.lineWidth = strokeWidth;
              ctx.beginPath();
              ctx.roundRect(-width / 2, -height / 2, width, height, borderRadius);
              ctx.stroke();
              
              ctx.fillStyle = customColor;
              ctx.font = `bold ${Math.min(height * 0.5, 32)}px Arial, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(customText, 0, 0);
            } else {
              // Load and draw pre-made SVG stamp
              const svgUrl = `/pdf-stamps/${stamp}.svg`;
              const img = await loadImage(svgUrl);
              ctx.drawImage(img, -width / 2, -height / 2, width, height);
            }
            
            ctx.restore();
            
            // Convert canvas to PNG blob
            const pngDataUrl = canvas.toDataURL('image/png');
            const pngBytes = await fetch(pngDataUrl).then(r => r.arrayBuffer());
            
            // Embed PNG in PDF
            const pngImage = await doc.embedPng(pngBytes);
            
            // Calculate position accounting for rotation
            const centerX = (x + width / 2) / canvasScale;
            const centerY = pdfHeight - (y + height / 2) / canvasScale;
            
            page.drawImage(pngImage, {
              x: centerX - (canvasSize / canvasScale) / 2,
              y: centerY - (canvasSize / canvasScale) / 2,
              width: canvasSize / canvasScale,
              height: canvasSize / canvasScale,
            });
            
            console.log(`[export] Embedded stamp: ${stamp} at ${x},${y} rotation:${rotation}`);
          } catch (err) {
            console.error('[export] Failed to embed stamp:', err);
          }
          break;
        }
      }
    }
  }

  return doc.save();
}

// Helper to load image
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

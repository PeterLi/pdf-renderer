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
export async function exportAnnotatedPDF(originalPdfBytes, store) {
  const doc = await PDFDocument.load(originalPdfBytes);
  const pages = doc.getPages();

  for (const [pageNum, annotations] of store.pages) {
    if (!annotations.length) continue;
    const pageIdx = pageNum - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const page = pages[pageIdx];
    const { height } = page.getSize();

    for (const ann of annotations) {
      const color = hexToRgb(ann.color);

      switch (ann.type) {
        case 'pen': {
          const points = ann.data.points;
          if (points.length < 2) break;
          for (let i = 1; i < points.length; i++) {
            page.drawLine({
              start: { x: points[i - 1].x, y: height - points[i - 1].y },
              end: { x: points[i].x, y: height - points[i].y },
              thickness: ann.width,
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
              start: { x: points[i - 1].x, y: height - points[i - 1].y },
              end: { x: points[i].x, y: height - points[i].y },
              thickness: ann.width,
              color,
              opacity: 0.35,
            });
          }
          break;
        }

        case 'text': {
          const font = await doc.embedFont('Helvetica');
          page.drawText(ann.data.content, {
            x: ann.data.x,
            y: height - ann.data.y,
            size: ann.data.fontSize || 14,
            font,
            color,
          });
          break;
        }

        case 'rect': {
          page.drawRectangle({
            x: ann.data.x,
            y: height - ann.data.y - ann.data.h,
            width: ann.data.w,
            height: ann.data.h,
            borderColor: color,
            borderWidth: ann.width,
            opacity: 0,
          });
          break;
        }

        case 'circle': {
          // pdf-lib drawEllipse
          page.drawEllipse({
            x: ann.data.cx,
            y: height - ann.data.cy,
            xScale: ann.data.rx,
            yScale: ann.data.ry,
            borderColor: color,
            borderWidth: ann.width,
            opacity: 0,
          });
          break;
        }

        case 'arrow': {
          const { x1, y1, x2, y2 } = ann.data;
          page.drawLine({
            start: { x: x1, y: height - y1 },
            end: { x: x2, y: height - y2 },
            thickness: ann.width,
            color,
          });
          // Arrowhead
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headLen = 12 + ann.width * 2;
          const a1 = angle + Math.PI / 6;
          const a2 = angle - Math.PI / 6;
          page.drawLine({
            start: { x: x2, y: height - y2 },
            end: { x: x2 - headLen * Math.cos(a1), y: height - (y2 - headLen * Math.sin(a1)) },
            thickness: ann.width,
            color,
          });
          page.drawLine({
            start: { x: x2, y: height - y2 },
            end: { x: x2 - headLen * Math.cos(a2), y: height - (y2 - headLen * Math.sin(a2)) },
            thickness: ann.width,
            color,
          });
          break;
        }
      }
    }
  }

  return doc.save();
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

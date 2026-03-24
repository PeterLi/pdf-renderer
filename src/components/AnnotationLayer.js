/**
 * AnnotationLayer — handles drawing on a canvas overlay.
 *
 * Sits on top of the PDF canvas and manages all pointer events
 * for creating pen strokes, highlights, shapes, text, and erasing.
 */
import { uid } from '../utils/annotations.js';

export class AnnotationLayer {
  /**
   * @param {HTMLCanvasElement} canvas  The annotation overlay canvas
   * @param {import('../utils/annotations').AnnotationStore} store
   * @param {() => void} onChanged  Called whenever annotations change
   */
  constructor(canvas, store, onChanged) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.store = store;
    this.onChanged = onChanged;

    // Current state
    this.tool = 'select';
    this.color = '#E53935';
    this.strokeWidth = 3;
    this.page = 1;
    this.scale = 1;
    this.visible = true;

    // Drawing state
    this._drawing = false;
    this._points = [];
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;

    this._bindEvents();
  }

  /** Resize canvas to match PDF canvas. */
  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${Math.floor(width)}px`;
    this.canvas.style.height = `${Math.floor(height)}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  /** Update current tool. */
  setTool(tool) {
    this.tool = tool;
    // Update cursor class
    this.canvas.className = 'annotation-canvas';
    if (tool !== 'select') {
      this.canvas.classList.add(`tool-${tool}`);
    } else {
      this.canvas.classList.add('tool-select');
    }
  }

  /** Full redraw of all annotations for the current page. */
  redraw() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    if (!this.visible) return;

    const annotations = this.store.get(this.page);
    for (const ann of annotations) {
      this._drawAnnotation(ctx, ann);
    }
  }

  _drawAnnotation(ctx, ann) {
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (ann.type) {
      case 'pen':
        this._drawPath(ctx, ann.data.points, 1);
        break;

      case 'highlighter':
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = ann.width;
        this._drawPath(ctx, ann.data.points, 1);
        ctx.globalAlpha = 1;
        break;

      case 'text':
        ctx.font = `${ann.data.fontSize || 14}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(ann.data.content, ann.data.x, ann.data.y);
        break;

      case 'rect': {
        const { x, y, w, h } = ann.data;
        ctx.strokeRect(x, y, w, h);
        break;
      }

      case 'circle': {
        const { cx, cy, rx, ry } = ann.data;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'arrow': {
        const { x1, y1, x2, y2 } = ann.data;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 12 + ann.width * 2;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  _drawPath(ctx, points, _opacity) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      // Smooth with quadratic curves
      const prev = points[i - 1];
      const curr = points[i];
      const mx = (prev.x + curr.x) / 2;
      const my = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
  }

  // --- Pointer events ---

  _bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.canvas.addEventListener('pointerleave', (e) => {
      if (this._drawing) this._onPointerUp(e);
    });
  }

  _canvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  }

  _onPointerDown(e) {
    if (this.tool === 'select') return;
    if (e.button !== 0) return; // left button only

    const { x, y } = this._canvasCoords(e);
    this._drawing = true;
    this._startX = x;
    this._startY = y;
    this._currentX = x;
    this._currentY = y;
    this.canvas.setPointerCapture(e.pointerId);

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      this._points = [{ x, y }];
    }

    if (this.tool === 'eraser') {
      this._tryErase(x, y);
    }

    if (this.tool === 'text') {
      this._drawing = false;
      this._createTextInput(x, y);
    }
  }

  _onPointerMove(e) {
    if (!this._drawing) return;
    const { x, y } = this._canvasCoords(e);
    this._currentX = x;
    this._currentY = y;

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      this._points.push({ x, y });
      // Live preview
      this.redraw();
      this._drawLiveStroke();
    } else if (this.tool === 'eraser') {
      this._tryErase(x, y);
    } else {
      // Shape preview
      this.redraw();
      this._drawLiveShape();
    }
  }

  _onPointerUp(e) {
    if (!this._drawing) return;
    this._drawing = false;

    const { x, y } = this._canvasCoords(e);
    this._currentX = x;
    this._currentY = y;

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      if (this._points.length >= 2) {
        this.store.add(this.page, {
          id: uid(),
          page: this.page,
          type: this.tool,
          color: this.color,
          width: this.tool === 'highlighter' ? Math.max(this.strokeWidth * 3, 12) : this.strokeWidth,
          data: { points: [...this._points] },
        });
      }
    } else if (this.tool === 'rect') {
      const w = this._currentX - this._startX;
      const h = this._currentY - this._startY;
      if (Math.abs(w) > 3 || Math.abs(h) > 3) {
        this.store.add(this.page, {
          id: uid(),
          page: this.page,
          type: 'rect',
          color: this.color,
          width: this.strokeWidth,
          data: {
            x: Math.min(this._startX, this._currentX),
            y: Math.min(this._startY, this._currentY),
            w: Math.abs(w),
            h: Math.abs(h),
          },
        });
      }
    } else if (this.tool === 'circle') {
      const rx = Math.abs(this._currentX - this._startX) / 2;
      const ry = Math.abs(this._currentY - this._startY) / 2;
      if (rx > 3 || ry > 3) {
        this.store.add(this.page, {
          id: uid(),
          page: this.page,
          type: 'circle',
          color: this.color,
          width: this.strokeWidth,
          data: {
            cx: (this._startX + this._currentX) / 2,
            cy: (this._startY + this._currentY) / 2,
            rx,
            ry,
          },
        });
      }
    } else if (this.tool === 'arrow') {
      const dist = Math.hypot(this._currentX - this._startX, this._currentY - this._startY);
      if (dist > 5) {
        this.store.add(this.page, {
          id: uid(),
          page: this.page,
          type: 'arrow',
          color: this.color,
          width: this.strokeWidth,
          data: {
            x1: this._startX,
            y1: this._startY,
            x2: this._currentX,
            y2: this._currentY,
          },
        });
      }
    }

    this._points = [];
    this.redraw();
    this.onChanged();
  }

  _drawLiveStroke() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.tool === 'highlighter' ? Math.max(this.strokeWidth * 3, 12) : this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (this.tool === 'highlighter') ctx.globalAlpha = 0.35;
    this._drawPath(ctx, this._points, 1);
    ctx.restore();
  }

  _drawLiveShape() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([4, 4]);

    if (this.tool === 'rect') {
      const x = Math.min(this._startX, this._currentX);
      const y = Math.min(this._startY, this._currentY);
      const w = Math.abs(this._currentX - this._startX);
      const h = Math.abs(this._currentY - this._startY);
      ctx.strokeRect(x, y, w, h);
    } else if (this.tool === 'circle') {
      const cx = (this._startX + this._currentX) / 2;
      const cy = (this._startY + this._currentY) / 2;
      const rx = Math.abs(this._currentX - this._startX) / 2;
      const ry = Math.abs(this._currentY - this._startY) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry, 1), 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.tool === 'arrow') {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(this._startX, this._startY);
      ctx.lineTo(this._currentX, this._currentY);
      ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(this._currentY - this._startY, this._currentX - this._startX);
      const headLen = 12 + this.strokeWidth * 2;
      ctx.beginPath();
      ctx.moveTo(this._currentX, this._currentY);
      ctx.lineTo(this._currentX - headLen * Math.cos(angle - Math.PI / 6), this._currentY - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(this._currentX, this._currentY);
      ctx.lineTo(this._currentX - headLen * Math.cos(angle + Math.PI / 6), this._currentY - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }

    ctx.restore();
  }

  _tryErase(x, y) {
    const hit = this.store.hitTest(this.page, x, y);
    if (hit) {
      this.store.remove(this.page, hit.id);
      this.redraw();
      this.onChanged();
    }
  }

  _createTextInput(x, y) {
    // Remove any existing text input
    const existing = document.querySelector('.text-annotation-input');
    if (existing) existing.remove();

    const wrapper = this.canvas.parentElement;
    const input = document.createElement('textarea');
    input.className = 'text-annotation-input';
    input.style.left = `${x}px`;
    input.style.top = `${y}px`;
    input.style.color = this.color;
    input.style.fontSize = `${Math.max(this.strokeWidth * 4, 14)}px`;
    wrapper.appendChild(input);
    input.focus();

    const commit = () => {
      const content = input.value.trim();
      if (content) {
        this.store.add(this.page, {
          id: uid(),
          page: this.page,
          type: 'text',
          color: this.color,
          width: this.strokeWidth,
          data: {
            x,
            y: y + Math.max(this.strokeWidth * 4, 14),
            content,
            fontSize: Math.max(this.strokeWidth * 4, 14),
          },
        });
        this.redraw();
        this.onChanged();
      }
      input.remove();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { input.value = ''; input.blur(); }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
    });
  }
}

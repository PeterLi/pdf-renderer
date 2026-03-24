/**
 * AnnotationLayer — handles drawing and interaction on a canvas overlay.
 *
 * Sits on top of the PDF canvas and manages all pointer events for:
 *   - Selection (click, multi-select, drag-to-move, resize handles)
 *   - Drawing (pen strokes, highlights, shapes, text, erasing)
 *   - Text editing (double-click to edit existing text annotations)
 */
import { uid } from '../utils/annotations.js';

// --- Constants ---
const HANDLE_SIZE = 8;
const HANDLE_HALF = HANDLE_SIZE / 2;
const HANDLE_HIT = HANDLE_HALF + 3; // Hit area slightly larger than visual
const SELECTION_PAD = 4;
const SELECTION_COLOR = '#4C8BF5';
const ROTATION_HANDLE_OFFSET = 20; // Distance above top-right corner
const ROTATION_HANDLE_RADIUS = 6;
const HANDLE_CURSORS = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
  rotate: 'grab',
};

// Stamp aspect ratios (width:height ratio from SVG viewBox)
const STAMP_ASPECT_RATIOS = {
  paid: 200 / 80,          // 2.5:1
  approved: 240 / 80,      // 3:1
  rejected: 240 / 80,      // 3:1
  invoice: 220 / 80,       // 2.75:1
  processed: 260 / 80,     // 3.25:1
  reviewed: 240 / 80,      // 3:1
  confidential: 300 / 80,  // 3.75:1
  urgent: 220 / 80,        // 2.75:1
  draft: 200 / 80,         // 2.5:1
  final: 200 / 80,         // 2.5:1
  copy: 180 / 80,          // 2.25:1
  overdue: 240 / 80,       // 3:1
  void: 180 / 80,          // 2.25:1
};
const STAMP_DEFAULT_HEIGHT = 60; // Fixed height, width calculated from aspect ratio

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
    this._page = 1;
    this.scale = 1;
    this.visible = true;

    // Drawing state (for pen/highlighter/shapes)
    this._drawing = false;
    this._points = [];
    this._startX = 0;
    this._startY = 0;
    this._currentX = 0;
    this._currentY = 0;

    // Selection state
    this._selected = new Set();       // Set of selected annotation IDs
    this._dragMode = null;            // 'move' | 'resize' | 'rotate' | null
    this._dragMoved = false;          // Whether pointer actually moved during drag
    this._lastDragX = 0;
    this._lastDragY = 0;
    this._resizeHandle = null;        // Handle name ('nw', 'n', etc.)
    this._resizeAnnId = null;         // ID of annotation being resized
    this._resizeOrigBounds = null;    // Bounds at resize start
    this._resizeOrigData = null;      // Deep clone of annotation data at resize start
    
    // Rotation state
    this._rotateAnnId = null;         // ID of annotation being rotated
    this._rotateStartAngle = 0;       // Starting rotation angle
    this._rotateOrigRotation = 0;     // Original rotation value

    // Stamp cache - stores loaded SVG images
    this._stampCache = new Map();     // stamp name -> Image object

    this._bindEvents();
  }

  // --- Page property (clears selection on change) ---

  get page() { return this._page; }
  set page(val) {
    if (val !== this._page) {
      this._selected.clear();
      this._dragMode = null;
    }
    this._page = val;
  }

  // --- Public API ---

  /** Resize canvas to match PDF canvas dimensions. */
  resize(width, height) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${Math.floor(width)}px`;
    this.canvas.style.height = `${Math.floor(height)}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  /** Update current tool. Clears selection when switching away from select. */
  setTool(tool) {
    if (tool !== 'select' && this.tool === 'select') {
      this._selected.clear();
      this._dragMode = null;
    }
    this.tool = tool;
    this.canvas.className = 'annotation-canvas';
    this.canvas.classList.add(`tool-${tool}`);
    if (tool === 'select') {
      this.canvas.style.cursor = 'default';
    }
    this.redraw();
  }

  /** Full redraw of all annotations + selection UI for the current page. */
  redraw() {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    if (!this.visible) return;

    const annotations = this.store.get(this._page);
    for (const ann of annotations) {
      this._drawAnnotation(ctx, ann);
    }

    // Selection UI on top
    this._drawSelectionUI();
  }

  /** Clear all selection. */
  clearSelection() {
    this._selected.clear();
    this._dragMode = null;
    this.redraw();
  }

  /** Whether any annotations are selected. */
  get hasSelection() {
    return this._selected.size > 0;
  }

  /** Delete all selected annotations. */
  deleteSelected() {
    if (this._selected.size === 0) return;
    this.store.pushUndo();
    const annotations = this.store.get(this._page);
    for (let i = annotations.length - 1; i >= 0; i--) {
      if (this._selected.has(annotations[i].id)) {
        annotations.splice(i, 1);
      }
    }
    this._selected.clear();
    this.redraw();
    this.onChanged();
  }

  /**
   * Handle keyboard events delegated from the main app.
   * Returns true if the event was consumed.
   */
  handleKeyDown(e) {
    if (this.tool !== 'select') return false;

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this._selected.size > 0) {
        this.deleteSelected();
        return true;
      }
    }

    if (e.key === 'Escape') {
      if (this._selected.size > 0) {
        this.clearSelection();
        return true;
      }
    }

    return false;
  }

  // ============================================================
  // Annotation helpers
  // ============================================================

  /** Find annotation by ID on current page. */
  _getAnnotation(id) {
    return this.store.get(this._page).find(a => a.id === id);
  }

  /** Compute bounding rectangle for an annotation. */
  _getBounds(ann) {
    switch (ann.type) {
      case 'pen':
      case 'highlighter': {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of ann.data.points) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        const pad = ann.width / 2;
        return {
          x: minX - pad, y: minY - pad,
          w: maxX - minX + ann.width, h: maxY - minY + ann.width,
        };
      }
      case 'text': {
        const fontSize = ann.data.fontSize || 14;
        const w = this._measureTextWidth(ann.data.content, fontSize);
        const h = fontSize * 1.3;
        return { x: ann.data.x, y: ann.data.y - fontSize, w: Math.max(w, 20), h };
      }
      case 'rect':
        return { x: ann.data.x, y: ann.data.y, w: ann.data.w, h: ann.data.h };
      case 'circle':
        return {
          x: ann.data.cx - Math.abs(ann.data.rx),
          y: ann.data.cy - Math.abs(ann.data.ry),
          w: Math.abs(ann.data.rx) * 2,
          h: Math.abs(ann.data.ry) * 2,
        };
      case 'arrow': {
        const { x1, y1, x2, y2 } = ann.data;
        return {
          x: Math.min(x1, x2), y: Math.min(y1, y2),
          w: Math.abs(x2 - x1) || 1, h: Math.abs(y2 - y1) || 1,
        };
      }
      case 'stamp':
        return {
          x: ann.data.x,
          y: ann.data.y,
          w: ann.data.width,
          h: ann.data.height,
        };
      default:
        return { x: 0, y: 0, w: 0, h: 0 };
    }
  }

  /** Measure rendered text width using canvas context. */
  _measureTextWidth(text, fontSize) {
    this.ctx.save();
    this.ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const w = this.ctx.measureText(text).width;
    this.ctx.restore();
    return w;
  }

  /** Get the 8 resize handle positions for a bounding rect. */
  _getHandlePositions(bounds) {
    const { x, y, w, h } = bounds;
    return {
      nw: { x, y },
      n:  { x: x + w / 2, y },
      ne: { x: x + w, y },
      e:  { x: x + w, y: y + h / 2 },
      se: { x: x + w, y: y + h },
      s:  { x: x + w / 2, y: y + h },
      sw: { x, y: y + h },
      w:  { x, y: y + h / 2 },
    };
  }

  /** Check if a point hits a resize or rotation handle of any selected annotation. */
  _getHandleAt(x, y) {
    for (const id of this._selected) {
      const ann = this._getAnnotation(id);
      if (!ann || ann.type === 'text') continue; // no resize handles for text
      const bounds = this._getBounds(ann);
      const rotation = ann.data.rotation || 0;
      
      // Transform click point into annotation's local space if rotated
      let localX = x;
      let localY = y;
      if (rotation) {
        const centerX = bounds.x + bounds.w / 2;
        const centerY = bounds.y + bounds.h / 2;
        const rad = (-rotation * Math.PI) / 180; // Inverse rotation
        const dx = x - centerX;
        const dy = y - centerY;
        localX = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
        localY = centerY + dx * Math.sin(rad) + dy * Math.cos(rad);
      }
      
      // Check rotation handle first (for stamp/rect/circle)
      if (ann.type === 'stamp' || ann.type === 'rect' || ann.type === 'circle') {
        const rotatePos = this._getRotationHandlePosition(bounds);
        const dist = Math.hypot(localX - rotatePos.x, localY - rotatePos.y);
        if (dist <= ROTATION_HANDLE_RADIUS + 3) {
          return { handle: 'rotate', annId: id };
        }
      }
      
      // Check resize handles
      const handles = this._getHandlePositions(bounds);
      for (const [name, pos] of Object.entries(handles)) {
        if (Math.abs(localX - pos.x) <= HANDLE_HIT && Math.abs(localY - pos.y) <= HANDLE_HIT) {
          return { handle: name, annId: id };
        }
      }
    }
    return null;
  }

  /** Get the position of the rotation handle for a bounding rect. */
  _getRotationHandlePosition(bounds) {
    return {
      x: bounds.x + bounds.w,
      y: bounds.y - ROTATION_HANDLE_OFFSET
    };
  }

  // ============================================================
  // Drawing — annotations
  // ============================================================

  _drawAnnotation(ctx, ann) {
    ctx.save();
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (ann.type) {
      case 'pen':
        this._drawPath(ctx, ann.data.points);
        break;

      case 'highlighter':
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = ann.width;
        this._drawPath(ctx, ann.data.points);
        ctx.globalAlpha = 1;
        break;

      case 'text':
        ctx.font = `${ann.data.fontSize || 14}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(ann.data.content, ann.data.x, ann.data.y);
        break;

      case 'rect': {
        const { x, y, w, h, rotation } = ann.data;
        
        if (rotation) {
          const centerX = x + w / 2;
          const centerY = y + h / 2;
          ctx.translate(centerX, centerY);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.translate(-centerX, -centerY);
        }
        
        ctx.strokeRect(x, y, w, h);
        break;
      }

      case 'circle': {
        const { cx, cy, rx, ry, rotation } = ann.data;
        
        ctx.beginPath();
        // Ellipse rotation parameter (5th arg) handles rotation natively
        const rotationRad = rotation ? (rotation * Math.PI) / 180 : 0;
        ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rotationRad, 0, Math.PI * 2);
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

      case 'stamp': {
        const { x, y, width, height, stamp, rotation, customText, customColor } = ann.data;
        this._drawStamp(ctx, stamp, x, y, width, height, rotation || 0, customText, customColor);
        break;
      }
    }
    ctx.restore();
  }

  _drawPath(ctx, points) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
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

  async _loadStamp(stampName) {
    // Check cache first
    if (this._stampCache.has(stampName)) {
      return this._stampCache.get(stampName);
    }

    // Load SVG as image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this._stampCache.set(stampName, img);
        resolve(img);
      };
      img.onerror = () => {
        console.error(`Failed to load stamp: ${stampName}`);
        reject(new Error(`Failed to load stamp: ${stampName}`));
      };
      img.src = `/pdf-stamps/${stampName}.svg`;
    });
  }

  _drawStamp(ctx, stampName, x, y, width, height, rotation, customText, customColor) {
    // Handle custom stamps
    if (stampName === 'custom' && customText) {
      ctx.save();
      
      // Apply rotation if specified
      if (rotation) {
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }
      
      // Draw rounded rectangle with stroke inset (like pre-made stamps)
      const borderRadius = 8;
      const strokeWidth = 6;
      const inset = strokeWidth / 2 + 2; // Inset to match pre-made stamps
      
      ctx.strokeStyle = customColor;
      ctx.lineWidth = strokeWidth;
      ctx.beginPath();
      ctx.roundRect(x + inset, y + inset, width - inset * 2, height - inset * 2, borderRadius);
      ctx.stroke();
      
      // Draw text - scale font size with stamp dimensions
      const baseFontSize = 32; // Base font size at default height (60px)
      const baseHeight = 60;
      const scaledFontSize = (height / baseHeight) * baseFontSize;
      const fontSize = Math.min(scaledFontSize, height * 0.5);
      
      ctx.fillStyle = customColor;
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(customText, x + width / 2, y + height / 2);
      
      ctx.restore();
      return;
    }
    
    // Handle pre-made stamps (SVG)
    const img = this._stampCache.get(stampName);
    
    if (!img) {
      // Load stamp async and redraw when ready
      this._loadStamp(stampName).then(() => {
        this.redraw();
      }).catch(err => {
        console.error('Failed to load stamp:', err);
      });
      // Draw placeholder while loading
      ctx.save();
      ctx.strokeStyle = '#666';
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.fillText('Loading...', x + 5, y + height / 2);
      ctx.restore();
      return;
    }

    // Draw the stamp image
    ctx.save();
    
    // Apply rotation if specified
    if (rotation) {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-centerX, -centerY);
    }
    
    ctx.drawImage(img, x, y, width, height);
    ctx.restore();
  }

  // ============================================================
  // Drawing — selection UI
  // ============================================================

  _drawSelectionUI() {
    if (this._selected.size === 0) return;
    const ctx = this.ctx;

    for (const id of this._selected) {
      const ann = this._getAnnotation(id);
      if (!ann) continue;
      const bounds = this._getBounds(ann);
      const p = SELECTION_PAD;
      const rotation = ann.data.rotation || 0;

      ctx.save();

      // Apply rotation transform if annotation is rotated
      if (rotation) {
        const centerX = bounds.x + bounds.w / 2;
        const centerY = bounds.y + bounds.h / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
      }

      // Dashed selection outline
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(bounds.x - p, bounds.y - p, bounds.w + p * 2, bounds.h + p * 2);
      ctx.setLineDash([]);

      // Resize handles (not for text — text uses double-click to edit)
      if (ann.type !== 'text') {
        const handles = this._getHandlePositions(bounds);
        ctx.lineWidth = 1.5;
        for (const pos of Object.values(handles)) {
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = SELECTION_COLOR;
          ctx.fillRect(pos.x - HANDLE_HALF, pos.y - HANDLE_HALF, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeRect(pos.x - HANDLE_HALF, pos.y - HANDLE_HALF, HANDLE_SIZE, HANDLE_SIZE);
        }
        
        // Rotation handle (above top-right corner) - for stamp and shapes
        if (ann.type === 'stamp' || ann.type === 'rect' || ann.type === 'circle') {
          const rotatePos = this._getRotationHandlePosition(bounds);
          
          // Draw line from corner to handle
          ctx.strokeStyle = SELECTION_COLOR;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(bounds.x + bounds.w, bounds.y);
          ctx.lineTo(rotatePos.x, rotatePos.y);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw rotation handle (circle with arc arrows)
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = SELECTION_COLOR;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(rotatePos.x, rotatePos.y, ROTATION_HANDLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw rotation icon (circular arrows)
          ctx.strokeStyle = SELECTION_COLOR;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(rotatePos.x, rotatePos.y, 3, -Math.PI / 4, Math.PI, false);
          ctx.stroke();
          // Arrowhead
          const arrowSize = 2;
          ctx.beginPath();
          ctx.moveTo(rotatePos.x - 3, rotatePos.y);
          ctx.lineTo(rotatePos.x - 3 - arrowSize, rotatePos.y - arrowSize);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  // ============================================================
  // Annotation manipulation — move & resize
  // ============================================================

  /** Translate an annotation by (dx, dy). */
  _moveAnnotation(ann, dx, dy) {
    switch (ann.type) {
      case 'pen':
      case 'highlighter':
        for (const p of ann.data.points) { p.x += dx; p.y += dy; }
        break;
      case 'text':
        ann.data.x += dx;
        ann.data.y += dy;
        break;
      case 'rect':
        ann.data.x += dx;
        ann.data.y += dy;
        break;
      case 'circle':
        ann.data.cx += dx;
        ann.data.cy += dy;
        break;
      case 'arrow':
        ann.data.x1 += dx; ann.data.y1 += dy;
        ann.data.x2 += dx; ann.data.y2 += dy;
        break;
      case 'stamp':
        ann.data.x += dx;
        ann.data.y += dy;
        break;
    }
  }

  /** Compute new bounds when a resize handle is dragged to (mouseX, mouseY). */
  _computeResizedBounds(origBounds, handle, mouseX, mouseY) {
    let left = origBounds.x;
    let top = origBounds.y;
    let right = origBounds.x + origBounds.w;
    let bottom = origBounds.y + origBounds.h;

    // Adjust edges based on which handle is being dragged
    if (handle === 'nw' || handle === 'w' || handle === 'sw') left = mouseX;
    if (handle === 'ne' || handle === 'e' || handle === 'se') right = mouseX;
    if (handle === 'nw' || handle === 'n' || handle === 'ne') top = mouseY;
    if (handle === 'sw' || handle === 's' || handle === 'se') bottom = mouseY;

    // Normalize (handle flipping when dragged past opposite edge)
    return {
      x: Math.min(left, right),
      y: Math.min(top, bottom),
      w: Math.abs(right - left),
      h: Math.abs(bottom - top),
    };
  }

  /** Apply resized bounds to an annotation, scaling its data appropriately. */
  _applyResize(ann, newBounds, origBounds, origData) {
    const scaleX = origBounds.w > 1 ? newBounds.w / origBounds.w : 1;
    const scaleY = origBounds.h > 1 ? newBounds.h / origBounds.h : 1;

    switch (ann.type) {
      case 'rect':
        ann.data.x = newBounds.x;
        ann.data.y = newBounds.y;
        ann.data.w = newBounds.w;
        ann.data.h = newBounds.h;
        break;
      case 'circle':
        ann.data.cx = newBounds.x + newBounds.w / 2;
        ann.data.cy = newBounds.y + newBounds.h / 2;
        ann.data.rx = newBounds.w / 2;
        ann.data.ry = newBounds.h / 2;
        break;
      case 'arrow':
        ann.data.x1 = newBounds.x + (origData.x1 - origBounds.x) * scaleX;
        ann.data.y1 = newBounds.y + (origData.y1 - origBounds.y) * scaleY;
        ann.data.x2 = newBounds.x + (origData.x2 - origBounds.x) * scaleX;
        ann.data.y2 = newBounds.y + (origData.y2 - origBounds.y) * scaleY;
        break;
      case 'pen':
      case 'highlighter':
        ann.data.points = origData.points.map(p => ({
          x: newBounds.x + (p.x - origBounds.x) * scaleX,
          y: newBounds.y + (p.y - origBounds.y) * scaleY,
        }));
        break;
      case 'stamp':
        ann.data.x = newBounds.x;
        ann.data.y = newBounds.y;
        ann.data.width = newBounds.w;
        ann.data.height = newBounds.h;
        break;
    }
  }

  // ============================================================
  // Pointer events
  // ============================================================

  _bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.canvas.addEventListener('pointerleave', (e) => {
      if (this._drawing) this._onPointerUp(e);
    });
    this.canvas.addEventListener('dblclick', (e) => this._onDblClick(e));
  }

  _canvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  }

  // --- Pointer Down ---

  _onPointerDown(e) {
    if (e.button !== 0) return;
    const { x, y } = this._canvasCoords(e);

    // Select tool has its own handler
    if (this.tool === 'select') {
      this._onSelectDown(x, y, e);
      return;
    }

    // --- Drawing tools ---
    this._drawing = true;
    this._startX = x;
    this._startY = y;
    this._currentX = x;
    this._currentY = y;

    // Text tool: create input immediately, don't capture pointer
    if (this.tool === 'text') {
      console.log('[Text Tool] Creating text input at', x, y);
      this._drawing = false;
      this._createTextInput(x, y);
      return;
    }

    // Stamp tool: place selected stamp at click position
    if (this.tool === 'stamp') {
      this._drawing = false;
      this._placeStamp(x, y);
      return;
    }

    this.canvas.setPointerCapture(e.pointerId);

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      this._points = [{ x, y }];
    }

    if (this.tool === 'eraser') {
      this._tryErase(x, y);
    }
  }

  _onSelectDown(x, y, e) {
    // 1. Check resize/rotate handles first (if something is already selected)
    if (this._selected.size > 0) {
      const handleInfo = this._getHandleAt(x, y);
      if (handleInfo) {
        const ann = this._getAnnotation(handleInfo.annId);
        if (ann) {
          if (handleInfo.handle === 'rotate') {
            // Rotation mode
            this._dragMode = 'rotate';
            this._dragMoved = false;
            this._rotateAnnId = handleInfo.annId;
            const bounds = this._getBounds(ann);
            const centerX = bounds.x + bounds.w / 2;
            const centerY = bounds.y + bounds.h / 2;
            this._rotateCenterX = centerX;
            this._rotateCenterY = centerY;
            this._rotateStartAngle = Math.atan2(y - centerY, x - centerX);
            this._rotateOrigRotation = ann.data.rotation || 0;
            this.canvas.setPointerCapture(e.pointerId);
            this.canvas.style.cursor = 'grabbing';
          } else {
            // Resize mode
            this._dragMode = 'resize';
            this._dragMoved = false;
            this._resizeHandle = handleInfo.handle;
            this._resizeAnnId = handleInfo.annId;
            this._resizeOrigBounds = this._getBounds(ann);
            this._resizeOrigData = structuredClone(ann.data);
            this.canvas.setPointerCapture(e.pointerId);
            this.canvas.style.cursor = HANDLE_CURSORS[handleInfo.handle];
          }
          return;
        }
      }
    }

    // 2. Hit test for annotations
    const hit = this.store.hitTest(this._page, x, y);
    if (hit) {
      if (e.shiftKey) {
        // Toggle in multi-selection
        if (this._selected.has(hit.id)) {
          this._selected.delete(hit.id);
        } else {
          this._selected.add(hit.id);
        }
      } else if (!this._selected.has(hit.id)) {
        // Select only this annotation
        this._selected.clear();
        this._selected.add(hit.id);
      }
      // Start move drag
      this._dragMode = 'move';
      this._dragMoved = false;
      this._lastDragX = x;
      this._lastDragY = y;
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.style.cursor = 'move';
    } else {
      // Clicked empty space — deselect all
      this._selected.clear();
      this._dragMode = null;
      this.canvas.style.cursor = 'default';
    }

    this.redraw();
  }

  // --- Pointer Move ---

  _onPointerMove(e) {
    const { x, y } = this._canvasCoords(e);

    if (this.tool === 'select') {
      this._onSelectMove(x, y);
      return;
    }

    if (!this._drawing) return;
    this._currentX = x;
    this._currentY = y;

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      this._points.push({ x, y });
      this.redraw();
      this._drawLiveStroke();
    } else if (this.tool === 'eraser') {
      this._tryErase(x, y);
    } else {
      this.redraw();
      this._drawLiveShape();
    }
  }

  _onSelectMove(x, y) {
    if (this._dragMode === 'move') {
      // Push undo on first actual movement
      if (!this._dragMoved) {
        this._dragMoved = true;
        this.store.pushUndo();
      }
      const dx = x - this._lastDragX;
      const dy = y - this._lastDragY;
      for (const id of this._selected) {
        const ann = this._getAnnotation(id);
        if (ann) this._moveAnnotation(ann, dx, dy);
      }
      this._lastDragX = x;
      this._lastDragY = y;
      this.redraw();

    } else if (this._dragMode === 'resize') {
      // Push undo on first actual movement
      if (!this._dragMoved) {
        this._dragMoved = true;
        this.store.pushUndo();
      }
      const ann = this._getAnnotation(this._resizeAnnId);
      if (ann) {
        const newBounds = this._computeResizedBounds(
          this._resizeOrigBounds, this._resizeHandle, x, y,
        );
        this._applyResize(ann, newBounds, this._resizeOrigBounds, this._resizeOrigData);
        this.redraw();
      }

    } else if (this._dragMode === 'rotate') {
      // Push undo on first actual movement
      if (!this._dragMoved) {
        this._dragMoved = true;
        this.store.pushUndo();
      }
      const ann = this._getAnnotation(this._rotateAnnId);
      if (ann) {
        // Calculate angle from center to current pointer
        const currentAngle = Math.atan2(y - this._rotateCenterY, x - this._rotateCenterX);
        const angleDiff = currentAngle - this._rotateStartAngle;
        const newRotation = this._rotateOrigRotation + (angleDiff * 180 / Math.PI);
        
        // Update annotation rotation
        if (!ann.data.rotation) ann.data.rotation = 0;
        ann.data.rotation = newRotation % 360;
        
        this.redraw();
      }

    } else {
      // Not dragging — update cursor based on what's under pointer
      this._updateSelectCursor(x, y);
    }
  }

  /** Update cursor to reflect what the pointer is hovering over. */
  _updateSelectCursor(x, y) {
    // Check resize handles
    if (this._selected.size > 0) {
      const handleInfo = this._getHandleAt(x, y);
      if (handleInfo) {
        this.canvas.style.cursor = HANDLE_CURSORS[handleInfo.handle];
        return;
      }
    }
    // Check annotations
    const hit = this.store.hitTest(this._page, x, y);
    this.canvas.style.cursor = hit ? 'move' : 'default';
  }

  // --- Pointer Up ---

  _onPointerUp(e) {
    // Select tool
    if (this.tool === 'select') {
      if (this._dragMode) {
        this._dragMode = null;
        this._resizeHandle = null;
        this._resizeOrigBounds = null;
        this._resizeOrigData = null;
        this._resizeAnnId = null;
        this._rotateAnnId = null;
        this._rotateStartAngle = 0;
        this._rotateOrigRotation = 0;
        if (this._dragMoved) {
          this.onChanged();
        }
        // Restore cursor
        if (e) {
          const { x, y } = this._canvasCoords(e);
          this._updateSelectCursor(x, y);
        }
      }
      return;
    }

    // Drawing tools
    if (!this._drawing) return;
    this._drawing = false;

    if (e) {
      const { x, y } = this._canvasCoords(e);
      this._currentX = x;
      this._currentY = y;
    }

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      if (this._points.length >= 2) {
        this.store.add(this._page, {
          id: uid(),
          page: this._page,
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
        this.store.add(this._page, {
          id: uid(),
          page: this._page,
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
        this.store.add(this._page, {
          id: uid(),
          page: this._page,
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
        this.store.add(this._page, {
          id: uid(),
          page: this._page,
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

  // --- Double-click (text editing) ---

  _onDblClick(e) {
    if (this.tool !== 'select') return;
    const { x, y } = this._canvasCoords(e);
    const hit = this.store.hitTest(this._page, x, y);
    if (hit && hit.type === 'text') {
      this._editTextAnnotation(hit);
    }
  }

  /** Open an inline editor for an existing text annotation. */
  _editTextAnnotation(ann) {
    // Remove any existing text input
    const existing = document.querySelector('.text-annotation-input');
    if (existing) existing.remove();

    const wrapper = this.canvas.parentElement;
    const input = document.createElement('textarea');
    input.className = 'text-annotation-input';
    const fontSize = ann.data.fontSize || 14;
    input.style.left = `${ann.data.x}px`;
    input.style.top = `${ann.data.y - fontSize}px`;
    input.style.color = ann.color;
    input.style.fontSize = `${fontSize}px`;
    input.value = ann.data.content;
    wrapper.appendChild(input);
    input.focus();
    input.select();

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      const content = input.value.trim();
      if (content && content !== ann.data.content) {
        this.store.pushUndo();
        ann.data.content = content;
        this.redraw();
        this.onChanged();
      } else if (!content) {
        // Empty text — delete the annotation
        this.store.remove(this._page, ann.id);
        this._selected.delete(ann.id);
        this.redraw();
        this.onChanged();
      }
      input.remove();
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // Don't trigger global shortcuts while editing
      if (e.key === 'Escape') {
        committed = true;
        input.remove();
        this.redraw();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
    });
  }

  // ============================================================
  // Drawing tools — live preview & helpers
  // ============================================================

  _drawLiveStroke() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.tool === 'highlighter' ? Math.max(this.strokeWidth * 3, 12) : this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (this.tool === 'highlighter') ctx.globalAlpha = 0.35;
    this._drawPath(ctx, this._points);
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
    const hit = this.store.hitTest(this._page, x, y);
    if (hit) {
      this.store.remove(this._page, hit.id);
      this.redraw();
      this.onChanged();
    }
  }

  _createTextInput(x, y) {
    console.log('[_createTextInput] Called with', x, y);
    
    // Remove any existing text input
    const existing = document.querySelector('.text-annotation-input');
    if (existing) {
      console.log('[_createTextInput] Removing existing input');
      existing.remove();
    }

    const wrapper = this.canvas.parentElement;
    console.log('[_createTextInput] Wrapper element:', wrapper);
    
    const input = document.createElement('textarea');
    input.className = 'text-annotation-input';
    input.style.left = `${x}px`;
    input.style.top = `${y}px`;
    input.style.color = this.color;
    input.style.fontSize = `${Math.max(this.strokeWidth * 4, 14)}px`;
    
    console.log('[_createTextInput] Created input with styles:', {
      left: input.style.left,
      top: input.style.top,
      color: input.style.color,
      fontSize: input.style.fontSize
    });
    
    wrapper.appendChild(input);
    console.log('[_createTextInput] Appended input to wrapper');
    console.log('[_createTextInput] Input in DOM?', document.body.contains(input));
    console.log('[_createTextInput] Input offsetParent:', input.offsetParent);
    console.log('[_createTextInput] Input computed style:', window.getComputedStyle(input).display, window.getComputedStyle(input).visibility, window.getComputedStyle(input).zIndex);
    
    // Delay focus to next frame to ensure input is fully rendered
    requestAnimationFrame(() => {
      input.focus();
      console.log('[_createTextInput] Focused input, activeElement:', document.activeElement === input);
    });
    
    // CRITICAL FIX: Disable pointer events on annotation canvas while text input is active
    this.canvas.style.pointerEvents = 'none';
    console.log('[_createTextInput] Disabled canvas pointer events');

    let committed = false;
    const commit = () => {
      if (committed) return;
      committed = true;
      console.log('[Text commit] Committing with value:', input.value);
      const content = input.value.trim();
      if (content) {
        const fontSize = Math.max(this.strokeWidth * 4, 14);
        this.store.add(this._page, {
          id: uid(),
          page: this._page,
          type: 'text',
          color: this.color,
          width: this.strokeWidth,
          data: {
            x,
            y: y + fontSize,
            content,
            fontSize,
          },
        });
        this.redraw();
        this.onChanged();
      }
      input.remove();
      // CRITICAL: Re-enable pointer events on canvas
      this.canvas.style.pointerEvents = 'auto';
      console.log('[Text commit] Re-enabled canvas pointer events');
    };

    // CRITICAL FIX: Delay blur listener to prevent immediate closure
    // 
    // Problem: When the text input is created and focused, a blur event fires
    // immediately (likely due to focus() being called while the input is still
    // being positioned/rendered). This causes the input to be removed before
    // the user can even see it or type anything.
    //
    // Solution: Add a 100ms delay before enabling the blur listener. This gives
    // the input time to properly receive and settle focus before blur can trigger.
    // The delay is imperceptible to users but prevents the race condition.
    //
    // Discovered: March 24, 2026 - Text tool was creating inputs that immediately
    // disappeared. Logs showed commit() being called instantly after focus().
    let blurEnabled = false;
    setTimeout(() => {
      blurEnabled = true;
      console.log('[Text input] Blur listener now enabled');
    }, 100);
    
    input.addEventListener('blur', () => {
      if (blurEnabled) {
        console.log('[Text blur] Blur event fired');
        commit();
      } else {
        console.log('[Text blur] Blur event ignored (too soon - focus settling)');
      }
    });
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // Don't trigger global shortcuts while typing
      if (e.key === 'Escape') {
        committed = true;
        input.remove();
        this.canvas.style.pointerEvents = 'auto';
        console.log('[Text escape] Re-enabled canvas pointer events');
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        commit();
      }
    });
  }

  _placeStamp(x, y) {
    // Get the parent PDFRenderer instance to access selectedStamp
    // Check both window.pdfViewer and window.pdfRenderer (different names used)
    const viewer = window.pdfViewer || window.pdfRenderer;
    const selectedStamp = viewer?.selectedStamp;
    
    if (!selectedStamp) {
      console.warn('[Stamp] No stamp selected. Viewer:', viewer);
      return;
    }

    console.log('[Stamp] Placing stamp:', selectedStamp, 'at', x, y);

    // Handle custom stamps
    let stampData;
    if (selectedStamp === 'custom') {
      const customText = viewer?.customStampText || 'CUSTOM';
      const customColor = viewer?.customStampColor || '#E53935';
      
      // Calculate width based on text length
      const textLength = customText.length;
      const charWidth = 18; // Approximate width per character
      const padding = 40;
      const height = STAMP_DEFAULT_HEIGHT;
      const width = Math.max(textLength * charWidth + padding, 120);
      
      stampData = {
        x: x - (width / 2),
        y: y - (height / 2),
        width: width,
        height: height,
        stamp: 'custom',
        customText: customText,
        customColor: customColor,
        rotation: 0,
      };
      
      console.log('[Custom Stamp] Text:', customText, 'Color:', customColor);
    } else {
      // Regular pre-made stamp
      const aspectRatio = STAMP_ASPECT_RATIOS[selectedStamp] || 2.5;
      const height = STAMP_DEFAULT_HEIGHT;
      const width = height * aspectRatio;
      
      stampData = {
        x: x - (width / 2),
        y: y - (height / 2),
        width: width,
        height: height,
        stamp: selectedStamp,
        rotation: 0,
      };
    }

    // Create stamp annotation
    const stampId = uid();
    this.store.add(this._page, {
      id: stampId,
      page: this._page,
      type: 'stamp',
      color: this.color,
      width: 1,
      data: stampData,
    });

    // Auto-switch to select tool and select the stamp for immediate resize/rotate
    // Call PDFRenderer's _setActiveTool to update both UI and layer
    if (viewer && viewer._setActiveTool) {
      viewer._setActiveTool('select');
    } else {
      // Fallback: just update the layer
      this.setTool('select');
    }
    
    this._selected.clear();
    this._selected.add(stampId);
    
    console.log('[Stamp] Auto-selected stamp for immediate editing');

    this.redraw();
    this.onChanged();
  }
}

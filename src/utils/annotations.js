/**
 * Annotation data model and serialization.
 *
 * Each annotation is a plain object with:
 *   - id:    string (uuid)
 *   - page:  number (1-based)
 *   - type:  'pen' | 'highlighter' | 'text' | 'rect' | 'circle' | 'arrow'
 *   - color: string (hex)
 *   - width: number (stroke width)
 *   - data:  type-specific payload
 *
 * Data shapes:
 *   pen/highlighter: { points: [{x,y}] }
 *   text:            { x, y, content, fontSize }
 *   rect:            { x, y, w, h }
 *   circle:          { cx, cy, rx, ry }
 *   arrow:           { x1, y1, x2, y2 }
 */

let _id = 0;
export function uid() {
  return `ann_${Date.now()}_${++_id}`;
}

/**
 * Annotation store — per-page arrays, undo/redo stacks.
 */
export class AnnotationStore {
  constructor() {
    /** @type {Map<number, object[]>} page → annotations */
    this.pages = new Map();
    /** @type {object[][]} undo stack (snapshots) */
    this.undoStack = [];
    /** @type {object[][]} redo stack */
    this.redoStack = [];
    this._currentPage = 1;
  }

  /** Set current page context for undo/redo. */
  setPage(page) { this._currentPage = page; }

  /** Get annotations for a page. */
  get(page) {
    if (!this.pages.has(page)) this.pages.set(page, []);
    return this.pages.get(page);
  }

  /** Push undo snapshot before a mutation. */
  _pushUndo() {
    const p = this._currentPage;
    this.undoStack.push({ page: p, snapshot: structuredClone(this.get(p)) });
    this.redoStack = [];
    // Limit stack size
    if (this.undoStack.length > 100) this.undoStack.shift();
  }

  /** Add an annotation. */
  add(page, annotation) {
    this._pushUndo();
    this.get(page).push(annotation);
  }

  /** Remove annotation by id. */
  remove(page, id) {
    this._pushUndo();
    const list = this.get(page);
    const idx = list.findIndex(a => a.id === id);
    if (idx !== -1) list.splice(idx, 1);
  }

  /** Clear all on page. */
  clearPage(page) {
    this._pushUndo();
    this.pages.set(page, []);
  }

  /** Undo last action. Returns the affected page or null. */
  undo() {
    if (!this.undoStack.length) return null;
    const { page, snapshot } = this.undoStack.pop();
    this.redoStack.push({ page, snapshot: structuredClone(this.get(page)) });
    this.pages.set(page, snapshot);
    return page;
  }

  /** Redo. Returns the affected page or null. */
  redo() {
    if (!this.redoStack.length) return null;
    const { page, snapshot } = this.redoStack.pop();
    this.undoStack.push({ page, snapshot: structuredClone(this.get(page)) });
    this.pages.set(page, snapshot);
    return page;
  }

  /** Public method to push an undo snapshot (e.g., before drag operations). */
  pushUndo() {
    this._pushUndo();
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  /** Export all annotations as a serializable object. */
  toJSON() {
    const result = {};
    for (const [page, annotations] of this.pages) {
      if (annotations.length) result[page] = annotations;
    }
    return { version: 1, annotations: result };
  }

  /** Import from JSON. */
  fromJSON(data) {
    this.pages.clear();
    this.undoStack = [];
    this.redoStack = [];
    if (data && data.annotations) {
      for (const [page, annotations] of Object.entries(data.annotations)) {
        this.pages.set(Number(page), annotations);
      }
    }
  }

  /** Find annotation at a point (for eraser). */
  hitTest(page, x, y, tolerance = 8) {
    const annotations = this.get(page);
    // Search in reverse order (top-most first)
    for (let i = annotations.length - 1; i >= 0; i--) {
      const a = annotations[i];
      if (hitTestAnnotation(a, x, y, tolerance)) return a;
    }
    return null;
  }
}

function hitTestAnnotation(a, x, y, tol) {
  switch (a.type) {
    case 'pen':
    case 'highlighter': {
      for (const pt of a.data.points) {
        if (Math.hypot(pt.x - x, pt.y - y) < tol + a.width / 2) return true;
      }
      return false;
    }
    case 'text': {
      const w = a.data.content.length * a.data.fontSize * 0.6;
      const h = a.data.fontSize * 1.4;
      return x >= a.data.x - 4 && x <= a.data.x + w + 4 &&
             y >= a.data.y - h - 4 && y <= a.data.y + 4;
    }
    case 'rect': {
      const { x: rx, y: ry, w: rw, h: rh, rotation } = a.data;
      
      // Transform click point into rect's local space if rotated
      let localX = x;
      let localY = y;
      if (rotation) {
        const centerX = rx + rw / 2;
        const centerY = ry + rh / 2;
        const rad = (-rotation * Math.PI) / 180; // Inverse rotation
        const dx = x - centerX;
        const dy = y - centerY;
        localX = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
        localY = centerY + dx * Math.sin(rad) + dy * Math.cos(rad);
      }
      
      return localX >= rx - tol && localX <= rx + rw + tol && 
             localY >= ry - tol && localY <= ry + rh + tol;
    }
    case 'circle': {
      const { cx, cy, rx, ry, rotation } = a.data;
      
      // Transform click point into circle's local space if rotated (for ellipse)
      let localX = x;
      let localY = y;
      if (rotation) {
        const rad = (-rotation * Math.PI) / 180; // Inverse rotation
        const dx = x - cx;
        const dy = y - cy;
        localX = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
        localY = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
      }
      
      const dxNorm = (localX - cx) / rx;
      const dyNorm = (localY - cy) / ry;
      return (dxNorm * dxNorm + dyNorm * dyNorm) <= 1.3; // slightly generous
    }
    case 'arrow': {
      const { x1, y1, x2, y2 } = a.data;
      return distToSegment(x, y, x1, y1, x2, y2) < tol + a.width;
    }
    case 'stamp': {
      const { x: sx, y: sy, width, height, rotation } = a.data;
      
      // Transform click point into stamp's local space if rotated
      let localX = x;
      let localY = y;
      if (rotation) {
        const centerX = sx + width / 2;
        const centerY = sy + height / 2;
        const rad = (-rotation * Math.PI) / 180; // Inverse rotation
        const dx = x - centerX;
        const dy = y - centerY;
        localX = centerX + dx * Math.cos(rad) - dy * Math.sin(rad);
        localY = centerY + dx * Math.sin(rad) + dy * Math.cos(rad);
      }
      
      return localX >= sx - tol && localX <= sx + width + tol && 
             localY >= sy - tol && localY <= sy + height + tol;
    }
    default: return false;
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

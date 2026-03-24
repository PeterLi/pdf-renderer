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
      const { x: rx, y: ry, w: rw, h: rh } = a.data;
      return x >= rx - tol && x <= rx + rw + tol && y >= ry - tol && y <= ry + rh + tol;
    }
    case 'circle': {
      const dx = (x - a.data.cx) / a.data.rx;
      const dy = (y - a.data.cy) / a.data.ry;
      return (dx * dx + dy * dy) <= 1.3; // slightly generous
    }
    case 'arrow': {
      const { x1, y1, x2, y2 } = a.data;
      return distToSegment(x, y, x1, y1, x2, y2) < tol + a.width;
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

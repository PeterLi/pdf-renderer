/**
 * PDF Renderer — Main Application
 * Interact Technology
 */
import { loadPDF, renderPage, renderThumbnail } from './utils/pdf.js';
import { AnnotationStore } from './utils/annotations.js';
import { AnnotationLayer } from './components/AnnotationLayer.js';
import { exportAnnotatedPDF } from './utils/export.js';
import { showToast } from './utils/toast.js';

// ============================================================
// State
// ============================================================
let pdfDoc = null;
let pdfBytes = null; // original bytes for export
let currentPage = 1;
let totalPages = 0;
let currentScale = 1;
let baseScale = 1; // scale for "fit to width"

const store = new AnnotationStore();
let annotationLayer = null;

// ============================================================
// DOM References
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  // Toolbar
  btnSidebar:    $('#btn-sidebar'),
  btnOpen:       $('#btn-open'),
  filename:      $('#filename'),
  btnPrev:       $('#btn-prev'),
  btnNext:       $('#btn-next'),
  pageInput:     $('#page-input'),
  pageCount:     $('#page-count'),
  btnZoomOut:    $('#btn-zoom-out'),
  btnZoomIn:     $('#btn-zoom-in'),
  zoomLevel:     $('#zoom-level'),
  btnFitWidth:   $('#btn-fit-width'),
  btnFitPage:    $('#btn-fit-page'),
  btnAnnotations:$('#btn-annotations'),
  btnHelp:       $('#btn-help'),

  // Annotation bar
  annotationBar: $('#annotation-bar'),
  strokeWidth:   $('#stroke-width'),
  strokeValue:   $('#stroke-value'),
  customColor:   $('#custom-color'),
  btnUndo:       $('#btn-undo'),
  btnRedo:       $('#btn-redo'),
  btnToggleLayer:$('#btn-toggle-layer'),
  btnClear:      $('#btn-clear'),
  btnExportJSON: $('#btn-export-json'),
  btnImportJSON: $('#btn-import-json'),
  btnSavePDF:    $('#btn-save-pdf'),

  // Layout
  sidebar:       $('#sidebar'),
  thumbnailList: $('#thumbnail-list'),
  viewport:      $('#viewport'),
  landing:       $('#landing'),
  pdfContainer:  $('#pdf-container'),
  pageWrapper:   $('#page-wrapper'),
  pdfCanvas:     $('#pdf-canvas'),
  annotCanvas:   $('#annotation-canvas'),

  // Landing
  btnOpenLanding:$('#btn-open-landing'),
  btnDemo:       $('#btn-demo'),

  // Overlays
  helpOverlay:   $('#help-overlay'),
  btnCloseHelp:  $('#btn-close-help'),
  btnCloseSidebar:$('#btn-close-sidebar'),

  // File inputs
  fileInput:     $('#file-input'),
  jsonInput:     $('#json-input'),
};

// ============================================================
// PDF Loading & Rendering
// ============================================================

async function openFile(file) {
  try {
    const buffer = await file.arrayBuffer();
    // Create a copy for pdf-lib export (PDF.js will consume the original)
    pdfBytes = new Uint8Array(buffer).slice();
    // Create another copy for PDF.js rendering
    const pdfJsBytes = new Uint8Array(buffer);
    pdfDoc = await loadPDF(pdfJsBytes);
    totalPages = pdfDoc.numPages;
    currentPage = 1;

    // Reset annotations
    store.pages.clear();
    store.undoStack = [];
    store.redoStack = [];

    // Init annotation layer
    if (!annotationLayer) {
      annotationLayer = new AnnotationLayer(els.annotCanvas, store, onAnnotationsChanged);
    }

    // UI update
    els.filename.textContent = file.name || 'Document';
    els.pageCount.textContent = totalPages;
    els.landing.classList.add('hidden');
    els.pdfContainer.classList.remove('hidden');
    enableControls(true);

    // Calculate fit-to-width scale
    await calculateBaseScale();
    currentScale = baseScale;
    await renderCurrentPage();
    await generateThumbnails();

    showToast(`Loaded "${file.name}" — ${totalPages} page${totalPages > 1 ? 's' : ''}`, 'success');
  } catch (err) {
    console.error('PDF loading error:', err);
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    showToast(`Failed to open PDF: ${err.message || 'Unknown error'}`, 'error');
  }
}

async function openFromURL(url) {
  try {
    const resp = await fetch(url);
    const buffer = await resp.arrayBuffer();
    const file = new File([buffer], url.split('/').pop() || 'document.pdf', { type: 'application/pdf' });
    await openFile(file);
  } catch (err) {
    console.error(err);
    showToast('Failed to load PDF from URL.', 'error');
  }
}

async function calculateBaseScale() {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const containerWidth = els.viewport.clientWidth - 48; // padding
  baseScale = containerWidth / viewport.width;
  // Clamp
  baseScale = Math.max(0.25, Math.min(baseScale, 3));
}

async function renderCurrentPage() {
  if (!pdfDoc) return;

  const dims = await renderPage(pdfDoc, currentPage, els.pdfCanvas, currentScale);

  // Size annotation canvas to match
  annotationLayer.page = currentPage;
  annotationLayer.scale = currentScale;
  annotationLayer.resize(dims.width, dims.height);
  store.setPage(currentPage);

  // Update UI
  els.pageInput.value = currentPage;
  els.zoomLevel.textContent = `${Math.round(currentScale * 100)}%`;
  els.btnPrev.disabled = currentPage <= 1;
  els.btnNext.disabled = currentPage >= totalPages;
  updateUndoRedoButtons();
  updateThumbnailHighlight();
}

function enableControls(enabled) {
  const btns = [els.btnPrev, els.btnNext, els.btnZoomIn, els.btnZoomOut,
                els.zoomLevel, els.btnFitWidth, els.btnFitPage];
  btns.forEach(b => b.disabled = !enabled);
}

// ============================================================
// Thumbnails
// ============================================================

async function generateThumbnails() {
  els.thumbnailList.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const canvas = await renderThumbnail(pdfDoc, i, 150);
    const item = document.createElement('div');
    item.className = 'thumbnail-item' + (i === currentPage ? ' active' : '');
    item.dataset.page = i;
    item.appendChild(canvas);
    const label = document.createElement('div');
    label.className = 'thumbnail-label';
    label.textContent = `Page ${i}`;
    item.appendChild(label);
    item.addEventListener('click', () => goToPage(i));
    els.thumbnailList.appendChild(item);
  }
}

function updateThumbnailHighlight() {
  $$('.thumbnail-item').forEach(el => {
    el.classList.toggle('active', Number(el.dataset.page) === currentPage);
  });
}

// ============================================================
// Navigation
// ============================================================

async function goToPage(num) {
  num = Math.max(1, Math.min(num, totalPages));
  if (num === currentPage && pdfDoc) {
    // Just re-render in case of scale change
  }
  currentPage = num;
  await renderCurrentPage();
  // Scroll viewport to top
  els.viewport.scrollTop = 0;
}

async function zoomTo(scale) {
  currentScale = Math.max(0.25, Math.min(scale, 5));
  await renderCurrentPage();
}

async function fitToWidth() {
  await calculateBaseScale();
  await zoomTo(baseScale);
}

async function fitToPage() {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(currentPage);
  const viewport = page.getViewport({ scale: 1 });
  const containerWidth = els.viewport.clientWidth - 48;
  const containerHeight = els.viewport.clientHeight - 48;
  const scaleW = containerWidth / viewport.width;
  const scaleH = containerHeight / viewport.height;
  await zoomTo(Math.min(scaleW, scaleH));
}

// ============================================================
// Annotations UI
// ============================================================

function onAnnotationsChanged() {
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  els.btnUndo.disabled = !store.canUndo;
  els.btnRedo.disabled = !store.canRedo;
}

function setActiveTool(tool) {
  $$('.tool-btn[data-tool]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === tool);
  });
  if (annotationLayer) annotationLayer.setTool(tool);
}

function setActiveColor(color) {
  $$('.color-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color === color);
  });
  if (annotationLayer) annotationLayer.color = color;
  els.customColor.value = color;
}

// ============================================================
// Export / Import
// ============================================================

function exportAnnotationsJSON() {
  const data = store.toJSON();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'annotations.json');
  showToast('Annotations exported!', 'success');
}

function importAnnotationsJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      store.fromJSON(data);
      annotationLayer?.redraw();
      showToast('Annotations imported!', 'success');
    } catch {
      showToast('Invalid annotation file.', 'error');
    }
  };
  reader.readAsText(file);
}

async function savePDF() {
  if (!pdfBytes) {
    showToast('No PDF loaded', 'error');
    return;
  }
  
  console.log('[save] pdfBytes type:', pdfBytes.constructor.name);
  console.log('[save] pdfBytes length:', pdfBytes.length);
  console.log('[save] First 10 bytes:', Array.from(pdfBytes.slice(0, 10)));
  
  try {
    // Pass current scale so annotations are positioned correctly
    const bytes = await exportAnnotatedPDF(pdfBytes, store, currentScale);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    downloadBlob(blob, 'annotated.pdf');
    showToast('Annotated PDF saved!', 'success');
  } catch (err) {
    console.error(err);
    showToast('Failed to save PDF.', 'error');
  }
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Event Bindings
// ============================================================

function bindEvents() {
  // File open
  els.btnOpen.addEventListener('click', () => els.fileInput.click());
  els.btnOpenLanding.addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) openFile(e.target.files[0]);
    e.target.value = '';
  });

  // Demo
  els.btnDemo.addEventListener('click', () => openFromURL('./sample.pdf'));

  // Navigation
  els.btnPrev.addEventListener('click', () => goToPage(currentPage - 1));
  els.btnNext.addEventListener('click', () => goToPage(currentPage + 1));
  els.pageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      goToPage(parseInt(els.pageInput.value, 10) || 1);
      els.pageInput.blur();
    }
  });

  // Zoom
  els.btnZoomIn.addEventListener('click', () => zoomTo(currentScale * 1.2));
  els.btnZoomOut.addEventListener('click', () => zoomTo(currentScale / 1.2));
  els.zoomLevel.addEventListener('click', () => zoomTo(1));
  els.btnFitWidth.addEventListener('click', fitToWidth);
  els.btnFitPage.addEventListener('click', fitToPage);

  // Sidebar
  els.btnSidebar.addEventListener('click', toggleSidebar);
  els.btnCloseSidebar.addEventListener('click', toggleSidebar);

  // Annotation bar toggle
  els.btnAnnotations.addEventListener('click', toggleAnnotationBar);

  // Tool buttons
  $$('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
  });

  // Color swatches
  $$('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => setActiveColor(swatch.dataset.color));
  });
  els.customColor.addEventListener('input', (e) => {
    setActiveColor(e.target.value);
  });

  // Stroke width
  els.strokeWidth.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    els.strokeValue.textContent = val;
    if (annotationLayer) annotationLayer.strokeWidth = val;
  });

  // Undo / Redo
  els.btnUndo.addEventListener('click', () => {
    const page = store.undo();
    if (page !== null) {
      if (page !== currentPage) goToPage(page);
      annotationLayer?.redraw();
      onAnnotationsChanged();
    }
  });
  els.btnRedo.addEventListener('click', () => {
    const page = store.redo();
    if (page !== null) {
      if (page !== currentPage) goToPage(page);
      annotationLayer?.redraw();
      onAnnotationsChanged();
    }
  });

  // Toggle layer
  els.btnToggleLayer.addEventListener('click', () => {
    if (!annotationLayer) return;
    annotationLayer.visible = !annotationLayer.visible;
    els.btnToggleLayer.classList.toggle('active', annotationLayer.visible);
    els.btnToggleLayer.querySelector('span').textContent = annotationLayer.visible ? 'Visible' : 'Hidden';
    annotationLayer.redraw();
  });

  // Clear
  els.btnClear.addEventListener('click', () => {
    if (!pdfDoc) return;
    store.clearPage(currentPage);
    annotationLayer?.redraw();
    onAnnotationsChanged();
    showToast('Annotations cleared on this page.', 'info');
  });

  // Export / Import
  els.btnExportJSON.addEventListener('click', exportAnnotationsJSON);
  els.btnImportJSON.addEventListener('click', () => els.jsonInput.click());
  els.jsonInput.addEventListener('change', (e) => {
    if (e.target.files[0]) importAnnotationsJSON(e.target.files[0]);
    e.target.value = '';
  });
  els.btnSavePDF.addEventListener('click', savePDF);

  // Help
  els.btnHelp.addEventListener('click', () => toggleOverlay(els.helpOverlay));
  els.btnCloseHelp.addEventListener('click', () => els.helpOverlay.classList.add('hidden'));

  // Drag & Drop
  els.viewport.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.viewport.classList.add('drag-over');
  });
  els.viewport.addEventListener('dragleave', () => {
    els.viewport.classList.remove('drag-over');
  });
  els.viewport.addEventListener('drop', (e) => {
    e.preventDefault();
    els.viewport.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      openFile(file);
    } else {
      showToast('Please drop a PDF file.', 'error');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // Window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(async () => {
      if (pdfDoc) {
        await calculateBaseScale();
        await renderCurrentPage();
      }
    }, 150);
  });

  // Scroll-based zoom (Ctrl+wheel)
  els.viewport.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoomTo(currentScale * delta);
    }
  }, { passive: false });
}

function toggleSidebar() {
  els.sidebar.classList.toggle('hidden');
  els.btnSidebar.classList.toggle('active', !els.sidebar.classList.contains('hidden'));
  // Re-render to fit new available width
  setTimeout(async () => {
    if (pdfDoc) {
      await calculateBaseScale();
      await renderCurrentPage();
    }
  }, 200);
}

function toggleAnnotationBar() {
  els.annotationBar.classList.toggle('hidden');
  els.btnAnnotations.classList.toggle('active', !els.annotationBar.classList.contains('hidden'));
}

function toggleOverlay(overlay) {
  overlay.classList.toggle('hidden');
}

function handleKeyboard(e) {
  // Don't handle if user is typing in an input
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  const ctrl = e.ctrlKey || e.metaKey;

  // Ctrl+O — open file
  if (ctrl && e.key === 'o') {
    e.preventDefault();
    els.fileInput.click();
    return;
  }

  // Ctrl+Z — undo
  if (ctrl && !e.shiftKey && e.key === 'z') {
    e.preventDefault();
    els.btnUndo.click();
    return;
  }

  // Ctrl+Shift+Z — redo
  if (ctrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    els.btnRedo.click();
    return;
  }

  // Ctrl+Plus/Minus/0 — zoom
  if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); zoomTo(currentScale * 1.2); return; }
  if (ctrl && e.key === '-') { e.preventDefault(); zoomTo(currentScale / 1.2); return; }
  if (ctrl && e.key === '0') { e.preventDefault(); zoomTo(1); return; }

  // Page navigation
  if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); goToPage(currentPage - 1); return; }
  if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); goToPage(currentPage + 1); return; }
  if (e.key === 'Home') { e.preventDefault(); goToPage(1); return; }
  if (e.key === 'End') { e.preventDefault(); goToPage(totalPages); return; }

  // Tool shortcuts
  if (e.key === 'a') { toggleAnnotationBar(); return; }
  if (e.key === 'v') { setActiveTool('select'); return; }
  if (e.key === 'd') { setActiveTool('pen'); return; }
  if (e.key === 'h') { setActiveTool('highlighter'); return; }
  if (e.key === 'x') { setActiveTool('text'); return; }
  if (e.key === 'r') { setActiveTool('rect'); return; }
  if (e.key === 'c') { setActiveTool('circle'); return; }
  if (e.key === 'l') { setActiveTool('arrow'); return; }
  if (e.key === 'e') { setActiveTool('eraser'); return; }

  // View shortcuts
  if (e.key === 'w') { fitToWidth(); return; }
  if (e.key === 'p') { fitToPage(); return; }
  if (e.key === 't') { toggleSidebar(); return; }

  // Help
  if (e.key === '?') { toggleOverlay(els.helpOverlay); return; }

  // Delete / Backspace — delete selected annotations
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (annotationLayer && annotationLayer.handleKeyDown(e)) {
      e.preventDefault();
      return;
    }
  }

  // Escape — deselect annotations first, then fall through to close overlays
  if (e.key === 'Escape') {
    if (annotationLayer && annotationLayer.handleKeyDown(e)) {
      return;
    }
    els.helpOverlay.classList.add('hidden');
    setActiveTool('select');
    return;
  }
}

// ============================================================
// Init
// ============================================================

bindEvents();

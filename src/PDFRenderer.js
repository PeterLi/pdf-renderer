/**
 * PDF Renderer Library
 * A reusable PDF viewer with annotation and form-filling capabilities
 * By Peter Li
 */
import { loadPDF, renderPage, renderThumbnail } from './utils/pdf.js';
import { AnnotationStore } from './utils/annotations.js';
import { AnnotationLayer } from './components/AnnotationLayer.js';
import { exportAnnotatedPDF } from './utils/export.js';
import { detectFormFields, readFieldValues, exportFilledPDF } from './utils/forms.js';
import { FormLayer } from './components/FormLayer.js';
import { showToast } from './utils/toast.js';

/**
 * PDFRenderer - Embeddable PDF viewer with annotations
 *
 * @example
 * const viewer = new PDFRenderer({
 *   pdfUrl: 'document.pdf',
 * });
 */
class PDFRenderer {
  constructor(options = {}) {
    console.log('[PDFRenderer] Constructor called with options:', options);

    this.config = {
      pdfUrl: options.pdfUrl || null,
      onLoad: options.onLoad || null,
      onError: options.onError || null,
      // Form validation & JavaScript config
      allowFormJavaScript: options.allowFormJavaScript ?? true,  // Sandboxed JS is secure - enabled by default
      validateOnBlur: options.validateOnBlur ?? true,
      validateOnSubmit: options.validateOnSubmit ?? true,
      showValidationErrors: options.showValidationErrors ?? true,
    };

    // State
    this.pdfDoc = null;
    this.pdfBytes = null;
    this.currentPage = 1;
    this.totalPages = 0;
    this.currentScale = 1;
    this.baseScale = 1;

    this.store = new AnnotationStore();
    this.annotationLayer = null;

    // Form state
    this.formLayer = null;
    this.formMode = true;  // Default ON - form overlays are performant and hide PDF text duplication
    this.formFieldsByPage = new Map();
    this.formFieldCount = 0;
    this.hasForm = false;
    /** @type {Map<string, import('./utils/forms.js').EnhancedFieldMeta>} */
    this.enhancedMeta = new Map();

    // Initialize
    console.log('[PDFRenderer] Caching DOM elements...');
    this._cacheElements();
    console.log('[PDFRenderer] DOM elements cached:', Object.fromEntries(
      Object.entries(this.els).map(([k, v]) => [k, v ? 'found' : 'NULL'])
    ));
    console.log('[PDFRenderer] Binding events...');
    this._bindEvents();
    console.log('[PDFRenderer] Events bound, starting initialization...');
    this._initialize();
    
    // Expose to window for AnnotationLayer to access selectedStamp
    window.pdfViewer = this;
    console.log('[PDFRenderer] Exposed as window.pdfViewer');
  }

  // ============================================================
  // DOM & Event Setup
  // ============================================================

  _cacheElements() {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);
    this.$ = $;
    this.$$ = $$;

    this.els = {
      btnSidebar:     $('#btn-sidebar'),
      btnOpen:        $('#btn-open'),
      filename:       $('#filename'),
      btnPrev:        $('#btn-prev'),
      btnNext:        $('#btn-next'),
      pageInput:      $('#page-input'),
      pageCount:      $('#page-count'),
      btnZoomOut:     $('#btn-zoom-out'),
      btnZoomIn:      $('#btn-zoom-in'),
      zoomLevel:      $('#zoom-level'),
      btnFitWidth:    $('#btn-fit-width'),
      btnFitPage:     $('#btn-fit-page'),
      btnAnnotations: $('#btn-annotations'),
      btnHelp:        $('#btn-help'),

      annotationBar:  $('#annotation-bar'),
      strokeWidth:    $('#stroke-width'),
      strokeValue:    $('#stroke-value'),
      customColor:    $('#custom-color'),
      btnUndo:        $('#btn-undo'),
      btnRedo:        $('#btn-redo'),
      btnToggleLayer: $('#btn-toggle-layer'),
      btnClear:       $('#btn-clear'),
      btnExportJSON:  $('#btn-export-json'),
      btnImportJSON:  $('#btn-import-json'),
      btnSavePDF:     $('#btn-save-pdf'),

      sidebar:        $('#sidebar'),
      thumbnailList:  $('#thumbnail-list'),
      viewport:       $('#viewport'),
      landing:        $('#landing'),
      pdfContainer:   $('#pdf-container'),
      pageWrapper:    $('#page-wrapper'),
      pdfCanvas:      $('#pdf-canvas'),
      annotCanvas:    $('#annotation-canvas'),

      btnOpenLanding: $('#btn-open-landing'),
      btnDemo:        $('#btn-demo'),

      helpOverlay:    $('#help-overlay'),
      btnCloseHelp:   $('#btn-close-help'),
      btnCloseSidebar:$('#btn-close-sidebar'),

      btnFormMode:    $('#btn-form-mode'),
      formBar:        $('#form-bar'),
      formFieldCount: $('#form-field-count'),
      btnClearForm:   $('#btn-clear-form'),
      btnJsToggle:    $('#btn-js-toggle'),
      jsStatus:       $('#js-status'),
      btnValidateForm:$('#btn-validate-form'),
      btnExportFilled:$('#btn-export-filled'),

      fileInput:      $('#file-input'),
      jsonInput:      $('#json-input'),
    };
  }

  _bindEvents() {
    const { els } = this;

    // File open
    els.btnOpen.addEventListener('click', () => els.fileInput.click());
    els.btnOpenLanding.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this._openFile(e.target.files[0]);
      e.target.value = '';
    });

    // Demo
    els.btnDemo.addEventListener('click', () => this.openFromURL('./sample-enhanced.pdf'));

    // Navigation
    els.btnPrev.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    els.btnNext.addEventListener('click', () => this.goToPage(this.currentPage + 1));
    els.pageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.goToPage(parseInt(els.pageInput.value, 10) || 1);
        els.pageInput.blur();
      }
    });

    // Zoom
    els.btnZoomIn.addEventListener('click', () => this._zoomTo(this.currentScale * 1.2));
    els.btnZoomOut.addEventListener('click', () => this._zoomTo(this.currentScale / 1.2));
    els.zoomLevel.addEventListener('click', () => this._zoomTo(1));
    els.btnFitWidth.addEventListener('click', () => this._fitToWidth());
    els.btnFitPage.addEventListener('click', () => this._fitToPage());

    // Sidebar
    els.btnSidebar.addEventListener('click', () => this._toggleSidebar());
    els.btnCloseSidebar.addEventListener('click', () => this._toggleSidebar());

    // Annotation bar toggle
    els.btnAnnotations.addEventListener('click', () => this._toggleAnnotationBar());

    // Form mode
    els.btnFormMode.addEventListener('click', () => this._toggleFormMode());
    els.btnClearForm.addEventListener('click', () => this._clearFormFields());
    if (els.btnJsToggle) {
      els.btnJsToggle.addEventListener('click', () => this._toggleJavaScript());
    }
    if (els.btnValidateForm) {
      els.btnValidateForm.addEventListener('click', () => this._validateForm());
    }
    els.btnExportFilled.addEventListener('click', () => this._exportFilledPDF());

    // Tool buttons (only ones with data-tool attribute)
    this.$$('.tool-btn[data-tool]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Special handling for stamp tool - toggle dropdown
        if (btn.dataset.tool === 'stamp') {
          e.stopPropagation();
          const dropdown = this.$('#stamp-dropdown');
          if (dropdown) {
            const isHidden = dropdown.classList.contains('hidden');
            
            if (isHidden) {
              // Showing dropdown
              // Move dropdown to body to escape overflow clipping
              document.body.appendChild(dropdown);
              
              // Show it temporarily to measure
              dropdown.style.visibility = 'hidden';
              dropdown.classList.remove('hidden');
              
              const rect = btn.getBoundingClientRect();
              const dropdownRect = dropdown.getBoundingClientRect();
              
              // Position dropdown so the arrow (at center) points at center of button
              const buttonCenterX = rect.left + (rect.width / 2);
              const dropdownWidth = dropdownRect.width;
              
              dropdown.style.left = `${buttonCenterX - (dropdownWidth / 2)}px`;
              dropdown.style.top = `${rect.bottom + 12}px`;
              dropdown.style.visibility = 'visible';
            } else {
              // Hiding dropdown
              dropdown.classList.add('hidden');
            }
          }
        } else {
          this._setActiveTool(btn.dataset.tool);
        }
      });
    });

    // Stamp dropdown options
    this.selectedStamp = null;
    this.customStampText = null;
    this.customStampColor = null;
    this.$$('.stamp-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const stampType = option.dataset.stamp;
        
        if (stampType === 'custom') {
          // Show custom stamp modal
          this._showCustomStampModal();
          // Hide dropdown
          const dropdown = this.$('#stamp-dropdown');
          if (dropdown) dropdown.classList.add('hidden');
        } else {
          // Regular pre-made stamp
          this.selectedStamp = stampType;
          this.customStampText = null;
          this.customStampColor = null;
          console.log('[Stamp] Selected stamp:', this.selectedStamp);
          this._setActiveTool('stamp');
          // Hide dropdown after selection
          const dropdown = this.$('#stamp-dropdown');
          if (dropdown) dropdown.classList.add('hidden');
        }
        
        // Expose to window for AnnotationLayer
        window.pdfViewer = this;
      });
    });

    // Close stamp dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = this.$('#stamp-dropdown');
      const stampBtn = this.$('#tool-stamp');
      if (dropdown && !dropdown.classList.contains('hidden')) {
        if (!dropdown.contains(e.target) && e.target !== stampBtn) {
          dropdown.classList.add('hidden');
        }
      }
    });

    // Color swatches
    this.$$('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => this._setActiveColor(swatch.dataset.color));
    });
    els.customColor.addEventListener('input', (e) => this._setActiveColor(e.target.value));

    // Stroke width
    els.strokeWidth.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      els.strokeValue.textContent = val;
      if (this.annotationLayer) this.annotationLayer.strokeWidth = val;
    });

    // Undo / Redo
    els.btnUndo.addEventListener('click', () => {
      const page = this.store.undo();
      if (page !== null) {
        if (page !== this.currentPage) this.goToPage(page);
        this.annotationLayer?.redraw();
        this._updateUndoRedoButtons();
      }
    });
    els.btnRedo.addEventListener('click', () => {
      const page = this.store.redo();
      if (page !== null) {
        if (page !== this.currentPage) this.goToPage(page);
        this.annotationLayer?.redraw();
        this._updateUndoRedoButtons();
      }
    });

    // Toggle annotation layer visibility
    els.btnToggleLayer.addEventListener('click', () => {
      if (!this.annotationLayer) return;
      this.annotationLayer.visible = !this.annotationLayer.visible;
      els.btnToggleLayer.classList.toggle('active', this.annotationLayer.visible);
      els.btnToggleLayer.querySelector('span').textContent = this.annotationLayer.visible ? 'Visible' : 'Hidden';
      this.annotationLayer.redraw();
    });

    // Clear annotations
    els.btnClear.addEventListener('click', () => {
      if (!this.pdfDoc) return;
      this.store.clearPage(this.currentPage);
      this.annotationLayer?.redraw();
      this._updateUndoRedoButtons();
      showToast('Annotations cleared on this page.', 'info');
    });

    // Export / Import
    els.btnExportJSON.addEventListener('click', () => this._exportAnnotationsJSON());
    els.btnImportJSON.addEventListener('click', () => els.jsonInput.click());
    els.jsonInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this._importAnnotationsJSON(e.target.files[0]);
      e.target.value = '';
    });
    els.btnSavePDF.addEventListener('click', () => this._savePDF());

    // Help
    els.btnHelp.addEventListener('click', () => this._toggleOverlay(els.helpOverlay));
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
        this._openFile(file);
      } else {
        showToast('Please drop a PDF file.', 'error');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._handleKeyboard(e));

    // Window resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(async () => {
        if (this.pdfDoc) {
          await this._calculateBaseScale();
          await this._renderCurrentPage();
        }
      }, 150);
    });

    // Scroll-based zoom (Ctrl+wheel)
    els.viewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this._zoomTo(this.currentScale * delta);
      }
    }, { passive: false });
  }

  async _initialize() {
    console.log('[PDFRenderer] _initialize called, pdfUrl:', this.config.pdfUrl);
    if (this.config.pdfUrl) {
      try {
        console.log('[PDFRenderer] Loading PDF from URL:', this.config.pdfUrl);
        await this.openFromURL(this.config.pdfUrl);
        console.log('[PDFRenderer] PDF loaded successfully');
      } catch (error) {
        console.error('[PDFRenderer] Failed to load PDF:', error);
        if (this.config.onError) {
          this.config.onError(error);
        } else {
          showToast('Failed to load PDF: ' + error.message, 'error');
        }
      }
    } else {
      console.log('[PDFRenderer] No pdfUrl provided, waiting for user action');
    }
  }

  // ============================================================
  // Public API
  // ============================================================

  async openFromURL(url) {
    console.log('[PDFRenderer] openFromURL called:', url);
    try {
      const resp = await fetch(url);
      console.log('[PDFRenderer] Fetch response:', resp.status, resp.statusText);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      const buffer = await resp.arrayBuffer();
      console.log('[PDFRenderer] Received', buffer.byteLength, 'bytes');
      const file = new File([buffer], url.split('/').pop() || 'document.pdf', { type: 'application/pdf' });
      this._sourceURL = url;
      await this._openFile(file);
    } catch (err) {
      console.error('[PDFRenderer] openFromURL error:', err);
      showToast('Failed to load PDF from URL.', 'error');
    }
  }

  async goToPage(num) {
    num = Math.max(1, Math.min(num, this.totalPages));
    this.currentPage = num;
    await this._renderCurrentPage();
    this.els.viewport.scrollTop = 0;
  }

  // ============================================================
  // Private: PDF Loading & Rendering
  // ============================================================

  async _openFile(file) {
    console.log('[PDFRenderer] _openFile called:', file.name, file.size, 'bytes');
    try {
      const buffer = await file.arrayBuffer();
      this.pdfBytes = new Uint8Array(buffer).slice();
      const pdfJsBytes = new Uint8Array(buffer);
      console.log('[PDFRenderer] Calling loadPDF...');
      this.pdfDoc = await loadPDF(pdfJsBytes);
      console.log('[PDFRenderer] PDF loaded, pages:', this.pdfDoc.numPages);
      this.totalPages = this.pdfDoc.numPages;
      this.currentPage = 1;

      // Reset annotations
      this.store.pages.clear();
      this.store.undoStack = [];
      this.store.redoStack = [];

      // Init annotation layer
      if (!this.annotationLayer) {
        this.annotationLayer = new AnnotationLayer(this.els.annotCanvas, this.store, () => this._updateUndoRedoButtons());
      }

      // UI update
      this.els.filename.textContent = file.name || 'Document';
      this.els.pageCount.textContent = this.totalPages;
      this.els.landing.classList.add('hidden');
      this.els.pdfContainer.classList.remove('hidden');
      this._enableControls(true);

      // Detect form fields
      await this._detectAndSetupForm();

      // Calculate fit-to-width scale
      await this._calculateBaseScale();
      this.currentScale = this.baseScale;
      await this._renderCurrentPage();
      await this._generateThumbnails();

      if (this.config.onLoad) {
        this.config.onLoad({ pages: this.totalPages, filename: file.name });
      }

      showToast(`Loaded "${file.name}" — ${this.totalPages} page${this.totalPages > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      console.error('PDF loading error:', err);
      showToast(`Failed to open PDF: ${err.message || 'Unknown error'}`, 'error');
    }
  }

  async _calculateBaseScale() {
    if (!this.pdfDoc) return;
    const page = await this.pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = this.els.viewport.clientWidth - 48;
    this.baseScale = containerWidth / viewport.width;
    this.baseScale = Math.max(0.25, Math.min(this.baseScale, 3));
  }

  async _renderCurrentPage() {
    if (!this.pdfDoc) return;

    const dims = await renderPage(this.pdfDoc, this.currentPage, this.els.pdfCanvas, this.currentScale);

    // When form mode is ON, blank out form field areas on the canvas so the
    // PDF-rendered field text doesn't bleed through the HTML form inputs.
    if (this.formMode) {
      await this._blankFormFieldAreas();
    }

    // Size annotation canvas to match
    this.annotationLayer.page = this.currentPage;
    this.annotationLayer.scale = this.currentScale;
    this.annotationLayer.resize(dims.width, dims.height);
    this.store.setPage(this.currentPage);

    // Update UI
    this.els.pageInput.value = this.currentPage;
    this.els.zoomLevel.textContent = `${Math.round(this.currentScale * 100)}%`;
    this.els.btnPrev.disabled = this.currentPage <= 1;
    this.els.btnNext.disabled = this.currentPage >= this.totalPages;
    this._updateUndoRedoButtons();
    this._updateThumbnailHighlight();

    if (this.formMode) {
      await this._renderFormFields();
    }
  }

  /**
   * Paint white rectangles over form field positions on the PDF canvas
   * to hide the PDF-rendered field appearances underneath the HTML inputs.
   */
  async _blankFormFieldAreas() {
    const widgets = this.formFieldsByPage.get(this.currentPage) || [];
    if (widgets.length === 0) return;

    const page = await this.pdfDoc.getPage(this.currentPage);
    const viewport = page.getViewport({ scale: this.currentScale });
    const dpr = window.devicePixelRatio || 1;

    const canvas = this.els.pdfCanvas;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const widget of widgets) {
      if (!widget.rect) continue;
      const [vx1, vy1, vx2, vy2] = viewport.convertToViewportRectangle(widget.rect);
      const x = Math.min(vx1, vx2);
      const y = Math.min(vy1, vy2);
      const w = Math.abs(vx2 - vx1);
      const h = Math.abs(vy2 - vy1);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, w, h);
    }

    ctx.restore();
  }

  _enableControls(enabled) {
    const btns = [this.els.btnPrev, this.els.btnNext, this.els.btnZoomIn, this.els.btnZoomOut,
                  this.els.zoomLevel, this.els.btnFitWidth, this.els.btnFitPage];
    btns.forEach(b => b.disabled = !enabled);
  }

  // ============================================================
  // Private: Thumbnails
  // ============================================================

  async _generateThumbnails() {
    this.els.thumbnailList.innerHTML = '';
    for (let i = 1; i <= this.totalPages; i++) {
      const canvas = await renderThumbnail(this.pdfDoc, i, 150);
      const item = document.createElement('div');
      item.className = 'thumbnail-item' + (i === this.currentPage ? ' active' : '');
      item.dataset.page = i;
      item.appendChild(canvas);
      const label = document.createElement('div');
      label.className = 'thumbnail-label';
      label.textContent = `Page ${i}`;
      item.appendChild(label);
      item.addEventListener('click', () => this.goToPage(i));
      this.els.thumbnailList.appendChild(item);
    }
  }

  _updateThumbnailHighlight() {
    this.$$('.thumbnail-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.page) === this.currentPage);
    });
  }

  // ============================================================
  // Private: Zoom
  // ============================================================

  async _zoomTo(scale) {
    this.currentScale = Math.max(0.25, Math.min(scale, 5));
    await this._renderCurrentPage();
  }

  async _fitToWidth() {
    await this._calculateBaseScale();
    await this._zoomTo(this.baseScale);
  }

  async _fitToPage() {
    if (!this.pdfDoc) return;
    const page = await this.pdfDoc.getPage(this.currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = this.els.viewport.clientWidth - 48;
    const containerHeight = this.els.viewport.clientHeight - 48;
    const scaleW = containerWidth / viewport.width;
    const scaleH = containerHeight / viewport.height;
    await this._zoomTo(Math.min(scaleW, scaleH));
  }

  // ============================================================
  // Private: Annotations UI
  // ============================================================

  _updateUndoRedoButtons() {
    this.els.btnUndo.disabled = !this.store.canUndo;
    this.els.btnRedo.disabled = !this.store.canRedo;
  }

  _setActiveTool(tool) {
    this.$$('.tool-btn[data-tool]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    if (this.annotationLayer) this.annotationLayer.setTool(tool);
  }

  _setActiveColor(color) {
    this.$$('.color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === color);
    });
    if (this.annotationLayer) this.annotationLayer.color = color;
    this.els.customColor.value = color;
  }

  _showCustomStampModal() {
    const modal = this.$('#custom-stamp-modal');
    const textInput = this.$('#custom-stamp-text');
    const colorInput = this.$('#custom-stamp-color');
    const createBtn = this.$('#custom-stamp-create');
    const cancelBtn = this.$('#custom-stamp-cancel');
    
    if (!modal) return;
    
    // Show modal
    modal.classList.remove('hidden');
    
    // Focus text input
    setTimeout(() => textInput.focus(), 100);
    
    // Auto-uppercase as user types
    const uppercaseHandler = () => {
      textInput.value = textInput.value.toUpperCase();
    };
    textInput.addEventListener('input', uppercaseHandler);
    
    // Handle create button
    const createHandler = () => {
      const text = textInput.value.trim();
      if (!text) {
        alert('Please enter stamp text');
        return;
      }
      
      this.selectedStamp = 'custom';
      this.customStampText = text.toUpperCase();
      this.customStampColor = colorInput.value;
      
      console.log('[Custom Stamp] Created:', this.customStampText, this.customStampColor);
      
      // Switch to stamp tool
      this._setActiveTool('stamp');
      
      // Close modal
      modal.classList.add('hidden');
      cleanup();
    };
    
    // Handle cancel button
    const cancelHandler = () => {
      modal.classList.add('hidden');
      cleanup();
    };
    
    // Handle enter key
    const keyHandler = (e) => {
      if (e.key === 'Enter') {
        createHandler();
      } else if (e.key === 'Escape') {
        cancelHandler();
      }
    };
    
    // Cleanup function
    const cleanup = () => {
      textInput.removeEventListener('input', uppercaseHandler);
      createBtn.removeEventListener('click', createHandler);
      cancelBtn.removeEventListener('click', cancelHandler);
      textInput.removeEventListener('keydown', keyHandler);
      textInput.value = '';
      colorInput.value = '#E53935';
    };
    
    createBtn.addEventListener('click', createHandler);
    cancelBtn.addEventListener('click', cancelHandler);
    textInput.addEventListener('keydown', keyHandler);
  }

  // ============================================================
  // Private: Form Filling
  // ============================================================

  async _detectAndSetupForm() {
    this.formFieldsByPage = new Map();
    this.formFieldCount = 0;
    this.hasForm = false;
    this.formMode = false;
    this.enhancedMeta = new Map();

    if (this.formLayer) {
      this.formLayer.destroy();
      this.formLayer = null;
    }

    this.els.btnFormMode.classList.add('hidden');
    this.els.formBar.classList.add('hidden');
    this.els.btnFormMode.classList.remove('active');

    if (!this.pdfDoc) return;

    try {
      const result = await detectFormFields(this.pdfDoc);
      this.formFieldsByPage = result.fieldsByPage;
      this.formFieldCount = result.fieldCount;
      this.hasForm = result.hasForm;
      this.enhancedMeta = result.enhancedMeta || new Map();

      if (this.hasForm) {
        this.els.btnFormMode.classList.remove('hidden');
        const existingValues = await readFieldValues(this.pdfBytes);
        this.formLayer = new FormLayer(this.els.pageWrapper, () => {}, {
          allowFormJavaScript: this.config.allowFormJavaScript,
          validateOnBlur: this.config.validateOnBlur,
          validateOnSubmit: this.config.validateOnSubmit,
          showValidationErrors: this.config.showValidationErrors,
        });
        this.formLayer.setValues(existingValues);
        this.formLayer.setEnhancedMeta(this.enhancedMeta);

        // Pass document-level properties for sandbox JS (this.numPages, etc.)
        await this._setFormDocumentProperties();
      }
    } catch (err) {
      console.warn('Form detection failed:', err);
    }
  }

  /**
   * Collect document properties and pass them to FormLayer for sandbox JS.
   */
  async _setFormDocumentProperties() {
    if (!this.formLayer || !this.pdfDoc) return;

    const filename = this.els.filename.textContent || '';
    const url = this._sourceURL || '';

    // Gather all field names across all pages
    const allFieldNames = [];
    for (const [, fields] of this.formFieldsByPage) {
      for (const f of fields) {
        if (f.fieldName) allFieldNames.push(f.fieldName);
      }
    }

    // Get PDF metadata
    let info = {};
    try {
      const meta = await this.pdfDoc.getMetadata();
      if (meta?.info) {
        info = {
          Title: meta.info.Title || '',
          Author: meta.info.Author || '',
          Subject: meta.info.Subject || '',
          Keywords: meta.info.Keywords || '',
          Creator: meta.info.Creator || '',
          Producer: meta.info.Producer || '',
          CreationDate: meta.info.CreationDate ? new Date(meta.info.CreationDate) : new Date(),
          ModDate: meta.info.ModDate ? new Date(meta.info.ModDate) : new Date(),
        };
      }
    } catch (e) {
      console.warn('[PDFRenderer] Could not get PDF metadata:', e);
    }

    this.formLayer.setDocumentProperties({
      numPages: this.totalPages,
      documentFileName: filename,
      filesize: this.pdfBytes ? this.pdfBytes.length : 0,
      path: url || filename,
      url,
      info,
      allFieldNames,
    });
  }

  async _toggleFormMode() {
    if (!this.hasForm) return;

    this.formMode = !this.formMode;
    this.els.btnFormMode.classList.toggle('active', this.formMode);

    if (this.formMode) {
      this.els.formBar.classList.remove('hidden');
      this.els.annotationBar.classList.add('hidden');
      this.els.btnAnnotations.classList.remove('active');
      this.els.annotCanvas.style.pointerEvents = 'none';
      this.els.annotCanvas.style.opacity = '0.3';
      this.els.formFieldCount.textContent = `${this.formFieldCount} field${this.formFieldCount !== 1 ? 's' : ''}`;
      // Blank out PDF text under form fields, then render the HTML form overlay
      await this._blankFormFieldAreas();
      await this._renderFormFields();
    } else {
      this.els.formBar.classList.add('hidden');
      this.els.annotCanvas.style.pointerEvents = '';
      this.els.annotCanvas.style.opacity = '';
      if (this.formLayer) {
        this.formLayer.snapshotValues();
        this.formLayer.destroy();
      }
      // Re-render the page to remove white rectangles from the canvas
      const dims = await renderPage(this.pdfDoc, this.currentPage, this.els.pdfCanvas, this.currentScale);
    }
  }

  async _renderFormFields() {
    if (!this.formMode || !this.formLayer || !this.pdfDoc) return;

    const widgets = this.formFieldsByPage.get(this.currentPage) || [];
    const page = await this.pdfDoc.getPage(this.currentPage);
    const viewport = page.getViewport({ scale: this.currentScale });

    this.formLayer.snapshotValues();
    this.formLayer.render(widgets, viewport, this.currentScale);
  }

  async _clearFormFields() {
    if (!this.formLayer) return;
    this.formLayer.values.clear();
    this.formLayer.clearErrors();
    await this._renderFormFields();
    showToast('Form fields cleared', 'info');
  }

  _validateForm() {
    if (!this.formLayer) return;
    this.formLayer.snapshotValues();
    const result = this.formLayer.validateAll();
    if (result.valid) {
      showToast('All fields are valid!', 'success');
    } else {
      const count = result.errors.size;
      showToast(`${count} field${count !== 1 ? 's' : ''} with errors`, 'error');
    }
  }

  _toggleJavaScript() {
    this.config.allowFormJavaScript = !this.config.allowFormJavaScript;
    const { els } = this;
    
    if (els.jsStatus) {
      els.jsStatus.textContent = this.config.allowFormJavaScript ? 'ON' : 'OFF';
    }
    
    if (els.btnJsToggle) {
      const title = this.config.allowFormJavaScript 
        ? 'Disable JavaScript (currently enabled)' 
        : 'Enable JavaScript (currently disabled for security)';
      els.btnJsToggle.title = title;
      
      if (this.config.allowFormJavaScript) {
        els.btnJsToggle.classList.add('active');
      } else {
        els.btnJsToggle.classList.remove('active');
      }
    }
    
    const status = this.config.allowFormJavaScript ? 'enabled' : 'disabled';
    showToast(`Form JavaScript ${status}`, this.config.allowFormJavaScript ? 'success' : 'info');
    
    // Update FormLayer if it exists
    if (this.formLayer) {
      this.formLayer._config.allowFormJavaScript = this.config.allowFormJavaScript;
    }
  }

  async _exportFilledPDF() {
    if (!this.pdfBytes || !this.formLayer) {
      showToast('No form data to export', 'error');
      return;
    }
    this.formLayer.snapshotValues();

    // Validate before export if configured
    if (this.config.validateOnSubmit) {
      const validation = this.formLayer.validateAll();
      if (!validation.valid) {
        const count = validation.errors.size;
        showToast(`Cannot export: ${count} field${count !== 1 ? 's' : ''} with errors. Fix errors or clear validation.`, 'error');
        return;
      }
    }

    try {
      const bytes = await exportFilledPDF(this.pdfBytes, this.formLayer.values);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      this._downloadBlob(blob, 'filled.pdf');
      showToast('Filled PDF exported!', 'success');
    } catch (err) {
      console.error('Export filled PDF error:', err);
      showToast('Failed to export filled PDF.', 'error');
    }
  }

  // ============================================================
  // Private: Export / Import
  // ============================================================

  _exportAnnotationsJSON() {
    const data = this.store.toJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this._downloadBlob(blob, 'annotations.json');
    showToast('Annotations exported!', 'success');
  }

  _importAnnotationsJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        this.store.fromJSON(data);
        this.annotationLayer?.redraw();
        showToast('Annotations imported!', 'success');
      } catch {
        showToast('Invalid annotation file.', 'error');
      }
    };
    reader.readAsText(file);
  }

  async _savePDF() {
    if (!this.pdfBytes) {
      showToast('No PDF loaded', 'error');
      return;
    }
    try {
      const bytes = await exportAnnotatedPDF(this.pdfBytes, this.store, this.currentScale);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      this._downloadBlob(blob, 'annotated.pdf');
      showToast('Annotated PDF saved!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save PDF.', 'error');
    }
  }

  _downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // Private: UI Toggles
  // ============================================================

  _toggleSidebar() {
    this.els.sidebar.classList.toggle('hidden');
    this.els.btnSidebar.classList.toggle('active', !this.els.sidebar.classList.contains('hidden'));
    setTimeout(async () => {
      if (this.pdfDoc) {
        await this._calculateBaseScale();
        await this._renderCurrentPage();
      }
    }, 200);
  }

  _toggleAnnotationBar() {
    if (this.formMode) {
      this.formMode = false;
      this.els.btnFormMode.classList.remove('active');
      this.els.formBar.classList.add('hidden');
      this.els.annotCanvas.style.pointerEvents = '';
      this.els.annotCanvas.style.opacity = '';
      if (this.formLayer) {
        this.formLayer.snapshotValues();
        this.formLayer.destroy();
      }
    }
    this.els.annotationBar.classList.toggle('hidden');
    this.els.btnAnnotations.classList.toggle('active', !this.els.annotationBar.classList.contains('hidden'));
  }

  _toggleOverlay(overlay) {
    overlay.classList.toggle('hidden');
  }

  // ============================================================
  // Private: Keyboard
  // ============================================================

  _handleKeyboard(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const ctrl = e.ctrlKey || e.metaKey;

    if (ctrl && e.key === 'o') { e.preventDefault(); this.els.fileInput.click(); return; }
    if (ctrl && !e.shiftKey && e.key === 'z') { e.preventDefault(); this.els.btnUndo.click(); return; }
    if (ctrl && e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); this.els.btnRedo.click(); return; }
    if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); this._zoomTo(this.currentScale * 1.2); return; }
    if (ctrl && e.key === '-') { e.preventDefault(); this._zoomTo(this.currentScale / 1.2); return; }
    if (ctrl && e.key === '0') { e.preventDefault(); this._zoomTo(1); return; }

    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); this.goToPage(this.currentPage - 1); return; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); this.goToPage(this.currentPage + 1); return; }
    if (e.key === 'Home') { e.preventDefault(); this.goToPage(1); return; }
    if (e.key === 'End') { e.preventDefault(); this.goToPage(this.totalPages); return; }

    if (e.key === 'f') { if (this.hasForm) this._toggleFormMode(); return; }
    if (e.key === 'a') { this._toggleAnnotationBar(); return; }
    if (e.key === 'v') { this._setActiveTool('select'); return; }
    if (e.key === 'd') { this._setActiveTool('pen'); return; }
    if (e.key === 'h') { this._setActiveTool('highlighter'); return; }
    if (e.key === 'x') { this._setActiveTool('text'); return; }
    if (e.key === 'r') { this._setActiveTool('rect'); return; }
    if (e.key === 'c') { this._setActiveTool('circle'); return; }
    if (e.key === 'l') { this._setActiveTool('arrow'); return; }
    if (e.key === 'e') { this._setActiveTool('eraser'); return; }

    if (e.key === 'w') { this._fitToWidth(); return; }
    if (e.key === 'p') { this._fitToPage(); return; }
    if (e.key === 't') { this._toggleSidebar(); return; }

    if (e.key === '?') { this._toggleOverlay(this.els.helpOverlay); return; }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.annotationLayer && this.annotationLayer.handleKeyDown(e)) {
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'Escape') {
      if (this.annotationLayer && this.annotationLayer.handleKeyDown(e)) return;
      this.els.helpOverlay.classList.add('hidden');
      this._setActiveTool('select');
      return;
    }
  }
}

export default PDFRenderer;

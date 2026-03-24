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
 *   container: '#pdf-container',
 *   pdfUrl: 'document.pdf',
 *   showOpenButton: true,
 *   showDemoButton: true
 * });
 */
export class PDFRenderer {
  constructor(options = {}) {
    // Configuration
    this.config = {
      container: options.container || '#pdf-container',
      pdfUrl: options.pdfUrl || null,
      showOpenButton: options.showOpenButton !== false,
      showDemoButton: options.showDemoButton !== false,
      onLoad: options.onLoad || null,
      onError: options.onError || null,
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
    this.formMode = false;
    this.formFieldsByPage = new Map();
    this.formFieldCount = 0;
    this.hasForm = false;

    // Initialize
    this._cacheElements();
    this._setupEventListeners();
    this._initialize();
  }

  _cacheElements() {
    const $ = (sel) => document.querySelector(sel);
    
    console.log('[PDFRenderer] Caching elements...');
    
    this.els = {
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

      // Form mode
      btnFormMode:   $('#btn-form-mode'),
      formBar:       $('#form-bar'),
      formFieldCount:$('#form-field-count'),
      btnClearForm:  $('#btn-clear-form'),
      btnExportFilled:$('#btn-export-filled'),

      // File inputs
      fileInput:     $('#file-input'),
      jsonInput:     $('#json-input'),
    };
  }

  _setupEventListeners() {
    console.log('[PDFRenderer] Setting up event listeners...');
    console.log('[PDFRenderer] btnOpen:', this.els.btnOpen);
    console.log('[PDFRenderer] btnDemo:', this.els.btnDemo);
    console.log('[PDFRenderer] btnOpenLanding:', this.els.btnOpenLanding);
    
    // File input
    this.els.fileInput?.addEventListener('change', (e) => this._handleFileSelect(e));
    this.els.btnOpen?.addEventListener('click', () => {
      console.log('[PDFRenderer] Open button clicked');
      this.els.fileInput?.click();
    });
    this.els.btnOpenLanding?.addEventListener('click', () => {
      console.log('[PDFRenderer] Open landing button clicked');
      this.els.fileInput?.click();
    });
    this.els.btnDemo?.addEventListener('click', () => {
      console.log('[PDFRenderer] Demo button clicked');
      this.loadDemo();
    });

    // Navigation
    this.els.btnPrev?.addEventListener('click', () => this.prevPage());
    this.els.btnNext?.addEventListener('click', () => this.nextPage());
    this.els.pageInput?.addEventListener('change', (e) => this.goToPage(parseInt(e.target.value, 10)));

    // Zoom
    this.els.btnZoomOut?.addEventListener('click', () => this.zoomOut());
    this.els.btnZoomIn?.addEventListener('click', () => this.zoomIn());
    this.els.btnFitWidth?.addEventListener('click', () => this.fitToWidth());
    this.els.btnFitPage?.addEventListener('click', () => this.fitToPage());

    // Annotations
    this.els.btnAnnotations?.addEventListener('click', () => this.toggleAnnotations());
    this.els.strokeWidth?.addEventListener('input', (e) => this._updateStrokeWidth(e));
    this.els.customColor?.addEventListener('input', (e) => this._updateCustomColor(e));
    this.els.btnUndo?.addEventListener('click', () => this.undo());
    this.els.btnRedo?.addEventListener('click', () => this.redo());
    this.els.btnToggleLayer?.addEventListener('click', () => this.toggleAnnotationLayer());
    this.els.btnClear?.addEventListener('click', () => this.clearAnnotations());
    this.els.btnSavePDF?.addEventListener('click', () => this.savePDF());
    
    // Export/Import
    this.els.btnExportJSON?.addEventListener('click', () => this.exportAnnotations());
    this.els.btnImportJSON?.addEventListener('click', () => this.els.jsonInput?.click());
    this.els.jsonInput?.addEventListener('change', (e) => this._handleJSONImport(e));

    // Sidebar
    this.els.btnSidebar?.addEventListener('click', () => this.toggleSidebar());
    this.els.btnCloseSidebar?.addEventListener('click', () => this.closeSidebar());

    // Help
    this.els.btnHelp?.addEventListener('click', () => this.showHelp());
    this.els.btnCloseHelp?.addEventListener('click', () => this.closeHelp());
    this.els.helpOverlay?.addEventListener('click', (e) => {
      if (e.target === this.els.helpOverlay) this.closeHelp();
    });

    // Form mode
    this.els.btnFormMode?.addEventListener('click', () => this.toggleFormMode());
    this.els.btnClearForm?.addEventListener('click', () => this.clearForm());
    this.els.btnExportFilled?.addEventListener('click', () => this.exportFilledPDF());

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this._handleKeyboard(e));

    // Color palette
    this._setupColorPalette();

    // Tool buttons
    this._setupToolButtons();
  }

  _setupColorPalette() {
    const colors = document.querySelectorAll('.color-btn');
    colors.forEach((btn) => {
      btn.addEventListener('click', () => {
        colors.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.annotationLayer?.setColor(btn.dataset.color);
      });
    });
  }

  _setupToolButtons() {
    const tools = document.querySelectorAll('.tool-btn');
    tools.forEach((btn) => {
      btn.addEventListener('click', () => {
        tools.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.annotationLayer?.setTool(btn.dataset.tool);
      });
    });
  }

  async _initialize() {
    // Hide demo buttons if configured
    if (!this.config.showOpenButton && this.els.btnOpenLanding) {
      this.els.btnOpenLanding.style.display = 'none';
    }
    if (!this.config.showDemoButton && this.els.btnDemo) {
      this.els.btnDemo.style.display = 'none';
    }

    // Auto-load PDF if URL provided
    if (this.config.pdfUrl) {
      try {
        await this.loadPDF(this.config.pdfUrl);
      } catch (error) {
        console.error('Failed to load PDF:', error);
        if (this.config.onError) {
          this.config.onError(error);
        } else {
          showToast('Failed to load PDF: ' + error.message, 'error');
        }
      }
    }
  }

  // ============================================================
  // Public API
  // ============================================================

  /**
   * Load a PDF from URL or File
   */
  async loadPDF(source) {
    try {
      let bytes;
      let filename = 'document.pdf';

      if (typeof source === 'string') {
        // URL
        const response = await fetch(source);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        bytes = await response.arrayBuffer();
        filename = source.split('/').pop() || 'document.pdf';
      } else if (source instanceof File) {
        // File object
        bytes = await source.arrayBuffer();
        filename = source.name;
      } else if (source instanceof ArrayBuffer) {
        // Raw bytes
        bytes = source;
      } else {
        throw new Error('Invalid source: must be URL, File, or ArrayBuffer');
      }

      this.pdfBytes = new Uint8Array(bytes);
      this.pdfDoc = await loadPDF(this.pdfBytes);
      this.totalPages = this.pdfDoc.numPages;

      // Update UI
      this.els.filename.textContent = filename;
      this.els.pageCount.textContent = this.totalPages;
      this.els.landing.style.display = 'none';
      this.els.pdfContainer.style.display = 'block';

      // Check for forms
      await this._checkForForms();

      // Render first page
      await this._renderCurrentPage();

      // Generate thumbnails
      await this._generateThumbnails();

      // Notify callback
      if (this.config.onLoad) {
        this.config.onLoad({ pages: this.totalPages, filename });
      }

      showToast(`Loaded ${filename} (${this.totalPages} pages)`, 'success');
    } catch (error) {
      console.error('Error loading PDF:', error);
      throw error;
    }
  }

  /**
   * Load demo PDF
   */
  async loadDemo() {
    console.log('[PDFRenderer] loadDemo() called');
    await this.loadPDF('sample.pdf');
  }

  /**
   * Navigate to specific page
   */
  async goToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    this.currentPage = pageNum;
    this.els.pageInput.value = pageNum;
    await this._renderCurrentPage();
  }

  /**
   * Go to previous page
   */
  async prevPage() {
    if (this.currentPage > 1) {
      await this.goToPage(this.currentPage - 1);
    }
  }

  /**
   * Go to next page
   */
  async nextPage() {
    if (this.currentPage < this.totalPages) {
      await this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Zoom in
   */
  async zoomIn() {
    this.currentScale = Math.min(this.currentScale + 0.25, 5);
    await this._renderCurrentPage();
  }

  /**
   * Zoom out
   */
  async zoomOut() {
    this.currentScale = Math.max(this.currentScale - 0.25, 0.25);
    await this._renderCurrentPage();
  }

  /**
   * Fit to width
   */
  async fitToWidth() {
    const page = await this.pdfDoc.getPage(this.currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = this.els.viewport.clientWidth - 80;
    this.baseScale = containerWidth / viewport.width;
    this.currentScale = this.baseScale;
    await this._renderCurrentPage();
  }

  /**
   * Fit to page
   */
  async fitToPage() {
    const page = await this.pdfDoc.getPage(this.currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = this.els.viewport.clientWidth - 80;
    const containerHeight = this.els.viewport.clientHeight - 40;
    const scaleW = containerWidth / viewport.width;
    const scaleH = containerHeight / viewport.height;
    this.currentScale = Math.min(scaleW, scaleH);
    await this._renderCurrentPage();
  }

  /**
   * Toggle annotations toolbar
   */
  toggleAnnotations() {
    const visible = this.els.annotationBar.style.display !== 'none';
    this.els.annotationBar.style.display = visible ? 'none' : 'flex';
    this.els.btnAnnotations.classList.toggle('active', !visible);
  }

  /**
   * Undo last annotation
   */
  undo() {
    this.annotationLayer?.undo();
  }

  /**
   * Redo last undone annotation
   */
  redo() {
    this.annotationLayer?.redo();
  }

  /**
   * Toggle annotation layer visibility
   */
  toggleAnnotationLayer() {
    const visible = this.els.annotCanvas.style.display !== 'none';
    this.els.annotCanvas.style.display = visible ? 'none' : 'block';
    this.els.btnToggleLayer.classList.toggle('active', !visible);
  }

  /**
   * Clear all annotations on current page
   */
  clearAnnotations() {
    if (!confirm('Clear all annotations on this page?')) return;
    this.annotationLayer?.clear();
    this.store.clearPage(this.currentPage);
  }

  /**
   * Export annotations to JSON
   */
  exportAnnotations() {
    const json = this.store.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Annotations exported', 'success');
  }

  /**
   * Save annotated PDF
   */
  async savePDF() {
    try {
      const pdfBytes = await exportAnnotatedPDF(this.pdfDoc, this.pdfBytes, this.store);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'annotated.pdf';
      a.click();
      URL.revokeObjectURL(url);
      showToast('PDF saved with annotations', 'success');
    } catch (error) {
      console.error('Error saving PDF:', error);
      showToast('Failed to save PDF', 'error');
    }
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar() {
    this.els.sidebar.classList.toggle('open');
  }

  /**
   * Close sidebar
   */
  closeSidebar() {
    this.els.sidebar.classList.remove('open');
  }

  /**
   * Show help overlay
   */
  showHelp() {
    this.els.helpOverlay.style.display = 'flex';
  }

  /**
   * Close help overlay
   */
  closeHelp() {
    this.els.helpOverlay.style.display = 'none';
  }

  /**
   * Toggle form mode
   */
  async toggleFormMode() {
    this.formMode = !this.formMode;
    this.els.btnFormMode.classList.toggle('active', this.formMode);
    this.els.formBar.style.display = this.formMode ? 'flex' : 'none';
    this.els.annotationBar.style.display = this.formMode ? 'none' : (this.els.btnAnnotations.classList.contains('active') ? 'flex' : 'none');
    
    if (this.formMode) {
      await this._enterFormMode();
    } else {
      this._exitFormMode();
    }
  }

  /**
   * Clear form values
   */
  clearForm() {
    if (!confirm('Clear all form values?')) return;
    this.formLayer?.clear();
  }

  /**
   * Export filled PDF
   */
  async exportFilledPDF() {
    try {
      const values = readFieldValues();
      const filledBytes = await exportFilledPDF(this.pdfBytes, values);
      const blob = new Blob([filledBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'filled-form.pdf';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Form exported', 'success');
    } catch (error) {
      console.error('Error exporting form:', error);
      showToast('Failed to export form', 'error');
    }
  }

  // ============================================================
  // Private Methods
  // ============================================================

  async _handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    await this.loadPDF(file);
  }

  async _handleJSONImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      this.store.fromJSON(text);
      await this._renderCurrentPage();
      showToast('Annotations imported', 'success');
    } catch (error) {
      console.error('Error importing annotations:', error);
      showToast('Failed to import annotations', 'error');
    }
  }

  _updateStrokeWidth(e) {
    const width = parseInt(e.target.value, 10);
    this.els.strokeValue.textContent = width;
    this.annotationLayer?.setStrokeWidth(width);
  }

  _updateCustomColor(e) {
    this.annotationLayer?.setColor(e.target.value);
  }

  _handleKeyboard(e) {
    // Navigation
    if (e.key === 'ArrowLeft') this.prevPage();
    if (e.key === 'ArrowRight') this.nextPage();
    
    // Zoom
    if (e.key === '+' || e.key === '=') this.zoomIn();
    if (e.key === '-' || e.key === '_') this.zoomOut();
    
    // Annotations
    if (e.ctrlKey && e.key === 'z') this.undo();
    if (e.ctrlKey && e.key === 'y') this.redo();
    
    // Help
    if (e.key === '?') this.showHelp();
    if (e.key === 'Escape') this.closeHelp();
  }

  async _renderCurrentPage() {
    const page = await this.pdfDoc.getPage(this.currentPage);
    const viewport = page.getViewport({ scale: this.currentScale });
    
    // Resize canvases
    this.els.pdfCanvas.width = viewport.width;
    this.els.pdfCanvas.height = viewport.height;
    this.els.annotCanvas.width = viewport.width;
    this.els.annotCanvas.height = viewport.height;
    
    // Set wrapper size
    this.els.pageWrapper.style.width = `${viewport.width}px`;
    this.els.pageWrapper.style.height = `${viewport.height}px`;
    
    // Render PDF
    await renderPage(this.pdfDoc, this.currentPage, this.els.pdfCanvas, this.currentScale);
    
    // Update zoom display
    this.els.zoomLevel.textContent = `${Math.round(this.currentScale * 100)}%`;
    
    // Render annotations
    this._renderAnnotations();
    
    // Update thumbnails
    this._updateThumbnailSelection();
    
    // Update form if in form mode
    if (this.formMode) {
      await this._renderFormFields();
    }
  }

  _renderAnnotations() {
    const ctx = this.els.annotCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.els.annotCanvas.width, this.els.annotCanvas.height);
    
    const annotations = this.store.getPage(this.currentPage);
    
    if (!this.annotationLayer) {
      this.annotationLayer = new AnnotationLayer(this.els.annotCanvas, annotations, this.store);
    } else {
      this.annotationLayer.setAnnotations(annotations);
    }
    
    this.annotationLayer.render();
  }

  async _generateThumbnails() {
    this.els.thumbnailList.innerHTML = '';
    
    for (let i = 1; i <= this.totalPages; i++) {
      const li = document.createElement('li');
      li.className = 'thumbnail-item';
      if (i === this.currentPage) li.classList.add('active');
      
      const canvas = document.createElement('canvas');
      li.appendChild(canvas);
      
      const label = document.createElement('span');
      label.textContent = i;
      li.appendChild(label);
      
      li.addEventListener('click', () => this.goToPage(i));
      this.els.thumbnailList.appendChild(li);
      
      // Render thumbnail
      await renderThumbnail(this.pdfDoc, i, canvas);
    }
  }

  _updateThumbnailSelection() {
    const thumbnails = this.els.thumbnailList.querySelectorAll('.thumbnail-item');
    thumbnails.forEach((thumb, idx) => {
      thumb.classList.toggle('active', idx + 1 === this.currentPage);
    });
  }

  async _checkForForms() {
    try {
      const formFields = await detectFormFields(this.pdfDoc);
      this.hasForm = formFields.length > 0;
      this.formFieldCount = formFields.length;
      
      // Group by page
      this.formFieldsByPage.clear();
      formFields.forEach(field => {
        if (!this.formFieldsByPage.has(field.page)) {
          this.formFieldsByPage.set(field.page, []);
        }
        this.formFieldsByPage.get(field.page).push(field);
      });
      
      // Show/hide form button
      if (this.els.btnFormMode) {
        this.els.btnFormMode.style.display = this.hasForm ? 'block' : 'none';
      }
    } catch (error) {
      console.warn('Could not detect forms:', error);
      this.hasForm = false;
    }
  }

  async _enterFormMode() {
    if (!this.hasForm) {
      showToast('No form fields detected', 'info');
      return;
    }
    
    this.els.formFieldCount.textContent = `${this.formFieldCount} fields`;
    await this._renderFormFields();
  }

  _exitFormMode() {
    if (this.formLayer) {
      this.formLayer.destroy();
      this.formLayer = null;
    }
  }

  async _renderFormFields() {
    const fields = this.formFieldsByPage.get(this.currentPage) || [];
    
    if (this.formLayer) {
      this.formLayer.destroy();
    }
    
    if (fields.length > 0) {
      this.formLayer = new FormLayer(this.els.pageWrapper, fields, this.currentScale);
      this.formLayer.render();
    }
  }
}

// Export for use in other modules
export default PDFRenderer;

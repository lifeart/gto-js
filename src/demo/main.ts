/**
 * GTO Demo App - Main Entry Point
 *
 * This file wires together all the demo app modules and sets up
 * event handlers, window globals, and initializes the application.
 */
import './style.css';

// State management
import { getGtoData, setSelectedObject } from './state';

// File handling
import { handleFileSelect, setupDragAndDrop, setParseCallback, loadSampleFile } from './file-handler';

// Tree component
import { renderTree, filterTree, expandAll, collapseAll, selectObjectByName, selectObject, setSelectionCallback } from './tree';

// Panel components
import {
  renderStats,
  renderDetailsPanel,
  renderAllPanels,
  selectFromProtocolView,
  toggleProtocolSection,
  setCompareObject,
  switchToTab,
  setupTabSwitching,
  setSelectFromProtocolCallback
} from './panels';

// Export functions
import { exportJSON, exportTextGTO, exportBinaryGTO, toggleExportMenu, copyJSON, downloadJSON, setupExportMenuClose } from './export';

// Theme handling
import { toggleTheme, loadTheme } from './theme';

// Keyboard shortcuts
import { showShortcutsModal, hideShortcutsModal, setupKeyboardShortcuts } from './keyboard';

// Navigation
import { addToRecent, updateBreadcrumb, updateHash, handleHashChange, setupHashNavigation, copyToClipboard } from './navigation';

// ============= Show Data View =============

function showDataView(): void {
  const uploadContainer = document.getElementById('upload-container') as HTMLElement;
  const dataView = document.getElementById('data-view');
  const sidebar = document.getElementById('sidebar') as HTMLElement;
  const exportBtn = document.getElementById('export-btn') as HTMLElement;
  const compareBtn = document.getElementById('compare-btn') as HTMLElement;

  if (uploadContainer) uploadContainer.style.display = 'none';
  dataView?.classList.add('visible');
  if (sidebar) sidebar.style.display = 'flex';
  if (exportBtn) exportBtn.style.display = 'flex';
  if (compareBtn) compareBtn.style.display = 'flex';
}

// ============= Parse Callback =============

function onFileParsed(filename: string): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  showDataView();
  renderStats();
  renderTree();
  renderAllPanels();

  // Select first object
  if (gtoData.objects.length > 0) {
    selectObject(gtoData.objects[0]);
  }
}

// ============= Selection Callbacks =============

function onObjectSelected(obj: ReturnType<typeof getGtoData>['objects'][0], compName?: string | null): void {
  renderDetailsPanel(obj, compName);
  switchToTab('details');
}

function onSelectFromProtocol(objectName: string): void {
  addToRecent(objectName);
  updateBreadcrumb(objectName);
  updateHash(objectName, 'details');
}

// ============= Setup Window Globals =============

function setupWindowGlobals(): void {
  // File handling
  window.handleFileSelect = handleFileSelect;

  // Tree operations
  window.filterTree = filterTree;
  window.selectObjectByName = selectObjectByName;
  window.expandAll = expandAll;
  window.collapseAll = collapseAll;

  // Export functions
  window.exportJSON = exportJSON;
  window.exportTextGTO = exportTextGTO;
  window.exportBinaryGTO = exportBinaryGTO;
  window.toggleExportMenu = toggleExportMenu;
  window.copyJSON = copyJSON;
  window.downloadJSON = downloadJSON;

  // UI functions
  window.toggleTheme = toggleTheme;
  window.showShortcutsModal = showShortcutsModal;
  window.hideShortcutsModal = hideShortcutsModal;
  window.copyToClipboard = copyToClipboard;
  window.toggleProtocolSection = toggleProtocolSection;

  // Compare functions
  window.toggleCompareMode = () => switchToTab('compare');
  window.setCompareObject = setCompareObject;

  // Panel functions
  window.renderAllPanels = renderAllPanels;
  window.selectFromProtocolView = selectFromProtocolView;
  window.showDataView = showDataView;
}

// ============= Initialize Application =============

function init(): void {
  // Set up callbacks
  setParseCallback(onFileParsed);
  setSelectionCallback(onObjectSelected);
  setSelectFromProtocolCallback(onSelectFromProtocol);

  // Set up window globals for HTML onclick handlers
  setupWindowGlobals();

  // Set up drag and drop
  const uploadArea = document.getElementById('upload-area');
  if (uploadArea) {
    setupDragAndDrop(uploadArea);
  }

  // Set up tab switching
  setupTabSwitching();

  // Set up export menu close on outside click
  setupExportMenuClose();

  // Set up keyboard shortcuts
  setupKeyboardShortcuts();

  // Set up hash navigation
  setupHashNavigation();

  // Load saved theme
  loadTheme();

  // Handle initial hash after a short delay
  setTimeout(() => {
    const gtoData = getGtoData();
    if (gtoData) handleHashChange();
  }, 100);

  // Auto-load sample file on page load
  loadSampleFile();
}

// Initialize when DOM is ready
init();

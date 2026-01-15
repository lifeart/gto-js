/**
 * Global application state
 */
import type { GTOData, ObjectData } from 'gto-js';

export const state = {
  gtoData: null as GTOData | null,
  selectedObject: null as ObjectData | null,
  compareObjects: {
    left: null as string | null,
    right: null as string | null
  },
  recentlyViewed: [] as string[],
  currentBreadcrumb: {
    object: null as string | null,
    component: null as string | null,
    property: null as string | null
  },
  graphZoom: 1,
  graphPan: { x: 0, y: 0 },
  // File info
  currentFilename: null as string | null,
  currentFileSize: 0,
  isModified: false,
  // Recent files (stored in localStorage)
  recentFiles: [] as { name: string; timestamp: number }[]
};

// Load recent files from localStorage
try {
  const stored = localStorage.getItem('gto-recent-files');
  if (stored) {
    state.recentFiles = JSON.parse(stored);
  }
} catch (e) {
  // Ignore localStorage errors
}

export function getGtoData(): GTOData | null {
  return state.gtoData;
}

export function setGtoData(data: GTOData): void {
  state.gtoData = data;
  state.isModified = false;
}

export function markModified(): void {
  if (!state.isModified) {
    state.isModified = true;
    updateModifiedIndicator();
  }
}

export function clearModified(): void {
  state.isModified = false;
  updateModifiedIndicator();
}

export function isModified(): boolean {
  return state.isModified;
}

function updateModifiedIndicator(): void {
  const indicator = document.getElementById('modified-indicator');
  if (indicator) {
    indicator.style.display = state.isModified ? 'flex' : 'none';
  }
  // Update document title
  const baseTitle = state.currentFilename || 'GTO Viewer';
  document.title = state.isModified ? `● ${baseTitle}` : baseTitle;
}

export function setFileInfo(filename: string, size: number): void {
  state.currentFilename = filename;
  state.currentFileSize = size;
  state.isModified = false;
  updateModifiedIndicator();
  addToRecentFiles(filename);
  updateStatusBar();
}

export function addToRecentFiles(filename: string): void {
  // Remove if already exists
  state.recentFiles = state.recentFiles.filter(f => f.name !== filename);
  // Add to front
  state.recentFiles.unshift({ name: filename, timestamp: Date.now() });
  // Keep only last 10
  state.recentFiles = state.recentFiles.slice(0, 10);
  // Save to localStorage
  try {
    localStorage.setItem('gto-recent-files', JSON.stringify(state.recentFiles));
  } catch (e) {
    // Ignore localStorage errors
  }
}

export function getRecentFiles(): { name: string; timestamp: number }[] {
  return state.recentFiles;
}

function updateStatusBar(): void {
  const statusBar = document.getElementById('status-bar');
  if (!statusBar || !state.gtoData) return;

  // Show status bar
  statusBar.classList.add('visible');

  const objCount = state.gtoData.objects.length;
  const protocolCount = new Set(state.gtoData.objects.map(o => o.protocol)).size;
  const sizeStr = formatFileSize(state.currentFileSize);

  statusBar.innerHTML = `
    <span class="status-item" title="Current file">📄 ${state.currentFilename || 'No file'}</span>
    <span class="status-item" title="File size">💾 ${sizeStr}</span>
    <span class="status-item" title="Objects">${objCount} objects</span>
    <span class="status-item" title="Protocols">${protocolCount} protocols</span>
    <span class="status-item" title="GTO version">v${state.gtoData.version}</span>
  `;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getSelectedObject(): ObjectData | null {
  return state.selectedObject;
}

export function setSelectedObject(obj: ObjectData | null): void {
  state.selectedObject = obj;
}

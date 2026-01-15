/* eslint-disable @typescript-eslint/no-explicit-any */

// Extend Element to include common properties
interface Element {
  style: CSSStyleDeclaration;
  dataset: DOMStringMap;
  value?: string;
}

// Extend EventTarget to include Element methods
interface EventTarget {
  closest(selector: string): Element | null;
  tagName: string;
}

interface Window {
  // File handling
  handleFileSelect: (event: Event) => void;

  // Tree operations
  filterTree: () => void;
  selectObjectByName: (objName: string, compName?: string, propName?: string) => void;
  expandAll: () => void;
  collapseAll: () => void;

  // Export functions
  exportJSON: () => void;
  exportTextGTO: () => void;
  exportBinaryGTO: () => void;
  toggleExportMenu: () => void;
  copyJSON: () => void;
  downloadJSON: () => void;

  // UI functions
  toggleTheme: () => void;
  showShortcutsModal: () => void;
  hideShortcutsModal: () => void;
  copyToClipboard: (text: string, button?: HTMLElement) => void;
  toggleProtocolSection: (header: HTMLElement) => void;
  toggleTypeFilter: (type: string) => void;

  // Compare functions
  toggleCompareMode: () => void;
  setCompareObject: (side: string, name: string) => void;

  // Graph functions
  zoomGraph: (delta: number) => void;
  resetGraphView: () => void;

  // Panel functions
  renderAllPanels: () => void;
  selectFromProtocolView: (objectName: string) => void;
  showDataView: () => void;

  // Annotation functions
  selectAnnotationFrame: (frame: number) => void;
  navigateAnnotationFrame: (delta: number) => void;
  toggleGhostFrames: (enabled: boolean) => void;

  // Property editor functions
  openPropertyEditor: (objectName: string, compName: string, propName: string) => void;
  closePropertyEditor: () => void;
  savePropertyValue: () => void;

  // Property copy functions
  copyPropertyValue: (btn: HTMLElement, value: string) => void;
  copyPropertyPath: (btn: HTMLElement, path: string) => void;

  // SVG export functions
  exportFrameSvg: () => void;
  exportGraphSvg: () => void;
}

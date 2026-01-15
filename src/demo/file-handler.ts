/**
 * File handling: loading and parsing GTO files
 */
import { SimpleReader } from 'gto-js';
import { state, setGtoData } from './state';

export type ParseCallback = (filename: string) => void;

let onParseSuccess: ParseCallback | null = null;

export function setParseCallback(callback: ParseCallback): void {
  onParseSuccess = callback;
}

export function preventDefaults(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
}

export function handleDrop(e: DragEvent): void {
  const dt = e.dataTransfer;
  const files = dt?.files;
  if (files && files.length > 0) {
    loadFile(files[0]);
  }
}

export function handleFileSelect(event: Event): void {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    loadFile(file);
  }
}

export function loadFile(file: File): void {
  const reader = new FileReader();
  const isBinary = file.name.toLowerCase().endsWith('.gto');

  reader.onload = (e) => {
    const content = e.target?.result;
    if (content) parseGTO(content, file.name);
  };

  if (isBinary) {
    reader.readAsArrayBuffer(file);
  } else {
    reader.readAsText(file);
  }
}

export function parseGTO(content: string | ArrayBuffer, filename: string): boolean {
  const reader = new SimpleReader();
  const success = reader.open(content, filename);

  if (!success) {
    alert('Failed to parse GTO file');
    return false;
  }

  setGtoData(reader.result);

  if (onParseSuccess) {
    onParseSuccess(filename);
  }

  return true;
}

export async function loadSampleFile(): Promise<boolean> {
  try {
    const response = await fetch('./sample/test_session.rv');
    if (response.ok) {
      const content = await response.text();
      return parseGTO(content, 'test_session.rv');
    }
  } catch (e) {
    console.log('Sample file not available, waiting for user upload');
  }
  return false;
}

export function setupDragAndDrop(uploadArea: HTMLElement): void {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, () => uploadArea.classList.remove('dragover'), false);
  });

  uploadArea.addEventListener('drop', handleDrop, false);
}

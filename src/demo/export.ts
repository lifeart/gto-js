/**
 * Export functions: JSON, text GTO, binary GTO exports
 */
import { SimpleWriter } from 'gto-js';
import { getGtoData } from './state';

export function copyJSON(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;
  navigator.clipboard.writeText(JSON.stringify(gtoData, null, 2));
}

export function downloadJSON(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const blob = new Blob([JSON.stringify(gtoData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'session.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(): void {
  downloadJSON();
}

export function toggleExportMenu(): void {
  const menu = document.getElementById('export-menu');
  menu?.classList.toggle('show');
}

export function exportTextGTO(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  try {
    const text = SimpleWriter.write(gtoData);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session.rv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Export error:', e);
    alert('Failed to export as text: ' + (e as Error).message);
  }
  document.getElementById('export-menu')?.classList.remove('show');
}

export function exportBinaryGTO(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  try {
    const binary = SimpleWriter.write(gtoData, { binary: true });
    const blob = new Blob([binary], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'session.gto';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Export error:', e);
    alert('Failed to export as binary: ' + (e as Error).message);
  }
  document.getElementById('export-menu')?.classList.remove('show');
}

export function setupExportMenuClose(): void {
  document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('export-btn');
    if (dropdown && !dropdown.contains(e.target as Node)) {
      document.getElementById('export-menu')?.classList.remove('show');
    }
  });
}

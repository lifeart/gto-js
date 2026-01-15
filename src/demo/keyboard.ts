/**
 * Keyboard shortcuts handling
 */
import { getGtoData } from './state';
import { toggleTheme } from './theme';
import { expandAll, collapseAll } from './tree';
import { switchToTab } from './panels';

export function showShortcutsModal(): void {
  document.getElementById('shortcuts-modal')?.classList.add('visible');
}

export function hideShortcutsModal(): void {
  document.getElementById('shortcuts-modal')?.classList.remove('visible');
}

export function setupKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in input
    if ((e.target as Element).tagName === 'INPUT' ||
        (e.target as Element).tagName === 'SELECT' ||
        (e.target as Element).tagName === 'TEXTAREA') {
      return;
    }

    const modal = document.getElementById('shortcuts-modal');
    if (modal?.classList.contains('visible')) {
      if (e.key === 'Escape') hideShortcutsModal();
      return;
    }

    const gtoData = getGtoData();
    if (!gtoData) return;

    switch (e.key) {
      case '?':
        showShortcutsModal();
        break;
      case '/':
        e.preventDefault();
        document.getElementById('search-box')?.focus();
        break;
      case 't':
      case 'T':
        toggleTheme();
        break;
      case 'e':
      case 'E':
        expandAll();
        break;
      case 'c':
      case 'C':
        if (!e.ctrlKey && !e.metaKey) collapseAll();
        break;
      case '1':
        switchToTab('protocols');
        break;
      case '2':
        switchToTab('details');
        break;
      case '3':
        switchToTab('sources');
        break;
      case '4':
        switchToTab('timeline');
        break;
      case '5':
        switchToTab('annotations');
        break;
      case '6':
        switchToTab('graph');
        break;
      case '7':
        switchToTab('compare');
        break;
      case '8':
        switchToTab('json');
        break;
    }
  });
}

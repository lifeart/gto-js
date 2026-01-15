/**
 * Navigation: breadcrumb, hash navigation, recently viewed
 */
import { getGtoData } from './state';
import { escapeHtml, escapeAttr } from './utils';
import { getProtocolIcon } from './protocol-info';
import { selectFromProtocolView, switchToTab } from './panels';

// ============= Recently Viewed =============

const recentlyViewed: string[] = [];
const MAX_RECENT = 5;

export function addToRecent(objName: string): void {
  const idx = recentlyViewed.indexOf(objName);
  if (idx !== -1) {
    recentlyViewed.splice(idx, 1);
  }
  recentlyViewed.unshift(objName);
  if (recentlyViewed.length > MAX_RECENT) {
    recentlyViewed.pop();
  }
  renderRecentlyViewed();
}

function renderRecentlyViewed(): void {
  const section = document.getElementById('recent-section');
  const list = document.getElementById('recent-list');

  if (!section || !list) return;

  if (recentlyViewed.length === 0) {
    section.style.display = 'none';
    return;
  }

  const gtoData = getGtoData();
  section.style.display = 'block';
  list.innerHTML = recentlyViewed.map(name => {
    const obj = gtoData?.objects.find(o => o.name === name);
    const icon = obj ? getProtocolIcon(obj.protocol) : '○';
    return `<div class="recent-item" onclick="selectFromProtocolView('${escapeAttr(name)}')">${icon} ${escapeHtml(name)}</div>`;
  }).join('');
}

// ============= Breadcrumb Navigation =============

let currentBreadcrumb: { object: string | null; component: string | null; property: string | null } = {
  object: null,
  component: null,
  property: null
};

export function updateBreadcrumb(objName: string, compName: string | null = null, propName: string | null = null): void {
  currentBreadcrumb = { object: objName, component: compName, property: propName };
  renderBreadcrumb();
}

function renderBreadcrumb(): void {
  const container = document.getElementById('breadcrumb');

  if (!container) return;

  if (!currentBreadcrumb.object) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  let html = `<span class="breadcrumb-item${!currentBreadcrumb.component ? ' current' : ''}" onclick="selectFromProtocolView('${escapeAttr(currentBreadcrumb.object)}')">${escapeHtml(currentBreadcrumb.object)}</span>`;

  if (currentBreadcrumb.component) {
    html += `<span class="breadcrumb-sep">›</span>`;
    html += `<span class="breadcrumb-item${!currentBreadcrumb.property ? ' current' : ''}">${escapeHtml(currentBreadcrumb.component)}</span>`;
  }

  if (currentBreadcrumb.property) {
    html += `<span class="breadcrumb-sep">›</span>`;
    html += `<span class="breadcrumb-item current">${escapeHtml(currentBreadcrumb.property)}</span>`;
  }

  container.innerHTML = html;
}

// ============= URL Hash Navigation =============

export function handleHashChange(): void {
  const hash = window.location.hash.slice(1);
  const gtoData = getGtoData();
  if (!hash || !gtoData) return;

  const params = new URLSearchParams(hash);
  const objName = params.get('object');
  const tab = params.get('tab');

  if (objName) {
    const obj = gtoData.objects.find(o => o.name === objName);
    if (obj) {
      selectFromProtocolView(objName);
    }
  }

  if (tab) {
    switchToTab(tab);
  }
}

export function updateHash(objName: string | null = null, tab: string | null = null): void {
  const params = new URLSearchParams();
  if (objName) params.set('object', objName);
  if (tab) params.set('tab', tab);
  const hash = params.toString();
  if (hash) {
    history.replaceState(null, '', '#' + hash);
  }
}

export function setupHashNavigation(): void {
  window.addEventListener('hashchange', handleHashChange);
}

// ============= Copy to Clipboard =============

export function copyToClipboard(text: string, btn?: HTMLElement): void {
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      btn.textContent = '✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋';
        btn.classList.remove('copied');
      }, 1500);
    }
  });
}

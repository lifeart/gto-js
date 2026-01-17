/**
 * Tree component: object tree rendering and navigation
 */
import type { ObjectData, ComponentData, PropertyData } from 'gto-js';
import { state, getGtoData, setSelectedObject } from './state';
import { escapeHtml, escapeAttr } from './utils';
import { getProtocolIcon } from './protocol-info';

export type SelectionCallback = (obj: ObjectData, compName?: string | null) => void;

let onObjectSelect: SelectionCallback | null = null;

export function setSelectionCallback(callback: SelectionCallback): void {
  onObjectSelect = callback;
}

function getSearchText(obj: ObjectData): string {
  const parts = [obj.name, obj.protocol];
  for (const [compName, comp] of Object.entries(obj.components) as [string, ComponentData][]) {
    parts.push(compName);
    for (const propName of Object.keys(comp.properties)) {
      parts.push(propName);
    }
  }
  return parts.join(' ').toLowerCase();
}

function createTreeItem(obj: ObjectData): HTMLDivElement {
  const item = document.createElement('div');
  item.className = 'tree-item';
  item.dataset.name = obj.name;
  item.dataset.protocol = obj.protocol;
  item.dataset.searchText = getSearchText(obj);

  const componentCount = Object.keys(obj.components).length;

  item.innerHTML = `
    <div class="tree-item-header" data-object="${escapeAttr(obj.name)}">
      <div class="tree-toggle">▶</div>
      <div class="tree-icon object">${getProtocolIcon(obj.protocol)}</div>
      <div class="tree-name" title="${escapeAttr(obj.name)}">${escapeHtml(obj.name)}</div>
      <div class="tree-badge">${componentCount}</div>
    </div>
    <div class="tree-children">
      ${(Object.entries(obj.components) as [string, ComponentData][]).map(([name, comp]) => `
        <div class="tree-item" data-name="${escapeAttr(name)}">
          <div class="tree-item-header" data-object="${escapeAttr(obj.name)}" data-component="${escapeAttr(name)}">
            <div class="tree-toggle">▶</div>
            <div class="tree-icon component">◇</div>
            <div class="tree-name" title="${escapeAttr(name)}">${escapeHtml(name)}</div>
            <div class="tree-badge">${Object.keys(comp.properties).length}</div>
          </div>
          <div class="tree-children">
            ${(Object.entries(comp.properties) as [string, PropertyData][]).map(([propName, prop]) => `
              <div class="tree-item" data-name="${escapeAttr(propName)}">
                <div class="tree-item-header" data-object="${escapeAttr(obj.name)}" data-component="${escapeAttr(name)}" data-property="${escapeAttr(propName)}">
                  <div class="tree-toggle" style="visibility: hidden">▶</div>
                  <div class="tree-icon property">●</div>
                  <div class="tree-name" title="${escapeAttr(propName)}">${escapeHtml(propName)}</div>
                  <span class="type-badge ${prop.type}">${prop.type}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  return item;
}

function toggleTreeItem(toggle: HTMLElement): void {
  toggle.classList.toggle('expanded');
  const children = toggle.closest('.tree-item')?.querySelector(':scope > .tree-children');
  if (children) {
    children.classList.toggle('expanded');
  }
}

function isVisible(el: Element): boolean {
  let parent = el.parentElement;
  while (parent && parent.id !== 'object-tree') {
    if (parent.classList.contains('tree-children') && !parent.classList.contains('expanded')) {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

function selectHeaderElement(header: Element): void {
  document.querySelectorAll('.tree-item-header.selected').forEach(el => el.classList.remove('selected'));
  header.classList.add('selected');
  header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const objName = (header as HTMLElement).dataset.object;
  const gtoData = getGtoData();
  if (objName && !(header as HTMLElement).dataset.component && gtoData) {
    const obj = gtoData.objects.find(o => o.name === objName);
    if (obj) {
      setSelectedObject(obj);
      if (onObjectSelect) {
        onObjectSelect(obj);
      }
    }
  }
}

function selectFirstVisible(): void {
  const container = document.getElementById('object-tree');
  const first = container?.querySelector('.tree-item:not([style*="display: none"]) > .tree-item-header');
  if (first) selectHeaderElement(first);
}

function handleTreeKeyboard(e: KeyboardEvent): void {
  const container = document.getElementById('object-tree');
  if (!container) return;

  const selected = container.querySelector('.tree-item-header.selected');

  if (!selected) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      selectFirstVisible();
    }
    return;
  }

  const allHeaders = [...container.querySelectorAll('.tree-item-header')].filter(h => {
    const item = h.closest('.tree-item') as HTMLElement;
    return item.style.display !== 'none' && isVisible(h);
  });

  const currentIndex = allHeaders.indexOf(selected);

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      if (currentIndex < allHeaders.length - 1) {
        const next = allHeaders[currentIndex + 1];
        selectHeaderElement(next);
      }
      break;

    case 'ArrowUp':
      e.preventDefault();
      if (currentIndex > 0) {
        const prev = allHeaders[currentIndex - 1];
        selectHeaderElement(prev);
      }
      break;

    case 'ArrowRight':
      e.preventDefault();
      const toggleRight = selected.querySelector('.tree-toggle') as HTMLElement | null;
      if (toggleRight && toggleRight.style.visibility !== 'hidden' && !toggleRight.classList.contains('expanded')) {
        toggleTreeItem(toggleRight);
      }
      break;

    case 'ArrowLeft':
      e.preventDefault();
      const toggleLeft = selected.querySelector('.tree-toggle') as HTMLElement | null;
      if (toggleLeft && toggleLeft.classList.contains('expanded')) {
        toggleTreeItem(toggleLeft);
      } else {
        const parentItem = selected.closest('.tree-item')?.parentElement?.closest('.tree-item');
        if (parentItem) {
          const parentHeader = parentItem.querySelector(':scope > .tree-item-header');
          if (parentHeader) selectHeaderElement(parentHeader);
        }
      }
      break;

    case 'Enter':
      e.preventDefault();
      const objName = (selected as HTMLElement).dataset.object;
      const compName = (selected as HTMLElement).dataset.component;
      if (objName) {
        selectObjectByName(objName, compName);
      }
      break;

    case 'Home':
      e.preventDefault();
      if (allHeaders.length > 0) selectHeaderElement(allHeaders[0]);
      break;

    case 'End':
      e.preventDefault();
      if (allHeaders.length > 0) selectHeaderElement(allHeaders[allHeaders.length - 1]);
      break;
  }
}

export function selectObjectByName(name: string, compName: string | null = null, propName: string | null = null): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const obj = gtoData.objects.find(o => o.name === name);
  if (obj) {
    selectObject(obj, compName);
  }
}

export function selectObject(obj: ObjectData, highlightComponent: string | null = null): void {
  setSelectedObject(obj);

  // Update tree selection
  document.querySelectorAll('.tree-item-header.selected').forEach(el => {
    el.classList.remove('selected');
  });

  const header = document.querySelector(`.tree-item-header[data-object="${escapeAttr(obj.name)}"]:not([data-component])`);
  if (header) {
    header.classList.add('selected');
    header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Expand this item
    const toggle = header.querySelector('.tree-toggle');
    if (toggle && !toggle.classList.contains('expanded')) {
      toggle.classList.add('expanded');
      header.closest('.tree-item')?.querySelector(':scope > .tree-children')?.classList.add('expanded');
    }
  }

  if (onObjectSelect) {
    onObjectSelect(obj, highlightComponent);
  }
}

export function filterTree(): void {
  const searchBox = document.getElementById('search-box') as HTMLInputElement | null;
  const protocolFilter = document.getElementById('protocol-filter') as HTMLSelectElement | null;
  const query = searchBox?.value.toLowerCase() || '';
  const protocol = protocolFilter?.value || '';

  const items = document.querySelectorAll('#object-tree > .tree-item');

  items.forEach(item => {
    const htmlItem = item as HTMLElement;
    const matchesProtocol = !protocol || htmlItem.dataset.protocol === protocol;
    const matchesSearch = !query || htmlItem.dataset.searchText?.includes(query);
    const show = matchesProtocol && matchesSearch;

    htmlItem.style.display = show ? 'block' : 'none';

    // If searching, expand matching items to show context
    if (show && query) {
      const toggle = htmlItem.querySelector(':scope > .tree-item-header > .tree-toggle');
      if (toggle && !toggle.classList.contains('expanded')) {
        toggle.classList.add('expanded');
        htmlItem.querySelector(':scope > .tree-children')?.classList.add('expanded');
      }
    }
  });

  updateMatchCount();
}

function updateMatchCount(): void {
  const items = document.querySelectorAll('#object-tree > .tree-item');
  const visible = [...items].filter(i => (i as HTMLElement).style.display !== 'none').length;
  const total = items.length;
  const countEl = document.getElementById('match-count');

  if (countEl) {
    if (visible === total) {
      countEl.textContent = `${total} objects`;
    } else {
      countEl.textContent = `${visible} of ${total} objects`;
    }
  }
}

export function expandAll(): void {
  document.querySelectorAll('#object-tree .tree-toggle').forEach(toggle => {
    const htmlToggle = toggle as HTMLElement;
    if (htmlToggle.style.visibility !== 'hidden' && !toggle.classList.contains('expanded')) {
      toggle.classList.add('expanded');
      toggle.closest('.tree-item')?.querySelector(':scope > .tree-children')?.classList.add('expanded');
    }
  });
}

export function collapseAll(): void {
  document.querySelectorAll('#object-tree .tree-toggle.expanded').forEach(toggle => {
    toggle.classList.remove('expanded');
    toggle.closest('.tree-item')?.querySelector(':scope > .tree-children')?.classList.remove('expanded');
  });
}

export function renderTree(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('object-tree');
  if (!container) return;

  container.innerHTML = '';

  // Populate protocol filter
  const protocolFilter = document.getElementById('protocol-filter');
  const protocols = [...new Set(gtoData.objects.map(o => o.protocol))].sort();
  if (protocolFilter) {
    protocolFilter.innerHTML = '<option value="">All Protocols</option>' +
      protocols.map(p => `<option value="${p}">${p}</option>`).join('');
  }

  for (const obj of gtoData.objects) {
    const item = createTreeItem(obj);
    container.appendChild(item);
  }

  setupTreeEvents();
  updateMatchCount();
}

function setupTreeEvents(): void {
  const container = document.getElementById('object-tree');
  const searchBox = document.getElementById('search-box') as HTMLInputElement | null;
  const protocolFilter = document.getElementById('protocol-filter');

  if (!container) return;

  // Click delegation for tree
  container.addEventListener('click', (e) => {
    const target = e.target as Element;
    const toggle = target.closest('.tree-toggle') as HTMLElement | null;
    const header = target.closest('.tree-item-header') as HTMLElement | null;

    if (toggle && toggle.style.visibility !== 'hidden') {
      e.stopPropagation();
      toggleTreeItem(toggle);
      return;
    }

    if (header) {
      const objName = header.dataset.object;
      const compName = header.dataset.component;
      const propName = header.dataset.property;

      if (objName) {
        selectObjectByName(objName, compName, propName);
      }
    }
  });

  // Double-click to expand/collapse
  container.addEventListener('dblclick', (e) => {
    const target = e.target as Element;
    const header = target.closest('.tree-item-header') as HTMLElement | null;
    if (header) {
      const toggle = header.querySelector('.tree-toggle') as HTMLElement | null;
      if (toggle && toggle.style.visibility !== 'hidden') {
        toggleTreeItem(toggle);
      }
    }
  });

  // Keyboard navigation
  container.addEventListener('keydown', handleTreeKeyboard);

  // Search input
  if (searchBox) {
    searchBox.addEventListener('input', () => filterTree());
    searchBox.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        searchBox.value = '';
        filterTree();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        container.focus();
        selectFirstVisible();
      }
    });
  }

  // Protocol filter
  if (protocolFilter) {
    protocolFilter.addEventListener('change', () => filterTree());
  }
}

export function toggleTypeFilter(type: string): void {
  const protocolFilter = document.getElementById('protocol-filter') as HTMLSelectElement | null;
  if (protocolFilter) {
    protocolFilter.value = type;
    filterTree();
  }
}

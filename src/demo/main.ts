import './style.css';
import { SimpleReader, SimpleWriter } from 'gto-js';

let gtoData = null;
let selectedObject = null;

// Expose functions to window for inline handlers
window.handleFileSelect = handleFileSelect;
window.filterTree = filterTree;
window.exportJSON = exportJSON;

// Drag and drop
const uploadArea = document.getElementById('upload-area');

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

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length > 0) {
    loadFile(files[0]);
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    loadFile(file);
  }
}

function loadFile(file) {
  const reader = new FileReader();
  const isBinary = file.name.toLowerCase().endsWith('.gto');

  reader.onload = (e) => {
    const content = e.target.result;
    parseGTO(content, file.name);
  };

  if (isBinary) {
    // Binary format - read as ArrayBuffer
    reader.readAsArrayBuffer(file);
  } else {
    // Text format - read as text
    reader.readAsText(file);
  }
}

function parseGTO(content, filename) {
  const reader = new SimpleReader();
  const success = reader.open(content, filename);

  if (!success) {
    alert('Failed to parse GTO file');
    return;
  }

  gtoData = reader.result;
  showDataView();
  renderStats();
  renderTree();
  renderAllPanels();

  // Select first object
  if (gtoData.objects.length > 0) {
    selectObject(gtoData.objects[0]);
  }
}

function showDataView() {
  document.getElementById('upload-container').style.display = 'none';
  document.getElementById('data-view').classList.add('visible');
  document.getElementById('sidebar').style.display = 'flex';
  document.getElementById('export-btn').style.display = 'flex';
}

function renderStats() {
  const stats = calculateStats();
  const container = document.getElementById('stats-bar');

  container.innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${stats.objects}</div>
      <div class="stat-label">Objects</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.protocols}</div>
      <div class="stat-label">Protocols</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.components}</div>
      <div class="stat-label">Components</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.sources}</div>
      <div class="stat-label">Sources</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${stats.annotations}</div>
      <div class="stat-label">Annotations</div>
    </div>
  `;
}

function calculateStats() {
  let components = 0;
  let properties = 0;
  let sources = 0;
  let annotations = 0;
  const protocolSet = new Set();

  for (const obj of gtoData.objects) {
    protocolSet.add(obj.protocol);
    components += Object.keys(obj.components).length;

    for (const comp of Object.values(obj.components)) {
      properties += Object.keys(comp.properties).length;
    }

    if (obj.protocol === 'RVFileSource') {
      sources++;
    }

    if (obj.protocol === 'RVPaint') {
      const paintComp = obj.components.paint;
      if (paintComp && paintComp.properties.nextId) {
        annotations += paintComp.properties.nextId.data[0] || 0;
      }
    }
  }

  return {
    objects: gtoData.objects.length,
    protocols: protocolSet.size,
    components,
    properties,
    sources,
    annotations
  };
}

function renderTree() {
  const container = document.getElementById('object-tree');
  container.innerHTML = '';

  // Populate protocol filter
  const protocolFilter = document.getElementById('protocol-filter');
  const protocols = [...new Set(gtoData.objects.map(o => o.protocol))].sort();
  protocolFilter.innerHTML = '<option value="">All Protocols</option>' +
    protocols.map(p => `<option value="${p}">${p}</option>`).join('');

  for (const obj of gtoData.objects) {
    const item = createTreeItem(obj);
    container.appendChild(item);
  }

  // Setup event delegation
  setupTreeEvents();
  updateMatchCount();
}

function createTreeItem(obj) {
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
      ${Object.entries(obj.components).map(([name, comp]) => `
        <div class="tree-item" data-name="${escapeAttr(name)}">
          <div class="tree-item-header" data-object="${escapeAttr(obj.name)}" data-component="${escapeAttr(name)}">
            <div class="tree-toggle">▶</div>
            <div class="tree-icon component">◇</div>
            <div class="tree-name" title="${escapeAttr(name)}">${escapeHtml(name)}</div>
            <div class="tree-badge">${Object.keys(comp.properties).length}</div>
          </div>
          <div class="tree-children">
            ${Object.entries(comp.properties).map(([propName, prop]) => `
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

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getSearchText(obj) {
  const parts = [obj.name, obj.protocol];
  for (const [compName, comp] of Object.entries(obj.components)) {
    parts.push(compName);
    for (const propName of Object.keys(comp.properties)) {
      parts.push(propName);
    }
  }
  return parts.join(' ').toLowerCase();
}

function getProtocolIcon(protocol) {
  return PROTOCOL_INFO[protocol]?.icon || '○';
}

function setupTreeEvents() {
  const container = document.getElementById('object-tree');
  const searchBox = document.getElementById('search-box');
  const protocolFilter = document.getElementById('protocol-filter');

  // Click delegation for tree
  container.addEventListener('click', (e) => {
    const toggle = e.target.closest('.tree-toggle');
    const header = e.target.closest('.tree-item-header');

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
    const header = e.target.closest('.tree-item-header');
    if (header) {
      const toggle = header.querySelector('.tree-toggle');
      if (toggle && toggle.style.visibility !== 'hidden') {
        toggleTreeItem(toggle);
      }
    }
  });

  // Keyboard navigation
  container.addEventListener('keydown', handleTreeKeyboard);

  // Search input
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

  // Protocol filter
  protocolFilter.addEventListener('change', () => filterTree());
}

function toggleTreeItem(toggle) {
  toggle.classList.toggle('expanded');
  const children = toggle.closest('.tree-item').querySelector(':scope > .tree-children');
  if (children) {
    children.classList.toggle('expanded');
  }
}

function selectObjectByName(name, compName = null, propName = null) {
  const obj = gtoData.objects.find(o => o.name === name);
  if (obj) {
    selectObject(obj, compName);
    // Switch to details tab
    switchToTab('details');
  }
}
window.selectObjectByName = selectObjectByName;

function selectObject(obj, highlightComponent = null) {
  selectedObject = obj;

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
      header.closest('.tree-item').querySelector(':scope > .tree-children')?.classList.add('expanded');
    }
  }

  renderDetailsPanel(obj, highlightComponent);
}

function handleTreeKeyboard(e) {
  const container = document.getElementById('object-tree');
  const selected = container.querySelector('.tree-item-header.selected');

  if (!selected) {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      selectFirstVisible();
    }
    return;
  }

  const allHeaders = [...container.querySelectorAll('.tree-item-header')].filter(h => {
    const item = h.closest('.tree-item');
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
      const toggleRight = selected.querySelector('.tree-toggle');
      if (toggleRight && toggleRight.style.visibility !== 'hidden' && !toggleRight.classList.contains('expanded')) {
        toggleTreeItem(toggleRight);
      }
      break;

    case 'ArrowLeft':
      e.preventDefault();
      const toggleLeft = selected.querySelector('.tree-toggle');
      if (toggleLeft && toggleLeft.classList.contains('expanded')) {
        toggleTreeItem(toggleLeft);
      } else {
        // Go to parent
        const parentItem = selected.closest('.tree-item').parentElement.closest('.tree-item');
        if (parentItem) {
          const parentHeader = parentItem.querySelector(':scope > .tree-item-header');
          if (parentHeader) selectHeaderElement(parentHeader);
        }
      }
      break;

    case 'Enter':
      e.preventDefault();
      const objName = selected.dataset.object;
      if (objName) {
        selectObjectByName(objName, selected.dataset.component);
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

function isVisible(el) {
  let parent = el.parentElement;
  while (parent && parent.id !== 'object-tree') {
    if (parent.classList.contains('tree-children') && !parent.classList.contains('expanded')) {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

function selectFirstVisible() {
  const container = document.getElementById('object-tree');
  const first = container.querySelector('.tree-item:not([style*="display: none"]) > .tree-item-header');
  if (first) selectHeaderElement(first);
}

function selectHeaderElement(header) {
  document.querySelectorAll('.tree-item-header.selected').forEach(el => el.classList.remove('selected'));
  header.classList.add('selected');
  header.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const objName = header.dataset.object;
  if (objName && !header.dataset.component) {
    const obj = gtoData.objects.find(o => o.name === objName);
    if (obj) {
      selectedObject = obj;
      renderDetailsPanel(obj);
    }
  }
}

function filterTree() {
  const searchBox = document.getElementById('search-box');
  const protocolFilter = document.getElementById('protocol-filter');
  const query = searchBox.value.toLowerCase();
  const protocol = protocolFilter.value;

  const items = document.querySelectorAll('#object-tree > .tree-item');

  items.forEach(item => {
    const matchesProtocol = !protocol || item.dataset.protocol === protocol;
    const matchesSearch = !query || item.dataset.searchText.includes(query);
    const show = matchesProtocol && matchesSearch;

    item.style.display = show ? 'block' : 'none';

    // If searching, expand matching items to show context
    if (show && query) {
      const toggle = item.querySelector(':scope > .tree-item-header > .tree-toggle');
      if (toggle && !toggle.classList.contains('expanded')) {
        toggle.classList.add('expanded');
        item.querySelector(':scope > .tree-children')?.classList.add('expanded');
      }
    }
  });

  updateMatchCount();
}

function updateMatchCount() {
  const items = document.querySelectorAll('#object-tree > .tree-item');
  const visible = [...items].filter(i => i.style.display !== 'none').length;
  const total = items.length;
  const countEl = document.getElementById('match-count');

  if (visible === total) {
    countEl.textContent = `${total} objects`;
  } else {
    countEl.textContent = `${visible} of ${total} objects`;
  }
}

window.expandAll = function() {
  document.querySelectorAll('#object-tree .tree-toggle').forEach(toggle => {
    if (toggle.style.visibility !== 'hidden' && !toggle.classList.contains('expanded')) {
      toggle.classList.add('expanded');
      toggle.closest('.tree-item').querySelector(':scope > .tree-children')?.classList.add('expanded');
    }
  });
};

window.collapseAll = function() {
  document.querySelectorAll('#object-tree .tree-toggle.expanded').forEach(toggle => {
    toggle.classList.remove('expanded');
    toggle.closest('.tree-item').querySelector(':scope > .tree-children')?.classList.remove('expanded');
  });
};

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));

    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.panel}`).classList.add('visible');
  });
});

function renderAllPanels() {
  renderProtocolsPanel();
  renderSourcesPanel();
  renderTimelinePanel();
  renderAnnotationsPanel();
  renderGraphPanel();
  renderJSONPanel();
}

// Protocol metadata
const PROTOCOL_INFO = {
  'RVSession': {
    icon: '◉',
    category: 'session',
    description: 'Main session state: timeline range, FPS, current frame, view settings',
    getDetails: (obj) => {
      const session = obj.components.session?.properties;
      const matte = obj.components.matte?.properties;
      return {
        'FPS': session?.fps?.data?.[0] || 24,
        'Frame': session?.currentFrame?.data?.[0] || 1,
        'Range': session?.range?.data?.[0] ? `${session.range.data[0][0]}-${session.range.data[0][1]}` : '-',
        'Matte': matte?.show?.data?.[0] ? `${(matte.aspect?.data?.[0] || 1).toFixed(2)}:1` : 'Off'
      };
    }
  },
  'RVFileSource': {
    icon: '🎬',
    category: 'source',
    description: 'Media file source: movie path, frame range, resolution',
    getDetails: (obj) => {
      const media = obj.components.media?.properties;
      const proxy = obj.components.proxy?.properties;
      const moviePath = media?.movie?.data?.[0] || '';
      const fileName = moviePath.split(/[/\\]/).pop() || 'Unknown';
      return {
        'File': fileName,
        'Range': proxy?.range?.data?.[0] ? `${proxy.range.data[0][0]}-${proxy.range.data[0][1]}` : '-',
        'Size': proxy?.size?.data?.[0] ? `${proxy.size.data[0][0]}×${proxy.size.data[0][1]}` : '-',
        'FPS': proxy?.fps?.data?.[0] || '-'
      };
    }
  },
  'RVSourceGroup': {
    icon: '📦',
    category: 'group',
    description: 'Source container: groups related source nodes together',
    getDetails: (obj) => {
      const ui = obj.components.ui?.properties;
      return {
        'Name': ui?.name?.data?.[0] || obj.name
      };
    }
  },
  'RVSequenceGroup': {
    icon: '📋',
    category: 'group',
    description: 'Sequence: plays sources sequentially (like NLE timeline)',
    getDetails: (obj) => {
      const ui = obj.components.ui?.properties;
      const session = obj.components.session?.properties;
      const markers = obj.components.markers?.properties;
      return {
        'Name': ui?.name?.data?.[0] || obj.name,
        'FPS': session?.fps?.data?.[0] || 24,
        'Markers': markers?.in?.data?.length || 0
      };
    }
  },
  'RVStackGroup': {
    icon: '📚',
    category: 'group',
    description: 'Stack: composites sources together (layered)',
    getDetails: (obj) => {
      const ui = obj.components.ui?.properties;
      return {
        'Name': ui?.name?.data?.[0] || obj.name
      };
    }
  },
  'RVLayoutGroup': {
    icon: '⊞',
    category: 'group',
    description: 'Layout: arranges sources spatially (grid, packed)',
    getDetails: (obj) => {
      const ui = obj.components.ui?.properties;
      const layout = obj.components.layout?.properties;
      return {
        'Name': ui?.name?.data?.[0] || obj.name,
        'Mode': layout?.mode?.data?.[0] || 'packed',
        'Grid': layout?.gridRows?.data?.[0] && layout?.gridColumns?.data?.[0]
          ? `${layout.gridRows.data[0]}×${layout.gridColumns.data[0]}` : 'Auto'
      };
    }
  },
  'RVOutputGroup': {
    icon: '📤',
    category: 'output',
    description: 'Output settings: resolution, data type, pixel aspect',
    getDetails: (obj) => {
      const output = obj.components.output?.properties;
      const w = output?.width?.data?.[0] || 0;
      const h = output?.height?.data?.[0] || 0;
      return {
        'Size': w && h ? `${w}×${h}` : 'Auto',
        'Type': output?.dataType?.data?.[0] || 'uint8',
        'Active': output?.active?.data?.[0] ? 'Yes' : 'No'
      };
    }
  },
  'RVPaint': {
    icon: '🖌',
    category: 'paint',
    description: 'Paint/annotations: pen strokes, text overlays per frame',
    getDetails: (obj) => {
      const paint = obj.components.paint?.properties;
      let penCount = 0, textCount = 0;
      for (const compName of Object.keys(obj.components)) {
        if (compName.startsWith('pen:')) penCount++;
        if (compName.startsWith('text:')) textCount++;
      }
      return {
        'Strokes': penCount,
        'Text': textCount,
        'Show': paint?.show?.data?.[0] ? 'Yes' : 'No'
      };
    }
  },
  'RVOverlay': {
    icon: '🔲',
    category: 'paint',
    description: 'Overlay graphics: rectangles and text on source',
    getDetails: (obj) => {
      const overlay = obj.components.overlay?.properties;
      return {
        'Rects': overlay?.nextRectId?.data?.[0] || 0,
        'Text': overlay?.nextTextId?.data?.[0] || 0,
        'Show': overlay?.show?.data?.[0] ? 'Yes' : 'No'
      };
    }
  },
  'RVColor': {
    icon: '🎨',
    category: 'color',
    description: 'Color correction: exposure, contrast, saturation, gamma',
    getDetails: (obj) => {
      const color = obj.components.color?.properties;
      const lut = obj.components.lut?.properties;
      const cdl = obj.components.CDL?.properties;
      return {
        'Active': color?.active?.data?.[0] ? 'Yes' : 'No',
        'Saturation': color?.saturation?.data?.[0]?.toFixed(2) || '1.00',
        'Hue': color?.hue?.data?.[0]?.toFixed(1) || '0.0',
        'LUT': lut?.active?.data?.[0] ? lut?.name?.data?.[0] || 'Active' : 'None',
        'CDL': cdl?.active?.data?.[0] ? 'Active' : 'Off'
      };
    }
  },
  'RVDisplayColor': {
    icon: '🖥',
    category: 'color',
    description: 'Display color: gamma, sRGB, Rec709, brightness',
    getDetails: (obj) => {
      const color = obj.components.color?.properties;
      const lut = obj.components.lut?.properties;
      return {
        'Gamma': color?.gamma?.data?.[0]?.toFixed(2) || '1.00',
        'sRGB': color?.sRGB?.data?.[0] ? 'Yes' : 'No',
        'Rec709': color?.Rec709?.data?.[0] ? 'Yes' : 'No',
        'LUT': lut?.active?.data?.[0] ? lut?.type?.data?.[0] || 'Active' : 'None'
      };
    }
  },
  'RVLinearize': {
    icon: '📈',
    category: 'color',
    description: 'Linearization: convert to linear colorspace for compositing',
    getDetails: (obj) => {
      const color = obj.components.color?.properties;
      return {
        'Active': color?.active?.data?.[0] ? 'Yes' : 'No',
        'sRGB→Linear': color?.sRGB2linear?.data?.[0] ? 'Yes' : 'No',
        'Rec709→Linear': color?.Rec709ToLinear?.data?.[0] ? 'Yes' : 'No',
        'File Gamma': color?.fileGamma?.data?.[0]?.toFixed(2) || '1.00'
      };
    }
  },
  'RVTransform2D': {
    icon: '↔',
    category: 'transform',
    description: '2D transform: translate, scale, rotate, flip/flop',
    getDetails: (obj) => {
      const xform = obj.components.transform?.properties;
      const translate = xform?.translate?.data?.[0] || [0, 0];
      const scale = xform?.scale?.data?.[0] || [1, 1];
      return {
        'Active': xform?.active?.data?.[0] ? 'Yes' : 'No',
        'Translate': `${translate[0].toFixed(1)}, ${translate[1].toFixed(1)}`,
        'Scale': `${scale[0].toFixed(2)}, ${scale[1].toFixed(2)}`,
        'Rotate': `${xform?.rotate?.data?.[0]?.toFixed(1) || 0}°`,
        'Flip': xform?.flip?.data?.[0] ? 'Yes' : 'No',
        'Flop': xform?.flop?.data?.[0] ? 'Yes' : 'No'
      };
    }
  },
  'RVDispTransform2D': {
    icon: '🔍',
    category: 'transform',
    description: 'Display transform: pan/zoom in viewer',
    getDetails: (obj) => {
      const xform = obj.components.transform?.properties;
      const translate = xform?.translate?.data?.[0] || [0, 0];
      const scale = xform?.scale?.data?.[0] || [1, 1];
      return {
        'Pan': `${translate[0].toFixed(1)}, ${translate[1].toFixed(1)}`,
        'Zoom': `${scale[0].toFixed(2)}×`
      };
    }
  },
  'RVRetime': {
    icon: '⏱',
    category: 'transform',
    description: 'Retime: time scale, offset, warp curves, explicit frame mapping',
    getDetails: (obj) => {
      const visual = obj.components.visual?.properties;
      const warp = obj.components.warp?.properties;
      const explicit = obj.components.explicit?.properties;
      const output = obj.components.output?.properties;
      return {
        'Scale': visual?.scale?.data?.[0]?.toFixed(2) || '1.00',
        'Offset': visual?.offset?.data?.[0]?.toFixed(1) || '0',
        'FPS': output?.fps?.data?.[0] || 24,
        'Warp': warp?.active?.data?.[0] ? 'Active' : 'Off',
        'Explicit': explicit?.active?.data?.[0] ? 'Active' : 'Off'
      };
    }
  },
  'RVLensWarp': {
    icon: '🔘',
    category: 'transform',
    description: 'Lens distortion: k1/k2/k3 radial, p1/p2 tangential distortion',
    getDetails: (obj) => {
      const warp = obj.components.warp?.properties;
      const node = obj.components.node?.properties;
      return {
        'Active': node?.active?.data?.[0] ? 'Yes' : 'No',
        'Model': warp?.model?.data?.[0] || 'brown',
        'K1': warp?.k1?.data?.[0]?.toFixed(4) || '0',
        'K2': warp?.k2?.data?.[0]?.toFixed(4) || '0'
      };
    }
  },
  'RVDisplayStereo': {
    icon: '👓',
    category: 'output',
    description: 'Stereo display: anaglyph, side-by-side, checkerboard modes',
    getDetails: (obj) => {
      const stereo = obj.components.stereo?.properties;
      return {
        'Mode': stereo?.type?.data?.[0] || 'off',
        'Swap': stereo?.swap?.data?.[0] ? 'Yes' : 'No',
        'Offset': stereo?.relativeOffset?.data?.[0]?.toFixed(2) || '0'
      };
    }
  },
  'RVSourceStereo': {
    icon: '📷',
    category: 'source',
    description: 'Source stereo: left/right eye configuration',
    getDetails: (obj) => {
      const stereo = obj.components.stereo?.properties;
      return {
        'Swap': stereo?.swap?.data?.[0] ? 'Yes' : 'No',
        'Offset': stereo?.relativeOffset?.data?.[0]?.toFixed(2) || '0'
      };
    }
  },
  'RVStack': {
    icon: '⬛',
    category: 'group',
    description: 'Stack node: compositing mode, output size, audio routing',
    getDetails: (obj) => {
      const output = obj.components.output?.properties;
      const composite = obj.components.composite?.properties;
      return {
        'Size': output?.size?.data ? `${output.size.data[0]}×${output.size.data[1]}` : 'Auto',
        'FPS': output?.fps?.data?.[0] || 24,
        'Composite': composite?.type?.data?.[0] || 'over',
        'Auto Size': output?.autoSize?.data?.[0] ? 'Yes' : 'No'
      };
    }
  },
  'RVSequence': {
    icon: '🎞',
    category: 'group',
    description: 'Sequence node: EDL (edit decision list), output settings',
    getDetails: (obj) => {
      const edl = obj.components.edl?.properties;
      const output = obj.components.output?.properties;
      const clipCount = edl?.source?.data?.length || 0;
      return {
        'Clips': clipCount,
        'Size': output?.size?.data ? `${output.size.data[0]}×${output.size.data[1]}` : 'Auto',
        'FPS': output?.fps?.data?.[0] || 24,
        'Auto EDL': obj.components.mode?.properties?.autoEDL?.data?.[0] ? 'Yes' : 'No'
      };
    }
  },
  'RVFormat': {
    icon: '📐',
    category: 'transform',
    description: 'Format: resize, crop, scale source media',
    getDetails: (obj) => {
      const geo = obj.components.geometry?.properties;
      const crop = obj.components.crop?.properties;
      return {
        'Scale': geo?.scale?.data?.[0]?.toFixed(2) || '1.00',
        'Method': geo?.resampleMethod?.data?.[0] || 'area',
        'Crop': crop?.active?.data?.[0] ? 'Active' : 'Off'
      };
    }
  },
  'RVCache': {
    icon: '💾',
    category: 'output',
    description: 'Cache settings: downsampling for performance',
    getDetails: (obj) => {
      const render = obj.components.render?.properties;
      return {
        'Downsampling': `${render?.downSampling?.data?.[0] || 1}×`
      };
    }
  },
  'RVCacheLUT': {
    icon: '📊',
    category: 'color',
    description: 'Cache LUT: baked color transforms for caching',
    getDetails: (obj) => {
      const lut = obj.components.lut?.properties;
      return {
        'Active': lut?.active?.data?.[0] ? 'Yes' : 'No',
        'Type': lut?.type?.data?.[0] || 'Luminance'
      };
    }
  },
  'RVLookLUT': {
    icon: '🎭',
    category: 'color',
    description: 'Look LUT: creative color grades (CDL, 3D LUT)',
    getDetails: (obj) => {
      const lut = obj.components.lut?.properties;
      return {
        'Active': lut?.active?.data?.[0] ? 'Yes' : 'No',
        'File': lut?.file?.data?.[0] || 'None',
        'Type': lut?.type?.data?.[0] || 'Luminance'
      };
    }
  },
  'RVChannelMap': {
    icon: '🔀',
    category: 'color',
    description: 'Channel mapping: reorder or select color channels',
    getDetails: (obj) => {
      const format = obj.components.format?.properties;
      return {
        'Channels': format?.channels?.data?.join(', ') || 'Default'
      };
    }
  },
  'RVSoundTrack': {
    icon: '🔊',
    category: 'output',
    description: 'Audio: volume, balance, offset, mute',
    getDetails: (obj) => {
      const audio = obj.components.audio?.properties;
      return {
        'Volume': audio?.volume?.data?.[0]?.toFixed(2) || '1.00',
        'Balance': audio?.balance?.data?.[0]?.toFixed(2) || '0.00',
        'Mute': audio?.mute?.data?.[0] ? 'Yes' : 'No'
      };
    }
  },
  'connection': {
    icon: '🔗',
    category: 'session',
    description: 'Node graph: connections between nodes, evaluation order',
    getDetails: (obj) => {
      const eval_ = obj.components.evaluation?.properties;
      const top = obj.components.top?.properties;
      return {
        'Connections': eval_?.connections?.data?.length || 0,
        'Top Nodes': top?.nodes?.data?.length || 0
      };
    }
  },
  // Pipeline groups
  'RVColorPipelineGroup': {
    icon: '🎨',
    category: 'pipeline',
    description: 'Color pipeline: chain of color processing nodes',
    getDetails: (obj) => ({ 'Nodes': obj.components.pipeline?.properties?.nodes?.data?.[0] || '-' })
  },
  'RVDisplayPipelineGroup': {
    icon: '🖥',
    category: 'pipeline',
    description: 'Display pipeline: final display processing chain',
    getDetails: (obj) => ({ 'Nodes': obj.components.pipeline?.properties?.nodes?.data?.[0] || '-' })
  },
  'RVLinearizePipelineGroup': {
    icon: '📈',
    category: 'pipeline',
    description: 'Linearize pipeline: input linearization chain',
    getDetails: (obj) => {
      const nodes = obj.components.pipeline?.properties?.nodes?.data;
      return { 'Nodes': Array.isArray(nodes) ? nodes.join(', ') : (nodes || '-') };
    }
  },
  'RVLookPipelineGroup': {
    icon: '🎭',
    category: 'pipeline',
    description: 'Look pipeline: creative color grading chain',
    getDetails: (obj) => ({ 'Nodes': obj.components.pipeline?.properties?.nodes?.data?.[0] || '-' })
  },
  'RVViewPipelineGroup': {
    icon: '👁',
    category: 'pipeline',
    description: 'View pipeline: viewer-specific processing',
    getDetails: (obj) => {
      const nodes = obj.components.pipeline?.properties?.nodes?.data;
      return { 'Nodes': Array.isArray(nodes) && nodes.length ? nodes.join(', ') : 'Empty' };
    }
  }
};

function renderProtocolsPanel() {
  const container = document.getElementById('panel-protocols');

  // Group objects by protocol
  const groups = {};
  for (const obj of gtoData.objects) {
    const protocol = obj.protocol;
    if (!groups[protocol]) {
      groups[protocol] = [];
    }
    groups[protocol].push(obj);
  }

  // Sort protocols by category for logical grouping
  const categoryOrder = ['session', 'source', 'group', 'color', 'transform', 'paint', 'pipeline', 'output'];
  const sortedProtocols = Object.keys(groups).sort((a, b) => {
    const catA = PROTOCOL_INFO[a]?.category || 'other';
    const catB = PROTOCOL_INFO[b]?.category || 'other';
    const orderA = categoryOrder.indexOf(catA);
    const orderB = categoryOrder.indexOf(catB);
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  let html = '<div class="protocol-grid">';

  for (const protocol of sortedProtocols) {
    const objects = groups[protocol];
    const info = PROTOCOL_INFO[protocol] || {
      icon: '○',
      category: 'other',
      description: 'Custom protocol',
      getDetails: () => ({})
    };

    html += `
      <div class="protocol-section">
        <div class="protocol-header" onclick="toggleProtocolSection(this)">
          <div class="protocol-icon ${info.category}">${info.icon}</div>
          <div class="protocol-info">
            <div class="protocol-name">${protocol}</div>
            <div class="protocol-description">${info.description}</div>
          </div>
          <div class="protocol-count">${objects.length}</div>
        </div>
        <div class="protocol-body">
          ${objects.map(obj => renderProtocolItem(obj, info)).join('')}
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;

  // Setup event delegation for protocol items
  setupProtocolPanelEvents();
}

function renderProtocolItem(obj, info) {
  const details = info.getDetails ? info.getDetails(obj) : {};
  const metaItems = Object.entries(details)
    .map(([key, value]) => `<span>${key}: <span class="protocol-item-value">${value}</span></span>`)
    .join('');

  return `
    <div class="protocol-item" data-object="${escapeAttr(obj.name)}">
      <div class="protocol-item-name" title="${escapeAttr(obj.name)}">${escapeHtml(obj.name)}</div>
      <div class="protocol-item-meta">${metaItems}</div>
    </div>
  `;
}

// Setup click delegation for protocol items
function setupProtocolPanelEvents() {
  const panel = document.getElementById('panel-protocols');
  panel.addEventListener('click', (e) => {
    const item = e.target.closest('.protocol-item');
    if (item && item.dataset.object) {
      selectFromProtocolView(item.dataset.object);
    }
  });
}

function selectFromProtocolView(objectName) {
  const obj = gtoData.objects.find(o => o.name === objectName);
  if (!obj) return;

  // Clear any filters to ensure item is visible
  const searchBox = document.getElementById('search-box');
  const protocolFilter = document.getElementById('protocol-filter');
  if (searchBox.value || protocolFilter.value) {
    searchBox.value = '';
    protocolFilter.value = '';
    filterTree();
  }

  // Select and expand in sidebar
  selectedObject = obj;

  // Update tree selection
  document.querySelectorAll('.tree-item-header.selected').forEach(el => {
    el.classList.remove('selected');
  });

  const header = document.querySelector(`.tree-item-header[data-object="${escapeAttr(obj.name)}"]:not([data-component])`);
  if (header) {
    header.classList.add('selected');

    // Expand this item
    const toggle = header.querySelector('.tree-toggle');
    if (toggle && !toggle.classList.contains('expanded')) {
      toggle.classList.add('expanded');
      header.closest('.tree-item').querySelector(':scope > .tree-children')?.classList.add('expanded');
    }

    // Scroll sidebar to show the item
    setTimeout(() => {
      header.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  // Switch to details tab and render
  switchToTab('details');
  renderDetailsPanel(obj);
}

window.toggleProtocolSection = function(header) {
  const body = header.nextElementSibling;
  body.style.display = body.style.display === 'none' ? 'block' : 'none';
};

function switchToTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));

  const tab = document.querySelector(`[data-panel="${tabName}"]`);
  if (tab) {
    tab.classList.add('active');
    document.getElementById(`panel-${tabName}`).classList.add('visible');
  }
}

function renderDetailsPanel(obj, highlightComponent = null) {
  const container = document.getElementById('panel-details');

  let html = `
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-title">
          <span>${getProtocolIcon(obj.protocol)}</span>
          ${obj.name}
        </div>
        <span class="type-badge string">${obj.protocol} v${obj.protocolVersion}</span>
      </div>
      <div class="detail-body">
        <table class="prop-table">
          <tr>
            <th>Protocol</th>
            <td>${obj.protocol}</td>
          </tr>
          <tr>
            <th>Version</th>
            <td>${obj.protocolVersion}</td>
          </tr>
          <tr>
            <th>Components</th>
            <td>${Object.keys(obj.components).length}</td>
          </tr>
        </table>
      </div>
    </div>
  `;

  for (const [compName, comp] of Object.entries(obj.components)) {
    html += `
      <div class="detail-card" id="comp-${compName}">
        <div class="detail-header">
          <div class="detail-title">
            <span>◇</span>
            ${compName}
          </div>
          <span class="tree-badge">${Object.keys(comp.properties).length} properties</span>
        </div>
        <div class="detail-body">
          <table class="prop-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Size</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(comp.properties).map(([propName, prop]) => `
                <tr>
                  <td><strong>${propName}</strong></td>
                  <td><span class="type-badge ${prop.type}">${prop.type}${prop.width > 1 ? `[${prop.width}]` : ''}</span></td>
                  <td>${prop.size}</td>
                  <td><span class="data-preview">${formatDataPreview(prop)}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  if (highlightComponent) {
    const el = document.getElementById(`comp-${highlightComponent}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function formatDataPreview(prop) {
  const data = prop.data;
  if (!data || data.length === 0) return '[ ]';

  if (prop.type === 'string') {
    if (data.length === 1) return `"${data[0]}"`;
    return `["${data.slice(0, 3).join('", "')}"${data.length > 3 ? ', ...' : ''}]`;
  }

  const flat = Array.isArray(data[0]) ? data.flat() : data;
  if (flat.length <= 6) {
    return `[${flat.map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')}]`;
  }
  return `[${flat.slice(0, 4).map(v => typeof v === 'number' ? v.toFixed(2) : v).join(', ')}, ... (${flat.length} values)]`;
}

function renderSourcesPanel() {
  const container = document.getElementById('panel-sources');
  const sources = gtoData.objects.filter(obj => obj.protocol === 'RVFileSource');

  if (sources.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎬</div>
        <div>No media sources found</div>
      </div>
    `;
    return;
  }

  let html = '<div class="source-list">';

  for (const source of sources) {
    const media = source.components.media?.properties;
    const proxy = source.components.proxy?.properties;
    const group = source.components.group?.properties;

    const moviePath = media?.movie?.data?.[0] || 'Unknown';
    const fileName = moviePath.split(/[/\\]/).pop();
    const range = proxy?.range?.data?.[0] || [0, 0];
    const fps = proxy?.fps?.data?.[0] || group?.fps?.data?.[0] || 24;
    const size = proxy?.size?.data?.[0] || [0, 0];

    html += `
      <div class="source-card" data-object="${escapeAttr(source.name)}" style="cursor: pointer;">
        <div class="source-thumb">🎞</div>
        <div class="source-info">
          <div class="source-name">${escapeHtml(fileName)}</div>
          <div class="source-path">${escapeHtml(moviePath)}</div>
          <div class="source-meta">
            <div class="source-meta-item">Frames: <span>${range[0]} - ${range[1]}</span></div>
            <div class="source-meta-item">FPS: <span>${fps}</span></div>
            <div class="source-meta-item">Size: <span>${size[0]} × ${size[1]}</span></div>
          </div>
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;

  // Click to select source
  container.querySelectorAll('.source-card[data-object]').forEach(card => {
    card.addEventListener('click', () => selectFromProtocolView(card.dataset.object));
  });
}

function renderTimelinePanel() {
  const container = document.getElementById('panel-timeline');

  // Find session info
  const session = gtoData.objects.find(obj => obj.protocol === 'RVSession');
  if (!session) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⏱</div>
        <div>No timeline information found</div>
      </div>
    `;
    return;
  }

  const sessionComp = session.components.session?.properties;
  const range = sessionComp?.range?.data?.[0] || [1, 100];
  const region = sessionComp?.region?.data?.[0] || range;
  const fps = sessionComp?.fps?.data?.[0] || 24;
  const currentFrame = sessionComp?.currentFrame?.data?.[0] || 1;
  const marks = sessionComp?.marks?.data || [];

  const duration = (range[1] - range[0] + 1) / fps;
  const rangeStart = ((region[0] - range[0]) / (range[1] - range[0])) * 100;
  const rangeWidth = ((region[1] - region[0]) / (range[1] - range[0])) * 100;
  const markerPos = ((currentFrame - range[0]) / (range[1] - range[0])) * 100;

  container.innerHTML = `
    <div class="timeline-info">
      <div class="timeline-card">
        <div class="timeline-value">${range[1] - range[0] + 1}</div>
        <div class="timeline-label">Total Frames</div>
      </div>
      <div class="timeline-card">
        <div class="timeline-value">${fps}</div>
        <div class="timeline-label">FPS</div>
      </div>
      <div class="timeline-card">
        <div class="timeline-value">${duration.toFixed(2)}s</div>
        <div class="timeline-label">Duration</div>
      </div>
      <div class="timeline-card">
        <div class="timeline-value">${currentFrame}</div>
        <div class="timeline-label">Current Frame</div>
      </div>
    </div>

    <div class="timeline-bar">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong>Timeline</strong>
        <span style="color: var(--text-muted); font-size: 13px;">
          Region: ${region[0]} - ${region[1]}
        </span>
      </div>
      <div class="timeline-track">
        <div class="timeline-range" style="left: ${rangeStart}%; width: ${rangeWidth}%;"></div>
        <div class="timeline-marker" style="left: ${markerPos}%;"></div>
      </div>
      <div class="timeline-labels">
        <span>${range[0]}</span>
        <span>${range[1]}</span>
      </div>
    </div>

    ${marks.length > 0 ? `
      <div class="detail-card" style="margin-top: 20px;">
        <div class="detail-header">
          <div class="detail-title">🏷 Marks</div>
        </div>
        <div class="detail-body">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${marks.map(m => `<span class="format-tag">Frame ${m}</span>`).join('')}
          </div>
        </div>
      </div>
    ` : ''}
  `;
}

function renderAnnotationsPanel() {
  const container = document.getElementById('panel-annotations');

  // Find paint nodes with annotations
  const paintNodes = gtoData.objects.filter(obj => obj.protocol === 'RVPaint');
  const annotations = [];

  for (const paint of paintNodes) {
    for (const [compName, comp] of Object.entries(paint.components)) {
      if (compName.startsWith('pen:') || compName.startsWith('text:')) {
        const frame = compName.split(':')[2] || '?';
        annotations.push({
          type: compName.startsWith('pen:') ? 'Drawing' : 'Text',
          frame,
          name: compName,
          node: paint.name,
          data: comp.properties
        });
      }
    }
  }

  if (annotations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🖌</div>
        <div>No annotations found</div>
      </div>
    `;
    return;
  }

  let html = '<div class="annotation-list">';

  for (const ann of annotations) {
    const color = ann.data.color?.data?.[0] || [1, 1, 1, 1];
    const colorStr = `rgba(${Math.round(color[0]*255)}, ${Math.round(color[1]*255)}, ${Math.round(color[2]*255)}, ${color[3]})`;

    html += `
      <div class="annotation-card" data-object="${escapeAttr(ann.node)}">
        <div class="annotation-header">
          <span class="annotation-frame">Frame ${ann.frame}</span>
          <span class="annotation-type">${ann.type}</span>
          <span style="margin-left: auto; color: var(--text-muted); font-size: 12px;">${escapeHtml(ann.node)}</span>
        </div>
        <div class="annotation-body">
          <div class="annotation-preview">
            ${ann.type === 'Text' ? `
              <div class="annotation-text-content" style="color: ${colorStr}">
                ${escapeHtml(ann.data.text?.data?.[0] || '')}
              </div>
            ` : `
              <svg width="100%" height="80" style="overflow: visible;">
                ${renderStrokePath(ann.data.points?.data || [], colorStr)}
              </svg>
            `}
          </div>
          <div class="annotation-meta">
            <span>Color: <span style="display: inline-block; width: 12px; height: 12px; background: ${colorStr}; border-radius: 2px; vertical-align: middle;"></span></span>
            ${ann.data.points ? `<span>Points: ${ann.data.points.data.length}</span>` : ''}
            ${ann.data.brush ? `<span>Brush: ${escapeHtml(ann.data.brush.data[0])}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;

  // Click to select annotation's paint node
  container.querySelectorAll('.annotation-card[data-object]').forEach(card => {
    card.addEventListener('click', () => selectFromProtocolView(card.dataset.object));
  });
}

function renderStrokePath(points, color) {
  if (!points || points.length < 2) return '';

  // Normalize points to SVG coordinates
  const width = 300;
  const height = 80;
  const padding = 10;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p[0]);
    maxX = Math.max(maxX, p[0]);
    minY = Math.min(minY, p[1]);
    maxY = Math.max(maxY, p[1]);
  }

  const scaleX = (width - padding * 2) / (maxX - minX || 1);
  const scaleY = (height - padding * 2) / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY);

  const pathPoints = points.map(p => {
    const x = padding + (p[0] - minX) * scale;
    const y = padding + (p[1] - minY) * scale;
    return `${x},${y}`;
  });

  return `<polyline points="${pathPoints.join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function renderGraphPanel() {
  const container = document.getElementById('panel-graph');

  // Find connections
  const connObj = gtoData.objects.find(obj => obj.protocol === 'connection');
  if (!connObj) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <div>No connection graph found</div>
      </div>
    `;
    return;
  }

  const connections = connObj.components.evaluation?.properties.connections?.data || [];
  const topNodes = connObj.components.top?.properties.nodes?.data || [];

  // Build graph
  const nodes = new Set();
  const edges = [];

  for (const conn of connections) {
    nodes.add(conn[0]);
    nodes.add(conn[1]);
    edges.push({ from: conn[0], to: conn[1] });
  }

  // Simple layout
  const nodeArray = Array.from(nodes);
  const nodePositions = {};
  const cols = Math.ceil(Math.sqrt(nodeArray.length));

  nodeArray.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    nodePositions[node] = {
      x: 50 + col * 180,
      y: 50 + row * 80
    };
  });

  container.innerHTML = `
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-title">🔗 Node Graph</div>
        <span class="tree-badge">${nodes.size} nodes, ${edges.length} connections</span>
      </div>
      <div class="detail-body">
        <div class="graph-canvas" id="graph-canvas">
          <svg width="100%" height="400" style="position: absolute; top: 0; left: 0; pointer-events: none;">
            ${edges.map(e => {
              const from = nodePositions[e.from];
              const to = nodePositions[e.to];
              if (!from || !to) return '';
              return `<line x1="${from.x + 70}" y1="${from.y + 20}" x2="${to.x}" y2="${to.y + 20}" stroke="var(--border-color)" stroke-width="2"/>`;
            }).join('')}
          </svg>
          ${nodeArray.map(node => {
            const pos = nodePositions[node];
            const nodeType = getNodeType(node);
            return `<div class="graph-node ${nodeType}" data-node="${escapeAttr(node)}" title="${escapeAttr(node)}" style="left: ${pos.x}px; top: ${pos.y}px;">${escapeHtml(node)}</div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-title">📋 Connections List</div>
      </div>
      <div class="detail-body">
        <table class="prop-table">
          <thead>
            <tr><th>From</th><th>→</th><th>To</th></tr>
          </thead>
          <tbody>
            ${edges.map(e => `<tr class="conn-row" data-from="${escapeAttr(e.from)}" data-to="${escapeAttr(e.to)}"><td>${escapeHtml(e.from)}</td><td style="color: var(--text-muted)">→</td><td>${escapeHtml(e.to)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Click handlers for graph nodes
  container.querySelectorAll('.graph-node[data-node]').forEach(node => {
    node.addEventListener('click', () => {
      const nodeName = node.dataset.node;
      // Try to find matching object
      const obj = gtoData.objects.find(o => o.name === nodeName);
      if (obj) {
        selectFromProtocolView(nodeName);
      }
    });
  });

  // Click handlers for connection rows
  container.querySelectorAll('.conn-row[data-from]').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const fromNode = row.dataset.from;
      const obj = gtoData.objects.find(o => o.name === fromNode);
      if (obj) {
        selectFromProtocolView(fromNode);
      }
    });
  });
}

function getNodeType(nodeName) {
  if (nodeName.includes('source') || nodeName.includes('Source')) return 'source';
  if (nodeName.includes('Group') || nodeName.includes('group')) return 'group';
  if (nodeName.includes('Output') || nodeName.includes('output')) return 'output';
  return '';
}

function renderJSONPanel() {
  const container = document.getElementById('panel-json');
  const json = JSON.stringify(gtoData, null, 2);

  // Syntax highlight
  const highlighted = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (-?\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>');

  container.innerHTML = `
    <div class="json-view">
      <div class="json-toolbar">
        <button class="btn" onclick="copyJSON()">📋 Copy</button>
        <button class="btn" onclick="downloadJSON()">💾 Download</button>
      </div>
      <div class="json-content">${highlighted}</div>
    </div>
  `;
}

window.copyJSON = function() {
  navigator.clipboard.writeText(JSON.stringify(gtoData, null, 2));
};

window.downloadJSON = function() {
  const blob = new Blob([JSON.stringify(gtoData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'session.json';
  a.click();
  URL.revokeObjectURL(url);
};

function exportJSON() {
  window.downloadJSON();
}

function toggleExportMenu() {
  const menu = document.getElementById('export-menu');
  menu.classList.toggle('show');
}
window.toggleExportMenu = toggleExportMenu;

// Close export menu when clicking outside
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('export-btn');
  if (dropdown && !dropdown.contains(e.target)) {
    document.getElementById('export-menu')?.classList.remove('show');
  }
});

function exportTextGTO() {
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
    alert('Failed to export as text: ' + e.message);
  }
  document.getElementById('export-menu')?.classList.remove('show');
}

function exportBinaryGTO() {
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
    alert('Failed to export as binary: ' + e.message);
  }
  document.getElementById('export-menu')?.classList.remove('show');
}

// Load sample file on startup
async function loadSampleFile() {
  try {
    const response = await fetch('./sample/test_session.rv');
    if (response.ok) {
      const content = await response.text();
      parseGTO(content, 'test_session.rv');
    }
  } catch (e) {
    console.log('Sample file not available, waiting for user upload');
  }
}

// ===== NEW FEATURES =====

// Recently viewed
const recentlyViewed = [];
const MAX_RECENT = 5;

function addToRecent(objName) {
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

function renderRecentlyViewed() {
  const section = document.getElementById('recent-section');
  const list = document.getElementById('recent-list');

  if (recentlyViewed.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = recentlyViewed.map(name => {
    const obj = gtoData?.objects.find(o => o.name === name);
    const icon = obj ? getProtocolIcon(obj.protocol) : '○';
    return `<div class="recent-item" onclick="selectFromProtocolView('${escapeAttr(name)}')">${icon} ${escapeHtml(name)}</div>`;
  }).join('');
}

// Breadcrumb navigation
let currentBreadcrumb = { object: null, component: null, property: null };

function updateBreadcrumb(objName, compName = null, propName = null) {
  currentBreadcrumb = { object: objName, component: compName, property: propName };
  renderBreadcrumb();
}

function renderBreadcrumb() {
  const container = document.getElementById('breadcrumb');

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

// Copy to clipboard
function copyToClipboard(text, btn) {
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
window.copyToClipboard = copyToClipboard;

// Search highlighting
let currentSearchQuery = '';

function highlightText(text, query) {
  if (!query || !text) return escapeHtml(String(text));
  const escaped = escapeHtml(String(text));
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<span class="highlight">$1</span>');
}

// Theme toggle
let isDarkTheme = true;

function toggleTheme() {
  isDarkTheme = !isDarkTheme;
  document.body.classList.toggle('light-theme', !isDarkTheme);
  document.querySelector('.theme-toggle').textContent = isDarkTheme ? '🌙' : '☀️';
  localStorage.setItem('gto-theme', isDarkTheme ? 'dark' : 'light');
}
window.toggleTheme = toggleTheme;

// Load saved theme
function loadTheme() {
  const saved = localStorage.getItem('gto-theme');
  if (saved === 'light') {
    isDarkTheme = false;
    document.body.classList.add('light-theme');
    document.querySelector('.theme-toggle').textContent = '☀️';
  }
}

// Keyboard shortcuts modal
function showShortcutsModal() {
  document.getElementById('shortcuts-modal').classList.add('visible');
}
window.showShortcutsModal = showShortcutsModal;

function hideShortcutsModal() {
  document.getElementById('shortcuts-modal').classList.remove('visible');
}
window.hideShortcutsModal = hideShortcutsModal;

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Don't trigger if typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
    return;
  }

  const modal = document.getElementById('shortcuts-modal');
  if (modal.classList.contains('visible')) {
    if (e.key === 'Escape') hideShortcutsModal();
    return;
  }

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

// URL hash navigation
function handleHashChange() {
  const hash = window.location.hash.slice(1);
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

function updateHash(objName = null, tab = null) {
  const params = new URLSearchParams();
  if (objName) params.set('object', objName);
  if (tab) params.set('tab', tab);
  const hash = params.toString();
  if (hash) {
    history.replaceState(null, '', '#' + hash);
  }
}

window.addEventListener('hashchange', handleHashChange);

// Property type filters
let activeTypeFilters = new Set();

function toggleTypeFilter(type) {
  if (activeTypeFilters.has(type)) {
    activeTypeFilters.delete(type);
  } else {
    activeTypeFilters.add(type);
  }
  if (selectedObject) {
    renderDetailsPanel(selectedObject);
  }
}
window.toggleTypeFilter = toggleTypeFilter;

// Compare view
let compareObjects = { left: null, right: null };

function toggleCompareMode() {
  switchToTab('compare');
}
window.toggleCompareMode = toggleCompareMode;

function renderComparePanel() {
  const container = document.getElementById('panel-compare');

  if (!gtoData || gtoData.objects.length < 2) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚖</div>
        <div>Need at least 2 objects to compare</div>
      </div>
    `;
    return;
  }

  const leftObj = compareObjects.left ? gtoData.objects.find(o => o.name === compareObjects.left) : null;
  const rightObj = compareObjects.right ? gtoData.objects.find(o => o.name === compareObjects.right) : null;

  container.innerHTML = `
    <div class="compare-container">
      <div class="compare-panel">
        <div class="compare-header">
          <span>Left Object</span>
          <select class="compare-select" id="compare-left" onchange="setCompareObject('left', this.value)">
            <option value="">Select object...</option>
            ${gtoData.objects.map(o => `<option value="${escapeAttr(o.name)}" ${compareObjects.left === o.name ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}
          </select>
        </div>
        <div class="compare-body" id="compare-body-left">
          ${leftObj ? renderCompareObject(leftObj, rightObj) : '<div class="empty-state">Select an object</div>'}
        </div>
      </div>
      <div class="compare-panel">
        <div class="compare-header">
          <span>Right Object</span>
          <select class="compare-select" id="compare-right" onchange="setCompareObject('right', this.value)">
            <option value="">Select object...</option>
            ${gtoData.objects.map(o => `<option value="${escapeAttr(o.name)}" ${compareObjects.right === o.name ? 'selected' : ''}>${escapeHtml(o.name)}</option>`).join('')}
          </select>
        </div>
        <div class="compare-body" id="compare-body-right">
          ${rightObj ? renderCompareObject(rightObj, leftObj) : '<div class="empty-state">Select an object</div>'}
        </div>
      </div>
    </div>
  `;
}

function setCompareObject(side, name) {
  compareObjects[side] = name || null;
  renderComparePanel();
}
window.setCompareObject = setCompareObject;

function renderCompareObject(obj, otherObj) {
  let html = `<div style="margin-bottom: 12px;"><strong>${escapeHtml(obj.protocol)}</strong> v${obj.protocolVersion}</div>`;

  for (const [compName, comp] of Object.entries(obj.components)) {
    const otherComp = otherObj?.components[compName];
    const compClass = !otherComp ? 'diff-added' : '';

    html += `<div class="detail-card ${compClass}" style="margin-bottom: 8px;">`;
    html += `<div class="detail-header" style="padding: 8px 12px;"><strong>${escapeHtml(compName)}</strong></div>`;
    html += `<div style="padding: 8px 12px; font-size: 12px;">`;

    for (const [propName, prop] of Object.entries(comp.properties)) {
      const otherProp = otherComp?.properties[propName];
      let rowClass = '';

      if (!otherProp) {
        rowClass = 'diff-added';
      } else {
        const thisVal = JSON.stringify(prop.data);
        const otherVal = JSON.stringify(otherProp.data);
        if (thisVal !== otherVal) {
          rowClass = 'diff-changed';
        }
      }

      html += `<div class="${rowClass}" style="padding: 4px 0; display: flex; justify-content: space-between;">`;
      html += `<span>${escapeHtml(propName)}</span>`;
      html += `<span style="color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis;">${formatCompareValue(prop.data)}</span>`;
      html += `</div>`;
    }

    // Check for removed properties
    if (otherComp) {
      for (const propName of Object.keys(otherComp.properties)) {
        if (!comp.properties[propName]) {
          html += `<div class="diff-removed" style="padding: 4px 0; display: flex; justify-content: space-between;">`;
          html += `<span>${escapeHtml(propName)}</span>`;
          html += `<span style="color: var(--text-muted);">(missing)</span>`;
          html += `</div>`;
        }
      }
    }

    html += `</div></div>`;
  }

  // Check for removed components
  if (otherObj) {
    for (const compName of Object.keys(otherObj.components)) {
      if (!obj.components[compName]) {
        html += `<div class="detail-card diff-removed" style="margin-bottom: 8px;">`;
        html += `<div class="detail-header" style="padding: 8px 12px;"><strong>${escapeHtml(compName)}</strong> (missing)</div>`;
        html += `</div>`;
      }
    }
  }

  return html;
}

function formatCompareValue(data) {
  if (!data || data.length === 0) return '[]';
  if (data.length === 1) {
    const val = data[0];
    if (typeof val === 'string') return `"${val.slice(0, 20)}${val.length > 20 ? '...' : ''}"`;
    if (Array.isArray(val)) return `[${val.slice(0, 3).join(', ')}${val.length > 3 ? '...' : ''}]`;
    return String(val);
  }
  return `[${data.length} items]`;
}

// Graph zoom/pan state
let graphState = { scale: 1, panX: 0, panY: 0 };

function zoomGraph(delta) {
  graphState.scale = Math.max(0.25, Math.min(2, graphState.scale + delta));
  updateGraphTransform();
}
window.zoomGraph = zoomGraph;

function resetGraphView() {
  graphState = { scale: 1, panX: 0, panY: 0 };
  updateGraphTransform();
}
window.resetGraphView = resetGraphView;

function updateGraphTransform() {
  const canvas = document.querySelector('.graph-canvas-inner');
  if (canvas) {
    canvas.style.transform = `translate(${graphState.panX}px, ${graphState.panY}px) scale(${graphState.scale})`;
  }
}

// Update renderAllPanels to include compare
const originalRenderAllPanels = renderAllPanels;
renderAllPanels = function() {
  originalRenderAllPanels();
  renderComparePanel();
};

// Update selectFromProtocolView to track recent and breadcrumb
const originalSelectFromProtocolView = selectFromProtocolView;
selectFromProtocolView = function(objectName) {
  originalSelectFromProtocolView(objectName);
  addToRecent(objectName);
  updateBreadcrumb(objectName);
  updateHash(objectName, 'details');
};

// Update showDataView to show compare button
const originalShowDataView = showDataView;
showDataView = function() {
  originalShowDataView();
  document.getElementById('compare-btn').style.display = 'flex';
};

// Initialize on load
loadTheme();

// Handle initial hash
setTimeout(() => {
  if (gtoData) handleHashChange();
}, 100);

// Auto-load sample on page load
loadSampleFile();

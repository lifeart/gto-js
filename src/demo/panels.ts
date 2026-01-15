/**
 * Panel rendering: all panel components for the demo app
 */
import type { ObjectData, ComponentData, PropertyData } from 'gto-js';
import { getGtoData, getSelectedObject, setSelectedObject } from './state';
import { escapeHtml, escapeAttr, formatDataPreview, formatCompareValue } from './utils';
import { getProtocolIcon, getProtocolInfo, PROTOCOL_INFO } from './protocol-info';
import { filterTree } from './tree';

// ============= Stats Panel =============

export function calculateStats() {
  const gtoData = getGtoData();
  if (!gtoData) return { objects: 0, protocols: 0, components: 0, properties: 0, sources: 0, annotations: 0 };

  let components = 0;
  let properties = 0;
  let sources = 0;
  let annotations = 0;
  const protocolSet = new Set();

  for (const obj of gtoData.objects) {
    protocolSet.add(obj.protocol);
    components += Object.keys(obj.components).length;

    for (const comp of Object.values(obj.components) as ComponentData[]) {
      properties += Object.keys(comp.properties).length;
    }

    if (obj.protocol === 'RVFileSource') {
      sources++;
    }

    if (obj.protocol === 'RVPaint') {
      const paintComp = obj.components.paint as ComponentData | undefined;
      if (paintComp && paintComp.properties.nextId) {
        annotations += (paintComp.properties.nextId.data[0] as number) || 0;
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

export function renderStats(): void {
  const stats = calculateStats();
  const container = document.getElementById('stats-bar');

  if (!container) return;

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

// ============= Details Panel =============

export function renderDetailsPanel(obj: ObjectData, highlightComponent: string | null = null): void {
  const container = document.getElementById('panel-details');
  if (!container) return;

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

  for (const [compName, comp] of Object.entries(obj.components) as [string, ComponentData][]) {
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
              ${(Object.entries(comp.properties) as [string, PropertyData][]).map(([propName, prop]) => `
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

// ============= Protocols Panel =============

function renderProtocolItem(obj: ObjectData, info: ReturnType<typeof getProtocolInfo>): string {
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

export function renderProtocolsPanel(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('panel-protocols');
  if (!container) return;

  // Group objects by protocol
  const groups: Record<string, ObjectData[]> = {};
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
    const info = getProtocolInfo(protocol);

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

  setupProtocolPanelEvents();
}

function setupProtocolPanelEvents(): void {
  const panel = document.getElementById('panel-protocols');
  if (!panel) return;

  panel.addEventListener('click', (e) => {
    const item = (e.target as Element).closest('.protocol-item');
    if (item && (item as HTMLElement).dataset.object) {
      selectFromProtocolView((item as HTMLElement).dataset.object!);
    }
  });
}

export function toggleProtocolSection(header: HTMLElement): void {
  const body = header.nextElementSibling as HTMLElement | null;
  if (body) {
    body.style.display = body.style.display === 'none' ? 'block' : 'none';
  }
}

// ============= Sources Panel =============

export function renderSourcesPanel(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('panel-sources');
  if (!container) return;

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

    const moviePath = (media?.movie?.data?.[0] as string) || 'Unknown';
    const fileName = moviePath.split(/[/\\]/).pop();
    const range = (proxy?.range?.data?.[0] as number[]) || [0, 0];
    const fps = proxy?.fps?.data?.[0] || group?.fps?.data?.[0] || 24;
    const size = (proxy?.size?.data?.[0] as number[]) || [0, 0];

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
    card.addEventListener('click', () => selectFromProtocolView((card as HTMLElement).dataset.object!));
  });
}

// ============= Timeline Panel =============

export function renderTimelinePanel(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('panel-timeline');
  if (!container) return;

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
  const range = (sessionComp?.range?.data?.[0] as number[]) || [1, 100];
  const region = (sessionComp?.region?.data?.[0] as number[]) || range;
  const fps = (sessionComp?.fps?.data?.[0] as number) || 24;
  const currentFrame = (sessionComp?.currentFrame?.data?.[0] as number) || 1;
  const marks = (sessionComp?.marks?.data as number[]) || [];

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

// ============= Annotations Panel =============

function renderStrokePath(points: number[][], color: string): string {
  if (!points || points.length < 2) return '';

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

export function renderAnnotationsPanel(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('panel-annotations');
  if (!container) return;

  // Find paint nodes with annotations
  const paintNodes = gtoData.objects.filter(obj => obj.protocol === 'RVPaint');
  const annotations: {
    type: string;
    frame: string;
    name: string;
    node: string;
    data: Record<string, PropertyData>;
  }[] = [];

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
    const color = (ann.data.color?.data?.[0] as number[]) || [1, 1, 1, 1];
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
                ${renderStrokePath((ann.data.points?.data || []) as number[][], colorStr)}
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
    card.addEventListener('click', () => selectFromProtocolView((card as HTMLElement).dataset.object!));
  });
}

// ============= Graph Panel =============

function getNodeType(nodeName: string): string {
  if (nodeName.includes('source') || nodeName.includes('Source')) return 'source';
  if (nodeName.includes('Group') || nodeName.includes('group')) return 'group';
  if (nodeName.includes('Output') || nodeName.includes('output')) return 'output';
  return '';
}

export function renderGraphPanel(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('panel-graph');
  if (!container) return;

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

  const connections = (connObj.components.evaluation?.properties.connections?.data || []) as string[][];
  const topNodes = connObj.components.top?.properties.nodes?.data || [];

  // Build graph
  const nodes = new Set<string>();
  const edges: { from: string; to: string }[] = [];

  for (const conn of connections) {
    nodes.add(conn[0]);
    nodes.add(conn[1]);
    edges.push({ from: conn[0], to: conn[1] });
  }

  // Simple layout
  const nodeArray = Array.from(nodes);
  const nodePositions: Record<string, { x: number; y: number }> = {};
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
      const nodeName = (node as HTMLElement).dataset.node;
      const obj = gtoData.objects.find(o => o.name === nodeName);
      if (obj) {
        selectFromProtocolView(nodeName!);
      }
    });
  });

  // Click handlers for connection rows
  container.querySelectorAll('.conn-row[data-from]').forEach(row => {
    (row as HTMLElement).style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const fromNode = (row as HTMLElement).dataset.from;
      const obj = gtoData.objects.find(o => o.name === fromNode);
      if (obj) {
        selectFromProtocolView(fromNode!);
      }
    });
  });
}

// ============= JSON Panel =============

export function renderJSONPanel(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('panel-json');
  if (!container) return;

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

// ============= Compare Panel =============

let compareObjects: { left: string | null; right: string | null } = { left: null, right: null };

function renderCompareObject(obj: ObjectData, otherObj: ObjectData | null): string {
  let html = `<div style="margin-bottom: 12px;"><strong>${escapeHtml(obj.protocol)}</strong> v${obj.protocolVersion}</div>`;

  for (const [compName, comp] of Object.entries(obj.components) as [string, ComponentData][]) {
    const otherComp = otherObj?.components[compName] as ComponentData | undefined;
    const compClass = !otherComp ? 'diff-added' : '';

    html += `<div class="detail-card ${compClass}" style="margin-bottom: 8px;">`;
    html += `<div class="detail-header" style="padding: 8px 12px;"><strong>${escapeHtml(compName)}</strong></div>`;
    html += `<div style="padding: 8px 12px; font-size: 12px;">`;

    for (const [propName, prop] of Object.entries(comp.properties) as [string, PropertyData][]) {
      const otherProp = otherComp?.properties[propName] as PropertyData | undefined;
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

export function renderComparePanel(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('panel-compare');
  if (!container) return;

  if (gtoData.objects.length < 2) {
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
          ${leftObj ? renderCompareObject(leftObj, rightObj ?? null) : '<div class="empty-state">Select an object</div>'}
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
          ${rightObj ? renderCompareObject(rightObj, leftObj ?? null) : '<div class="empty-state">Select an object</div>'}
        </div>
      </div>
    </div>
  `;
}

export function setCompareObject(side: 'left' | 'right', name: string): void {
  compareObjects[side] = name || null;
  renderComparePanel();
}

// ============= Tab Switching =============

export function switchToTab(tabName: string): void {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'));

  const tab = document.querySelector(`[data-panel="${tabName}"]`);
  if (tab) {
    tab.classList.add('active');
    document.getElementById(`panel-${tabName}`)?.classList.add('visible');
  }
}

export function setupTabSwitching(): void {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = (tab as HTMLElement).dataset.panel;
      if (tabName) {
        switchToTab(tabName);
      }
    });
  });
}

// ============= Select from Protocol View =============

export type SelectFromProtocolCallback = (objectName: string) => void;

let selectFromProtocolCallback: SelectFromProtocolCallback | null = null;

export function setSelectFromProtocolCallback(callback: SelectFromProtocolCallback): void {
  selectFromProtocolCallback = callback;
}

export function selectFromProtocolView(objectName: string): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const obj = gtoData.objects.find(o => o.name === objectName);
  if (!obj) return;

  // Clear any filters to ensure item is visible
  const searchBox = document.getElementById('search-box') as HTMLInputElement;
  const protocolFilter = document.getElementById('protocol-filter') as HTMLSelectElement;
  if (searchBox?.value || protocolFilter?.value) {
    searchBox.value = '';
    protocolFilter.value = '';
    filterTree();
  }

  // Select and expand in sidebar
  setSelectedObject(obj);

  // Update tree selection
  document.querySelectorAll('.tree-item-header.selected').forEach(el => {
    el.classList.remove('selected');
  });

  const header = document.querySelector(`.tree-item-header[data-object="${escapeAttr(obj.name)}"]:not([data-component])`) as HTMLElement | null;
  if (header) {
    header.classList.add('selected');

    // Expand this item
    const toggle = header.querySelector('.tree-toggle');
    if (toggle && !toggle.classList.contains('expanded')) {
      toggle.classList.add('expanded');
      (header.closest('.tree-item') as HTMLElement).querySelector(':scope > .tree-children')?.classList.add('expanded');
    }

    // Scroll sidebar to show the item
    setTimeout(() => {
      header.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  // Switch to details tab and render
  switchToTab('details');
  renderDetailsPanel(obj);

  // Call custom callback if set
  if (selectFromProtocolCallback) {
    selectFromProtocolCallback(objectName);
  }
}

// ============= Render All Panels =============

export function renderAllPanels(): void {
  renderProtocolsPanel();
  renderSourcesPanel();
  renderTimelinePanel();
  renderAnnotationsPanel();
  renderGraphPanel();
  renderJSONPanel();
  renderComparePanel();
}

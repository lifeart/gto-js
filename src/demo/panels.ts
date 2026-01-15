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

function renderColorVisualizer(obj: ObjectData): string {
  const color = obj.components.color?.properties;
  if (!color) return '';

  // Get color correction values
  const exposure = (color.exposure?.data?.[0] as number) ?? 0;
  const gamma = (color.gamma?.data?.[0] as number) ?? 1;
  const hue = (color.hue?.data?.[0] as number) ?? 0;
  const saturation = (color.saturation?.data?.[0] as number) ?? 1;
  const contrast = (color.contrast?.data?.[0] as number) ?? 0;
  const offset = (color.offset?.data?.[0] as number) ?? 0;
  const active = (color.active?.data?.[0] as number) ?? 1;

  // CDL values (ASC-CDL: slope, offset, power)
  const cdlSlope = (color.CDLslope?.data as number[]) ?? [1, 1, 1];
  const cdlOffset = (color.CDLoffset?.data as number[]) ?? [0, 0, 0];
  const cdlPower = (color.CDLpower?.data as number[]) ?? [1, 1, 1];
  const cdlSaturation = (color.CDLsaturation?.data?.[0] as number) ?? 1;

  return `
    <div class="detail-card color-visualizer">
      <div class="detail-header">
        <div class="detail-title">🎨 Color Correction</div>
        <span class="status-badge ${active ? 'active' : 'inactive'}">${active ? 'Active' : 'Bypassed'}</span>
      </div>
      <div class="detail-body">
        <div class="color-controls-grid">
          <div class="color-slider-row">
            <span class="slider-label">Exposure</span>
            <div class="slider-track">
              <div class="slider-fill" style="width: ${Math.min(100, Math.max(0, (exposure + 5) / 10 * 100))}%;"></div>
              <div class="slider-thumb" style="left: ${Math.min(100, Math.max(0, (exposure + 5) / 10 * 100))}%;"></div>
            </div>
            <span class="slider-value">${exposure.toFixed(2)}</span>
          </div>
          <div class="color-slider-row">
            <span class="slider-label">Gamma</span>
            <div class="slider-track">
              <div class="slider-fill" style="width: ${Math.min(100, Math.max(0, gamma / 4 * 100))}%;"></div>
              <div class="slider-thumb" style="left: ${Math.min(100, Math.max(0, gamma / 4 * 100))}%;"></div>
            </div>
            <span class="slider-value">${gamma.toFixed(2)}</span>
          </div>
          <div class="color-slider-row">
            <span class="slider-label">Saturation</span>
            <div class="slider-track">
              <div class="slider-fill saturation" style="width: ${Math.min(100, Math.max(0, saturation / 2 * 100))}%;"></div>
              <div class="slider-thumb" style="left: ${Math.min(100, Math.max(0, saturation / 2 * 100))}%;"></div>
            </div>
            <span class="slider-value">${saturation.toFixed(2)}</span>
          </div>
          <div class="color-slider-row">
            <span class="slider-label">Contrast</span>
            <div class="slider-track">
              <div class="slider-fill contrast" style="width: ${Math.min(100, Math.max(0, (contrast + 1) / 2 * 100))}%;"></div>
              <div class="slider-thumb" style="left: ${Math.min(100, Math.max(0, (contrast + 1) / 2 * 100))}%;"></div>
            </div>
            <span class="slider-value">${contrast.toFixed(2)}</span>
          </div>
          <div class="color-slider-row">
            <span class="slider-label">Hue</span>
            <div class="slider-track hue-track">
              <div class="slider-thumb" style="left: ${Math.min(100, Math.max(0, (hue + 180) / 360 * 100))}%;"></div>
            </div>
            <span class="slider-value">${hue.toFixed(0)}°</span>
          </div>
          <div class="color-slider-row">
            <span class="slider-label">Offset</span>
            <div class="slider-track">
              <div class="slider-fill" style="width: ${Math.min(100, Math.max(0, (offset + 1) / 2 * 100))}%;"></div>
              <div class="slider-thumb" style="left: ${Math.min(100, Math.max(0, (offset + 1) / 2 * 100))}%;"></div>
            </div>
            <span class="slider-value">${offset.toFixed(2)}</span>
          </div>
        </div>

        ${(cdlSlope[0] !== 1 || cdlSlope[1] !== 1 || cdlSlope[2] !== 1 ||
           cdlOffset[0] !== 0 || cdlOffset[1] !== 0 || cdlOffset[2] !== 0 ||
           cdlPower[0] !== 1 || cdlPower[1] !== 1 || cdlPower[2] !== 1) ? `
        <div class="cdl-section">
          <div class="cdl-header">ASC-CDL Values</div>
          <div class="cdl-grid">
            <div class="cdl-column">
              <div class="cdl-label">Slope (R G B)</div>
              <div class="cdl-values">
                <span class="cdl-r">${cdlSlope[0]?.toFixed(3)}</span>
                <span class="cdl-g">${cdlSlope[1]?.toFixed(3)}</span>
                <span class="cdl-b">${cdlSlope[2]?.toFixed(3)}</span>
              </div>
            </div>
            <div class="cdl-column">
              <div class="cdl-label">Offset (R G B)</div>
              <div class="cdl-values">
                <span class="cdl-r">${cdlOffset[0]?.toFixed(3)}</span>
                <span class="cdl-g">${cdlOffset[1]?.toFixed(3)}</span>
                <span class="cdl-b">${cdlOffset[2]?.toFixed(3)}</span>
              </div>
            </div>
            <div class="cdl-column">
              <div class="cdl-label">Power (R G B)</div>
              <div class="cdl-values">
                <span class="cdl-r">${cdlPower[0]?.toFixed(3)}</span>
                <span class="cdl-g">${cdlPower[1]?.toFixed(3)}</span>
                <span class="cdl-b">${cdlPower[2]?.toFixed(3)}</span>
              </div>
            </div>
          </div>
          <div class="cdl-saturation">
            CDL Saturation: <strong>${cdlSaturation.toFixed(2)}</strong>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderLinearizeVisualizer(obj: ObjectData): string {
  const lut = obj.components.lut?.properties;
  if (!lut) return '';

  const lutFile = (lut.file?.data?.[0] as string) || '';
  const lutType = (lut.type?.data?.[0] as number) ?? 0;
  const lutActive = (lut.active?.data?.[0] as number) ?? 1;
  const lutSize = (lut.size?.data?.[0] as number) ?? 0;

  const lutTypes: Record<number, string> = {
    0: 'None',
    1: 'Luminance',
    2: 'RGB',
    3: 'RGBA',
    4: '3D LUT'
  };

  const fileName = lutFile.split(/[/\\]/).pop() || 'No file';

  return `
    <div class="detail-card lut-visualizer">
      <div class="detail-header">
        <div class="detail-title">📊 LUT / Linearization</div>
        <span class="status-badge ${lutActive ? 'active' : 'inactive'}">${lutActive ? 'Active' : 'Bypassed'}</span>
      </div>
      <div class="detail-body">
        <div class="lut-info-grid">
          <div class="lut-info-item">
            <div class="lut-icon">📁</div>
            <div class="lut-details">
              <div class="lut-filename">${escapeHtml(fileName)}</div>
              <div class="lut-path">${escapeHtml(lutFile) || 'No LUT file specified'}</div>
            </div>
            ${lutFile ? `<button class="copy-btn small" onclick="event.stopPropagation(); copyToClipboard('${escapeAttr(lutFile)}', this)" title="Copy path">📋</button>` : ''}
          </div>
          <div class="lut-meta">
            <div class="lut-meta-item">
              <span class="meta-label">Type</span>
              <span class="meta-value">${lutTypes[lutType] || 'Unknown'}</span>
            </div>
            ${lutSize ? `
            <div class="lut-meta-item">
              <span class="meta-label">Size</span>
              <span class="meta-value">${lutSize}</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDisplayColorVisualizer(obj: ObjectData): string {
  const display = obj.components.color?.properties;
  if (!display) return '';

  const gamma = (display.gamma?.data?.[0] as number) ?? 2.2;
  const sRGB = (display.sRGB?.data?.[0] as number) ?? 0;
  const Rec709 = (display.Rec709?.data?.[0] as number) ?? 0;
  const brightness = (display.brightness?.data?.[0] as number) ?? 0;
  const outOfRange = (display.outOfRange?.data?.[0] as number) ?? 0;
  const dither = (display.dither?.data?.[0] as number) ?? 0;

  const colorSpaces = [];
  if (sRGB) colorSpaces.push('sRGB');
  if (Rec709) colorSpaces.push('Rec.709');
  if (!sRGB && !Rec709) colorSpaces.push(`Gamma ${gamma.toFixed(2)}`);

  return `
    <div class="detail-card display-color-visualizer">
      <div class="detail-header">
        <div class="detail-title">🖥 Display Color</div>
      </div>
      <div class="detail-body">
        <div class="display-settings-grid">
          <div class="display-setting">
            <div class="setting-label">Color Space</div>
            <div class="setting-value highlight">${colorSpaces.join(', ')}</div>
          </div>
          <div class="display-setting">
            <div class="setting-label">Display Gamma</div>
            <div class="setting-value">${gamma.toFixed(2)}</div>
          </div>
          <div class="display-setting">
            <div class="setting-label">Brightness</div>
            <div class="setting-value">${brightness.toFixed(2)}</div>
          </div>
          <div class="display-setting">
            <div class="setting-label">Out of Range</div>
            <div class="setting-value">${outOfRange ? 'Clamp' : 'Allow'}</div>
          </div>
          <div class="display-setting">
            <div class="setting-label">Dithering</div>
            <div class="setting-value">${dither ? 'Enabled' : 'Disabled'}</div>
          </div>
        </div>

        <div class="gamma-curve-preview">
          <svg viewBox="0 0 100 100" class="gamma-curve">
            <line x1="0" y1="100" x2="100" y2="0" stroke="var(--text-muted)" stroke-width="0.5" stroke-dasharray="2"/>
            <path d="${generateGammaCurve(gamma)}" fill="none" stroke="var(--accent-blue)" stroke-width="2"/>
          </svg>
          <div class="gamma-label">Gamma ${gamma.toFixed(2)} curve</div>
        </div>
      </div>
    </div>
  `;
}

function generateGammaCurve(gamma: number): string {
  const points: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const x = i / 20;
    const y = Math.pow(x, 1 / gamma);
    points.push(`${i === 0 ? 'M' : 'L'} ${x * 100} ${100 - y * 100}`);
  }
  return points.join(' ');
}

function renderTransform2DVisualizer(obj: ObjectData): string {
  const transform = obj.components.transform?.properties;
  if (!transform) return '';

  const flip = (transform.flip?.data?.[0] as number) ?? 0;
  const flop = (transform.flop?.data?.[0] as number) ?? 0;
  const rotate = (transform.rotate?.data?.[0] as number) ?? 0;
  const scale = (transform.scale?.data as number[]) ?? [1, 1];
  const translate = (transform.translate?.data as number[]) ?? [0, 0];
  const active = (transform.active?.data?.[0] as number) ?? 1;

  // Stencil/crop properties
  const stencil = obj.components.stencil?.properties;
  const visibleBox = (stencil?.visibleBox?.data as number[]) ?? [0, 0, 1, 1];
  const stencilActive = (stencil?.active?.data?.[0] as number) ?? 0;

  // Generate transform preview
  const transforms: string[] = [];
  if (flip) transforms.push('scaleX(-1)');
  if (flop) transforms.push('scaleY(-1)');
  if (rotate !== 0) transforms.push(`rotate(${rotate}deg)`);
  if (scale[0] !== 1 || scale[1] !== 1) transforms.push(`scale(${scale[0]}, ${scale[1]})`);
  if (translate[0] !== 0 || translate[1] !== 0) transforms.push(`translate(${translate[0] * 50}px, ${translate[1] * 50}px)`);

  return `
    <div class="detail-card transform-visualizer">
      <div class="detail-header">
        <div class="detail-title">🔄 2D Transform</div>
        <span class="status-badge ${active ? 'active' : 'inactive'}">${active ? 'Active' : 'Bypassed'}</span>
      </div>
      <div class="detail-body">
        <div class="transform-preview-container">
          <div class="transform-preview">
            <div class="transform-frame original">
              <div class="transform-label">Original</div>
              <div class="transform-box">
                <div class="transform-indicator">▲</div>
              </div>
            </div>
            <div class="transform-arrow">→</div>
            <div class="transform-frame result">
              <div class="transform-label">Result</div>
              <div class="transform-box" style="transform: ${transforms.join(' ') || 'none'};">
                <div class="transform-indicator">▲</div>
              </div>
            </div>
          </div>
        </div>

        <div class="transform-values-grid">
          <div class="transform-value-item ${flip ? 'active' : ''}">
            <span class="value-icon">${flip ? '↔' : '—'}</span>
            <span class="value-label">Flip (H)</span>
            <span class="value-state">${flip ? 'Yes' : 'No'}</span>
          </div>
          <div class="transform-value-item ${flop ? 'active' : ''}">
            <span class="value-icon">${flop ? '↕' : '—'}</span>
            <span class="value-label">Flop (V)</span>
            <span class="value-state">${flop ? 'Yes' : 'No'}</span>
          </div>
          <div class="transform-value-item ${rotate !== 0 ? 'active' : ''}">
            <span class="value-icon">↻</span>
            <span class="value-label">Rotate</span>
            <span class="value-state">${rotate.toFixed(1)}°</span>
          </div>
          <div class="transform-value-item ${scale[0] !== 1 || scale[1] !== 1 ? 'active' : ''}">
            <span class="value-icon">⊞</span>
            <span class="value-label">Scale</span>
            <span class="value-state">${scale[0].toFixed(2)} × ${scale[1].toFixed(2)}</span>
          </div>
          <div class="transform-value-item ${translate[0] !== 0 || translate[1] !== 0 ? 'active' : ''}">
            <span class="value-icon">⤢</span>
            <span class="value-label">Translate</span>
            <span class="value-state">${translate[0].toFixed(2)}, ${translate[1].toFixed(2)}</span>
          </div>
        </div>

        ${stencilActive || (visibleBox[0] !== 0 || visibleBox[1] !== 0 || visibleBox[2] !== 1 || visibleBox[3] !== 1) ? `
        <div class="stencil-section">
          <div class="stencil-header">
            <strong>Stencil / Crop</strong>
            <span class="status-badge ${stencilActive ? 'active' : 'inactive'}">${stencilActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div class="stencil-preview">
            <div class="stencil-frame">
              <div class="stencil-visible" style="
                left: ${visibleBox[0] * 100}%;
                top: ${visibleBox[1] * 100}%;
                width: ${(visibleBox[2] - visibleBox[0]) * 100}%;
                height: ${(visibleBox[3] - visibleBox[1]) * 100}%;
              "></div>
            </div>
            <div class="stencil-values">
              <span>X: ${visibleBox[0].toFixed(3)} - ${visibleBox[2].toFixed(3)}</span>
              <span>Y: ${visibleBox[1].toFixed(3)} - ${visibleBox[3].toFixed(3)}</span>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderRetimeVisualizer(obj: ObjectData): string {
  const retime = obj.components.retime?.properties;
  if (!retime) return '';

  const scale = (retime.scale?.data?.[0] as number) ?? 1;
  const offset = (retime.offset?.data?.[0] as number) ?? 0;
  const active = (retime.active?.data?.[0] as number) ?? 1;

  // Warp properties
  const warp = obj.components.warp?.properties;
  const warpActive = (warp?.active?.data?.[0] as number) ?? 0;
  const warpKeyFrames = (warp?.keyFrames?.data as number[]) ?? [];
  const warpKeyValues = (warp?.keyValues?.data as number[]) ?? [];

  // Calculate time effect
  const speedPercent = scale * 100;
  const direction = scale >= 0 ? 'Forward' : 'Reverse';
  let effect = 'Normal';
  if (scale === 0) effect = 'Frozen';
  else if (Math.abs(scale) < 1) effect = 'Slow Motion';
  else if (Math.abs(scale) > 1) effect = 'Fast Forward';
  else if (scale === -1) effect = 'Reverse';

  return `
    <div class="detail-card retime-visualizer">
      <div class="detail-header">
        <div class="detail-title">⏱ Retime</div>
        <span class="status-badge ${active ? 'active' : 'inactive'}">${active ? 'Active' : 'Bypassed'}</span>
      </div>
      <div class="detail-body">
        <div class="retime-main">
          <div class="retime-speed">
            <div class="speed-value ${scale < 0 ? 'reverse' : ''}">${Math.abs(speedPercent).toFixed(0)}%</div>
            <div class="speed-label">${effect}</div>
          </div>
          <div class="retime-details">
            <div class="retime-detail">
              <span class="detail-label">Time Scale</span>
              <span class="detail-value">${scale.toFixed(3)}×</span>
            </div>
            <div class="retime-detail">
              <span class="detail-label">Offset</span>
              <span class="detail-value">${offset.toFixed(2)} frames</span>
            </div>
            <div class="retime-detail">
              <span class="detail-label">Direction</span>
              <span class="detail-value ${scale < 0 ? 'reverse' : ''}">${direction}</span>
            </div>
          </div>
        </div>

        <div class="retime-timeline-preview">
          <div class="retime-bar">
            <div class="retime-fill" style="width: ${Math.min(100, Math.abs(scale) * 50)}%; ${scale < 0 ? 'background: var(--accent-red);' : ''}"></div>
          </div>
          <div class="retime-labels">
            <span>0×</span>
            <span>1×</span>
            <span>2×</span>
          </div>
        </div>

        ${warpActive && warpKeyFrames.length > 0 ? `
        <div class="warp-section">
          <div class="warp-header">
            <strong>Time Warp</strong>
            <span class="status-badge active">Active</span>
          </div>
          <div class="warp-info">
            <span>${warpKeyFrames.length} keyframes</span>
          </div>
          <div class="warp-curve">
            <svg viewBox="0 0 100 100" class="warp-svg">
              <line x1="0" y1="100" x2="100" y2="0" stroke="var(--text-muted)" stroke-width="0.5" stroke-dasharray="2"/>
              ${generateWarpCurve(warpKeyFrames, warpKeyValues)}
            </svg>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

function generateWarpCurve(frames: number[], values: number[]): string {
  if (frames.length < 2 || values.length < 2) return '';

  const minFrame = Math.min(...frames);
  const maxFrame = Math.max(...frames);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const frameRange = maxFrame - minFrame || 1;
  const valueRange = maxValue - minValue || 1;

  const points = frames.map((f, i) => {
    const x = ((f - minFrame) / frameRange) * 100;
    const y = 100 - ((values[i] - minValue) / valueRange) * 100;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return `<path d="${points}" fill="none" stroke="var(--accent-orange)" stroke-width="2"/>`;
}

function renderProtocolVisualizer(obj: ObjectData): string {
  switch (obj.protocol) {
    case 'RVColor':
      return renderColorVisualizer(obj);
    case 'RVLinearize':
      return renderLinearizeVisualizer(obj);
    case 'RVDisplayColor':
      return renderDisplayColorVisualizer(obj);
    case 'RVTransform2D':
      return renderTransform2DVisualizer(obj);
    case 'RVRetime':
      return renderRetimeVisualizer(obj);
    default:
      return '';
  }
}

export function renderDetailsPanel(obj: ObjectData, highlightComponent: string | null = null): void {
  const container = document.getElementById('panel-details');
  if (!container) return;

  // Get protocol-specific visualizer
  const protocolVisualizer = renderProtocolVisualizer(obj);

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
    ${protocolVisualizer}
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

function calculateAspectRatio(width: number, height: number): string {
  if (width === 0 || height === 0) return 'N/A';
  const ratio = width / height;
  // Common aspect ratios
  const knownRatios: [number, string][] = [
    [16/9, '16:9'],
    [4/3, '4:3'],
    [1.85, '1.85:1'],
    [2.39, '2.39:1'],
    [2.35, '2.35:1'],
    [1.78, '1.78:1'],
    [1.33, '1.33:1'],
    [1, '1:1'],
    [21/9, '21:9'],
    [9/16, '9:16'],
  ];

  for (const [known, label] of knownRatios) {
    if (Math.abs(ratio - known) < 0.05) return label;
  }
  return ratio.toFixed(2) + ':1';
}

function formatDuration(frames: number, fps: number): string {
  if (fps === 0) return 'N/A';
  const totalSeconds = frames / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frameRemainder = Math.round((totalSeconds % 1) * fps);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(frameRemainder).padStart(2, '0')}`;
}

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
    const audio = source.components.audio?.properties;

    const moviePath = (media?.movie?.data?.[0] as string) || 'Unknown';
    const fileName = moviePath.split(/[/\\]/).pop() || 'Unknown';
    const range = (proxy?.range?.data?.[0] as number[]) || [0, 0];
    const fps = (proxy?.fps?.data?.[0] || group?.fps?.data?.[0] || 24) as number;
    const size = (proxy?.size?.data?.[0] as number[]) || [0, 0];

    // Audio properties
    const volume = (audio?.volume?.data?.[0] as number) ?? 1.0;
    const balance = (audio?.balance?.data?.[0] as number) ?? 0.0;
    const audioOffset = (audio?.offset?.data?.[0] as number) ?? 0.0;
    const hasAudio = audio !== undefined;

    // Calculate derived values
    const frameCount = range[1] - range[0] + 1;
    const duration = formatDuration(frameCount, fps);
    const aspectRatio = calculateAspectRatio(size[0], size[1]);

    // Determine file type icon based on extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const videoExts = ['mov', 'mp4', 'avi', 'mkv', 'webm', 'm4v', 'mxf'];
    const imageExts = ['exr', 'dpx', 'tiff', 'tif', 'png', 'jpg', 'jpeg'];
    let fileIcon = '🎬';
    if (imageExts.includes(ext)) fileIcon = '🖼';
    else if (videoExts.includes(ext)) fileIcon = '🎞';

    html += `
      <div class="source-card enhanced" data-object="${escapeAttr(source.name)}">
        <div class="source-header">
          <div class="source-icon">${fileIcon}</div>
          <div class="source-title">
            <div class="source-name">${escapeHtml(fileName)}</div>
            <div class="source-type">${escapeHtml(ext.toUpperCase())} • ${escapeHtml(source.name)}</div>
          </div>
        </div>

        <div class="source-path-row">
          <div class="source-path" title="${escapeAttr(moviePath)}">${escapeHtml(moviePath)}</div>
          <button class="copy-btn" onclick="event.stopPropagation(); copyToClipboard('${escapeAttr(moviePath)}', this)" title="Copy path">📋</button>
        </div>

        <div class="source-timeline">
          <div class="source-timeline-bar">
            <div class="source-timeline-range" style="left: 0; width: 100%;"></div>
            <div class="source-timeline-marker start" style="left: 0;" title="In: ${range[0]}"></div>
            <div class="source-timeline-marker end" style="left: 100%;" title="Out: ${range[1]}"></div>
          </div>
          <div class="source-timeline-labels">
            <span>${range[0]}</span>
            <span class="timeline-duration">${frameCount} frames • ${duration}</span>
            <span>${range[1]}</span>
          </div>
        </div>

        <div class="source-meta-grid">
          <div class="source-meta-card">
            <div class="meta-label">Resolution</div>
            <div class="meta-value">${size[0]} × ${size[1]}</div>
            <div class="meta-sub">${aspectRatio}</div>
          </div>
          <div class="source-meta-card">
            <div class="meta-label">Frame Rate</div>
            <div class="meta-value">${fps} fps</div>
            <div class="meta-sub">${(1000/fps).toFixed(2)}ms/frame</div>
          </div>
          <div class="source-meta-card">
            <div class="meta-label">Duration</div>
            <div class="meta-value">${duration}</div>
            <div class="meta-sub">${frameCount} frames</div>
          </div>
          ${hasAudio ? `
          <div class="source-meta-card audio">
            <div class="meta-label">Audio</div>
            <div class="meta-value">${Math.round(volume * 100)}%</div>
            <div class="meta-sub">
              ${balance !== 0 ? `Pan: ${balance > 0 ? 'R' : 'L'}${Math.abs(Math.round(balance * 100))}%` : 'Centered'}
              ${audioOffset !== 0 ? ` • Offset: ${audioOffset.toFixed(2)}s` : ''}
            </div>
          </div>
          ` : ''}
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

function formatTimecode(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = Math.floor(frame % fps);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

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
  const matteComp = session.components.matte?.properties;

  const range = (sessionComp?.range?.data?.[0] as number[]) || [1, 100];
  const region = (sessionComp?.region?.data?.[0] as number[]) || range;
  const fps = (sessionComp?.fps?.data?.[0] as number) || 24;
  const currentFrame = (sessionComp?.currentFrame?.data?.[0] as number) || 1;
  const marks = (sessionComp?.marks?.data as number[]) || [];
  const realtime = (sessionComp?.realtime?.data?.[0] as number) ?? 1;
  const viewNode = (sessionComp?.viewNode?.data?.[0] as string) || 'N/A';

  // Matte settings
  const matteShow = (matteComp?.show?.data?.[0] as number) ?? 0;
  const matteAspect = (matteComp?.aspect?.data?.[0] as number) ?? 1.78;
  const matteOpacity = (matteComp?.opacity?.data?.[0] as number) ?? 0.66;
  const matteColor = (matteComp?.color?.data as number[]) ?? [0, 0, 0, 1];

  const totalFrames = range[1] - range[0] + 1;
  const duration = totalFrames / fps;
  const rangeStart = Math.max(0, ((region[0] - range[0]) / (range[1] - range[0])) * 100);
  const rangeWidth = Math.min(100, ((region[1] - region[0]) / (range[1] - range[0])) * 100);
  const markerPos = Math.max(0, Math.min(100, ((currentFrame - range[0]) / (range[1] - range[0])) * 100));

  // Generate marks on timeline
  const marksHtml = marks.map(m => {
    const markPos = ((m - range[0]) / (range[1] - range[0])) * 100;
    return `<div class="timeline-mark" style="left: ${markPos}%;" title="Mark: Frame ${m}"></div>`;
  }).join('');

  container.innerHTML = `
    <div class="timeline-header-section">
      <div class="timeline-info">
        <div class="timeline-card">
          <div class="timeline-value">${totalFrames}</div>
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
        <div class="timeline-card highlight">
          <div class="timeline-value">${currentFrame}</div>
          <div class="timeline-label">Current Frame</div>
        </div>
      </div>

      <div class="timecode-display">
        <span class="timecode-label">Timecode:</span>
        <span class="timecode-value">${formatTimecode(currentFrame, fps)}</span>
      </div>
    </div>

    <div class="timeline-bar enhanced">
      <div class="timeline-bar-header">
        <div class="timeline-title">
          <strong>Timeline</strong>
          <span class="playback-mode">${realtime ? '▶ Realtime' : '⏸ Non-realtime'}</span>
        </div>
        <div class="timeline-region-info">
          In: <span class="region-value">${region[0]}</span> •
          Out: <span class="region-value">${region[1]}</span> •
          Duration: <span class="region-value">${region[1] - region[0] + 1}</span> frames
        </div>
      </div>
      <div class="timeline-track enhanced">
        <div class="timeline-range" style="left: ${rangeStart}%; width: ${rangeWidth}%;"></div>
        ${marksHtml}
        <div class="timeline-marker playhead" style="left: ${markerPos}%;" title="Frame ${currentFrame}"></div>
      </div>
      <div class="timeline-labels">
        <span>${range[0]}</span>
        <span class="timeline-center">${Math.floor((range[0] + range[1]) / 2)}</span>
        <span>${range[1]}</span>
      </div>
    </div>

    <div class="timeline-details-grid">
      ${marks.length > 0 ? `
        <div class="detail-card">
          <div class="detail-header">
            <div class="detail-title">🏷 Marks (${marks.length})</div>
          </div>
          <div class="detail-body">
            <div class="marks-list">
              ${marks.map(m => {
                const markTimecode = formatTimecode(m, fps);
                return `<div class="mark-item">
                  <span class="mark-frame">Frame ${m}</span>
                  <span class="mark-timecode">${markTimecode}</span>
                </div>`;
              }).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      ${matteShow || matteComp ? `
        <div class="detail-card">
          <div class="detail-header">
            <div class="detail-title">📐 Matte Settings</div>
            <span class="status-badge ${matteShow ? 'active' : 'inactive'}">${matteShow ? 'Visible' : 'Hidden'}</span>
          </div>
          <div class="detail-body">
            <div class="matte-preview">
              <div class="matte-frame" style="aspect-ratio: ${matteAspect};">
                <div class="matte-overlay" style="background: rgba(${Math.round(matteColor[0]*255)}, ${Math.round(matteColor[1]*255)}, ${Math.round(matteColor[2]*255)}, ${matteOpacity});"></div>
                <div class="matte-safe-area"></div>
              </div>
            </div>
            <div class="matte-info">
              <div class="matte-info-row">
                <span>Aspect Ratio:</span>
                <strong>${matteAspect.toFixed(2)}:1</strong>
              </div>
              <div class="matte-info-row">
                <span>Opacity:</span>
                <strong>${Math.round(matteOpacity * 100)}%</strong>
              </div>
              <div class="matte-info-row">
                <span>Color:</span>
                <div class="color-swatch" style="background: rgb(${Math.round(matteColor[0]*255)}, ${Math.round(matteColor[1]*255)}, ${Math.round(matteColor[2]*255)});"></div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="detail-card">
        <div class="detail-header">
          <div class="detail-title">📺 View Info</div>
        </div>
        <div class="detail-body">
          <div class="view-info-grid">
            <div class="view-info-item">
              <span class="view-info-label">View Node</span>
              <span class="view-info-value">${escapeHtml(viewNode)}</span>
            </div>
            <div class="view-info-item">
              <span class="view-info-label">Session</span>
              <span class="view-info-value">${escapeHtml(session.name)}</span>
            </div>
            <div class="view-info-item">
              <span class="view-info-label">Playback</span>
              <span class="view-info-value">${realtime ? 'Realtime' : 'All Frames'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============= Annotations Panel =============

// Join style constants from OpenRV
const JOIN_STYLES = ['miter', 'round', 'bevel', 'none'] as const;
const CAP_STYLES = ['butt', 'round', 'square'] as const;

// State for frame viewer
let selectedAnnotationFrame: number | null = null;
let showGhostFrames = false;

interface StrokeData {
  id: string;
  frame: number;
  user: string;
  color: number[];
  width: number[];
  brush: string;
  points: number[][];
  join: number;
  cap: number;
}

interface TextAnnotation {
  id: string;
  frame: number;
  user: string;
  position: number[];
  color: number[];
  text: string;
  size: number;
  scale: number;
  rotation: number;
}

interface FrameAnnotations {
  frame: number;
  strokes: StrokeData[];
  texts: TextAnnotation[];
}

function renderStrokePath(points: number[][], color: string, strokeWidth = 2, join = 1, cap = 1): string {
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

  // Calculate center offset for centering the stroke
  const contentWidth = (maxX - minX) * scale;
  const contentHeight = (maxY - minY) * scale;
  const offsetX = (width - contentWidth) / 2;
  const offsetY = (height - contentHeight) / 2;

  const pathPoints = points.map(p => {
    const x = offsetX + (p[0] - minX) * scale;
    // Flip Y-axis: OpenRV uses Y-up, canvas uses Y-down
    const y = height - offsetY - (p[1] - minY) * scale;
    return `${x},${y}`;
  });

  const joinStyle = JOIN_STYLES[join] || 'round';
  const capStyle = CAP_STYLES[cap] || 'round';

  return `<polyline points="${pathPoints.join(' ')}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="${capStyle}" stroke-linejoin="${joinStyle === 'none' ? 'miter' : joinStyle}"/>`;
}

function renderStrokeInCanvas(
  points: number[][],
  color: string,
  widths: number[],
  join: number,
  cap: number,
  canvasWidth: number,
  canvasHeight: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  opacity = 1
): string {
  if (!points || points.length < 2) return '';

  const padding = 20;
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;

  const scaleX = (canvasWidth - padding * 2) / rangeX;
  const scaleY = (canvasHeight - padding * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY);

  // Center the content
  const contentWidth = rangeX * scale;
  const contentHeight = rangeY * scale;
  const offsetX = (canvasWidth - contentWidth) / 2;
  const offsetY = (canvasHeight - contentHeight) / 2;

  // Calculate average width for display (widths are normalized)
  const avgWidth = widths.length > 0
    ? widths.reduce((a, b) => a + b, 0) / widths.length
    : 0.01;
  const strokeWidth = Math.max(1, avgWidth * scale * 50);

  const pathPoints = points.map(p => {
    const x = offsetX + (p[0] - bounds.minX) * scale;
    // Flip Y-axis
    const y = canvasHeight - offsetY - (p[1] - bounds.minY) * scale;
    return `${x},${y}`;
  });

  const joinStyle = JOIN_STYLES[join] || 'round';
  const capStyle = CAP_STYLES[cap] || 'round';

  return `<polyline points="${pathPoints.join(' ')}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="${capStyle}" stroke-linejoin="${joinStyle === 'none' ? 'miter' : joinStyle}" opacity="${opacity}"/>`;
}

function renderTextInCanvas(
  text: TextAnnotation,
  canvasWidth: number,
  canvasHeight: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  opacity = 1
): string {
  const padding = 20;
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;

  const scaleX = (canvasWidth - padding * 2) / rangeX;
  const scaleY = (canvasHeight - padding * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY);

  const contentWidth = rangeX * scale;
  const contentHeight = rangeY * scale;
  const offsetX = (canvasWidth - contentWidth) / 2;
  const offsetY = (canvasHeight - contentHeight) / 2;

  const x = offsetX + (text.position[0] - bounds.minX) * scale;
  // Flip Y-axis
  const y = canvasHeight - offsetY - (text.position[1] - bounds.minY) * scale;

  const color = text.color || [1, 1, 1, 1];
  const colorStr = `rgba(${Math.round(color[0]*255)}, ${Math.round(color[1]*255)}, ${Math.round(color[2]*255)}, ${color[3] * opacity})`;
  const fontSize = Math.max(10, text.size * scale * 1000 * text.scale);

  return `<text x="${x}" y="${y}" fill="${colorStr}" font-size="${fontSize}px" transform="rotate(${-text.rotation}, ${x}, ${y})" opacity="${opacity}">${escapeHtml(text.text)}</text>`;
}

function collectFrameAnnotations(paintNodes: ObjectData[]): Map<number, FrameAnnotations> {
  const frameMap = new Map<number, FrameAnnotations>();

  for (const paint of paintNodes) {
    for (const [compName, comp] of Object.entries(paint.components)) {
      if (compName.startsWith('pen:')) {
        // pen:{id}:{frame}:{user}
        const parts = compName.split(':');
        const id = parts[1];
        const frame = parseInt(parts[2]) || 0;
        const user = parts[3] || 'Unknown';

        if (!frameMap.has(frame)) {
          frameMap.set(frame, { frame, strokes: [], texts: [] });
        }

        const props = comp.properties;
        frameMap.get(frame)!.strokes.push({
          id,
          frame,
          user,
          color: (props.color?.data?.[0] as number[]) || [1, 1, 1, 1],
          width: (props.width?.data as number[]) || [0.01],
          brush: (props.brush?.data?.[0] as string) || 'circle',
          points: (props.points?.data as number[][]) || [],
          join: (props.join?.data?.[0] as number) ?? 1,
          cap: (props.cap?.data?.[0] as number) ?? 1
        });
      } else if (compName.startsWith('text:')) {
        // text:{id}:{frame}:{user}
        const parts = compName.split(':');
        const id = parts[1];
        const frame = parseInt(parts[2]) || 0;
        const user = parts[3] || 'Unknown';

        if (!frameMap.has(frame)) {
          frameMap.set(frame, { frame, strokes: [], texts: [] });
        }

        const props = comp.properties;
        frameMap.get(frame)!.texts.push({
          id,
          frame,
          user,
          position: (props.position?.data?.[0] as number[]) || [0, 0],
          color: (props.color?.data?.[0] as number[]) || [1, 1, 1, 1],
          text: (props.text?.data?.[0] as string) || '',
          size: (props.size?.data?.[0] as number) || 0.01,
          scale: (props.scale?.data?.[0] as number) || 1,
          rotation: (props.rotation?.data?.[0] as number) || 0
        });
      }
    }
  }

  return frameMap;
}

function calculateGlobalBounds(frameAnnotations: Map<number, FrameAnnotations>): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  for (const fa of frameAnnotations.values()) {
    for (const stroke of fa.strokes) {
      for (const p of stroke.points) {
        minX = Math.min(minX, p[0]);
        maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]);
        maxY = Math.max(maxY, p[1]);
      }
    }
    for (const text of fa.texts) {
      minX = Math.min(minX, text.position[0]);
      maxX = Math.max(maxX, text.position[0]);
      minY = Math.min(minY, text.position[1]);
      maxY = Math.max(maxY, text.position[1]);
    }
  }

  // Default bounds if no annotations
  if (minX === Infinity) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  }

  // Add some padding to bounds
  const padX = (maxX - minX) * 0.1 || 0.1;
  const padY = (maxY - minY) * 0.1 || 0.1;

  return {
    minX: minX - padX,
    maxX: maxX + padX,
    minY: minY - padY,
    maxY: maxY + padY
  };
}

function renderFrameCanvas(
  frameAnnotations: Map<number, FrameAnnotations>,
  selectedFrame: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  showGhost: boolean
): string {
  const canvasWidth = 600;
  const canvasHeight = 400;

  let svgContent = '';

  // Ghost frames (before and after)
  if (showGhost) {
    const frames = [...frameAnnotations.keys()].sort((a, b) => a - b);
    const currentIdx = frames.indexOf(selectedFrame);

    // Ghost before (opacity 0.3)
    if (currentIdx > 0) {
      const prevFrame = frames[currentIdx - 1];
      const prevData = frameAnnotations.get(prevFrame)!;
      for (const stroke of prevData.strokes) {
        const colorStr = `rgba(${Math.round(stroke.color[0]*255)}, ${Math.round(stroke.color[1]*255)}, ${Math.round(stroke.color[2]*255)}, 0.3)`;
        svgContent += renderStrokeInCanvas(stroke.points, colorStr, stroke.width, stroke.join, stroke.cap, canvasWidth, canvasHeight, bounds, 0.3);
      }
      for (const text of prevData.texts) {
        svgContent += renderTextInCanvas(text, canvasWidth, canvasHeight, bounds, 0.3);
      }
    }

    // Ghost after (opacity 0.3)
    if (currentIdx < frames.length - 1) {
      const nextFrame = frames[currentIdx + 1];
      const nextData = frameAnnotations.get(nextFrame)!;
      for (const stroke of nextData.strokes) {
        const colorStr = `rgba(${Math.round(stroke.color[0]*255)}, ${Math.round(stroke.color[1]*255)}, ${Math.round(stroke.color[2]*255)}, 0.3)`;
        svgContent += renderStrokeInCanvas(stroke.points, colorStr, stroke.width, stroke.join, stroke.cap, canvasWidth, canvasHeight, bounds, 0.3);
      }
      for (const text of nextData.texts) {
        svgContent += renderTextInCanvas(text, canvasWidth, canvasHeight, bounds, 0.3);
      }
    }
  }

  // Current frame (full opacity)
  const currentData = frameAnnotations.get(selectedFrame);
  if (currentData) {
    for (const stroke of currentData.strokes) {
      const colorStr = `rgba(${Math.round(stroke.color[0]*255)}, ${Math.round(stroke.color[1]*255)}, ${Math.round(stroke.color[2]*255)}, ${stroke.color[3]})`;
      svgContent += renderStrokeInCanvas(stroke.points, colorStr, stroke.width, stroke.join, stroke.cap, canvasWidth, canvasHeight, bounds, 1);
    }
    for (const text of currentData.texts) {
      svgContent += renderTextInCanvas(text, canvasWidth, canvasHeight, bounds, 1);
    }
  }

  return `
    <svg width="${canvasWidth}" height="${canvasHeight}" class="frame-canvas-svg" style="background: var(--bg-tertiary); border-radius: var(--radius-sm);">
      <!-- Grid lines for reference -->
      <line x1="${canvasWidth/2}" y1="0" x2="${canvasWidth/2}" y2="${canvasHeight}" stroke="var(--border-color)" stroke-width="1" opacity="0.3" stroke-dasharray="4"/>
      <line x1="0" y1="${canvasHeight/2}" x2="${canvasWidth}" y2="${canvasHeight/2}" stroke="var(--border-color)" stroke-width="1" opacity="0.3" stroke-dasharray="4"/>
      ${svgContent}
    </svg>
  `;
}

export function renderAnnotationsPanel(): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const container = document.getElementById('panel-annotations');
  if (!container) return;

  // Find paint nodes with annotations
  const paintNodes = gtoData.objects.filter(obj => obj.protocol === 'RVPaint');

  // Collect frame-organized annotations
  const frameAnnotations = collectFrameAnnotations(paintNodes);
  const frames = [...frameAnnotations.keys()].sort((a, b) => a - b);

  if (frames.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🖌</div>
        <div>No annotations found</div>
      </div>
    `;
    return;
  }

  // Initialize selected frame if not set
  if (selectedAnnotationFrame === null || !frameAnnotations.has(selectedAnnotationFrame)) {
    selectedAnnotationFrame = frames[0];
  }

  const bounds = calculateGlobalBounds(frameAnnotations);
  const currentFrameData = frameAnnotations.get(selectedAnnotationFrame);

  // Count total annotations
  let totalStrokes = 0, totalTexts = 0;
  for (const fa of frameAnnotations.values()) {
    totalStrokes += fa.strokes.length;
    totalTexts += fa.texts.length;
  }

  let html = `
    <!-- Frame Viewer Section -->
    <div class="detail-card frame-viewer-card">
      <div class="detail-header">
        <div class="detail-title">🎬 Frame Viewer</div>
        <div class="frame-viewer-controls">
          <button class="btn btn-sm frame-nav-btn" onclick="navigateAnnotationFrame(-1)" title="Previous frame">◀</button>
          <select class="frame-selector" onchange="selectAnnotationFrame(parseInt(this.value))">
            ${frames.map(f => `<option value="${f}" ${f === selectedAnnotationFrame ? 'selected' : ''}>Frame ${f}</option>`).join('')}
          </select>
          <button class="btn btn-sm frame-nav-btn" onclick="navigateAnnotationFrame(1)" title="Next frame">▶</button>
          <label class="ghost-toggle" title="Show adjacent frames with reduced opacity">
            <input type="checkbox" ${showGhostFrames ? 'checked' : ''} onchange="toggleGhostFrames(this.checked)">
            <span>Ghost</span>
          </label>
        </div>
      </div>
      <div class="detail-body frame-canvas-container">
        <div id="frame-canvas-wrapper">
          ${renderFrameCanvas(frameAnnotations, selectedAnnotationFrame, bounds, showGhostFrames)}
        </div>
        <div class="frame-info">
          <span>Frame ${selectedAnnotationFrame}</span>
          <span>•</span>
          <span>${currentFrameData?.strokes.length || 0} strokes</span>
          <span>•</span>
          <span>${currentFrameData?.texts.length || 0} texts</span>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-title">📊 Summary</div>
      </div>
      <div class="detail-body">
        <div class="annotation-stats">
          <div class="stat-item">
            <span class="stat-value">${frames.length}</span>
            <span class="stat-label">Frames with annotations</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${totalStrokes}</span>
            <span class="stat-label">Total strokes</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${totalTexts}</span>
            <span class="stat-label">Total text annotations</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Annotation List -->
    <div class="detail-card">
      <div class="detail-header">
        <div class="detail-title">📝 All Annotations</div>
      </div>
      <div class="detail-body">
        <div class="annotation-list">
  `;

  // Build flat annotation list for display
  for (const [frame, data] of frameAnnotations) {
    // Strokes
    for (const stroke of data.strokes) {
      const colorStr = `rgba(${Math.round(stroke.color[0]*255)}, ${Math.round(stroke.color[1]*255)}, ${Math.round(stroke.color[2]*255)}, ${stroke.color[3]})`;
      const joinStyle = JOIN_STYLES[stroke.join] || 'round';
      const capStyle = CAP_STYLES[stroke.cap] || 'round';

      html += `
        <div class="annotation-card" data-frame="${frame}" onclick="selectAnnotationFrame(${frame})">
          <div class="annotation-header">
            <span class="annotation-frame">Frame ${frame}</span>
            <span class="annotation-type">Drawing</span>
            <span class="annotation-user">${escapeHtml(stroke.user)}</span>
          </div>
          <div class="annotation-body">
            <div class="annotation-preview">
              <svg width="100%" height="80" style="overflow: visible;">
                ${renderStrokePath(stroke.points, colorStr, 2, stroke.join, stroke.cap)}
              </svg>
            </div>
            <div class="annotation-meta">
              <span>Color: <span class="color-swatch" style="background: ${colorStr};"></span></span>
              <span>Points: ${stroke.points.length}</span>
              <span>Brush: ${escapeHtml(stroke.brush)}</span>
              <span>Join: ${joinStyle}</span>
              <span>Cap: ${capStyle}</span>
            </div>
          </div>
        </div>
      `;
    }

    // Texts
    for (const text of data.texts) {
      const colorStr = `rgba(${Math.round(text.color[0]*255)}, ${Math.round(text.color[1]*255)}, ${Math.round(text.color[2]*255)}, ${text.color[3]})`;

      html += `
        <div class="annotation-card" data-frame="${frame}" onclick="selectAnnotationFrame(${frame})">
          <div class="annotation-header">
            <span class="annotation-frame">Frame ${frame}</span>
            <span class="annotation-type">Text</span>
            <span class="annotation-user">${escapeHtml(text.user)}</span>
          </div>
          <div class="annotation-body">
            <div class="annotation-preview">
              <div class="annotation-text-content" style="color: ${colorStr}">
                ${escapeHtml(text.text)}
              </div>
            </div>
            <div class="annotation-meta">
              <span>Color: <span class="color-swatch" style="background: ${colorStr};"></span></span>
              <span>Size: ${text.size.toFixed(3)}</span>
              <span>Scale: ${text.scale.toFixed(2)}</span>
              ${text.rotation !== 0 ? `<span>Rotation: ${text.rotation.toFixed(1)}°</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }
  }

  html += `
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

export function selectAnnotationFrame(frame: number): void {
  selectedAnnotationFrame = frame;
  renderAnnotationsPanel();
}

export function navigateAnnotationFrame(delta: number): void {
  const gtoData = getGtoData();
  if (!gtoData) return;

  const paintNodes = gtoData.objects.filter(obj => obj.protocol === 'RVPaint');
  const frameAnnotations = collectFrameAnnotations(paintNodes);
  const frames = [...frameAnnotations.keys()].sort((a, b) => a - b);

  if (frames.length === 0) return;

  const currentIdx = frames.indexOf(selectedAnnotationFrame!);
  const newIdx = Math.max(0, Math.min(frames.length - 1, currentIdx + delta));
  selectedAnnotationFrame = frames[newIdx];
  renderAnnotationsPanel();
}

export function toggleGhostFrames(enabled: boolean): void {
  showGhostFrames = enabled;
  renderAnnotationsPanel();
}

// ============= Graph Panel =============

function getNodeType(nodeName: string): string {
  if (nodeName.includes('source') || nodeName.includes('Source')) return 'source';
  if (nodeName.includes('Group') || nodeName.includes('group')) return 'group';
  if (nodeName.includes('Output') || nodeName.includes('output')) return 'output';
  return '';
}

function getProtocolCategory(nodeName: string, gtoData: ReturnType<typeof getGtoData>): string {
  const obj = gtoData?.objects.find(o => o.name === nodeName);
  if (!obj) return 'unknown';

  const protocol = obj.protocol;
  if (protocol.includes('Color') || protocol.includes('Linearize')) return 'color';
  if (protocol.includes('Transform') || protocol.includes('Retime')) return 'transform';
  if (protocol.includes('Source') || protocol.includes('FileSource')) return 'source';
  if (protocol.includes('Paint')) return 'paint';
  if (protocol.includes('Session') || protocol.includes('View')) return 'session';
  if (protocol.includes('Stack') || protocol.includes('Layout') || protocol.includes('Sequence')) return 'composite';
  if (protocol.includes('Group')) return 'group';
  return 'default';
}

function computeHierarchicalLayout(
  nodes: Set<string>,
  edges: { from: string; to: string }[]
): Record<string, { x: number; y: number; depth: number }> {
  const nodeArray = Array.from(nodes);
  const positions: Record<string, { x: number; y: number; depth: number }> = {};

  // Build adjacency lists
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const node of nodeArray) {
    outgoing.set(node, []);
    incoming.set(node, []);
  }

  for (const edge of edges) {
    outgoing.get(edge.from)?.push(edge.to);
    incoming.get(edge.to)?.push(edge.from);
  }

  // Find root nodes (nodes with no incoming edges)
  const roots = nodeArray.filter(n => incoming.get(n)?.length === 0);

  // BFS to assign depths
  const depths = new Map<string, number>();
  const queue: string[] = [...roots];
  const visited = new Set<string>();

  // Assign depth 0 to roots
  for (const root of roots) {
    depths.set(root, 0);
    visited.add(root);
  }

  // Process remaining nodes
  while (queue.length > 0) {
    const node = queue.shift()!;
    const currentDepth = depths.get(node) || 0;

    for (const child of outgoing.get(node) || []) {
      if (!visited.has(child)) {
        visited.add(child);
        depths.set(child, currentDepth + 1);
        queue.push(child);
      }
    }
  }

  // Handle disconnected nodes
  for (const node of nodeArray) {
    if (!depths.has(node)) {
      depths.set(node, 0);
    }
  }

  // Group nodes by depth
  const depthGroups = new Map<number, string[]>();
  for (const [node, depth] of depths) {
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push(node);
  }

  // Calculate positions
  const depthValues = Array.from(depths.values());
  const maxDepth = depthValues.length > 0 ? Math.max(...depthValues) : 0;
  const nodeWidth = 160;
  const nodeHeight = 50;
  const horizontalGap = 40;
  const verticalGap = 80;

  for (const [depth, nodesAtDepth] of depthGroups) {
    const totalWidth = nodesAtDepth.length * nodeWidth + (nodesAtDepth.length - 1) * horizontalGap;
    const startX = Math.max(20, (800 - totalWidth) / 2);

    nodesAtDepth.forEach((node, index) => {
      positions[node] = {
        x: startX + index * (nodeWidth + horizontalGap),
        y: 30 + depth * (nodeHeight + verticalGap),
        depth
      };
    });
  }

  return positions;
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

  // Hierarchical layout
  const nodePositions = computeHierarchicalLayout(nodes, edges);

  // Calculate required canvas height
  const positionValues = Object.values(nodePositions);
  const maxY = positionValues.length > 0 ? Math.max(...positionValues.map(p => p.y)) + 80 : 400;
  const canvasHeight = Math.max(400, maxY);

  // Count nodes by category for legend
  const categoryCount: Record<string, number> = {};
  Array.from(nodes).forEach(node => {
    const cat = getProtocolCategory(node, gtoData);
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const categoryLabels: Record<string, { label: string; icon: string }> = {
    source: { label: 'Source', icon: '🎬' },
    color: { label: 'Color', icon: '🎨' },
    transform: { label: 'Transform', icon: '🔄' },
    paint: { label: 'Paint', icon: '🖌' },
    session: { label: 'Session', icon: '📺' },
    composite: { label: 'Composite', icon: '📚' },
    group: { label: 'Group', icon: '📁' },
    default: { label: 'Other', icon: '○' }
  };

  container.innerHTML = `
    <div class="detail-card graph-container">
      <div class="detail-header">
        <div class="detail-title">🔗 Node Graph</div>
        <div class="graph-stats">
          <span class="tree-badge">${nodes.size} nodes</span>
          <span class="tree-badge">${edges.length} connections</span>
        </div>
      </div>
      <div class="detail-body">
        <div class="graph-legend">
          ${Object.entries(categoryCount).map(([cat, count]) => {
            const info = categoryLabels[cat] || categoryLabels.default;
            return `<span class="legend-item ${cat}">${info.icon} ${info.label} (${count})</span>`;
          }).join('')}
        </div>
        <div class="graph-canvas enhanced" id="graph-canvas" style="height: ${canvasHeight}px;">
          <svg width="100%" height="${canvasHeight}" style="position: absolute; top: 0; left: 0; pointer-events: none;">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--text-muted)"/>
              </marker>
            </defs>
            ${edges.map(e => {
              const from = nodePositions[e.from];
              const to = nodePositions[e.to];
              if (!from || !to) return '';
              const fromX = from.x + 80;
              const fromY = from.y + 40;
              const toX = to.x + 80;
              const toY = to.y;
              // Calculate control points for curved line
              const midY = (fromY + toY) / 2;
              return `<path d="M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}"
                fill="none" stroke="var(--border-color)" stroke-width="2" marker-end="url(#arrowhead)"/>`;
            }).join('')}
          </svg>
          ${Array.from(nodes).map(node => {
            const pos = nodePositions[node];
            const nodeType = getNodeType(node);
            const category = getProtocolCategory(node, gtoData);
            const obj = gtoData.objects.find(o => o.name === node);
            const protocol = obj?.protocol || 'Unknown';
            const compCount = obj ? Object.keys(obj.components).length : 0;
            return `<div class="graph-node enhanced ${nodeType} cat-${category}"
                        data-node="${escapeAttr(node)}"
                        style="left: ${pos.x}px; top: ${pos.y}px;">
              <div class="node-icon">${categoryLabels[category]?.icon || '○'}</div>
              <div class="node-content">
                <div class="node-name">${escapeHtml(node)}</div>
                <div class="node-protocol">${escapeHtml(protocol)}</div>
              </div>
              <div class="node-tooltip">
                <div class="tooltip-title">${escapeHtml(node)}</div>
                <div class="tooltip-row">Protocol: ${escapeHtml(protocol)}</div>
                <div class="tooltip-row">Components: ${compCount}</div>
                <div class="tooltip-row">Depth: ${pos.depth}</div>
              </div>
            </div>`;
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
            <tr><th>From</th><th></th><th>To</th><th>Type</th></tr>
          </thead>
          <tbody>
            ${edges.map(e => {
              const fromCat = getProtocolCategory(e.from, gtoData);
              const toCat = getProtocolCategory(e.to, gtoData);
              return `<tr class="conn-row" data-from="${escapeAttr(e.from)}" data-to="${escapeAttr(e.to)}">
                <td><span class="conn-node cat-${fromCat}">${escapeHtml(e.from)}</span></td>
                <td class="conn-arrow">→</td>
                <td><span class="conn-node cat-${toCat}">${escapeHtml(e.to)}</span></td>
                <td><span class="conn-type">${fromCat} → ${toCat}</span></td>
              </tr>`;
            }).join('')}
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

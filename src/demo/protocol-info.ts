/**
 * Protocol metadata for GTO object types
 */
import type { ObjectData } from 'gto-js';

export interface ProtocolMetadata {
  icon: string;
  category: string;
  description: string;
  getDetails?: (obj: ObjectData) => Record<string, unknown>;
}

export const PROTOCOL_INFO: Record<string, ProtocolMetadata> = {
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
        'Range': session?.range?.data?.[0] ? `${(session.range.data[0] as number[])[0]}-${(session.range.data[0] as number[])[1]}` : '-',
        'Matte': matte?.show?.data?.[0] ? `${(matte.aspect?.data?.[0] as number || 1).toFixed(2)}:1` : 'Off'
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
      const moviePath = (media?.movie?.data?.[0] as string) || '';
      const fileName = moviePath.split(/[/\\]/).pop() || 'Unknown';
      return {
        'File': fileName,
        'Range': proxy?.range?.data?.[0] ? `${(proxy.range.data[0] as number[])[0]}-${(proxy.range.data[0] as number[])[1]}` : '-',
        'Size': proxy?.size?.data?.[0] ? `${(proxy.size.data[0] as number[])[0]}×${(proxy.size.data[0] as number[])[1]}` : '-',
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
        'Saturation': (color?.saturation?.data?.[0] as number)?.toFixed(2) || '1.00',
        'Hue': (color?.hue?.data?.[0] as number)?.toFixed(1) || '0.0',
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
        'Gamma': (color?.gamma?.data?.[0] as number)?.toFixed(2) || '1.00',
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
        'File Gamma': (color?.fileGamma?.data?.[0] as number)?.toFixed(2) || '1.00'
      };
    }
  },
  'RVTransform2D': {
    icon: '↔',
    category: 'transform',
    description: '2D transform: translate, scale, rotate, flip/flop',
    getDetails: (obj) => {
      const xform = obj.components.transform?.properties;
      const translate = (xform?.translate?.data?.[0] as number[]) || [0, 0];
      const scale = (xform?.scale?.data?.[0] as number[]) || [1, 1];
      return {
        'Active': xform?.active?.data?.[0] ? 'Yes' : 'No',
        'Translate': `${translate[0].toFixed(1)}, ${translate[1].toFixed(1)}`,
        'Scale': `${scale[0].toFixed(2)}, ${scale[1].toFixed(2)}`,
        'Rotate': `${(xform?.rotate?.data?.[0] as number)?.toFixed(1) || 0}°`,
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
      const translate = (xform?.translate?.data?.[0] as number[]) || [0, 0];
      const scale = (xform?.scale?.data?.[0] as number[]) || [1, 1];
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
        'Scale': (visual?.scale?.data?.[0] as number)?.toFixed(2) || '1.00',
        'Offset': (visual?.offset?.data?.[0] as number)?.toFixed(1) || '0',
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
        'K1': (warp?.k1?.data?.[0] as number)?.toFixed(4) || '0',
        'K2': (warp?.k2?.data?.[0] as number)?.toFixed(4) || '0'
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
        'Offset': (stereo?.relativeOffset?.data?.[0] as number)?.toFixed(2) || '0'
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
        'Offset': (stereo?.relativeOffset?.data?.[0] as number)?.toFixed(2) || '0'
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
        'Scale': (geo?.scale?.data?.[0] as number)?.toFixed(2) || '1.00',
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
        'Channels': (format?.channels?.data as string[])?.join(', ') || 'Default'
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
        'Volume': (audio?.volume?.data?.[0] as number)?.toFixed(2) || '1.00',
        'Balance': (audio?.balance?.data?.[0] as number)?.toFixed(2) || '0.00',
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

export function getProtocolIcon(protocol: string): string {
  return PROTOCOL_INFO[protocol]?.icon || '○';
}

export function getProtocolInfo(protocol: string): ProtocolMetadata {
  return PROTOCOL_INFO[protocol] || {
    icon: '○',
    category: 'other',
    description: 'Custom protocol',
    getDetails: () => ({})
  };
}

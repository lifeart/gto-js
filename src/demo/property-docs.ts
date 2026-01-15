/**
 * Comprehensive property documentation from OpenRV Reference Manual
 * This file provides detailed descriptions for GTO properties to improve user awareness
 */

export interface PropertyDoc {
  description: string;
  type?: string;
  default?: string | number | boolean | number[];
  range?: string;
}

export interface ComponentDoc {
  description: string;
  properties: Record<string, PropertyDoc>;
}

export interface ProtocolDoc {
  description: string;
  components: Record<string, ComponentDoc>;
}

/**
 * Complete property documentation keyed by protocol -> component -> property
 */
export const PROPERTY_DOCS: Record<string, ProtocolDoc> = {
  // ============= RVColor =============
  'RVColor': {
    description: 'Color correction node: applies exposure, contrast, saturation, gamma, and CDL adjustments. Takes images as input and produces images with hue, saturation, exposure, and contrast potentially changed. All color corrections exclude alpha channel processing.',
    components: {
      'color': {
        description: 'Primary color correction controls - operations applied to RGB channels only',
        properties: {
          'normalize': { description: 'Normalize incoming pixels to [0,1] range before processing', type: 'int', default: 0 },
          'invert': { description: 'Apply inversion matrix to image (creates negative)', type: 'int', default: 0 },
          'gamma': { description: 'Per-channel gamma adjustment using power curve: out = in^gamma', type: 'float[3]', default: [1.0, 1.0, 1.0], range: '0.1 to 4.0 typical' },
          'offset': { description: 'Per-channel color bias added to RGB after other operations', type: 'float[3]', default: [0, 0, 0], range: '-1.0 to 1.0' },
          'scale': { description: 'Scale each RGB channel independently (gain multiplier)', type: 'float[3]', default: [1, 1, 1], range: '0.0 to 4.0' },
          'exposure': { description: 'Relative exposure in stops. Formula: out = in × 2^exposure. Each stop doubles/halves brightness', type: 'float[3]', default: [0, 0, 0], range: '-10 to +10 stops' },
          'contrast': { description: 'Per-channel contrast around 0.18 midpoint using matrix with offset compensation', type: 'float[3]', default: [1, 1, 1], range: '0.0 to 4.0' },
          'saturation': { description: 'Relative saturation via matrix using Rec.709 luma weights (0.2126, 0.7152, 0.0722)', type: 'float', default: 1.0, range: '0.0 (grayscale) to 4.0' },
          'hue': { description: 'Luminance-preserving hue rotation in radians around color wheel', type: 'float', default: 0, range: '-π to +π' },
          'active': { description: 'Toggle all color correction on/off (1=enabled, 0=disabled)', type: 'int', default: 1 }
        }
      },
      'CDL': {
        description: 'ASC Color Decision List (CDL) for interchange with color grading systems. Applied in order: slope → offset → power → saturation. Formula: out = clamp((in × slope + offset)^power)',
        properties: {
          'slope': { description: 'CDL slope (gain) - multiplies RGB values first in the CDL chain', type: 'float[3]', default: [1, 1, 1], range: '0.0 to 4.0' },
          'offset': { description: 'CDL offset - added to RGB after slope multiplication', type: 'float[3]', default: [0, 0, 0], range: '-1.0 to 1.0' },
          'power': { description: 'CDL power (gamma) - raises RGB to this power after slope+offset', type: 'float[3]', default: [1, 1, 1], range: '0.1 to 4.0' },
          'saturation': { description: 'CDL saturation applied after slope/offset/power', type: 'float', default: 1.0, range: '0.0 to 4.0' },
          'noClamp': { description: 'Remove CDL equation clamping at 0 and 1 for HDR/wide-gamut workflows', type: 'int', default: 0 },
          'active': { description: 'Enable CDL processing', type: 'int', default: 0 }
        }
      },
      'luminanceLUT': {
        description: 'Luminance-based 1D lookup table for tonal adjustments (curves)',
        properties: {
          'lut': { description: 'Luminance lookup table float array', type: 'float[]' },
          'max': { description: 'Output scale factor for luminance LUT', type: 'float', default: 1.0 },
          'active': { description: 'Enable luminance LUT processing', type: 'int', default: 0 }
        }
      },
      'lut': {
        description: '3D LUT or channel (1D) LUT for color transformation. Pre-cache LUT results go into cache; subsequent LUTs applied in hardware.',
        properties: {
          'lut': { description: '3D LUT data (size³×3 floats) or channel LUT data. Size must be divisible by 3', type: 'float[]' },
          'prelut': { description: 'Per-channel pre-LUT (shaper) applied before 3D LUT for log encoding', type: 'float[]' },
          'inMatrix': { description: '4×4 input color matrix applied before LUT (row-major)', type: 'float[16]' },
          'outMatrix': { description: '4×4 output color matrix applied after LUT (row-major)', type: 'float[16]' },
          'file': { description: 'Path to LUT file loaded when session opens. Supports: .csp, .3dl, .cube, .rv3dlut, .rvchlut', type: 'string' },
          'name': { description: 'Display name for this LUT in UI', type: 'string' },
          'size': { description: 'LUT dimensions: 1=channel (1D) LUT, 3=3D cube LUT', type: 'int' },
          'type': { description: 'LUT type identifier (Luminance, Channel, 3D)', type: 'string' },
          'active': { description: 'Enable LUT processing (non-zero = active)', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= RVTransform2D =============
  'RVTransform2D': {
    description: '2D image transformation: translate, scale, rotate, flip/flop operations',
    components: {
      'transform': {
        description: 'Geometric transformation controls',
        properties: {
          'flip': { description: 'Vertical image flip (mirror top-to-bottom)', type: 'int', default: 0 },
          'flop': { description: 'Horizontal image flip (mirror left-to-right)', type: 'int', default: 0 },
          'rotate': { description: 'Rotate image in degrees about center point', type: 'float', default: 0 },
          'translate': { description: 'Translation offset in NDC space (normalized device coordinates)', type: 'float[2]', default: [0, 0] },
          'scale': { description: 'Scale factor along X and Y axes', type: 'float[2]', default: [1, 1] },
          'active': { description: 'Toggle transform on/off', type: 'int', default: 1 }
        }
      },
      'pixel': {
        description: 'Pixel-level format settings',
        properties: {
          'aspectRatio': { description: 'Override pixel aspect ratio (0 = use source)', type: 'float', default: 0 }
        }
      },
      'stencil': {
        description: 'Stencil/mask region settings',
        properties: {
          'visibleBox': { description: 'Stencil region bounds (left, right, top, bottom)', type: 'float[4]' }
        }
      }
    }
  },

  // ============= RVLinearize =============
  'RVLinearize': {
    description: 'Linearization node: converts encoded pixels to linear colorspace for compositing',
    components: {
      'color': {
        description: 'Color space linearization controls',
        properties: {
          'alphaType': { description: 'Alpha handling: 0=as reported, 1=force premultiplied', type: 'int', default: 0 },
          'YUV': { description: 'Convert from YUV color space to RGB linear', type: 'int', default: 0 },
          'logtype': { description: 'Log transform type: 0=none, 1=Cineon, 2=Viper, 3=LogC', type: 'int', default: 0 },
          'sRGB2linear': { description: 'Convert sRGB encoded pixels to linear', type: 'int', default: 0 },
          'Rec709ToLinear': { description: 'Apply inverse Rec.709 transfer function', type: 'int', default: 0 },
          'fileGamma': { description: 'Gamma value for linearization (1.0 = linear input)', type: 'float', default: 1.0 },
          'active': { description: 'Toggle linearization on/off', type: 'int', default: 1 },
          'ignoreChromaticities': { description: 'Ignore non-Rec.709 chromaticities in file', type: 'int', default: 0 }
        }
      },
      'CDL': {
        description: 'CDL applied in linear space before linearization',
        properties: {
          'slope': { description: 'CDL per-channel slope (gain)', type: 'float[3]' },
          'offset': { description: 'CDL per-channel offset', type: 'float[3]' },
          'power': { description: 'CDL per-channel power (gamma)', type: 'float[3]' },
          'saturation': { description: 'CDL saturation control', type: 'float' },
          'noClamp': { description: 'Disable CDL value clamping', type: 'int', default: 0 },
          'active': { description: 'Enable CDL processing', type: 'int', default: 0 }
        }
      },
      'lut': {
        description: 'LUT for linearization',
        properties: {
          'lut': { description: '3D or channel LUT data', type: 'float[]' },
          'prelut': { description: 'Channel pre-LUT (shaper)', type: 'float[]' },
          'inMatrix': { description: 'Input color matrix', type: 'float[16]' },
          'outMatrix': { description: 'Output color matrix', type: 'float[16]' },
          'file': { description: 'Path to LUT file loaded on session open', type: 'string' },
          'size': { description: 'LUT dimensions (1=channel, 3=3D cube)', type: 'int' },
          'active': { description: 'Enable LUT processing', type: 'int', default: 0 }
        }
      },
      'cineon': {
        description: 'Cineon/DPX log-to-linear settings',
        properties: {
          'refBlack': { description: 'Reference black point (code value 0-1023)', type: 'float', default: 95 },
          'refWhite': { description: 'Reference white point (code value 0-1023)', type: 'float', default: 685 },
          'softClip': { description: 'Soft clip range for highlight rolloff', type: 'float', default: 0 }
        }
      }
    }
  },

  // ============= RVDisplayColor =============
  'RVDisplayColor': {
    description: 'Display color node: final gamma, sRGB/Rec.709 encoding for output device',
    components: {
      'color': {
        description: 'Display color settings',
        properties: {
          'channelOrder': { description: 'Four-char string for channel permutation (RGBA, BGRA, etc)', type: 'string' },
          'channelFlood': { description: 'Channel flooding mode: 0=off, 1=R, 2=G, 3=B, 4=A, 5=L', type: 'int', default: 0 },
          'gamma': { description: 'Display gamma value for all channels', type: 'float', default: 1.0 },
          'sRGB': { description: 'Apply linear-to-sRGB transfer function', type: 'int', default: 0 },
          'Rec709': { description: 'Apply Rec.709 transfer function for broadcast', type: 'int', default: 0 },
          'brightness': { description: 'Pixel brightening in relative stops', type: 'float', default: 0 },
          'outOfRange': { description: 'Enable out-of-range pixel highlighting', type: 'int', default: 0 },
          'active': { description: 'Toggle display color on/off', type: 'int', default: 1 }
        }
      },
      'lut': {
        description: 'Display LUT (monitor profile)',
        properties: {
          'lut': { description: '3D or channel display LUT data', type: 'float[]' },
          'prelut': { description: 'Channel pre-LUT (shaper)', type: 'float[]' },
          'scale': { description: 'LUT output scale factor', type: 'float' },
          'offset': { description: 'LUT output offset', type: 'float' },
          'inMatrix': { description: 'Input color matrix', type: 'float[16]' },
          'outMatrix': { description: 'Output color matrix', type: 'float[16]' },
          'file': { description: 'Path to display LUT file', type: 'string' },
          'size': { description: 'Display LUT dimensions', type: 'int' },
          'type': { description: 'LUT type identifier', type: 'string' },
          'active': { description: 'Enable display LUT', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= RVFileSource =============
  'RVFileSource': {
    description: 'File source node: manages movie/image/audio file I/O and metadata',
    components: {
      'media': {
        description: 'Media file references',
        properties: {
          'movie': { description: 'Movie, image, or audio file path (or image sequence pattern)', type: 'string' }
        }
      },
      'group': {
        description: 'Source group settings',
        properties: {
          'fps': { description: 'Override file frame rate (fps)', type: 'float' },
          'volume': { description: 'Relative audio volume (1.0 = original)', type: 'float', default: 1.0 },
          'audioOffset': { description: 'Audio offset in seconds for sync adjustment', type: 'float', default: 0 },
          'rangeOffset': { description: 'Shift frame number range by this amount', type: 'int', default: 0 },
          'rangeStart': { description: 'Reset start frame to this value', type: 'int' },
          'balance': { description: 'Left/right audio balance (-1=left, 0=center, 1=right)', type: 'float', default: 0, range: '-1 to 1' },
          'noMovieAudio': { description: 'Skip embedded audio tracks in movie files', type: 'int', default: 0 }
        }
      },
      'cut': {
        description: 'Source trim points',
        properties: {
          'in': { description: 'Preferred start frame (in point)', type: 'int' },
          'out': { description: 'Preferred end frame (out point)', type: 'int' }
        }
      },
      'request': {
        description: 'Media request settings',
        properties: {
          'readAllChannels': { description: 'Request all image channels (not just RGBA)', type: 'int', default: 0 },
          'imageComponent': { description: 'Specific view/layer/channel to read from multi-part files', type: 'string' },
          'stereoViews': { description: 'Requested stereo view names (left, right)', type: 'string' }
        }
      },
      'proxy': {
        description: 'Proxy/metadata information (read-only)',
        properties: {
          'range': { description: 'Frame range from file [start, end]', type: 'int[2]' },
          'size': { description: 'Image dimensions [width, height]', type: 'int[2]' },
          'fps': { description: 'Frame rate from file metadata', type: 'float' }
        }
      }
    }
  },

  // ============= RVSession =============
  'RVSession': {
    description: 'Session node: global container for session state. One per file. Stores frame range, marks, playback FPS, realtime settings, matte and paint configurations. Values stored here apply to all sources and views.',
    components: {
      'session': {
        description: 'Session playback state and timeline settings',
        properties: {
          'viewNode': { description: 'Default view node to display on startup', type: 'string' },
          'marks': { description: 'Array of marked frame numbers for navigation', type: 'int[]' },
          'fps': { description: 'Playback frame rate (frames per second)', type: 'float', default: 24 },
          'currentFrame': { description: 'Frame to display on session startup', type: 'int' },
          'range': { description: 'Full session frame range [start, end]', type: 'int[2]' },
          'region': { description: 'In/out points for playback region [in, out]', type: 'int[2]' },
          'inc': { description: 'Frame increment for playback (1=every frame, 2=every other)', type: 'int', default: 1 },
          'realtime': { description: 'Enable real-time playback mode (drop frames to maintain fps)', type: 'int', default: 1 }
        }
      },
      'matte': {
        description: 'Centralized default matte settings applied to all views. Defines letterboxing for projection or aspect ratio preview.',
        properties: {
          'aspect': { description: 'Matte aspect ratio (1.85=flat, 2.35/2.39=scope, 1.78=16:9)', type: 'float' },
          'centerPoint': { description: 'Matte center in normalized coordinates [x, y]. Default [0.5, 0.5]', type: 'float[2]', default: [0.5, 0.5] },
          'heightVisible': { description: 'Fraction of source height visible through matte (0.0-1.0)', type: 'float', range: '0.0 to 1.0' },
          'opacity': { description: 'Matte opacity (0=transparent/see-through, 1=opaque black bars)', type: 'float', default: 1, range: '0.0 to 1.0' },
          'show': { description: 'Toggle matte visibility globally (1=show, 0=hide)', type: 'int', default: 0 }
        }
      },
      'paintEffects': {
        description: 'Global annotation display effects - controls how annotations persist and ghost between frames',
        properties: {
          'hold': { description: 'Enable annotation duration holding (annotations persist beyond their frame)', type: 'int', default: 0 },
          'ghost': { description: 'Enable annotation ghosting/onion-skinning (show adjacent frame annotations)', type: 'int', default: 0 },
          'ghostBefore': { description: 'Number of frames before current to show ghosted annotations', type: 'int', default: 3 },
          'ghostAfter': { description: 'Number of frames after current to show ghosted annotations', type: 'int', default: 3 }
        }
      },
      'caching': {
        description: 'Cache configuration settings',
        properties: {
          'cacheMode': { description: 'Cache mode: 0=off, 1=look-ahead, 2=region', type: 'int', default: 1 },
          'cacheSize': { description: 'Cache size in bytes', type: 'int' },
          'cacheLookAheadSeconds': { description: 'Seconds to cache ahead in look-ahead mode', type: 'float' }
        }
      }
    }
  },

  // ============= RVPaint =============
  'RVPaint': {
    description: 'Paint/annotation node: stores per-frame annotation data including freehand strokes and text. Annotations indexed by id.frame.user. Coordinates are normalized: (0,0)=bottom-left, (1,1)=top-right. Multiply by image size to convert to pixels.',
    components: {
      'paint': {
        description: 'Global paint system state and counters',
        properties: {
          'nextId': { description: 'Counter for generating unique stroke/annotation identifiers', type: 'int' },
          'nextAnnotationId': { description: 'Reserved annotation ID counter (unused)', type: 'int' },
          'show': { description: 'Toggle all paint/strokes visibility (1=show, 0=hide)', type: 'int', default: 1 },
          'exclude': { description: 'Annotation tags to exclude from display', type: 'string' },
          'include': { description: 'Annotation tags to include in display', type: 'string' }
        }
      },
      'frame': {
        description: 'Per-frame annotation ordering (dynamic component: frame:[frameNum])',
        properties: {
          'order': { description: 'Annotation order stack - rendering order for annotations on this frame', type: 'string[]' }
        }
      },
      // Dynamic pen components: pen:[id]:[frame]:[user]
      'pen': {
        description: 'Pen stroke properties. Dynamic component named pen:id:frame:user where id=unique identifier, frame=frame number, user=creator',
        properties: {
          'color': { description: 'Stroke color RGBA in 0-1 range', type: 'float[4]' },
          'width': { description: 'Stroke width - single value or array of widths per point for pressure sensitivity', type: 'float[]' },
          'brush': { description: 'Brush type: 0=Gaussian (soft edges), 1=Circle (hard edges)', type: 'int', default: 0 },
          'points': { description: 'Array of (x,y) coordinate pairs in normalized [0,1] coordinates. (0,0)=bottom-left, (1,1)=top-right', type: 'float[2][]' },
          'join': { description: 'Line join style: 0=NoJoin, 1=Bevel, 2=Miter, 3=Round', type: 'int', default: 3 },
          'cap': { description: 'Line cap style: 0=NoCap, 1=Square, 2=Round', type: 'int', default: 2 },
          'splat': { description: 'Use Gaussian splats for rendering (soft brush effect)', type: 'int', default: 0 },
          'mode': { description: 'Composition mode: 0=draw over (normal), 1=erase', type: 'int', default: 0 },
          'startFrame': { description: 'First frame to display stroke. -1=display from current frame', type: 'int' },
          'duration': { description: 'Number of frames to display stroke. -1=visible on all subsequent frames', type: 'int', default: -1 }
        }
      },
      // Dynamic text components: text:[id]:[frame]:[user]
      'text': {
        description: 'Text annotation properties. Dynamic component named text:id:frame:user',
        properties: {
          'position': { description: 'Text location (x,y) in normalized [0,1] coordinates. Can be pixel-based if pixelScale set in RVOverlay', type: 'float[2]' },
          'color': { description: 'Text color RGBA in 0-1 range', type: 'float[4]' },
          'spacing': { description: 'Character spacing multiplier', type: 'float', default: 1.0 },
          'size': { description: 'Text point size', type: 'float' },
          'scale': { description: 'Text scale multiplier', type: 'float', default: 1.0 },
          'rotation': { description: 'Text rotation in degrees', type: 'float', default: 0 },
          'font': { description: 'Path to TrueType/OpenType font file. Default: "Luxi Serif"', type: 'string' },
          'text': { description: 'Text content string to display', type: 'string' },
          'origin': { description: 'Text alignment: 0=TopLeft, 1=TopCenter, 2=TopRight, 3=CenterLeft, 4=Center, 5=CenterRight, 6=BottomLeft, 7=BottomCenter, 8=BottomRight', type: 'int', default: 0 },
          'startFrame': { description: 'First frame to display text', type: 'int' },
          'duration': { description: 'Number of frames to display text. -1=visible on all subsequent frames', type: 'int', default: -1 }
        }
      }
    }
  },

  // ============= RVSequence =============
  'RVSequence': {
    description: 'Sequence node: EDL (Edit Decision List) for sequential playback',
    components: {
      'edl': {
        description: 'Edit Decision List - defines clip order and timing',
        properties: {
          'frame': { description: 'Global frame number where each cut starts', type: 'int[]' },
          'source': { description: 'Source input index for each cut', type: 'int[]' },
          'in': { description: 'Source-relative in-frame for each cut', type: 'int[]' },
          'out': { description: 'Source-relative out-frame for each cut', type: 'int[]' }
        }
      },
      'output': {
        description: 'Sequence output settings',
        properties: {
          'fps': { description: 'Output sequence frame rate', type: 'float' },
          'size': { description: 'Virtual output dimensions [width, height]', type: 'int[2]' },
          'interactiveSize': { description: 'Auto-adjust output size to window', type: 'int', default: 0 },
          'autoSize': { description: 'Auto-determine output size from sources', type: 'int', default: 0 }
        }
      },
      'mode': {
        description: 'Sequence mode settings',
        properties: {
          'useCutInfo': { description: 'Use input cut information for timing', type: 'int', default: 0 },
          'autoEDL': { description: 'Auto-concatenate new sources to EDL', type: 'int', default: 0 }
        }
      },
      'composite': {
        description: 'Sequence compositing (transitions)',
        properties: {
          'inputBlendModes': { description: 'Per-input blend modes: over, add, difference', type: 'string[]' },
          'inputOpacities': { description: 'Per-input opacity for compositing', type: 'float[]' },
          'inputAngularMaskActive': { description: 'Enable angular mask transition', type: 'int', default: 0 },
          'inputAngularMaskPivotX': { description: 'Angular mask X pivot point', type: 'float' },
          'inputAngularMaskAngleInRadians': { description: 'Angular mask rotation angle in radians', type: 'float' }
        }
      }
    }
  },

  // ============= RVStack =============
  'RVStack': {
    description: 'Stack node: layer compositing with blend modes',
    components: {
      'output': {
        description: 'Stack output settings',
        properties: {
          'fps': { description: 'Output stack frame rate', type: 'float' },
          'size': { description: 'Virtual output dimensions [width, height]', type: 'int[2]' },
          'autoSize': { description: 'Auto-determine output size from sources', type: 'int', default: 0 },
          'chosenAudioInput': { description: 'Active audio input source name', type: 'string' }
        }
      },
      'composite': {
        description: 'Stack compositing settings',
        properties: {
          'type': { description: 'Compositing operation: over, add, difference, replace', type: 'string', default: 'over' }
        }
      },
      'mode': {
        description: 'Stack mode settings',
        properties: {
          'useCutInfo': { description: 'Use input cut information for timing', type: 'int', default: 0 },
          'strictFrameRanges': { description: 'Match timeline exactly to source frames', type: 'int', default: 0 },
          'alignStartFrames': { description: 'Offset all inputs to start at same frame', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= RVLayoutGroup =============
  'RVLayoutGroup': {
    description: 'Layout group: arranges sources in grid, row, column, or packed layout',
    components: {
      'ui': {
        description: 'User interface settings',
        properties: {
          'name': { description: 'User-specified layout group name', type: 'string' }
        }
      },
      'layout': {
        description: 'Layout arrangement settings',
        properties: {
          'mode': { description: 'Layout mode: packed, row, column, grid, manual', type: 'string', default: 'packed' },
          'spacing': { description: 'Scale items in layout (0.0-1.0, 1.0=no gap)', type: 'float', default: 1.0 },
          'gridColumns': { description: 'Number of columns in grid mode', type: 'int' },
          'gridRows': { description: 'Number of rows in grid mode', type: 'int' }
        }
      },
      'timing': {
        description: 'Layout timing settings',
        properties: {
          'retimeInputs': { description: 'Retime inputs to match output fps', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= RVLensWarp =============
  'RVLensWarp': {
    description: 'Lens warp node: radial/tangential distortion using Brown-Conrady or other models',
    components: {
      'warp': {
        description: 'Lens distortion parameters',
        properties: {
          'pixelAspectRatio': { description: 'Override pixel aspect ratio (0=use source)', type: 'float', default: 0 },
          'model': { description: 'Lens model: brown, opencv, pfbarrel, adobe, 3de4_radial', type: 'string', default: 'brown' },
          'k1': { description: 'Radial distortion coefficient for r^2 term', type: 'float', default: 0 },
          'k2': { description: 'Radial distortion coefficient for r^4 term', type: 'float', default: 0 },
          'k3': { description: 'Radial distortion coefficient for r^6 term', type: 'float', default: 0 },
          'p1': { description: 'First tangential (decentering) distortion coefficient', type: 'float', default: 0 },
          'p2': { description: 'Second tangential (decentering) distortion coefficient', type: 'float', default: 0 },
          'center': { description: 'Distortion center in normalized [0-1] coordinates', type: 'float[2]', default: [0.5, 0.5] },
          'offset': { description: 'Offset from distortion center', type: 'float[2]', default: [0, 0] },
          'fx': { description: 'Normalized focal length X', type: 'float', default: 1.0 },
          'fy': { description: 'Normalized focal length Y', type: 'float', default: 1.0 },
          'cropRatioX': { description: 'Crop ratio of field of view X', type: 'float', default: 1.0 },
          'cropRatioY': { description: 'Crop ratio of field of view Y', type: 'float', default: 1.0 }
        }
      },
      'node': {
        description: 'Node state',
        properties: {
          'active': { description: 'Toggle lens warp on/off', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= RVFormat =============
  'RVFormat': {
    description: 'Format node: resize, crop, and bit-depth conversion',
    components: {
      'geometry': {
        description: 'Geometry/resolution settings',
        properties: {
          'xfit': { description: 'Force specific image width (pixels)', type: 'int' },
          'yfit': { description: 'Force specific image height (pixels)', type: 'int' },
          'xresize': { description: 'Force resolution width', type: 'int' },
          'yresize': { description: 'Force resolution height', type: 'int' },
          'scale': { description: 'Multiplier on incoming resolution', type: 'float', default: 1.0 },
          'resampleMethod': { description: 'Resample method: area, cubic, linear, nearest', type: 'string', default: 'area' }
        }
      },
      'crop': {
        description: 'Crop region settings',
        properties: {
          'active': { description: 'Enable cropping', type: 'int', default: 0 },
          'xmin': { description: 'Crop minimum X pixel value', type: 'int' },
          'ymin': { description: 'Crop minimum Y pixel value', type: 'int' },
          'xmax': { description: 'Crop maximum X pixel value', type: 'int' },
          'ymax': { description: 'Crop maximum Y pixel value', type: 'int' }
        }
      },
      'uncrop': {
        description: 'Uncrop/pad region settings',
        properties: {
          'active': { description: 'Enable uncrop region', type: 'int', default: 0 },
          'x': { description: 'Uncrop X offset', type: 'int' },
          'y': { description: 'Uncrop Y offset', type: 'int' },
          'width': { description: 'Uncropped image space width', type: 'int' },
          'height': { description: 'Uncropped image space height', type: 'int' }
        }
      },
      'color': {
        description: 'Color/bit-depth settings',
        properties: {
          'maxBitDepth': { description: 'Maximum bit depth: 8, 16, or 32', type: 'int' },
          'allowFloatingPoint': { description: 'Allow GPU floating-point images', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= RVRetime =============
  'RVRetime': {
    description: 'Retime node: time scaling, offset, speed warping, explicit frame mapping',
    components: {
      'visual': {
        description: 'Visual/video retime settings',
        properties: {
          'scale': { description: 'Output length scale factor (0.5=2x speed)', type: 'float', default: 1.0 },
          'offset': { description: 'Frame shift amount', type: 'float', default: 0 }
        }
      },
      'audio': {
        description: 'Audio retime settings',
        properties: {
          'scale': { description: 'Audio length scale factor', type: 'float', default: 1.0 },
          'offset': { description: 'Audio offset in seconds', type: 'float', default: 0 }
        }
      },
      'output': {
        description: 'Output settings',
        properties: {
          'fps': { description: 'Output frame rate in fps', type: 'float' }
        }
      },
      'warp': {
        description: 'Speed warp curve settings',
        properties: {
          'active': { description: 'Enable speed warping', type: 'int', default: 0 },
          'keyFrames': { description: 'Input frame positions for keyframes', type: 'int[]' },
          'keyRates': { description: 'Speed multipliers at each keyframe', type: 'float[]' }
        }
      },
      'explicit': {
        description: 'Explicit frame mapping',
        properties: {
          'active': { description: 'Use explicit frame mapping', type: 'int', default: 0 },
          'firstOutputFrame': { description: 'Starting output frame number', type: 'int' },
          'inputFrames': { description: 'Input frame for each output frame', type: 'int[]' }
        }
      }
    }
  },

  // ============= RVSoundTrack =============
  'RVSoundTrack': {
    description: 'Soundtrack node: audio volume, balance, offset, mute',
    components: {
      'audio': {
        description: 'Audio playback settings',
        properties: {
          'volume': { description: 'Global audio volume (1.0=original level)', type: 'float', default: 1.0 },
          'balance': { description: 'Left/right balance: -1=left, 0=center, 1=right', type: 'float', default: 0, range: '-1 to 1' },
          'offset': { description: 'Global audio offset in seconds', type: 'float', default: 0 },
          'mute': { description: 'Mute audio playback', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= RVDisplayStereo =============
  'RVDisplayStereo': {
    description: 'Display stereo node: controls stereo viewing mode for the first two image layers. Supports anaglyph, side-by-side, hardware stereo, and other display modes adaptable to various hardware.',
    components: {
      'stereo': {
        description: 'Stereo display settings - controls how left/right eye images are presented',
        properties: {
          'type': { description: 'Stereo viewing mode: off, anaglyph (red/cyan), luminance-anaglyph (grayscale), side-by-side, mirror, over-under, checker (DLP), scanline (LCD), hardware (shutter glasses)', type: 'string', default: 'off' },
          'swap': { description: 'Swap left and right eyes - useful when stereo appears inverted', type: 'int', default: 0 },
          'relativeOffset': { description: 'Horizontal separation between eyes as % of image width. Controls fusion depth - objects at fusion depth appear at screen depth', type: 'float', default: 0, range: '-0.1 to 0.1' },
          'rightOffset': { description: 'Absolute right eye offset [x, y] for fine-tuning convergence', type: 'float[2]', default: [0, 0] }
        }
      },
      'rightTransform': {
        description: 'Independent transform controls for right eye image (for projection alignment)',
        properties: {
          'flip': { description: 'Vertical flip of right eye image', type: 'int', default: 0 },
          'flop': { description: 'Horizontal flip of right eye image', type: 'int', default: 0 },
          'rotate': { description: 'Rotation of right eye in degrees', type: 'float', default: 0 },
          'translate': { description: 'Translation of right eye [x, y]', type: 'float[2]', default: [0, 0] }
        }
      }
    }
  },

  // ============= RVSourceStereo =============
  'RVSourceStereo': {
    description: 'Source stereo node: per-source stereo configuration. Used when individual sources need stereo adjustments independent of global display settings.',
    components: {
      'stereo': {
        description: 'Per-source stereo settings',
        properties: {
          'swap': { description: 'Swap left and right eyes for this specific source', type: 'int', default: 0 },
          'relativeOffset': { description: 'Source-specific eye separation as % of image width', type: 'float', default: 0, range: '-0.1 to 0.1' },
          'rightOffset': { description: 'Source-specific right eye offset [x, y]', type: 'float[2]', default: [0, 0] }
        }
      },
      'rightTransform': {
        description: 'Per-source right eye transform for alignment',
        properties: {
          'flip': { description: 'Vertical flip of right eye', type: 'int', default: 0 },
          'flop': { description: 'Horizontal flip of right eye', type: 'int', default: 0 },
          'rotate': { description: 'Rotation of right eye in degrees', type: 'float', default: 0 },
          'translate': { description: 'Translation of right eye [x, y]', type: 'float[2]', default: [0, 0] }
        }
      }
    }
  },

  // ============= RVCDL =============
  'RVCDL': {
    description: 'CDL node: ASC Color Decision List from CCC/CC/CDL files. Can be applied at File level (before linearization) or Look level (after linearization). Supports .cdl, .cc, and .ccc file formats.',
    components: {
      'node': {
        description: 'CDL node settings - ASC-CDL formula: out = clamp((in × slope + offset)^power × saturation_matrix)',
        properties: {
          'active': { description: 'Enable CDL processing', type: 'int', default: 1 },
          'colorspace': { description: 'Working colorspace for CDL application: rec709, aces, aceslog', type: 'string', default: 'rec709' },
          'file': { description: 'Path to CDL file (.cdl, .cc, or .ccc). First Color Correction in CCC files is used', type: 'string' },
          'slope': { description: 'CDL slope (gain) per RGB channel - multiplies input first', type: 'float[3]', default: [1, 1, 1], range: '0.0 to 4.0' },
          'offset': { description: 'CDL offset per RGB channel - added after slope', type: 'float[3]', default: [0, 0, 0], range: '-1.0 to 1.0' },
          'power': { description: 'CDL power (gamma) per RGB channel - applied after slope+offset', type: 'float[3]', default: [1, 1, 1], range: '0.1 to 4.0' },
          'saturation': { description: 'CDL saturation multiplier applied last', type: 'float', default: 1.0, range: '0.0 to 4.0' },
          'noClamp': { description: 'Skip clamping at 0 and 1 for HDR/wide-gamut workflows', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= RVDispTransform2D =============
  'RVDispTransform2D': {
    description: 'Display transform 2D: interactive pan/zoom controls for the viewer window',
    components: {
      'transform': {
        description: 'Interactive display transformation (not saved to session)',
        properties: {
          'translate': { description: 'Pan offset in normalized device coordinates', type: 'float[2]', default: [0, 0] },
          'scale': { description: 'Zoom factor [x, y] - 1.0 = 100%, 2.0 = 200%', type: 'float[2]', default: [1, 1] }
        }
      }
    }
  },

  // ============= OCIO Nodes =============
  'OCIO': {
    description: 'OpenColorIO node: software library for cross-application color consistency. Provides color space conversion across RV display, look, viewing, linearize, and color pipelines. Supports OCIO v2 with legacy v1 API.',
    components: {
      'ocio': {
        description: 'OCIO generic settings - usable as top-level user node for secondary color correction',
        properties: {
          'function': { description: 'OCIO function type: color, look, or display', type: 'string' },
          'active': { description: 'Enable OCIO processing', type: 'int', default: 1 },
          'inColorSpace': { description: 'Input color space name from OCIO config', type: 'string' },
          'lut3DSize': { description: '3D LUT cube size for baking transforms', type: 'int', default: 32, range: '16 to 64' }
        }
      },
      'ocio_color': {
        description: 'OCIO color space conversion settings',
        properties: {
          'outColorSpace': { description: 'Output color space name for color function', type: 'string' }
        }
      },
      'ocio_context': {
        description: 'OCIO context variables - string properties become name/value pairs for OCIO config',
        properties: {
          'name': { description: 'Context variable name/value pairs for OCIO environment', type: 'string' }
        }
      }
    }
  },

  // ============= OCIOFile =============
  'OCIOFile': {
    description: 'OCIO File node: converts between input and output color spaces using OCIO configuration',
    components: {
      'ocio': {
        description: 'OCIO file conversion settings',
        properties: {
          'active': { description: 'Enable OCIO file processing', type: 'int', default: 1 },
          'inColorSpace': { description: 'Input color space name', type: 'string' },
          'outColorSpace': { description: 'Output color space name', type: 'string' },
          'lut3DSize': { description: '3D LUT cube size', type: 'int', default: 32 }
        }
      }
    }
  },

  'OCIODisplay': {
    description: 'OCIO Display node: handles display-specific color correction using OCIO display and view transforms',
    components: {
      'ocio': {
        description: 'OCIO display settings',
        properties: {
          'active': { description: 'Enable OCIO display processing', type: 'int', default: 1 },
          'display': { description: 'OCIO display device name (e.g., sRGB, Rec709, ACES)', type: 'string' },
          'view': { description: 'OCIO view transform name (e.g., Film, Raw, Log)', type: 'string' },
          'lut3DSize': { description: '3D LUT cube size for display transform', type: 'int', default: 32 }
        }
      }
    }
  },

  'OCIOLook': {
    description: 'OCIO Look node: applies creative look transforms defined in OCIO configuration for artistic color grading',
    components: {
      'ocio': {
        description: 'OCIO look settings',
        properties: {
          'active': { description: 'Enable OCIO look processing', type: 'int', default: 1 },
          'look': { description: 'OCIO command string for looks - name from OCIO config', type: 'string' },
          'direction': { description: 'Look direction: 0=forward, 1=inverse', type: 'int', default: 0 },
          'inSpace': { description: 'Input color space name', type: 'string' },
          'outSpace': { description: 'Output color space name', type: 'string' },
          'lut3DSize': { description: '3D LUT cube size', type: 'int', default: 32 }
        }
      }
    }
  },

  // ============= RVCache =============
  'RVCache': {
    description: 'Cache node: placeholder representing the image cache. Pre-cache LUT is applied in software and results go into cache for playback performance.',
    components: {
      'render': {
        description: 'Cache render settings - controls quality vs. memory tradeoff',
        properties: {
          'downSampling': { description: 'Downsample factor for cache: 1=full resolution, 2=half res, 4=quarter res. Reduces memory usage', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= RVChannelMap =============
  'RVChannelMap': {
    description: 'Channel map node: remaps image channels by reordering or selecting specific channels. When channels list is empty, image passes through unchanged.',
    components: {
      'format': {
        description: 'Channel format/remapping settings',
        properties: {
          'channels': { description: 'List of channel names to keep and reorder (e.g., ["R", "G", "B"] or ["A", "R", "G", "B"])', type: 'string[]' }
        }
      }
    }
  },

  // ============= RVOverlay =============
  'RVOverlay': {
    description: 'Overlay node: provides mechanism to overlay rectangles, text, and matte windows over sources. Supports per-source mattes independent of global session matte.',
    components: {
      'overlay': {
        description: 'Global overlay settings',
        properties: {
          'nextRectId': { description: 'Counter for generating unique rectangle IDs', type: 'int' },
          'nextTextId': { description: 'Counter for generating unique text IDs', type: 'int' },
          'show': { description: 'Toggle all overlay elements visibility (1=show, 0=hide)', type: 'int', default: 1 }
        }
      },
      'matte': {
        description: 'Per-source matte settings (local matte independent of global session matte)',
        properties: {
          'show': { description: 'Toggle local matte visibility', type: 'int', default: 0 },
          'aspect': { description: 'Local matte aspect ratio (e.g., 2.35 for cinemascope)', type: 'float' },
          'opacity': { description: 'Matte opacity (0=transparent, 1=opaque black)', type: 'float', default: 1 },
          'heightVisible': { description: 'Fraction of source height visible through matte (0-1)', type: 'float' },
          'centerPoint': { description: 'Matte center in normalized coordinates [x, y]', type: 'float[2]' }
        }
      },
      'rect': {
        description: 'Rectangle overlay entries (dynamic components: rect:id)',
        properties: {
          'color': { description: 'Rectangle outline/fill color RGBA', type: 'float[4]' },
          'width': { description: 'Rectangle width', type: 'float' },
          'height': { description: 'Rectangle height', type: 'float' },
          'position': { description: 'Rectangle position [x, y] in normalized coords', type: 'float[2]' },
          'active': { description: 'Toggle this rectangle on/off', type: 'int', default: 1 },
          'eye': { description: 'Stereo eye assignment for this rectangle', type: 'int' }
        }
      },
      'text': {
        description: 'Text overlay entries (dynamic components: text:id)',
        properties: {
          'pixelScale': { description: 'When non-zero, position is interpreted as pixel coordinates', type: 'float', default: 0 },
          'position': { description: 'Text position [x, y] - normalized or pixel coords based on pixelScale', type: 'float[2]' },
          'color': { description: 'Text color RGBA', type: 'float[4]' },
          'spacing': { description: 'Character spacing', type: 'float' },
          'size': { description: 'Text font size', type: 'float' },
          'scale': { description: 'Text scale factor', type: 'float' },
          'rotation': { description: 'Text rotation in degrees', type: 'float' },
          'text': { description: 'Text content string', type: 'string' }
        }
      }
    }
  },

  // ============= RVPrimaryConvert =============
  'RVPrimaryConvert': {
    description: 'Primary convert node: color space conversion with illuminant adaptation',
    components: {
      'node': {
        description: 'Node settings',
        properties: {
          'active': { description: 'Enable primary conversion', type: 'int', default: 1 }
        }
      },
      'illuminantAdaptation': {
        description: 'Illuminant adaptation settings',
        properties: {
          'useBradfordTransform': { description: 'Use Bradford chromatic adaptation transform', type: 'int', default: 1 }
        }
      },
      'inChromaticities': {
        description: 'Input chromaticities',
        properties: {
          'red': { description: 'Input red primary xy chromaticity', type: 'float[2]' },
          'green': { description: 'Input green primary xy chromaticity', type: 'float[2]' },
          'blue': { description: 'Input blue primary xy chromaticity', type: 'float[2]' },
          'white': { description: 'Input white point xy chromaticity', type: 'float[2]' }
        }
      },
      'outChromaticities': {
        description: 'Output chromaticities',
        properties: {
          'red': { description: 'Output red primary xy chromaticity', type: 'float[2]' },
          'green': { description: 'Output green primary xy chromaticity', type: 'float[2]' },
          'blue': { description: 'Output blue primary xy chromaticity', type: 'float[2]' },
          'white': { description: 'Output white point xy chromaticity', type: 'float[2]' }
        }
      }
    }
  },

  // ============= Group nodes =============
  'RVSequenceGroup': {
    description: 'Sequence group: container for sequence nodes',
    components: {
      'ui': {
        description: 'User interface',
        properties: {
          'name': { description: 'Display name for this sequence', type: 'string' }
        }
      },
      'session': {
        description: 'Session settings',
        properties: {
          'fps': { description: 'Sequence frame rate', type: 'float' }
        }
      },
      'markers': {
        description: 'Timeline markers',
        properties: {
          'in': { description: 'In-point marker frames', type: 'int[]' },
          'out': { description: 'Out-point marker frames', type: 'int[]' }
        }
      }
    }
  },

  'RVStackGroup': {
    description: 'Stack group: container for stack compositing',
    components: {
      'ui': {
        description: 'User interface',
        properties: {
          'name': { description: 'Display name for this stack', type: 'string' }
        }
      }
    }
  },

  'RVSwitchGroup': {
    description: 'Switch group: toggle between multiple inputs',
    components: {
      'ui': {
        description: 'User interface',
        properties: {
          'name': { description: 'Display name for this switch', type: 'string' }
        }
      }
    }
  },

  'RVSwitch': {
    description: 'Switch node: controls which input is active',
    components: {
      'output': {
        description: 'Output settings',
        properties: {
          'input': { description: 'Currently active input index', type: 'int' },
          'fps': { description: 'Output frame rate', type: 'float' }
        }
      },
      'mode': {
        description: 'Switch mode settings',
        properties: {
          'alignStartFrames': { description: 'Align all input start frames', type: 'int', default: 0 }
        }
      }
    }
  },

  'RVFolderGroup': {
    description: 'Folder group: organizes sources into collapsible groups',
    components: {
      'ui': {
        description: 'User interface',
        properties: {
          'name': { description: 'Folder display name', type: 'string' }
        }
      },
      'mode': {
        description: 'Folder mode',
        properties: {
          'viewType': { description: 'View type: switch or layout', type: 'string', default: 'switch' }
        }
      }
    }
  },

  'RVRetimeGroup': {
    description: 'Retime group: container for time adjustments',
    components: {
      'ui': {
        description: 'User interface',
        properties: {
          'name': { description: 'Display name', type: 'string' }
        }
      }
    }
  },

  'RVSourceGroup': {
    description: 'Source group: container for source nodes and their processing chain',
    components: {
      'ui': {
        description: 'User interface',
        properties: {
          'name': { description: 'Display name for this source', type: 'string' }
        }
      }
    }
  },

  'RVViewGroup': {
    description: 'View group: manages what is displayed in the viewer',
    components: {
      'ui': {
        description: 'User interface',
        properties: {
          'name': { description: 'View name', type: 'string' }
        }
      }
    }
  },

  'RVOutputGroup': {
    description: 'Output group: output resolution and format settings',
    components: {
      'output': {
        description: 'Output settings',
        properties: {
          'width': { description: 'Output width in pixels', type: 'int' },
          'height': { description: 'Output height in pixels', type: 'int' },
          'dataType': { description: 'Output data type: uint8, uint16, float', type: 'string', default: 'uint8' },
          'active': { description: 'Enable output', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= Pipeline groups =============
  'RVColorPipelineGroup': {
    description: 'Color pipeline: chain of color processing nodes',
    components: {
      'pipeline': {
        description: 'Pipeline settings',
        properties: {
          'nodes': { description: 'Node names in pipeline order', type: 'string[]' }
        }
      }
    }
  },

  'RVDisplayPipelineGroup': {
    description: 'Display pipeline: final display processing chain',
    components: {
      'pipeline': {
        description: 'Pipeline settings',
        properties: {
          'nodes': { description: 'Node names in pipeline order', type: 'string[]' }
        }
      }
    }
  },

  'RVLinearizePipelineGroup': {
    description: 'Linearize pipeline: input linearization chain',
    components: {
      'pipeline': {
        description: 'Pipeline settings',
        properties: {
          'nodes': { description: 'Node names in pipeline order', type: 'string[]' }
        }
      }
    }
  },

  'RVLookPipelineGroup': {
    description: 'Look pipeline: creative color grading chain',
    components: {
      'pipeline': {
        description: 'Pipeline settings',
        properties: {
          'nodes': { description: 'Node names in pipeline order', type: 'string[]' }
        }
      }
    }
  },

  'RVViewPipelineGroup': {
    description: 'View pipeline: viewer-specific processing',
    components: {
      'pipeline': {
        description: 'Pipeline settings',
        properties: {
          'nodes': { description: 'Node names in pipeline order', type: 'string[]' }
        }
      }
    }
  },

  // ============= LUT nodes =============
  'RVCacheLUT': {
    description: 'Cache LUT: baked color transforms for caching',
    components: {
      'lut': {
        description: 'LUT settings',
        properties: {
          'active': { description: 'Enable cache LUT', type: 'int', default: 0 },
          'type': { description: 'LUT type identifier', type: 'string' }
        }
      }
    }
  },

  'RVLookLUT': {
    description: 'Look LUT: creative color grades',
    components: {
      'lut': {
        description: 'LUT settings',
        properties: {
          'active': { description: 'Enable look LUT', type: 'int', default: 0 },
          'file': { description: 'Path to LUT file', type: 'string' },
          'type': { description: 'LUT type identifier', type: 'string' }
        }
      }
    }
  },

  // ============= Connection/Graph =============
  'connection': {
    description: 'Node graph connections and evaluation order',
    components: {
      'evaluation': {
        description: 'Graph evaluation settings',
        properties: {
          'connections': { description: 'Node connection pairs', type: 'string[]' }
        }
      },
      'top': {
        description: 'Top-level nodes',
        properties: {
          'nodes': { description: 'Root node names', type: 'string[]' }
        }
      }
    }
  },

  // ============= RVImageSource =============
  'RVImageSource': {
    description: 'Image source: handles multi-layer EXR sequences with multiple views and channels. Supports complex image formats with layers, views, and channel selection.',
    components: {
      'media': {
        description: 'Media file references',
        properties: {
          'movie': { description: 'Image file path or sequence pattern (e.g., image.####.exr)', type: 'string' },
          'name': { description: 'Friendly display name for this source', type: 'string' }
        }
      },
      'cut': {
        description: 'Source trim points',
        properties: {
          'in': { description: 'Source in-point frame number', type: 'int' },
          'out': { description: 'Source out-point frame number', type: 'int' }
        }
      },
      'image': {
        description: 'Multi-layer image settings',
        properties: {
          'channels': { description: 'List of available channel names to load', type: 'string[]' },
          'layers': { description: 'List of available layer names (EXR layers)', type: 'string[]' },
          'views': { description: 'List of available view names (stereo: left, right)', type: 'string[]' },
          'defaultLayer': { description: 'Default layer to display', type: 'string' },
          'defaultView': { description: 'Default view to display', type: 'string' },
          'start': { description: 'Sequence start frame number', type: 'int' },
          'end': { description: 'Sequence end frame number', type: 'int' },
          'inc': { description: 'Frame increment (1=every frame, 2=every other)', type: 'int', default: 1 },
          'fps': { description: 'Sequence frame rate', type: 'float' }
        }
      }
    }
  },

  // ============= GLSL Shader Nodes =============
  // These are GPU-accelerated image processing nodes

  'Matrix3x3': {
    description: 'GLSL node: performs 3x3 matrix multiplication on RGB channels only. Used for color space conversions and color corrections.',
    components: {
      'node': {
        description: 'Matrix parameters',
        properties: {
          'active': { description: 'Enable matrix operation', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Matrix values',
        properties: {
          'm33': { description: '3x3 matrix values in row-major order [r0c0,r0c1,r0c2,r1c0,...]', type: 'float[9]', default: [1,0,0, 0,1,0, 0,0,1] }
        }
      }
    }
  },

  'Matrix4x4': {
    description: 'GLSL node: performs 4x4 matrix multiplication on all RGBA channels. Used for color transforms including alpha.',
    components: {
      'node': {
        description: 'Matrix parameters',
        properties: {
          'active': { description: 'Enable matrix operation', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Matrix values',
        properties: {
          'm44': { description: '4x4 matrix values in row-major order', type: 'float[16]', default: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] }
        }
      }
    }
  },

  'Gamma': {
    description: 'GLSL node: applies gamma correction (power curve) to RGB channels. Formula: out = in^gamma',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable gamma correction', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Gamma values',
        properties: {
          'gamma': { description: 'Per-channel gamma values. Default 0.4545 ≈ 1/2.2 (sRGB encoding)', type: 'float[3]', default: [0.4545, 0.4545, 0.4545] }
        }
      }
    }
  },

  'Saturation': {
    description: 'GLSL node: adjusts color saturation using luminance-preserving algorithm',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable saturation adjustment', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Saturation parameters',
        properties: {
          'saturation': { description: 'Saturation multiplier (0=grayscale, 1=unchanged, >1=oversaturated)', type: 'float', default: 1.0 },
          'lumaCoefficients': { description: 'Luminance weights for R, G, B (Rec.709 default)', type: 'float[3]', default: [0.2126, 0.7152, 0.0722] },
          'minClamp': { description: 'Minimum output value clamp', type: 'float', default: 0 },
          'maxClamp': { description: 'Maximum output value clamp', type: 'float', default: 1 }
        }
      }
    }
  },

  'Premult': {
    description: 'GLSL node: multiplies RGB values by alpha channel (pre-multiplication). Used for compositing preparation.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable premultiplication', type: 'int', default: 1 }
        }
      }
    }
  },

  'UnPremult': {
    description: 'GLSL node: divides RGB values by alpha channel (un-premultiplication). Reverses premultiplied alpha.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable un-premultiplication', type: 'int', default: 1 }
        }
      }
    }
  },

  'SRGBToLinear': {
    description: 'GLSL node: converts sRGB encoded values to linear light. Applies inverse sRGB transfer function.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable sRGB to linear conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'LinearToSRGB': {
    description: 'GLSL node: converts linear light values to sRGB encoding. Applies sRGB transfer function for display.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to sRGB conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'Rec709ToLinear': {
    description: 'GLSL node: converts Rec.709 gamma-encoded values to linear light for broadcast content.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable Rec.709 to linear conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'LinearToRec709': {
    description: 'GLSL node: converts linear light values to Rec.709 encoding for broadcast output.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to Rec.709 conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'CineonLogToLinear': {
    description: 'GLSL node: linearizes Cineon/DPX log-encoded film scans using Kodak specification.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable Cineon log to linear conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Cineon parameters',
        properties: {
          'refBlack': { description: 'Reference black code value (0-1023 range)', type: 'float', default: 95 },
          'refWhite': { description: 'Reference white code value (0-1023 range)', type: 'float', default: 685 },
          'softClip': { description: 'Soft clip range for highlight rolloff', type: 'float', default: 0 }
        }
      }
    }
  },

  'LinearToCineonLog': {
    description: 'GLSL node: converts linear values to Cineon log encoding for film output.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to Cineon log conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Cineon parameters',
        properties: {
          'refBlack': { description: 'Reference black code value (0-1023 range)', type: 'float', default: 95 },
          'refWhite': { description: 'Reference white code value (0-1023 range)', type: 'float', default: 685 }
        }
      }
    }
  },

  'ViperLogToLinear': {
    description: 'GLSL node: linearizes Thomson Viper camera log-encoded footage.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable Viper log to linear conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'LinearToViperLog': {
    description: 'GLSL node: converts linear values to Thomson Viper log encoding.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to Viper log conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  // Color space conversion nodes
  'RGBToYCbCr601': {
    description: 'GLSL node: converts RGB to YCbCr using ITU-R BT.601 standard (SD video).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable RGB to YCbCr 601 conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'YCbCr601ToRGB': {
    description: 'GLSL node: converts YCbCr to RGB using ITU-R BT.601 standard (SD video).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable YCbCr 601 to RGB conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'RGBToYCbCr709': {
    description: 'GLSL node: converts RGB to YCbCr using ITU-R BT.709 standard (HD video).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable RGB to YCbCr 709 conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'YCbCr709ToRGB': {
    description: 'GLSL node: converts YCbCr to RGB using ITU-R BT.709 standard (HD video).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable YCbCr 709 to RGB conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'RGBToYCgCo': {
    description: 'GLSL node: converts RGB to YCgCo color space (luma + chroma green/orange).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable RGB to YCgCo conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'YCgCoToRGB': {
    description: 'GLSL node: converts YCgCo color space back to RGB.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable YCgCo to RGB conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'RGBToYCbCr601FR': {
    description: 'GLSL node: converts RGB to YCbCr 601 Full Range (0-255 instead of 16-235).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable RGB to YCbCr 601 Full Range conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'YCbCr601FRToRGB': {
    description: 'GLSL node: converts YCbCr 601 Full Range back to RGB.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable YCbCr 601 Full Range to RGB conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  // Transition nodes
  'CrossDissolve': {
    description: 'GLSL transition node: creates smooth cross-dissolve between two sources over specified frames.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable cross-dissolve transition', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Transition timing',
        properties: {
          'startFrame': { description: 'Frame number where transition begins', type: 'float', default: 40 },
          'numFrames': { description: 'Duration of transition in frames', type: 'float', default: 20 }
        }
      }
    }
  },

  'Wipe': {
    description: 'GLSL transition node: creates wipe transition effect between two sources.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable wipe transition', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Transition timing',
        properties: {
          'startFrame': { description: 'Frame number where wipe begins', type: 'float', default: 40 },
          'numFrames': { description: 'Duration of wipe in frames', type: 'float', default: 20 }
        }
      }
    }
  },

  // CDL variants for ACES workflows
  'CDLForACESLinear': {
    description: 'GLSL node: CDL operation in ACES linear colorspace with conversion matrices for proper ACES workflow.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable ACES CDL processing', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'CDL and ACES parameters',
        properties: {
          'slope': { description: 'CDL slope per channel', type: 'float[3]', default: [1, 1, 1] },
          'offset': { description: 'CDL offset per channel', type: 'float[3]', default: [0, 0, 0] },
          'power': { description: 'CDL power per channel', type: 'float[3]', default: [1, 1, 1] },
          'saturation': { description: 'CDL saturation', type: 'float', default: 1.0 },
          'lumaCoefficients': { description: 'Luminance weights for saturation', type: 'float[3]', default: [0.2126, 0.7152, 0.0722] },
          'toACES': { description: '4x4 matrix to convert from working space to ACES', type: 'float[16]' },
          'fromACES': { description: '4x4 matrix to convert from ACES back to working space', type: 'float[16]' },
          'minClamp': { description: 'Minimum output value', type: 'float', default: 0 },
          'maxClamp': { description: 'Maximum output value', type: 'float', default: 1 }
        }
      }
    }
  },

  'CDLForACESLog': {
    description: 'GLSL node: CDL operation in ACES Log colorspace for log-based ACES workflows.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable ACES Log CDL processing', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'CDL and ACES parameters',
        properties: {
          'slope': { description: 'CDL slope per channel', type: 'float[3]', default: [1, 1, 1] },
          'offset': { description: 'CDL offset per channel', type: 'float[3]', default: [0, 0, 0] },
          'power': { description: 'CDL power per channel', type: 'float[3]', default: [1, 1, 1] },
          'saturation': { description: 'CDL saturation', type: 'float', default: 1.0 },
          'lumaCoefficients': { description: 'Luminance weights for saturation', type: 'float[3]', default: [0.2126, 0.7152, 0.0722] },
          'toACES': { description: '4x4 matrix to convert from working space to ACES', type: 'float[16]' },
          'fromACES': { description: '4x4 matrix to convert from ACES back to working space', type: 'float[16]' },
          'minClamp': { description: 'Minimum output value', type: 'float', default: 0 },
          'maxClamp': { description: 'Maximum output value', type: 'float', default: 1 }
        }
      }
    }
  },

  // ============= Image Attributes =============
  'image': {
    description: 'Image attributes from file metadata. Contains per-frame/per-layer information about resolution, data format, color space, and other technical details.',
    components: {
      'attributes': {
        description: 'Per-image attributes parsed from file metadata',
        properties: {
          'Width': { description: 'Image width in pixels', type: 'int' },
          'Height': { description: 'Image height in pixels', type: 'int' },
          'BitsPerChannel': { description: 'Bit depth per color channel (8, 16, 32)', type: 'int' },
          'NumberOfChannels': { description: 'Number of color/data channels', type: 'int' },
          'DataType': { description: 'Pixel data type: UINT8, UINT16, HALF, FLOAT', type: 'string' },
          'PixelAspectRatio': { description: 'Pixel aspect ratio (1.0 for square pixels)', type: 'float', default: 1.0 },
          'ColorSpace': { description: 'Color space name from file (sRGB, Linear, ACEScg, etc.)', type: 'string' },
          'Chromaticities': { description: 'CIE xy chromaticity coordinates [Rx,Ry,Gx,Gy,Bx,By,Wx,Wy]', type: 'float[8]' },
          'WhiteLuminance': { description: 'White point luminance in cd/m²', type: 'float' },
          'AdoptedNeutral': { description: 'Adopted neutral xy chromaticity', type: 'float[2]' },
          'RenderingIntent': { description: 'ICC rendering intent: perceptual, relative, saturation, absolute', type: 'string' },
          'ICCProfile': { description: 'Embedded ICC profile name', type: 'string' },
          'OriginalDate': { description: 'Original capture/creation date', type: 'string' },
          'Software': { description: 'Software that created/modified the file', type: 'string' }
        }
      },
      'displayAttributes': {
        description: 'Display-related attributes for proper viewing',
        properties: {
          'Gamma': { description: 'Display gamma value (2.2 typical)', type: 'float' },
          'DisplayPrimaries': { description: 'Display primaries chromaticities', type: 'float[6]' },
          'DisplayWhitePoint': { description: 'Display white point chromaticity', type: 'float[2]' }
        }
      }
    }
  },

  // ============= EXR Specific Attributes =============
  'exr': {
    description: 'OpenEXR specific attributes for multi-part, multi-view, and deep data files.',
    components: {
      'header': {
        description: 'EXR header attributes',
        properties: {
          'compression': { description: 'EXR compression type: none, rle, zips, zip, piz, pxr24, b44, b44a, dwaa, dwab', type: 'string' },
          'lineOrder': { description: 'Scanline order: increasingY, decreasingY, randomY', type: 'string' },
          'dataWindow': { description: 'Data window bounds [xMin, yMin, xMax, yMax]', type: 'int[4]' },
          'displayWindow': { description: 'Display window bounds [xMin, yMin, xMax, yMax]', type: 'int[4]' },
          'screenWindowCenter': { description: 'Screen window center for NDC mapping', type: 'float[2]' },
          'screenWindowWidth': { description: 'Screen window width for NDC mapping', type: 'float' },
          'type': { description: 'Part type: scanlineimage, tiledimage, deepscanline, deeptile', type: 'string' }
        }
      },
      'multiView': {
        description: 'Multi-view (stereo) settings',
        properties: {
          'view': { description: 'Current view name (left, right, center)', type: 'string' },
          'multiView': { description: 'List of available view names', type: 'string[]' },
          'defaultView': { description: 'Default view to display', type: 'string' }
        }
      },
      'deep': {
        description: 'Deep data settings',
        properties: {
          'deepImageState': { description: 'Deep image state: sorted, messy', type: 'string' },
          'maxSamplesPerPixel': { description: 'Maximum deep samples per pixel', type: 'int' }
        }
      }
    }
  },

  // ============= DPX/Cineon Attributes =============
  'dpx': {
    description: 'DPX and Cineon film format attributes from file headers.',
    components: {
      'film': {
        description: 'Film-related metadata',
        properties: {
          'FilmMfgId': { description: 'Film manufacturer ID code', type: 'string' },
          'FilmType': { description: 'Film stock type code', type: 'string' },
          'Offset': { description: 'Perfs offset', type: 'int' },
          'Prefix': { description: 'Prefix before frame number', type: 'string' },
          'Count': { description: 'Frame count in sequence', type: 'int' },
          'Format': { description: 'Film format description', type: 'string' },
          'FramePosition': { description: 'Frame position in sequence', type: 'int' },
          'SequenceLength': { description: 'Total sequence length', type: 'int' },
          'HeldCount': { description: 'Number of frames held', type: 'int' },
          'FrameRate': { description: 'Frame rate of original', type: 'float' },
          'ShutterAngle': { description: 'Camera shutter angle in degrees', type: 'float' },
          'FrameId': { description: 'Frame ID string', type: 'string' },
          'SlateInfo': { description: 'Slate/scene information', type: 'string' }
        }
      },
      'source': {
        description: 'Source device information',
        properties: {
          'XOriginalSize': { description: 'Original X dimension', type: 'int' },
          'YOriginalSize': { description: 'Original Y dimension', type: 'int' },
          'XOffset': { description: 'X offset from origin', type: 'int' },
          'YOffset': { description: 'Y offset from origin', type: 'int' },
          'XCenter': { description: 'X center of original', type: 'float' },
          'YCenter': { description: 'Y center of original', type: 'float' },
          'BorderValidity': { description: 'Border validity flags', type: 'int[4]' },
          'AspectRatio': { description: 'Horizontal/vertical aspect ratio', type: 'int[2]' }
        }
      },
      'orientation': {
        description: 'Image orientation metadata',
        properties: {
          'XOffset': { description: 'X data offset in pixels', type: 'int' },
          'YOffset': { description: 'Y data offset in pixels', type: 'int' },
          'XOriginalCenter': { description: 'X center of original capture', type: 'float' },
          'YOriginalCenter': { description: 'Y center of original capture', type: 'float' },
          'XOriginalSize': { description: 'Original X size in pixels', type: 'int' },
          'YOriginalSize': { description: 'Original Y size in pixels', type: 'int' },
          'FileName': { description: 'Original file name', type: 'string' },
          'CreationTime': { description: 'File creation timestamp', type: 'string' },
          'InputDevice': { description: 'Input device name (scanner, camera)', type: 'string' },
          'InputDeviceSerial': { description: 'Input device serial number', type: 'string' }
        }
      }
    }
  },

  // ============= Movie/Video Attributes =============
  'movie': {
    description: 'Movie container and codec attributes from QuickTime, AVI, MXF, and other formats.',
    components: {
      'video': {
        description: 'Video stream attributes',
        properties: {
          'Codec': { description: 'Video codec name (H.264, ProRes, DNxHD, etc.)', type: 'string' },
          'CodecFourCC': { description: 'Four character codec code', type: 'string' },
          'BitRate': { description: 'Video bit rate in bits/second', type: 'int' },
          'FrameRate': { description: 'Video frame rate', type: 'float' },
          'Duration': { description: 'Video duration in seconds', type: 'float' },
          'FrameCount': { description: 'Total number of frames', type: 'int' },
          'Width': { description: 'Video frame width', type: 'int' },
          'Height': { description: 'Video frame height', type: 'int' },
          'PixelFormat': { description: 'Pixel format (YUV420, RGB24, etc.)', type: 'string' },
          'ColorRange': { description: 'Color range: limited (16-235) or full (0-255)', type: 'string' },
          'ColorPrimaries': { description: 'Color primaries: BT.709, BT.2020, etc.', type: 'string' },
          'TransferFunction': { description: 'Transfer function: sRGB, PQ, HLG, etc.', type: 'string' },
          'MatrixCoefficients': { description: 'YUV matrix: BT.709, BT.601, etc.', type: 'string' }
        }
      },
      'audio': {
        description: 'Audio stream attributes',
        properties: {
          'AudioCodec': { description: 'Audio codec name (AAC, PCM, etc.)', type: 'string' },
          'SampleRate': { description: 'Audio sample rate in Hz', type: 'int' },
          'Channels': { description: 'Number of audio channels', type: 'int' },
          'BitDepth': { description: 'Audio bit depth (16, 24, 32)', type: 'int' },
          'AudioBitRate': { description: 'Audio bit rate in bits/second', type: 'int' },
          'AudioDuration': { description: 'Audio duration in seconds', type: 'float' },
          'ChannelLayout': { description: 'Channel layout (stereo, 5.1, 7.1)', type: 'string' }
        }
      },
      'container': {
        description: 'Container format attributes',
        properties: {
          'Format': { description: 'Container format (MOV, MXF, AVI, etc.)', type: 'string' },
          'FormatVersion': { description: 'Container format version', type: 'string' },
          'CreationDate': { description: 'Container creation date', type: 'string' },
          'ModificationDate': { description: 'Last modification date', type: 'string' },
          'Timecode': { description: 'Embedded timecode', type: 'string' },
          'TimecodeRate': { description: 'Timecode frame rate', type: 'float' },
          'DropFrame': { description: 'Drop-frame timecode flag', type: 'int' },
          'ReelName': { description: 'Reel/tape name', type: 'string' },
          'TapeNumber': { description: 'Tape number identifier', type: 'string' }
        }
      }
    }
  },

  // ============= RAW Camera Attributes =============
  'raw': {
    description: 'Camera RAW file attributes from RED, ARRI, Sony, Blackmagic, and other cameras.',
    components: {
      'camera': {
        description: 'Camera capture metadata',
        properties: {
          'Make': { description: 'Camera manufacturer', type: 'string' },
          'Model': { description: 'Camera model name', type: 'string' },
          'SerialNumber': { description: 'Camera serial number', type: 'string' },
          'LensModel': { description: 'Lens model name', type: 'string' },
          'LensSerialNumber': { description: 'Lens serial number', type: 'string' },
          'FocalLength': { description: 'Focal length in mm', type: 'float' },
          'FocalLength35mm': { description: 'Equivalent 35mm focal length', type: 'float' },
          'Aperture': { description: 'Aperture f-number', type: 'float' },
          'ISO': { description: 'ISO sensitivity value', type: 'int' },
          'ExposureTime': { description: 'Exposure time in seconds', type: 'float' },
          'ShutterAngle': { description: 'Shutter angle in degrees (cinema cameras)', type: 'float' },
          'WhiteBalance': { description: 'White balance color temperature in Kelvin', type: 'int' },
          'Tint': { description: 'White balance tint (green-magenta)', type: 'float' }
        }
      },
      'sensor': {
        description: 'Sensor technical data',
        properties: {
          'SensorWidth': { description: 'Active sensor width in mm', type: 'float' },
          'SensorHeight': { description: 'Active sensor height in mm', type: 'float' },
          'PhotositeWidth': { description: 'Photosite (pixel) width in μm', type: 'float' },
          'PhotositeHeight': { description: 'Photosite height in μm', type: 'float' },
          'BayerPattern': { description: 'Bayer mosaic pattern (RGGB, BGGR, etc.)', type: 'string' },
          'BlackLevel': { description: 'Sensor black level values per channel', type: 'int[]' },
          'WhiteLevel': { description: 'Sensor saturation (white) level', type: 'int' }
        }
      },
      'colorimetry': {
        description: 'RAW colorimetric data',
        properties: {
          'ColorMatrix1': { description: 'XYZ to camera RGB matrix (illuminant 1)', type: 'float[9]' },
          'ColorMatrix2': { description: 'XYZ to camera RGB matrix (illuminant 2)', type: 'float[9]' },
          'ForwardMatrix1': { description: 'Camera RGB to XYZ matrix (illuminant 1)', type: 'float[9]' },
          'ForwardMatrix2': { description: 'Camera RGB to XYZ matrix (illuminant 2)', type: 'float[9]' },
          'AsShotNeutral': { description: 'As-shot neutral point in camera RGB', type: 'float[3]' },
          'CalibrationIlluminant1': { description: 'Calibration illuminant 1 type', type: 'string' },
          'CalibrationIlluminant2': { description: 'Calibration illuminant 2 type', type: 'string' }
        }
      }
    }
  },

  // ============= Movieproc Procedural Format =============
  'movieproc': {
    description: 'Procedural image/movie generator for test patterns, color bars, and synthetic content. Format: movieproc:[type],[params],[width]x[height],[start]-[end].[ext]',
    components: {
      'solid': {
        description: 'Solid color generator: movieproc:solid,[r],[g],[b],[a]',
        properties: {
          'r': { description: 'Red channel value (0.0-1.0)', type: 'float', range: '0.0 to 1.0' },
          'g': { description: 'Green channel value (0.0-1.0)', type: 'float', range: '0.0 to 1.0' },
          'b': { description: 'Blue channel value (0.0-1.0)', type: 'float', range: '0.0 to 1.0' },
          'a': { description: 'Alpha channel value (0.0-1.0)', type: 'float', default: 1.0, range: '0.0 to 1.0' }
        }
      },
      'noise': {
        description: 'Random noise pattern generator: movieproc:noise,[seed]',
        properties: {
          'seed': { description: 'Random seed (animates when different per frame)', type: 'int' }
        }
      },
      'colorchart': {
        description: 'Color chart pattern generator: movieproc:colorchart',
        properties: {
          'type': { description: 'Chart type (Macbeth ColorChecker)', type: 'string', default: 'macbeth' }
        }
      },
      'colorwheel': {
        description: 'HSV color wheel generator: movieproc:colorwheel',
        properties: {}
      },
      'smptebars': {
        description: 'SMPTE color bars test pattern: movieproc:smptebars',
        properties: {}
      },
      'black': {
        description: 'Black frame generator: movieproc:black',
        properties: {}
      },
      'blank': {
        description: 'Blank/transparent frame generator: movieproc:blank',
        properties: {}
      },
      'grid': {
        description: 'Grid pattern generator: movieproc:grid,[spacing]',
        properties: {
          'spacing': { description: 'Grid line spacing in pixels', type: 'int', default: 100 }
        }
      }
    }
  },

  // ============= Reader/Threading Configuration =============
  'RVReaderPrefs': {
    description: 'Reader preferences and threading configuration for file I/O performance.',
    components: {
      'threading': {
        description: 'Multi-threaded reader settings',
        properties: {
          'numReaderThreads': { description: 'Number of reader threads for async I/O', type: 'int', default: 4 },
          'numIOThreads': { description: 'Number of I/O threads for disk access', type: 'int', default: 2 },
          'numEvaluationThreads': { description: 'Number of threads for frame evaluation', type: 'int' },
          'useThreadedUpload': { description: 'Use threaded GPU texture upload', type: 'int', default: 1 },
          'usePBOs': { description: 'Use Pixel Buffer Objects for async upload', type: 'int', default: 1 }
        }
      },
      'decoder': {
        description: 'Decoder settings',
        properties: {
          'numDecoderThreads': { description: 'Threads for codec decoding (0=auto)', type: 'int', default: 0 },
          'decoderPolicy': { description: 'Decoder thread policy: dedicated, shared', type: 'string', default: 'shared' },
          'hwDecode': { description: 'Enable hardware-accelerated decoding', type: 'int', default: 1 },
          'hwDecodePriority': { description: 'HW decode device preference: cuda, videotoolbox, qsv, vaapi', type: 'string' }
        }
      },
      'prefetch': {
        description: 'Prefetch/look-ahead settings',
        properties: {
          'prefetchFrames': { description: 'Number of frames to prefetch ahead', type: 'int', default: 4 },
          'prefetchBehind': { description: 'Number of frames to keep behind playhead', type: 'int', default: 2 },
          'asyncPrefetch': { description: 'Enable asynchronous prefetch', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= Audio Device Configuration =============
  'RVAudioPrefs': {
    description: 'Audio device and playback configuration settings.',
    components: {
      'device': {
        description: 'Audio device settings',
        properties: {
          'device': { description: 'Audio device name or "default"', type: 'string', default: 'default' },
          'rate': { description: 'Audio sample rate in Hz', type: 'int', default: 48000 },
          'channels': { description: 'Number of output channels', type: 'int', default: 2 },
          'format': { description: 'Audio format: int16, int24, int32, float32', type: 'string', default: 'float32' },
          'bufferSize': { description: 'Audio buffer size in samples', type: 'int', default: 512 },
          'latency': { description: 'Target audio latency in milliseconds', type: 'float', default: 20 }
        }
      },
      'sync': {
        description: 'Audio-video sync settings',
        properties: {
          'avsync': { description: 'Audio/video sync mode: audio, video, freerun', type: 'string', default: 'audio' },
          'avsyncOffset': { description: 'Global A/V sync offset in frames', type: 'float', default: 0 },
          'scrubMode': { description: 'Scrub audio mode: off, on, pitched', type: 'string', default: 'on' }
        }
      }
    }
  },

  // ============= Network/Sync Configuration =============
  'RVNetworkPrefs': {
    description: 'Network settings for remote sync, streaming, and collaborative review.',
    components: {
      'sync': {
        description: 'Network sync settings',
        properties: {
          'syncHost': { description: 'Sync server hostname', type: 'string' },
          'syncPort': { description: 'Sync server port', type: 'int', default: 45124 },
          'syncEnabled': { description: 'Enable network sync', type: 'int', default: 0 },
          'syncMode': { description: 'Sync mode: master, slave, peer', type: 'string', default: 'peer' },
          'syncTransport': { description: 'Transport protocol: tcp, udp, multicast', type: 'string', default: 'tcp' }
        }
      },
      'streaming': {
        description: 'Streaming output settings',
        properties: {
          'streamEnabled': { description: 'Enable streaming output', type: 'int', default: 0 },
          'streamPort': { description: 'Streaming server port', type: 'int', default: 45125 },
          'streamCodec': { description: 'Streaming codec: h264, mjpeg', type: 'string', default: 'mjpeg' },
          'streamQuality': { description: 'Streaming quality (0-100)', type: 'int', default: 85 },
          'streamBitRate': { description: 'Target streaming bit rate in kbps', type: 'int' }
        }
      }
    }
  },

  // ============= Comparison Modes =============
  'RVCompare': {
    description: 'Image comparison tools: wipe, difference, overlay modes for A/B comparison.',
    components: {
      'compare': {
        description: 'Comparison mode settings',
        properties: {
          'mode': { description: 'Comparison mode: replace, over, difference, tile, wipe', type: 'string', default: 'replace' },
          'wipeAngle': { description: 'Wipe line angle in degrees', type: 'float', default: 0 },
          'wipePosition': { description: 'Wipe split position (0=left, 1=right)', type: 'float', default: 0.5, range: '0.0 to 1.0' },
          'wipeWidth': { description: 'Wipe edge softness width in pixels', type: 'float', default: 2 },
          'differenceScale': { description: 'Difference mode amplification factor', type: 'float', default: 1.0 },
          'differenceOffset': { description: 'Difference mode offset (0.5=neutral gray)', type: 'float', default: 0.5 },
          'showWipeLines': { description: 'Show wipe divider lines', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= Histogram/Waveform/Vectorscope =============
  'RVScopes': {
    description: 'Video scopes for color analysis: histogram, waveform, vectorscope.',
    components: {
      'histogram': {
        description: 'Histogram display settings',
        properties: {
          'show': { description: 'Show histogram overlay', type: 'int', default: 0 },
          'mode': { description: 'Histogram mode: rgb, luminance, parade', type: 'string', default: 'rgb' },
          'position': { description: 'Histogram position [x, y]', type: 'float[2]' },
          'scale': { description: 'Histogram display scale', type: 'float', default: 1.0 },
          'opacity': { description: 'Histogram background opacity', type: 'float', default: 0.8 }
        }
      },
      'waveform': {
        description: 'Waveform monitor settings',
        properties: {
          'show': { description: 'Show waveform overlay', type: 'int', default: 0 },
          'mode': { description: 'Waveform mode: luma, rgb, parade, overlay', type: 'string', default: 'luma' },
          'position': { description: 'Waveform position [x, y]', type: 'float[2]' },
          'scale': { description: 'Waveform intensity scale', type: 'float', default: 1.0 }
        }
      },
      'vectorscope': {
        description: 'Vectorscope display settings',
        properties: {
          'show': { description: 'Show vectorscope overlay', type: 'int', default: 0 },
          'position': { description: 'Vectorscope position [x, y]', type: 'float[2]' },
          'scale': { description: 'Vectorscope display scale', type: 'float', default: 1.0 },
          'intensity': { description: 'Vectorscope trace intensity', type: 'float', default: 1.0 },
          'colorSpace': { description: 'Vectorscope color space: rec709, rec601, rec2020', type: 'string', default: 'rec709' }
        }
      }
    }
  },

  // ============= Output Device Configuration =============
  'RVOutputDevice': {
    description: 'External output device configuration for SDI, HDMI, and other professional video outputs.',
    components: {
      'device': {
        description: 'Output device settings',
        properties: {
          'device': { description: 'Output device name (AJA, Blackmagic, etc.)', type: 'string' },
          'videoOutput': { description: 'Video output connector: SDI1, SDI2, HDMI', type: 'string' },
          'audioOutput': { description: 'Audio output connector: embedded, analog, aes', type: 'string' },
          'videoFormat': { description: 'Output video format: 1080p24, 1080p25, UHD30, etc.', type: 'string' },
          'pixelFormat': { description: 'Output pixel format: yuv422, rgb444, yuv444', type: 'string' },
          'bitDepth': { description: 'Output bit depth: 8, 10, 12', type: 'int', default: 10 },
          'sync': { description: 'Genlock/sync source: internal, external, auto', type: 'string', default: 'internal' }
        }
      },
      'colorCorrect': {
        description: 'Output color correction settings',
        properties: {
          'outputColorSpace': { description: 'Output color space: rec709, rec2020, dci-p3', type: 'string', default: 'rec709' },
          'outputTransfer': { description: 'Output transfer function: sdr, pq, hlg', type: 'string', default: 'sdr' },
          'outputLUT': { description: 'Path to output calibration LUT file', type: 'string' },
          'outputLUTActive': { description: 'Enable output LUT', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= Timecode/Metadata Display =============
  'RVTimecodeDisplay': {
    description: 'Timecode and metadata burn-in display settings.',
    components: {
      'display': {
        description: 'Timecode display settings',
        properties: {
          'show': { description: 'Show timecode burn-in', type: 'int', default: 0 },
          'format': { description: 'Timecode format: SMPTE (HH:MM:SS:FF), frames, feet+frames, seconds', type: 'string', default: 'SMPTE' },
          'position': { description: 'Position: top-left, top-center, top-right, bottom-left, etc.', type: 'string', default: 'bottom-left' },
          'fontSize': { description: 'Font size in points', type: 'int', default: 24 },
          'fontColor': { description: 'Font color RGBA', type: 'float[4]', default: [1, 1, 1, 1] },
          'backgroundColor': { description: 'Background box color RGBA', type: 'float[4]', default: [0, 0, 0, 0.7] },
          'showFrameNumber': { description: 'Also display absolute frame number', type: 'int', default: 0 },
          'showSourceTimecode': { description: 'Display source file timecode', type: 'int', default: 1 }
        }
      },
      'metadata': {
        description: 'Metadata burn-in settings',
        properties: {
          'showFilename': { description: 'Display source filename', type: 'int', default: 0 },
          'showResolution': { description: 'Display frame resolution', type: 'int', default: 0 },
          'showCodec': { description: 'Display codec information', type: 'int', default: 0 },
          'showColorSpace': { description: 'Display color space info', type: 'int', default: 0 },
          'customText': { description: 'Custom text to display', type: 'string' },
          'customPosition': { description: 'Custom text position', type: 'string' }
        }
      }
    }
  },

  // ============= Dither and Banding Reduction =============
  'Dither': {
    description: 'GLSL node: applies dithering to reduce color banding when converting from high to low bit depth.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable dithering', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Dither parameters',
        properties: {
          'ditherAmount': { description: 'Dither noise amplitude (0.5/255 typical for 8-bit)', type: 'float', default: 0.00196 },
          'seed': { description: 'Random seed for noise pattern', type: 'int' }
        }
      }
    }
  },

  // ============= Sharpen/Blur Filters =============
  'Sharpen': {
    description: 'GLSL node: unsharp mask sharpening filter.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable sharpening', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Sharpen parameters',
        properties: {
          'amount': { description: 'Sharpening strength (0=none, 1=normal, >1=strong)', type: 'float', default: 0.5, range: '0.0 to 2.0' },
          'radius': { description: 'Sharpening kernel radius in pixels', type: 'float', default: 1.0 },
          'threshold': { description: 'Edge detection threshold to avoid noise amplification', type: 'float', default: 0.0 }
        }
      }
    }
  },

  'Blur': {
    description: 'GLSL node: Gaussian blur filter for softening or defocusing images.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable blur', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Blur parameters',
        properties: {
          'radius': { description: 'Blur radius in pixels', type: 'float', default: 2.0 },
          'sigma': { description: 'Gaussian sigma (0=auto from radius)', type: 'float', default: 0 },
          'quality': { description: 'Blur quality: 0=fast, 1=normal, 2=high', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= Blend Mode Nodes =============
  'Over': {
    description: 'GLSL node: Porter-Duff over compositing. Places foreground over background using alpha channel.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable over compositing', type: 'int', default: 1 }
        }
      }
    }
  },

  'Add': {
    description: 'GLSL node: Additive blend mode. Adds pixel values together (useful for light effects).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable additive blend', type: 'int', default: 1 }
        }
      }
    }
  },

  'Difference': {
    description: 'GLSL node: Difference blend mode. Shows absolute difference between images (useful for comparison).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable difference blend', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Difference parameters',
        properties: {
          'scale': { description: 'Difference amplification scale', type: 'float', default: 1.0 },
          'offset': { description: 'Offset added to result (0.5 for neutral gray)', type: 'float', default: 0.0 }
        }
      }
    }
  },

  'Multiply': {
    description: 'GLSL node: Multiply blend mode. Multiplies pixel values (darkens image).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable multiply blend', type: 'int', default: 1 }
        }
      }
    }
  },

  'Screen': {
    description: 'GLSL node: Screen blend mode. Inverse of multiply (lightens image).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable screen blend', type: 'int', default: 1 }
        }
      }
    }
  },

  'Replace': {
    description: 'GLSL node: Replace blend mode. Completely replaces background with foreground.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable replace blend', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= ARRI LogC Nodes =============
  'LogCToLinear': {
    description: 'GLSL node: Converts ARRI LogC encoded footage to linear light. Supports LogC3 (Alexa) and LogC4 (Alexa 35).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable LogC to linear conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'LogC parameters',
        properties: {
          'exposureIndex': { description: 'ARRI Exposure Index (EI) used during capture. Affects curve shape.', type: 'int', default: 800 },
          'logCVersion': { description: 'LogC version: 3 (Alexa/Amira) or 4 (Alexa 35)', type: 'int', default: 3 }
        }
      }
    }
  },

  'LinearToLogC': {
    description: 'GLSL node: Converts linear light values to ARRI LogC encoding for output/export.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to LogC conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'LogC parameters',
        properties: {
          'exposureIndex': { description: 'Target Exposure Index for encoding', type: 'int', default: 800 },
          'logCVersion': { description: 'LogC version: 3 or 4', type: 'int', default: 3 }
        }
      }
    }
  },

  // ============= RED Log Nodes =============
  'REDLogToLinear': {
    description: 'GLSL node: Converts RED camera log-encoded footage (Log3G10, REDlogFilm) to linear.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable RED log to linear conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'RED log parameters',
        properties: {
          'logType': { description: 'RED log curve type: Log3G10, REDlogFilm', type: 'string', default: 'Log3G10' }
        }
      }
    }
  },

  'LinearToREDLog': {
    description: 'GLSL node: Converts linear values to RED camera log encoding.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to RED log conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'RED log parameters',
        properties: {
          'logType': { description: 'RED log curve type: Log3G10, REDlogFilm', type: 'string', default: 'Log3G10' }
        }
      }
    }
  },

  // ============= Sony S-Log Nodes =============
  'SLogToLinear': {
    description: 'GLSL node: Converts Sony S-Log encoded footage to linear light.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable S-Log to linear conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'S-Log parameters',
        properties: {
          'slogVersion': { description: 'S-Log version: 2 or 3', type: 'int', default: 3 }
        }
      }
    }
  },

  'LinearToSLog': {
    description: 'GLSL node: Converts linear light to Sony S-Log encoding.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to S-Log conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'S-Log parameters',
        properties: {
          'slogVersion': { description: 'S-Log version: 2 or 3', type: 'int', default: 3 }
        }
      }
    }
  },

  // ============= PQ/HDR Nodes =============
  'PQToLinear': {
    description: 'GLSL node: Converts PQ (Perceptual Quantizer / SMPTE ST 2084) encoded HDR content to linear.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable PQ to linear conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'PQ parameters',
        properties: {
          'maxNits': { description: 'Maximum display luminance in nits (cd/m²)', type: 'float', default: 10000.0 }
        }
      }
    }
  },

  'LinearToPQ': {
    description: 'GLSL node: Converts linear light to PQ encoding for HDR display output.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to PQ conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'PQ parameters',
        properties: {
          'maxNits': { description: 'Target maximum luminance in nits', type: 'float', default: 10000.0 }
        }
      }
    }
  },

  'HLGToLinear': {
    description: 'GLSL node: Converts HLG (Hybrid Log-Gamma) HDR content to linear light.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable HLG to linear conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'HLG parameters',
        properties: {
          'systemGamma': { description: 'HLG system gamma (1.2 typical)', type: 'float', default: 1.2 }
        }
      }
    }
  },

  'LinearToHLG': {
    description: 'GLSL node: Converts linear light to HLG encoding for broadcast HDR.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to HLG conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'HLG parameters',
        properties: {
          'systemGamma': { description: 'Target system gamma', type: 'float', default: 1.2 }
        }
      }
    }
  },

  // ============= ACES Color Space Nodes =============
  'ACEScgToLinear': {
    description: 'GLSL node: Converts ACEScg (AP1 primaries) to Rec.709 linear for display.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable ACEScg to linear conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'LinearToACEScg': {
    description: 'GLSL node: Converts Rec.709 linear to ACEScg working space.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to ACEScg conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'ACESccToLinear': {
    description: 'GLSL node: Converts ACEScc (logarithmic ACES) to linear light.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable ACEScc to linear conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'LinearToACEScc': {
    description: 'GLSL node: Converts linear light to ACEScc logarithmic encoding.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable linear to ACEScc conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= Color Space Primaries Conversion =============
  'Rec709ToRec2020': {
    description: 'GLSL node: Converts from Rec.709 color primaries to Rec.2020 wide color gamut.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable Rec.709 to Rec.2020 conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'Rec2020ToRec709': {
    description: 'GLSL node: Converts from Rec.2020 wide gamut to Rec.709 primaries with gamut mapping.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable Rec.2020 to Rec.709 conversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Gamut mapping parameters',
        properties: {
          'gamutMapping': { description: 'Gamut mapping method: clip, compress, or none', type: 'string', default: 'clip' }
        }
      }
    }
  },

  'Rec709ToDCIP3': {
    description: 'GLSL node: Converts from Rec.709 to DCI-P3 color primaries.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable Rec.709 to DCI-P3 conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  'DCIP3ToRec709': {
    description: 'GLSL node: Converts from DCI-P3 to Rec.709 color primaries.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable DCI-P3 to Rec.709 conversion', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= Channel Operations =============
  'Invert': {
    description: 'GLSL node: Inverts image values (creates negative). Formula: out = 1 - in',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable inversion', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Invert parameters',
        properties: {
          'channels': { description: 'Channels to invert: rgb, rgba, r, g, b, a', type: 'string', default: 'rgb' }
        }
      }
    }
  },

  'Clamp': {
    description: 'GLSL node: Clamps pixel values to specified range.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable clamping', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Clamp parameters',
        properties: {
          'min': { description: 'Minimum output value', type: 'float', default: 0.0 },
          'max': { description: 'Maximum output value', type: 'float', default: 1.0 }
        }
      }
    }
  },

  'Normalize': {
    description: 'GLSL node: Normalizes pixel values to 0-1 range based on min/max in image.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable normalization', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Normalize parameters',
        properties: {
          'inMin': { description: 'Input minimum value to map from', type: 'float', default: 0.0 },
          'inMax': { description: 'Input maximum value to map from', type: 'float', default: 1.0 },
          'outMin': { description: 'Output minimum value to map to', type: 'float', default: 0.0 },
          'outMax': { description: 'Output maximum value to map to', type: 'float', default: 1.0 }
        }
      }
    }
  },

  // ============= Grain/Noise =============
  'FilmGrain': {
    description: 'GLSL node: Adds realistic film grain effect to images.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable film grain', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Film grain parameters',
        properties: {
          'intensity': { description: 'Grain intensity/strength', type: 'float', default: 0.1, range: '0.0 to 1.0' },
          'size': { description: 'Grain particle size', type: 'float', default: 1.0 },
          'softness': { description: 'Grain softness/blur', type: 'float', default: 0.0 },
          'saturation': { description: 'Grain color saturation (0=monochrome)', type: 'float', default: 0.0 },
          'seed': { description: 'Random seed (animate for temporal grain)', type: 'int' }
        }
      }
    }
  },

  // ============= Chromatic Aberration =============
  'ChromaticAberration': {
    description: 'GLSL node: Simulates lens chromatic aberration (color fringing).',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable chromatic aberration', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Chromatic aberration parameters',
        properties: {
          'redOffset': { description: 'Red channel offset from center', type: 'float[2]', default: [0.002, 0] },
          'blueOffset': { description: 'Blue channel offset from center', type: 'float[2]', default: [-0.002, 0] },
          'center': { description: 'Aberration center point [x, y]', type: 'float[2]', default: [0.5, 0.5] }
        }
      }
    }
  },

  // ============= Vignette =============
  'Vignette': {
    description: 'GLSL node: Applies vignette (darkening at edges) effect.',
    components: {
      'node': {
        description: 'Node parameters',
        properties: {
          'active': { description: 'Enable vignette', type: 'int', default: 1 }
        }
      },
      'parameters': {
        description: 'Vignette parameters',
        properties: {
          'intensity': { description: 'Vignette darkness intensity', type: 'float', default: 0.3, range: '0.0 to 1.0' },
          'radius': { description: 'Vignette radius (0=center, 1=corners)', type: 'float', default: 0.8 },
          'softness': { description: 'Vignette edge softness', type: 'float', default: 0.5 },
          'center': { description: 'Vignette center point [x, y]', type: 'float[2]', default: [0.5, 0.5] },
          'aspectRatio': { description: 'Vignette aspect ratio (1=circular)', type: 'float', default: 1.0 }
        }
      }
    }
  },

  // ============= GTO File Structure =============
  'GTOHeader': {
    description: 'GTO file header information. Contains magic number, version, and structure metadata.',
    components: {
      'header': {
        description: 'File header data',
        properties: {
          'magic': { description: 'GTO magic number (0x47544F for "GTO" or 0xFF47544F for big-endian)', type: 'int' },
          'version': { description: 'GTO format version number', type: 'int' },
          'flags': { description: 'Format flags (text mode, compression)', type: 'int' },
          'numObjects': { description: 'Total number of objects in file', type: 'int' },
          'numStrings': { description: 'Number of strings in string table', type: 'int' }
        }
      }
    }
  },

  // ============= SMPTE Timecode =============
  'Timecode': {
    description: 'SMPTE timecode metadata from source files.',
    components: {
      'timecode': {
        description: 'Timecode values',
        properties: {
          'hours': { description: 'Timecode hours (0-23)', type: 'int', range: '0 to 23' },
          'minutes': { description: 'Timecode minutes (0-59)', type: 'int', range: '0 to 59' },
          'seconds': { description: 'Timecode seconds (0-59)', type: 'int', range: '0 to 59' },
          'frames': { description: 'Timecode frames (0 to fps-1)', type: 'int' },
          'dropFrame': { description: 'Drop-frame timecode flag (for 29.97fps)', type: 'int', default: 0 },
          'frameRate': { description: 'Timecode frame rate', type: 'float' },
          'string': { description: 'Formatted timecode string (HH:MM:SS:FF or HH:MM:SS;FF)', type: 'string' }
        }
      }
    }
  },

  // ============= User Data / Custom Attributes =============
  'userData': {
    description: 'Custom user-defined attributes stored in GTO files. Arbitrary key-value pairs for pipeline integration.',
    components: {
      'custom': {
        description: 'User-defined custom attributes',
        properties: {
          'name': { description: 'Custom attribute name', type: 'string' },
          'value': { description: 'Custom attribute value (any type)', type: 'any' },
          'type': { description: 'Attribute data type', type: 'string' }
        }
      },
      'pipeline': {
        description: 'Pipeline-specific metadata',
        properties: {
          'shotName': { description: 'Shot identifier from production pipeline', type: 'string' },
          'sequenceName': { description: 'Sequence identifier', type: 'string' },
          'version': { description: 'Version number from asset management', type: 'int' },
          'status': { description: 'Review status: pending, approved, rejected', type: 'string' },
          'artist': { description: 'Artist/author name', type: 'string' },
          'notes': { description: 'Review notes or comments', type: 'string' },
          'tags': { description: 'Searchable tags for filtering', type: 'string[]' }
        }
      }
    }
  }
};

/**
 * Get property documentation for a specific protocol, component, and property
 */
export function getPropertyDoc(
  protocol: string,
  componentName: string,
  propertyName: string
): PropertyDoc | null {
  const protocolDoc = PROPERTY_DOCS[protocol];
  if (!protocolDoc) return null;

  // Handle dynamic component names (e.g., pen:0:1:user -> pen)
  const baseComponent = componentName.split(':')[0];
  const componentDoc = protocolDoc.components[baseComponent] || protocolDoc.components[componentName];
  if (!componentDoc) return null;

  return componentDoc.properties[propertyName] || null;
}

/**
 * Get component documentation for a specific protocol and component
 */
export function getComponentDoc(protocol: string, componentName: string): ComponentDoc | null {
  const protocolDoc = PROPERTY_DOCS[protocol];
  if (!protocolDoc) return null;

  // Handle dynamic component names
  const baseComponent = componentName.split(':')[0];
  return protocolDoc.components[baseComponent] || protocolDoc.components[componentName] || null;
}

/**
 * Get protocol documentation
 */
export function getProtocolDoc(protocol: string): ProtocolDoc | null {
  return PROPERTY_DOCS[protocol] || null;
}

/**
 * Get a formatted hint string for display
 */
export function getPropertyHintFromDocs(
  protocol: string,
  componentName: string,
  propertyName: string
): string | null {
  const doc = getPropertyDoc(protocol, componentName, propertyName);
  if (!doc) return null;

  let hint = doc.description;
  if (doc.type) {
    hint += ` [${doc.type}]`;
  }
  if (doc.default !== undefined) {
    const defaultStr = Array.isArray(doc.default)
      ? `[${doc.default.join(', ')}]`
      : String(doc.default);
    hint += ` (default: ${defaultStr})`;
  }
  if (doc.range) {
    hint += ` (range: ${doc.range})`;
  }
  return hint;
}

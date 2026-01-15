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
    description: 'Session node: global session state, matte settings, paint effects',
    components: {
      'session': {
        description: 'Session playback state',
        properties: {
          'fps': { description: 'Session frame rate (fps)', type: 'float', default: 24 },
          'currentFrame': { description: 'Current frame number', type: 'int' },
          'range': { description: 'Session frame range [start, end) exclusive', type: 'int[2]' },
          'inc': { description: 'Frame increment for playback', type: 'int', default: 1 }
        }
      },
      'matte': {
        description: 'Global matte/letterbox settings',
        properties: {
          'aspect': { description: 'Matte aspect ratio (e.g., 2.35 for cinemascope)', type: 'float' },
          'centerPoint': { description: 'Matte center in normalized coordinates [x, y]', type: 'float[2]' },
          'heightVisible': { description: 'Fraction of source height visible (0-1)', type: 'float' },
          'opacity': { description: 'Matte opacity (0=transparent, 1=opaque black)', type: 'float', default: 1 },
          'show': { description: 'Toggle matte on/off globally', type: 'int', default: 0 }
        }
      },
      'paintEffects': {
        description: 'Global paint/annotation effects',
        properties: {
          'hold': { description: 'Enable annotation duration holding', type: 'int', default: 0 },
          'ghost': { description: 'Enable annotation ghosting (onion skin)', type: 'int', default: 0 },
          'ghostBefore': { description: 'Frames to display ghosted before current', type: 'int', default: 3 },
          'ghostAfter': { description: 'Frames to display ghosted after current', type: 'int', default: 3 }
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

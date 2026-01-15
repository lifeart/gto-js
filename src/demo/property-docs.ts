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
    description: 'Color correction node: applies exposure, contrast, saturation, gamma, and CDL adjustments',
    components: {
      'color': {
        description: 'Primary color correction controls',
        properties: {
          'normalize': { description: 'Normalize incoming pixels to [0,1] range', type: 'int', default: 0 },
          'invert': { description: 'Apply inversion matrix to image (negative)', type: 'int', default: 0 },
          'gamma': { description: 'Per-channel gamma adjustment (power curve)', type: 'float[3]', default: [1.0, 1.0, 1.0] },
          'offset': { description: 'Per-channel color bias (added to RGB)', type: 'float[3]', default: [0, 0, 0] },
          'scale': { description: 'Scale each RGB channel independently (multiplier)', type: 'float[3]' },
          'exposure': { description: 'Relative exposure adjustment in stops (f-stops)', type: 'float[3]', default: [0, 0, 0] },
          'contrast': { description: 'Per-channel contrast control around midpoint', type: 'float[3]' },
          'saturation': { description: 'Relative saturation adjustment (1.0 = unchanged)', type: 'float', default: 1.0 },
          'hue': { description: 'Hue rotation in radians around color wheel', type: 'float', default: 0 },
          'active': { description: 'Toggle color correction on/off', type: 'int', default: 1 }
        }
      },
      'CDL': {
        description: 'ASC Color Decision List (CDL) controls for interchange with color grading systems',
        properties: {
          'slope': { description: 'CDL slope (gain) - multiplies RGB values', type: 'float[3]', default: [1, 1, 1] },
          'offset': { description: 'CDL offset - adds to RGB values after slope', type: 'float[3]', default: [0, 0, 0] },
          'power': { description: 'CDL power (gamma) - raises RGB to this power', type: 'float[3]', default: [1, 1, 1] },
          'saturation': { description: 'CDL saturation control', type: 'float', default: 1.0 },
          'noClamp': { description: 'Remove CDL equation clamping for HDR workflows', type: 'int', default: 0 },
          'active': { description: 'Enable CDL processing', type: 'int', default: 0 }
        }
      },
      'luminanceLUT': {
        description: 'Luminance-based lookup table for tonal adjustments',
        properties: {
          'lut': { description: 'Luminance lookup table values', type: 'float[]' },
          'max': { description: 'Output scale for luminance LUT', type: 'float' },
          'active': { description: 'Enable luminance LUT processing', type: 'int', default: 0 }
        }
      },
      'lut': {
        description: '3D or channel LUT for color transformation',
        properties: {
          'lut': { description: '3D LUT or channel LUT data', type: 'float[]' },
          'prelut': { description: 'Channel pre-LUT (shaper) applied before 3D LUT', type: 'float[]' },
          'inMatrix': { description: 'Input color matrix applied before LUT', type: 'float[16]' },
          'outMatrix': { description: 'Output color matrix applied after LUT', type: 'float[16]' },
          'file': { description: 'Path to LUT file loaded when session opens', type: 'string' },
          'name': { description: 'Display name for this LUT', type: 'string' },
          'size': { description: 'LUT dimensions (1=channel LUT, 3=3D cube)', type: 'int' },
          'type': { description: 'LUT type identifier', type: 'string' },
          'active': { description: 'Enable LUT processing', type: 'int', default: 0 }
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
    description: 'Paint/annotation node: pen strokes, text overlays, per-frame drawings',
    components: {
      'paint': {
        description: 'Paint system state',
        properties: {
          'nextId': { description: 'Counter for unique annotation IDs', type: 'int' },
          'nextAnnotationId': { description: 'Reserved annotation ID counter', type: 'int' },
          'show': { description: 'Toggle paint visibility on/off', type: 'int', default: 1 },
          'exclude': { description: 'Excluded annotation tags', type: 'string' },
          'include': { description: 'Included annotation tags', type: 'string' }
        }
      },
      // Dynamic pen components: pen:[id]:[frame]:[user]
      'pen': {
        description: 'Pen stroke properties (dynamic component per stroke)',
        properties: {
          'color': { description: 'Stroke color RGBA (0-1 range)', type: 'float[4]' },
          'width': { description: 'Stroke width at each point', type: 'float[]' },
          'brush': { description: 'Brush style: "gauss" (soft) or "circle" (hard)', type: 'string', default: 'gauss' },
          'points': { description: 'Stroke points in normalized device coordinates', type: 'float[2][]' },
          'join': { description: 'Line join style: 0=miter, 1=round, 2=bevel', type: 'int', default: 1 },
          'cap': { description: 'Line cap style: 0=butt, 1=round, 2=square', type: 'int', default: 1 },
          'mode': { description: 'Draw mode: 0=over (draw), 1=erase', type: 'int', default: 0 },
          'startFrame': { description: 'First frame to display this stroke', type: 'int' },
          'duration': { description: 'Number of frames to display stroke', type: 'int' }
        }
      },
      // Dynamic text components: text:[id]:[frame]:[user]
      'text': {
        description: 'Text annotation properties (dynamic component per text)',
        properties: {
          'position': { description: 'Text position in normalized coordinates', type: 'float[2]' },
          'color': { description: 'Text color RGBA (0-1 range)', type: 'float[4]' },
          'size': { description: 'Text size (font scale)', type: 'float' },
          'text': { description: 'Text content string', type: 'string' },
          'startFrame': { description: 'First frame to display this text', type: 'int' },
          'duration': { description: 'Number of frames to display text', type: 'int' }
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
    description: 'Display stereo node: stereo mode selection and eye offset',
    components: {
      'stereo': {
        description: 'Stereo display settings',
        properties: {
          'type': { description: 'Stereo mode: off, anaglyph, side-by-side, over-under, checkerboard, etc.', type: 'string', default: 'off' },
          'swap': { description: 'Swap left and right eyes', type: 'int', default: 0 },
          'relativeOffset': { description: 'Relative offset between eyes for convergence', type: 'float', default: 0 },
          'rightOffset': { description: 'Right eye offset', type: 'float[2]' }
        }
      }
    }
  },

  // ============= RVSourceStereo =============
  'RVSourceStereo': {
    description: 'Source stereo node: per-source stereo configuration',
    components: {
      'stereo': {
        description: 'Source stereo settings',
        properties: {
          'swap': { description: 'Swap left and right eyes for this source', type: 'int', default: 0 },
          'relativeOffset': { description: 'Relative offset between eyes', type: 'float', default: 0 }
        }
      }
    }
  },

  // ============= RVCDL =============
  'RVCDL': {
    description: 'CDL node: ASC Color Decision List from CCC/CC/CDL files',
    components: {
      'node': {
        description: 'CDL node settings',
        properties: {
          'active': { description: 'Enable CDL processing', type: 'int', default: 1 },
          'colorspace': { description: 'Working colorspace: rec709, aces, etc.', type: 'string', default: 'rec709' },
          'file': { description: 'Path to CDL file', type: 'string' },
          'slope': { description: 'CDL slope (gain) per channel', type: 'float[3]', default: [1, 1, 1] },
          'offset': { description: 'CDL offset per channel', type: 'float[3]', default: [0, 0, 0] },
          'power': { description: 'CDL power (gamma) per channel', type: 'float[3]', default: [1, 1, 1] },
          'saturation': { description: 'CDL saturation', type: 'float', default: 1.0 },
          'noClamp': { description: 'Disable CDL value clamping for HDR', type: 'int', default: 0 }
        }
      }
    }
  },

  // ============= RVDispTransform2D =============
  'RVDispTransform2D': {
    description: 'Display transform 2D: pan/zoom in viewer',
    components: {
      'transform': {
        description: 'Display transformation',
        properties: {
          'translate': { description: 'Pan offset in normalized coordinates', type: 'float[2]', default: [0, 0] },
          'scale': { description: 'Zoom factor', type: 'float[2]', default: [1, 1] }
        }
      }
    }
  },

  // ============= OCIO Nodes =============
  'OCIO': {
    description: 'OpenColorIO node: color space transforms using OCIO config',
    components: {
      'ocio': {
        description: 'OCIO settings',
        properties: {
          'active': { description: 'Enable OCIO processing', type: 'int', default: 1 },
          'inSpace': { description: 'Input color space name', type: 'string' },
          'outSpace': { description: 'Output color space name', type: 'string' },
          'lut3DSize': { description: '3D LUT cube size', type: 'int', default: 32 }
        }
      }
    }
  },

  'OCIODisplay': {
    description: 'OCIO Display node: display-specific color transforms',
    components: {
      'ocio': {
        description: 'OCIO display settings',
        properties: {
          'active': { description: 'Enable OCIO display processing', type: 'int', default: 1 },
          'display': { description: 'Display device name', type: 'string' },
          'view': { description: 'View transform name', type: 'string' },
          'lut3DSize': { description: '3D LUT cube size', type: 'int', default: 32 }
        }
      }
    }
  },

  'OCIOLook': {
    description: 'OCIO Look node: creative look transforms',
    components: {
      'ocio': {
        description: 'OCIO look settings',
        properties: {
          'active': { description: 'Enable OCIO look', type: 'int', default: 1 },
          'look': { description: 'Look name from OCIO config', type: 'string' },
          'inSpace': { description: 'Input color space', type: 'string' },
          'outSpace': { description: 'Output color space', type: 'string' }
        }
      }
    }
  },

  // ============= RVCache =============
  'RVCache': {
    description: 'Cache node: image caching with optional downsampling',
    components: {
      'render': {
        description: 'Cache render settings',
        properties: {
          'downSampling': { description: 'Downsample factor for cache (1=full res, 2=half, etc)', type: 'int', default: 1 }
        }
      }
    }
  },

  // ============= RVChannelMap =============
  'RVChannelMap': {
    description: 'Channel map node: reorder or select color channels',
    components: {
      'format': {
        description: 'Channel format settings',
        properties: {
          'channels': { description: 'Channel names to select/reorder', type: 'string[]' }
        }
      }
    }
  },

  // ============= RVOverlay =============
  'RVOverlay': {
    description: 'Overlay node: rectangles and text overlays on source',
    components: {
      'overlay': {
        description: 'Overlay settings',
        properties: {
          'nextRectId': { description: 'Counter for unique rectangle IDs', type: 'int' },
          'nextTextId': { description: 'Counter for unique text IDs', type: 'int' },
          'show': { description: 'Toggle overlay visibility', type: 'int', default: 1 }
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
    description: 'Image source: multi-layer EXR sequences with views',
    components: {
      'media': {
        description: 'Media settings',
        properties: {
          'movie': { description: 'Image file path or sequence pattern', type: 'string' }
        }
      },
      'image': {
        description: 'Image settings',
        properties: {
          'layers': { description: 'Available layer names', type: 'string[]' },
          'views': { description: 'Available view names (stereo)', type: 'string[]' },
          'fps': { description: 'Frame rate', type: 'float' }
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

# gto-js

TypeScript implementation of the GTO (Graph Topology Object) file format for reading and writing `.rv` text files and binary `.gto` files.

GTO is a flexible file format used primarily in visual effects and animation pipelines, notably by OpenRV for session files.

## Web Visualizer

A browser-based visualizer for VFX artists is included. Start the Vite dev server:

```bash
pnpm install
pnpm dev
```

Then open http://localhost:5173

**Features:**
- **Protocol browser** - Objects grouped by protocol type with meaningful summaries:
  - Session: FPS, frame range, matte settings
  - Sources: file paths, resolution, frame ranges
  - Groups: sequence/stack/layout modes and settings
  - Color: exposure, contrast, saturation, LUT status, CDL
  - Transform: translate, scale, rotate, flip/flop, lens warp
  - Paint: stroke counts, text annotations per frame
  - Pipelines: node chains for color/display/linearize
  - Output: resolution, data type, audio settings
- **Hierarchical object browser** with deep search (objects, components, properties)
- **Property inspector** with type badges, value previews, and type filters
- **Inline property editing** - Edit any property value directly in the UI:
  - Vector editor for float[2]/[3]/[4] (XY, XYZ, XYZW fields)
  - Toggle switch for boolean values
  - JSON editor for arrays
  - Changes reflected immediately in JSON export
- **Property tools** - Copy value/path buttons, interpretation hints, data size display
- **Modified indicator** - Visual indicator when file has unsaved changes
- **Status bar** - File info, object count, protocol count, GTO version
- **Media source viewer** (paths, frame ranges, resolution)
- **Interactive timeline** - Draggable scrubber, click to jump, keyboard navigation
- **Annotation previews** (paint strokes, text with frame viewer, SVG export)
- **Protocol visualizers**:
  - CIE chromaticity diagram for color spaces
  - Lens warp grid visualization (barrel/pincushion distortion)
- **Node connection graph** - Zoom/pan, connection badges, SVG export, native tooltips
- **Object comparison** - Compare two objects side by side with diff highlighting
- **Deep linking** - URL hash navigation (`#object=name&tab=details`)
- **Dark/light theme** - Toggle with `T` key, persisted in localStorage
- **Recently viewed** - Quick access to recently inspected objects
- **Copy to clipboard** - Copy property values and paths with visual feedback
- **Search highlighting** - Matched terms highlighted in results
- **Breadcrumb navigation** - Shows current location hierarchy
- **Export options** - JSON, text (.rv), binary (.gto), and SVG for visualizations

**Keyboard Shortcuts:**
| Key | Action |
|-----|--------|
| `1-8` | Switch tabs (Protocols, Details, Sources, Timeline, etc.) |
| `?` | Show keyboard shortcuts help |
| `T` | Toggle dark/light theme |
| `E` | Expand all sidebar items |
| `C` | Collapse all sidebar items |
| `/` | Focus search box |
| `↑/↓` | Navigate sidebar |
| `←/→` | Previous/next frame (Timeline/Annotations panel) |
| `Home/End` | Jump to first/last frame (Timeline/Annotations panel) |
| `Enter` | Select focused item |
| `Esc` | Clear search/close modals |
| `Ctrl/Cmd+Enter` | Save changes (in property editor) |

![GTO Session Viewer](https://img.shields.io/badge/GTO-Session%20Viewer-blue)

## Installation

```bash
npm install gto-js
# or
pnpm add gto-js
```

## Development Setup

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Build library
pnpm build:lib

# Build demo web app
pnpm build:app

# Build both
pnpm build
```

## Features

- **Reader** - Parse text (`.rv`) and binary GTO files with callback-based or simple API
- **Writer** - Generate text or binary GTO files programmatically
- **Binary format support** - Compact binary encoding for efficient storage (GTO v4)
- **Gzip compression** - Automatic decompression of gzip-compressed `.gto` files
- **Builder** - Fluent API for constructing GTO data structures
- **DTO** - Query and filter parsed data with null-safe chaining
- **Round-trip support** - Read and write files without data loss
- **Full type support** - int, float, double, string, byte, short, half, int64, and more
- **TypeScript** - Full type definitions included

## Quick Start

### Reading a .rv file

```typescript
import { SimpleReader } from 'gto-js';
import { readFileSync } from 'fs';

const content = readFileSync('session.rv', 'utf-8');
const reader = new SimpleReader();
reader.open(content);

console.log(reader.result.objects);
```

### Writing a .rv file

```typescript
import { GTOBuilder, SimpleWriter } from 'gto-js';
import { writeFileSync } from 'fs';

const data = new GTOBuilder()
  .object('myObject', 'myProtocol', 1)
    .component('settings')
      .int('count', 42)
      .float('scale', 1.5)
      .string('name', 'example')
    .end()
  .end()
  .build();

const rv = SimpleWriter.write(data);
writeFileSync('output.rv', rv);
```

### Binary Format

```typescript
import { SimpleReader, SimpleWriter, GTOBuilder } from 'gto-js';
import { readFileSync, writeFileSync } from 'fs';

// Write binary GTO file
const data = new GTOBuilder()
  .object('mesh', 'polygon', 1)
    .component('points')
      .float3('position', [[0,0,0], [1,0,0], [0,1,0]])
    .end()
  .end()
  .build();

const binary = SimpleWriter.write(data, { binary: true });
writeFileSync('mesh.gto', Buffer.from(binary));

// Read binary GTO file (auto-detected)
const content = readFileSync('mesh.gto');
const reader = new SimpleReader();
reader.open(content.buffer);  // Pass ArrayBuffer
console.log(reader.result.objects);

// Convert text to binary
const textContent = readFileSync('session.rv', 'utf-8');
const textReader = new SimpleReader();
textReader.open(textContent);
const binaryOutput = SimpleWriter.write(textReader.result, { binary: true });
```

### Gzip Compressed Files

```typescript
import { SimpleReader } from 'gto-js';
import { readFileSync } from 'fs';

// For gzip-compressed .gto files, use openAsync()
const compressed = readFileSync('scene.gto.gz');
const reader = new SimpleReader();
await reader.openAsync(compressed.buffer);  // Async decompression
console.log(reader.result.objects);

// Non-gzipped files can still use sync open()
reader.open(uncompressedData);
```

Binary format advantages:
- **Compact**: ~50% smaller than text for numeric-heavy data
- **Efficient**: Direct memory layout, no parsing overhead
- **Auto-detected**: Reader automatically detects text vs binary format
- **Gzip support**: Automatic decompression of compressed files via `openAsync()`

## API Reference

### SimpleReader

The easiest way to read GTO files. Parses the entire file into a structured object.

```typescript
import { SimpleReader } from 'gto-js';

const reader = new SimpleReader();

// Synchronous - for text and uncompressed binary
reader.open(fileContent);

// Asynchronous - for gzip-compressed binary files
await reader.openAsync(compressedBuffer);

// Access parsed data
console.log(reader.result.version);  // GTO version (usually 4)
console.log(reader.result.objects);  // Array of objects
```

**Result structure:**
```typescript
{
  version: 4,
  objects: [{
    name: 'objectName',
    protocol: 'protocolName',
    protocolVersion: 1,
    components: {
      componentName: {
        interpretation: '',
        properties: {
          propertyName: {
            type: 'float',
            size: 3,
            width: 3,
            interpretation: '',
            data: [[0, 0, 0], [1, 1, 1], [2, 2, 2]]
          }
        }
      }
    }
  }]
}
```

### Reader (Advanced)

For custom parsing with callbacks, extend the `Reader` class:

```typescript
import { Reader, Request } from 'gto-js';

class MyReader extends Reader {
  object(name, protocol, protocolVersion, info) {
    console.log(`Found object: ${name}`);
    return Request.Read;  // or Request.Skip
  }

  component(name, info) {
    return Request.Read;
  }

  property(name, interpretation, info) {
    return Request.Read;
  }

  dataRead(info, data) {
    console.log(`Property ${info.name}:`, data);
  }
}

const reader = new MyReader();
reader.open(fileContent);
```

### SimpleWriter

Convert structured data to `.rv` text or binary format:

```typescript
// Text output (default)
const text = SimpleWriter.write(data);

// Binary output
const binary = SimpleWriter.write(data, { binary: true });
// Returns ArrayBuffer
```

**Text format example:**

```typescript
import { SimpleWriter } from 'gto-js';

const data = {
  version: 4,
  objects: [{
    name: 'cube',
    protocol: 'polygon',
    protocolVersion: 2,
    components: {
      points: {
        interpretation: '',
        properties: {
          position: {
            type: 'float',
            size: 4,
            width: 3,
            interpretation: '',
            data: [[0,0,0], [1,0,0], [1,1,0], [0,1,0]]
          }
        }
      }
    }
  }]
};

const rv = SimpleWriter.write(data);
```

### Writer (Advanced)

For more control over output:

```typescript
import { Writer, DataType, FileType } from 'gto-js';

const writer = new Writer();
writer.open(FileType.TextGTO);

writer.beginObject('cube', 'polygon', 2);
  writer.beginComponent('points');
    writer.propertyWithData('position', DataType.Float, 4, 3, '', [
      0, 0, 0,
      1, 0, 0,
      1, 1, 0,
      0, 1, 0
    ]);
  writer.endComponent();
writer.endObject();

const output = writer.close();
```

### GTOBuilder

Fluent API for building GTO structures:

```typescript
import { GTOBuilder } from 'gto-js';

const data = new GTOBuilder()
  .object('mesh', 'polygon', 2)
    .component('points')
      .float3('position', [[0,0,0], [1,0,0], [1,1,0]])
      .float3('normal', [[0,0,1], [0,0,1], [0,0,1]])
      .float2('uv', [[0,0], [1,0], [1,1]])
    .end()
    .component('indices')
      .int('vertex', [0, 1, 2])
    .end()
  .end()
  .build();
```

**Available property methods:**

| Method | Type | Width | Description |
|--------|------|-------|-------------|
| `int(name, data)` | int | 1 | Integer values |
| `int2(name, data)` | int | 2 | Integer pairs |
| `int3(name, data)` | int | 3 | Integer triples |
| `int4(name, data)` | int | 4 | Integer quads |
| `float(name, data)` | float | 1 | Float values |
| `float2(name, data)` | float | 2 | 2D vectors (UV) |
| `float3(name, data)` | float | 3 | 3D vectors (position, normal) |
| `float4(name, data)` | float | 4 | 4D vectors (color, quaternion) |
| `matrix4(name, data)` | float | 16 | 4x4 matrices |
| `matrix3(name, data)` | float | 9 | 3x3 matrices |
| `double(name, data)` | double | 1 | Double precision floats |
| `string(name, data)` | string | 1 | String values |
| `byte(name, data)` | byte | 1 | Byte values |
| `short(name, data)` | short | 1 | Short integers |

### Convenience Builders

**Polygon mesh:**
```typescript
import { polygon } from 'gto-js';

const mesh = polygon('cube', 2)
  .positions([[0,0,0], [1,0,0], [1,1,0], [0,1,0]])
  .normals([[0,0,1], [0,0,1], [0,0,1], [0,0,1]])
  .uvs([[0,0], [1,0], [1,1], [0,1]])
  .indices([0, 1, 2, 2, 3, 0])
  .types([4, 4])      // quads
  .sizes([4, 4])      // 4 vertices each
  .build();
```

**Transform:**
```typescript
import { transform } from 'gto-js';

const identity = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

const xform = transform('myTransform', 1)
  .matrix([identity])
  .parent('rootNode')
  .build();
```

### GTODTO

Query and filter parsed GTO data with null-safe chaining:

```typescript
import { SimpleReader, GTODTO } from 'gto-js';

const reader = new SimpleReader();
reader.open(fileContent);
const dto = new GTODTO(reader.result);

// Get property value with safe chaining
const fps = dto.object('rv').component('session').property('fps').value();

// Shorthand syntax
const currentFrame = dto.object('rv').prop('session', 'currentFrame');

// Filter by protocol
const sources = dto.byProtocol('RVFileSource');
const moviePaths = sources.map(s => s.component('media').prop('movie'));

// Filter by name pattern
const sourceObjects = dto.byName(/^source/);

// Safe chaining (returns null, never throws)
const missing = dto.object('nonexistent').component('nope').prop('value');
// missing === null
```

**GTODTO methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `object(name)` | ObjectDTO | Get object by exact name |
| `objects()` | ObjectCollection | Get all objects |
| `byProtocol(protocol)` | ObjectCollection | Filter by protocol |
| `byName(pattern)` | ObjectCollection | Filter by name (string or regex) |
| `protocols()` | string[] | List unique protocols |
| `groupByProtocol()` | Map | Group objects by protocol |
| `find(predicate)` | ObjectDTO | Find first matching object |
| `filter(predicate)` | ObjectCollection | Filter objects |

**ObjectDTO methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `component(name)` | ComponentDTO | Get component by name |
| `prop(comp, prop)` | any | Shorthand for component().property().value() |
| `components()` | ComponentDTO[] | Get all components |
| `componentsByPattern(regex)` | ComponentDTO[] | Filter components by name |
| `hasComponent(name)` | boolean | Check if component exists |
| `isProtocol(protocol)` | boolean | Check protocol match |

**ComponentDTO methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `property(name)` | PropertyDTO | Get property by name |
| `prop(name)` | any | Shorthand for property().value() |
| `properties()` | PropertyDTO[] | Get all properties |
| `propertiesByType(type)` | PropertyDTO[] | Filter by type |
| `hasProperty(name)` | boolean | Check if property exists |

**PropertyDTO methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `value()` | any | Get value (unwraps single values) |
| `valueOr(default)` | any | Get value or default |
| `at(index)` | any | Get value at index |
| `first()` | any | Get first value |
| `last()` | any | Get last value |
| `flat()` | any[] | Flatten nested arrays |
| `map(fn)` | any[] | Map over values |
| `filter(fn)` | any[] | Filter values |
| `exists()` | boolean | Check if property has data |

**ObjectCollection methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `at(index)` | ObjectDTO | Get object at index |
| `first()` | ObjectDTO | Get first object |
| `last()` | ObjectDTO | Get last object |
| `byProtocol(protocol)` | ObjectCollection | Filter by protocol |
| `byName(pattern)` | ObjectCollection | Filter by name |
| `filter(predicate)` | ObjectCollection | Filter objects |
| `find(predicate)` | ObjectDTO | Find first match |
| `map(fn)` | any[] | Map over objects |
| `forEach(fn)` | void | Iterate objects |
| `toArray()` | ObjectDTO[] | Convert to array |

**RV Session helpers:**

```typescript
// Quick access to common RV session data
const dto = new GTODTO(reader.result);

// Session info
const session = dto.session();           // RVSession object
const timeline = dto.timeline();         // { fps, currentFrame, range, region, marks }

// Sources
const groups = dto.sourceGroups();       // RVSourceGroup objects
const sources = dto.fileSources();       // RVFileSource objects
const paths = dto.mediaPaths();          // Extract all media file paths

// Graph
const conn = dto.connections();          // connection object
const edges = dto.connectionEdges();     // [[from, to], ...] pairs

// Annotations
const paints = dto.paints();             // RVPaint objects
const annotations = dto.annotations();   // Extracted annotation data
```

## Data Types

| Type | Description | Size (bytes) |
|------|-------------|--------------|
| `int` | 32-bit signed integer | 4 |
| `int64` | 64-bit signed integer | 8 |
| `float` | 32-bit IEEE float | 4 |
| `double` | 64-bit IEEE float | 8 |
| `half` | 16-bit IEEE float | 2 |
| `short` | 16-bit unsigned integer | 2 |
| `byte` | 8-bit unsigned integer | 1 |
| `string` | String (index reference) | 4 |
| `bool` | Boolean | 1 |

## File Format

GTO text files (`.rv`) have this structure:

```
GTOa (4)

objectName : protocolName (version)
{
    componentName
    {
        type[width] propertyName = [ values ]
        type propertyName = singleValue
    }
}
```

**Example:**
```
GTOa (4)

cube : polygon (2)
{
    points
    {
        float[3] position = [ [ 0 0 0 ] [ 1 0 0 ] [ 1 1 0 ] [ 0 1 0 ] ]
        float[3] normal = [ [ 0 0 1 ] [ 0 0 1 ] [ 0 0 1 ] [ 0 0 1 ] ]
    }

    indices
    {
        int vertex = [ 0 1 2 2 3 0 ]
    }
}
```

## CLI Scripts

Convert between `.rv` and `.json` formats:

```bash
# RV to JSON
node scripts/rv-to-json.js input.rv output.json

# JSON to RV
node scripts/json-to-rv.js input.json output.rv
```

## Project Structure

```
gto-js/
├── index.html            # Web visualizer for VFX artists
├── README.md
├── package.json
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
├── src/
│   ├── index.ts          # Main entry point
│   ├── constants.ts      # Types, enums, info classes
│   ├── reader.ts         # Reader & SimpleReader
│   ├── writer.ts         # Writer & SimpleWriter
│   ├── builder.ts        # GTOBuilder, polygon(), transform()
│   ├── dto.ts            # GTODTO, ObjectDTO, ComponentDTO, PropertyDTO
│   ├── string-table.ts   # String table management
│   └── utils.ts          # Utilities
├── tests/
│   └── gto.test.ts       # Test suite (Vitest)
├── scripts/
│   ├── rv-to-json.js     # CLI: .rv → .json
│   └── json-to-rv.js     # CLI: .json → .rv
├── sample/
│   └── test_session.rv   # Sample RV file
├── dist/                 # Library build output (generated)
│   ├── gto.js            # ES module bundle
│   ├── gto.umd.cjs       # UMD bundle
│   └── index.d.ts        # TypeScript declarations
└── dist-app/             # Web app build output (generated)
```

## Constants

```typescript
import { DataType, FileType, Request, ReaderMode } from 'gto-js';

// Data types
DataType.Int      // 0
DataType.Float    // 1
DataType.Double   // 2
DataType.Half     // 3
DataType.String   // 4
DataType.Boolean  // 5
DataType.Short    // 6
DataType.Byte     // 7
DataType.Int64    // 8

// File types
FileType.BinaryGTO     // 0 - Standard binary
FileType.CompressedGTO // 1 - Gzip compressed binary
FileType.TextGTO       // 2 - Text format (.rv)

// Reader callbacks
Request.Skip      // 0 - Skip this item
Request.Read      // 1 - Read this item

// Reader modes
ReaderMode.None        // 0
ReaderMode.HeaderOnly  // 1
ReaderMode.RandomAccess // 2
ReaderMode.BinaryOnly   // 4
ReaderMode.TextOnly     // 8
```

## Common Protocols

GTO defines standard protocols for common data types:

| Protocol | Description |
|----------|-------------|
| `polygon` | Polygonal mesh with points, elements, indices |
| `transform` | Transformation with matrix and parent |
| `particle` | Point cloud with position, velocity, ID |
| `NURBS` | NURBS surfaces |
| `subdivision` | Subdivision surfaces |
| `image` | 2D/3D image data |
| `material` | Shader and parameters |

## License

MIT

## References

- [GTO File Format Documentation](https://aswf-openrv.readthedocs.io/en/latest/rv-manuals/rv-gto.html)
- [OpenRV](https://github.com/AcademySoftwareFoundation/OpenRV)

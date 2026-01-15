# gto-js

JavaScript implementation of the GTO (Graph Topology Object) file format for reading and writing `.rv` text files.

GTO is a flexible file format used primarily in visual effects and animation pipelines, notably by OpenRV for session files.

## Web Visualizer

A browser-based visualizer for VFX artists is included. Start a local server and open `index.html`:

```bash
# Using Python
python3 -m http.server 8080

# Using Node
npx serve .
```

Then open http://localhost:8080

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
- **Media source viewer** (paths, frame ranges, resolution)
- **Interactive timeline** - Click to change frame, drag to adjust range
- **Annotation previews** (paint strokes, text)
- **Node connection graph** with zoom/pan controls
- **Object comparison** - Compare two objects side by side with diff highlighting
- **Deep linking** - URL hash navigation (`#object=name&tab=details`)
- **Dark/light theme** - Toggle with `T` key, persisted in localStorage
- **Recently viewed** - Quick access to recently inspected objects
- **Copy to clipboard** - Copy property values and paths
- **Search highlighting** - Matched terms highlighted in results
- **Breadcrumb navigation** - Shows current location hierarchy
- **JSON export** with syntax highlighting

**Keyboard Shortcuts:**
| Key | Action |
|-----|--------|
| `1-8` | Switch tabs (Protocols, Objects, Details, etc.) |
| `?` | Show keyboard shortcuts help |
| `T` | Toggle dark/light theme |
| `E` | Expand all sidebar items |
| `C` | Collapse all sidebar items |
| `Ctrl/Cmd+F` | Focus search box |
| `↑/↓` | Navigate sidebar |
| `Enter` | Select focused item |
| `Esc` | Clear search/close modals |

![GTO Session Viewer](https://img.shields.io/badge/GTO-Session%20Viewer-blue)

## Installation

```bash
npm install gto
```

## Features

- **Reader** - Parse `.rv` text files with callback-based or simple API
- **Writer** - Generate `.rv` text files programmatically
- **Builder** - Fluent API for constructing GTO data structures
- **DTO** - Query and filter parsed data with null-safe chaining
- **Round-trip support** - Read and write files without data loss
- **Full type support** - int, float, double, string, byte, short, and more

## Quick Start

### Reading a .rv file

```javascript
import { SimpleReader } from 'gto';
import { readFileSync } from 'fs';

const content = readFileSync('session.rv', 'utf-8');
const reader = new SimpleReader();
reader.open(content);

console.log(reader.result.objects);
```

### Writing a .rv file

```javascript
import { GTOBuilder, SimpleWriter } from 'gto';
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

## API Reference

### SimpleReader

The easiest way to read GTO files. Parses the entire file into a structured object.

```javascript
import { SimpleReader } from 'gto';

const reader = new SimpleReader();
reader.open(fileContent);

// Access parsed data
console.log(reader.result.version);  // GTO version (usually 4)
console.log(reader.result.objects);  // Array of objects
```

**Result structure:**
```javascript
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

```javascript
import { Reader, Request } from 'gto';

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

Convert structured data to `.rv` format:

```javascript
import { SimpleWriter } from 'gto';

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

```javascript
import { Writer, DataType, FileType } from 'gto';

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

```javascript
import { GTOBuilder } from 'gto';

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
```javascript
import { polygon } from 'gto';

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
```javascript
import { transform } from 'gto';

const identity = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];

const xform = transform('myTransform', 1)
  .matrix([identity])
  .parent('rootNode')
  .build();
```

### GTODTO

Query and filter parsed GTO data with null-safe chaining:

```javascript
import { SimpleReader, GTODTO } from 'gto';

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

```javascript
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
├── src/
│   ├── index.js          # Main entry point
│   ├── constants.js      # Types, enums, info classes
│   ├── reader.js         # Reader & SimpleReader
│   ├── writer.js         # Writer & SimpleWriter
│   ├── builder.js        # GTOBuilder, polygon(), transform()
│   ├── dto.js            # GTODTO, ObjectDTO, ComponentDTO, PropertyDTO
│   ├── string-table.js   # String table management
│   └── utils.js          # Utilities
├── scripts/
│   ├── rv-to-json.js     # CLI: .rv → .json
│   └── json-to-rv.js     # CLI: .json → .rv
├── tests/
│   └── gto.test.js       # Test suite
└── sample/
    └── test_session.rv   # Sample RV file
```

## Constants

```javascript
import { DataType, FileType, Request, ReaderMode } from 'gto';

// Data types
DataType.Int      // 0
DataType.Float    // 1
DataType.Double   // 2
DataType.String   // 4
// ...

// File types
FileType.TextGTO  // 2

// Reader callbacks
Request.Skip      // 0 - Skip this item
Request.Read      // 1 - Read this item

// Reader modes
ReaderMode.None        // 0
ReaderMode.HeaderOnly  // 1
ReaderMode.RandomAccess // 2
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

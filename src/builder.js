/**
 * GTO DTO Builder
 *
 * Fluent API for building GTO data structures programmatically.
 *
 * @example
 * const gto = new GTOBuilder()
 *   .object('cube', 'polygon', 2)
 *     .component('points')
 *       .float3('position', [[0,0,0], [1,0,0], [1,1,0], [0,1,0]])
 *       .float3('normals', [[0,0,1], [0,0,1], [0,0,1], [0,0,1]])
 *     .end()
 *     .component('indices')
 *       .int('vertex', [0, 1, 2, 3])
 *     .end()
 *   .end()
 *   .build();
 */

import { DataType } from './constants.js';

/**
 * Property builder helper
 */
class PropertyBuilder {
  constructor(name, type, width = 1) {
    this.name = name;
    this.type = type;
    this.width = width;
    this.size = 0;
    this.data = [];
    this.interpretation = '';
  }

  /**
   * Set interpretation string
   */
  as(interpretation) {
    this.interpretation = interpretation;
    return this;
  }

  /**
   * Build the property object
   */
  build() {
    return {
      type: this._typeName(),
      size: this.size,
      width: this.width,
      interpretation: this.interpretation,
      data: this.data
    };
  }

  _typeName() {
    const names = {
      [DataType.Int]: 'int',
      [DataType.Float]: 'float',
      [DataType.Double]: 'double',
      [DataType.Half]: 'half',
      [DataType.String]: 'string',
      [DataType.Boolean]: 'bool',
      [DataType.Short]: 'short',
      [DataType.Byte]: 'byte',
      [DataType.Int64]: 'int64'
    };
    return names[this.type] || 'float';
  }
}

/**
 * Component builder
 */
class ComponentBuilder {
  constructor(name, parent) {
    this._name = name;
    this._parent = parent;
    this._properties = {};
    this._interpretation = '';
  }

  /**
   * Set component interpretation
   */
  as(interpretation) {
    this._interpretation = interpretation;
    return this;
  }

  // ============================================
  // Integer properties
  // ============================================

  /**
   * Add an int property (width=1)
   */
  int(name, data) {
    return this._addProperty(name, DataType.Int, 1, data);
  }

  /**
   * Add an int[2] property
   */
  int2(name, data) {
    return this._addProperty(name, DataType.Int, 2, data);
  }

  /**
   * Add an int[3] property
   */
  int3(name, data) {
    return this._addProperty(name, DataType.Int, 3, data);
  }

  /**
   * Add an int[4] property
   */
  int4(name, data) {
    return this._addProperty(name, DataType.Int, 4, data);
  }

  // ============================================
  // Float properties
  // ============================================

  /**
   * Add a float property (width=1)
   */
  float(name, data) {
    return this._addProperty(name, DataType.Float, 1, data);
  }

  /**
   * Add a float[2] property
   */
  float2(name, data) {
    return this._addProperty(name, DataType.Float, 2, data);
  }

  /**
   * Add a float[3] property
   */
  float3(name, data) {
    return this._addProperty(name, DataType.Float, 3, data);
  }

  /**
   * Add a float[4] property
   */
  float4(name, data) {
    return this._addProperty(name, DataType.Float, 4, data);
  }

  /**
   * Add a float[16] property (4x4 matrix)
   */
  matrix4(name, data) {
    return this._addProperty(name, DataType.Float, 16, data);
  }

  /**
   * Add a float[9] property (3x3 matrix)
   */
  matrix3(name, data) {
    return this._addProperty(name, DataType.Float, 9, data);
  }

  // ============================================
  // Double properties
  // ============================================

  /**
   * Add a double property (width=1)
   */
  double(name, data) {
    return this._addProperty(name, DataType.Double, 1, data);
  }

  /**
   * Add a double[2] property
   */
  double2(name, data) {
    return this._addProperty(name, DataType.Double, 2, data);
  }

  /**
   * Add a double[3] property
   */
  double3(name, data) {
    return this._addProperty(name, DataType.Double, 3, data);
  }

  // ============================================
  // String properties
  // ============================================

  /**
   * Add a string property (width=1)
   */
  string(name, data) {
    // Wrap single string in array
    if (typeof data === 'string') {
      data = [data];
    }
    return this._addProperty(name, DataType.String, 1, data);
  }

  /**
   * Add a string[N] property
   */
  stringN(name, width, data) {
    return this._addProperty(name, DataType.String, width, data);
  }

  // ============================================
  // Other types
  // ============================================

  /**
   * Add a byte property
   */
  byte(name, data) {
    return this._addProperty(name, DataType.Byte, 1, data);
  }

  /**
   * Add a short property
   */
  short(name, data) {
    return this._addProperty(name, DataType.Short, 1, data);
  }

  /**
   * Add a boolean property
   */
  bool(name, data) {
    return this._addProperty(name, DataType.Boolean, 1, data);
  }

  // ============================================
  // Generic property
  // ============================================

  /**
   * Add a generic property with custom type and width
   */
  property(name, type, width, data, interpretation = '') {
    const prop = this._addProperty(name, type, width, data);
    if (interpretation) {
      this._properties[name].interpretation = interpretation;
    }
    return prop;
  }

  // ============================================
  // Builder methods
  // ============================================

  /**
   * End component and return to parent object builder
   */
  end() {
    return this._parent;
  }

  /**
   * Build the component object
   */
  build() {
    const properties = {};
    for (const [name, prop] of Object.entries(this._properties)) {
      properties[name] = prop;
    }
    return {
      interpretation: this._interpretation,
      properties
    };
  }

  // ============================================
  // Internal
  // ============================================

  _addProperty(name, type, width, data) {
    // Normalize data
    let normalizedData = data;
    let size;

    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      // Already grouped: [[1,2,3], [4,5,6]]
      size = data.length;
      normalizedData = data;
    } else if (Array.isArray(data)) {
      // Flat array
      if (width > 1) {
        // Group into chunks
        size = Math.floor(data.length / width);
        normalizedData = [];
        for (let i = 0; i < data.length; i += width) {
          normalizedData.push(data.slice(i, i + width));
        }
      } else {
        size = data.length;
        normalizedData = data;
      }
    } else {
      // Single value
      size = 1;
      normalizedData = [data];
    }

    this._properties[name] = {
      type: this._typeName(type),
      size,
      width,
      interpretation: '',
      data: normalizedData
    };

    return this;
  }

  _typeName(type) {
    const names = {
      [DataType.Int]: 'int',
      [DataType.Float]: 'float',
      [DataType.Double]: 'double',
      [DataType.Half]: 'half',
      [DataType.String]: 'string',
      [DataType.Boolean]: 'bool',
      [DataType.Short]: 'short',
      [DataType.Byte]: 'byte',
      [DataType.Int64]: 'int64'
    };
    return names[type] || 'float';
  }
}

/**
 * Object builder
 */
class ObjectBuilder {
  constructor(name, protocol, version, parent) {
    this._name = name;
    this._protocol = protocol;
    this._version = version;
    this._parent = parent;
    this._components = {};
  }

  /**
   * Start a new component
   */
  component(name, interpretation = '') {
    const comp = new ComponentBuilder(name, this);
    if (interpretation) {
      comp.as(interpretation);
    }
    this._components[name] = comp;
    return comp;
  }

  /**
   * End object and return to parent GTO builder
   */
  end() {
    return this._parent;
  }

  /**
   * Build the object
   */
  build() {
    const components = {};
    for (const [name, comp] of Object.entries(this._components)) {
      components[name] = comp.build();
    }
    return {
      name: this._name,
      protocol: this._protocol,
      protocolVersion: this._version,
      components
    };
  }
}

/**
 * Main GTO Builder
 *
 * @example
 * const data = new GTOBuilder()
 *   .object('myObject', 'myProtocol', 1)
 *     .component('settings')
 *       .int('count', 42)
 *       .float('scale', 1.5)
 *       .string('name', 'test')
 *     .end()
 *   .end()
 *   .build();
 */
export class GTOBuilder {
  constructor() {
    this._objects = [];
    this._version = 4;
  }

  /**
   * Set GTO version
   */
  version(v) {
    this._version = v;
    return this;
  }

  /**
   * Start a new object
   * @param {string} name - Object name
   * @param {string} protocol - Protocol name
   * @param {number} version - Protocol version
   */
  object(name, protocol, version = 1) {
    const obj = new ObjectBuilder(name, protocol, version, this);
    this._objects.push(obj);
    return obj;
  }

  /**
   * Build the final GTO data structure
   */
  build() {
    return {
      version: this._version,
      objects: this._objects.map(obj => obj.build())
    };
  }

  /**
   * Build and convert to JSON string
   */
  toJSON(indent = 2) {
    return JSON.stringify(this.build(), null, indent);
  }
}

// ============================================
// Static factory methods for common protocols
// ============================================

/**
 * Create a polygon mesh builder
 */
export function polygon(name, version = 2) {
  return new PolygonBuilder(name, version);
}

/**
 * Create a transform builder
 */
export function transform(name, version = 1) {
  return new TransformBuilder(name, version);
}

/**
 * Polygon mesh builder with convenience methods
 */
class PolygonBuilder {
  constructor(name, version) {
    this._builder = new GTOBuilder();
    this._obj = this._builder.object(name, 'polygon', version);
    this._pointsComp = null;
    this._elementsComp = null;
    this._indicesComp = null;
  }

  /**
   * Set vertex positions
   * @param {number[][]} positions - Array of [x,y,z] positions
   */
  positions(positions) {
    if (!this._pointsComp) {
      this._pointsComp = this._obj.component('points');
    }
    this._pointsComp.float3('position', positions);
    return this;
  }

  /**
   * Set vertex normals
   * @param {number[][]} normals - Array of [x,y,z] normals
   */
  normals(normals) {
    if (!this._pointsComp) {
      this._pointsComp = this._obj.component('points');
    }
    this._pointsComp.float3('normal', normals);
    return this;
  }

  /**
   * Set UV coordinates
   * @param {number[][]} uvs - Array of [u,v] coordinates
   */
  uvs(uvs) {
    if (!this._pointsComp) {
      this._pointsComp = this._obj.component('points');
    }
    this._pointsComp.float2('st', uvs);
    return this;
  }

  /**
   * Set polygon types (3=triangle, 4=quad, etc.)
   * @param {number[]} types - Array of polygon types
   */
  types(types) {
    if (!this._elementsComp) {
      this._elementsComp = this._obj.component('elements');
    }
    this._elementsComp.byte('type', types);
    return this;
  }

  /**
   * Set polygon sizes (vertices per polygon)
   * @param {number[]} sizes - Array of polygon sizes
   */
  sizes(sizes) {
    if (!this._elementsComp) {
      this._elementsComp = this._obj.component('elements');
    }
    this._elementsComp.short('size', sizes);
    return this;
  }

  /**
   * Set vertex indices
   * @param {number[]} indices - Array of vertex indices
   */
  indices(indices) {
    if (!this._indicesComp) {
      this._indicesComp = this._obj.component('indices');
    }
    this._indicesComp.int('vertex', indices);
    return this;
  }

  /**
   * Build the polygon mesh
   */
  build() {
    if (this._pointsComp) this._pointsComp.end();
    if (this._elementsComp) this._elementsComp.end();
    if (this._indicesComp) this._indicesComp.end();
    this._obj.end();
    return this._builder.build();
  }
}

/**
 * Transform builder
 */
class TransformBuilder {
  constructor(name, version) {
    this._builder = new GTOBuilder();
    this._obj = this._builder.object(name, 'transform', version);
    this._objComp = this._obj.component('object');
  }

  /**
   * Set 4x4 transformation matrix
   */
  matrix(m) {
    this._objComp.matrix4('globalMatrix', m);
    return this;
  }

  /**
   * Set parent object name
   */
  parent(name) {
    this._objComp.string('parent', name);
    return this;
  }

  /**
   * Build the transform
   */
  build() {
    this._objComp.end();
    this._obj.end();
    return this._builder.build();
  }
}

export default GTOBuilder;

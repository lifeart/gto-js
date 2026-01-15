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
import type { GTOData, ObjectData, ComponentData, PropertyData } from './dto.js';

type PropertyValue = number | string | boolean | number[] | string[] | boolean[] | number[][];

/**
 * Component builder
 */
class ComponentBuilder {
  private _name: string;
  private _parent: ObjectBuilder;
  private _properties: Record<string, PropertyData> = {};
  private _interpretation: string = '';

  constructor(name: string, parent: ObjectBuilder) {
    this._name = name;
    this._parent = parent;
  }

  /**
   * Set component interpretation
   */
  as(interpretation: string): this {
    this._interpretation = interpretation;
    return this;
  }

  // ============================================
  // Integer properties
  // ============================================

  /**
   * Add an int property (width=1)
   */
  int(name: string, data: number | number[]): this {
    return this._addProperty(name, DataType.Int, 1, data);
  }

  /**
   * Add an int[2] property
   */
  int2(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Int, 2, data);
  }

  /**
   * Add an int[3] property
   */
  int3(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Int, 3, data);
  }

  /**
   * Add an int[4] property
   */
  int4(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Int, 4, data);
  }

  // ============================================
  // Float properties
  // ============================================

  /**
   * Add a float property (width=1)
   */
  float(name: string, data: number | number[]): this {
    return this._addProperty(name, DataType.Float, 1, data);
  }

  /**
   * Add a float[2] property
   */
  float2(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Float, 2, data);
  }

  /**
   * Add a float[3] property
   */
  float3(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Float, 3, data);
  }

  /**
   * Add a float[4] property
   */
  float4(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Float, 4, data);
  }

  /**
   * Add a float[16] property (4x4 matrix)
   */
  matrix4(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Float, 16, data);
  }

  /**
   * Add a float[9] property (3x3 matrix)
   */
  matrix3(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Float, 9, data);
  }

  // ============================================
  // Double properties
  // ============================================

  /**
   * Add a double property (width=1)
   */
  double(name: string, data: number | number[]): this {
    return this._addProperty(name, DataType.Double, 1, data);
  }

  /**
   * Add a double[2] property
   */
  double2(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Double, 2, data);
  }

  /**
   * Add a double[3] property
   */
  double3(name: string, data: number[] | number[][]): this {
    return this._addProperty(name, DataType.Double, 3, data);
  }

  // ============================================
  // String properties
  // ============================================

  /**
   * Add a string property (width=1)
   */
  string(name: string, data: string | string[]): this {
    // Wrap single string in array
    const normalizedData = typeof data === 'string' ? [data] : data;
    return this._addProperty(name, DataType.String, 1, normalizedData);
  }

  /**
   * Add a string[N] property
   */
  stringN(name: string, width: number, data: string[]): this {
    return this._addProperty(name, DataType.String, width, data);
  }

  // ============================================
  // Other types
  // ============================================

  /**
   * Add a byte property
   */
  byte(name: string, data: number | number[]): this {
    return this._addProperty(name, DataType.Byte, 1, data);
  }

  /**
   * Add a short property
   */
  short(name: string, data: number | number[]): this {
    return this._addProperty(name, DataType.Short, 1, data);
  }

  /**
   * Add a boolean property
   */
  bool(name: string, data: boolean | boolean[]): this {
    return this._addProperty(name, DataType.Boolean, 1, data);
  }

  // ============================================
  // Generic property
  // ============================================

  /**
   * Add a generic property with custom type and width
   */
  property(name: string, type: DataType, width: number, data: PropertyValue, interpretation: string = ''): this {
    this._addProperty(name, type, width, data);
    if (interpretation) {
      this._properties[name].interpretation = interpretation;
    }
    return this;
  }

  // ============================================
  // Builder methods
  // ============================================

  /**
   * End component and return to parent object builder
   */
  end(): ObjectBuilder {
    return this._parent;
  }

  /**
   * Build the component object
   */
  build(): ComponentData {
    const properties: Record<string, PropertyData> = {};
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

  private _addProperty(name: string, type: DataType, width: number, data: PropertyValue): this {
    // Normalize data
    let normalizedData: unknown[];
    let size: number;

    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      // Already grouped: [[1,2,3], [4,5,6]]
      size = data.length;
      normalizedData = data as unknown[];
    } else if (Array.isArray(data)) {
      // Flat array
      if (width > 1) {
        // Group into chunks
        size = Math.floor(data.length / width);
        normalizedData = [];
        for (let i = 0; i < data.length; i += width) {
          normalizedData.push((data as unknown[]).slice(i, i + width));
        }
      } else {
        size = data.length;
        normalizedData = data as unknown[];
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

  private _typeName(type: DataType): string {
    const names: Record<DataType, string> = {
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
  private _name: string;
  private _protocol: string;
  private _version: number;
  private _parent: GTOBuilder;
  private _components: Record<string, ComponentBuilder> = {};

  constructor(name: string, protocol: string, version: number, parent: GTOBuilder) {
    this._name = name;
    this._protocol = protocol;
    this._version = version;
    this._parent = parent;
  }

  /**
   * Start a new component
   */
  component(name: string, interpretation: string = ''): ComponentBuilder {
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
  end(): GTOBuilder {
    return this._parent;
  }

  /**
   * Build the object
   */
  build(): ObjectData {
    const components: Record<string, ComponentData> = {};
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
  private _objects: ObjectBuilder[] = [];
  private _version: number = 4;

  /**
   * Set GTO version
   */
  version(v: number): this {
    this._version = v;
    return this;
  }

  /**
   * Start a new object
   * @param name - Object name
   * @param protocol - Protocol name
   * @param version - Protocol version
   */
  object(name: string, protocol: string, version: number = 1): ObjectBuilder {
    const obj = new ObjectBuilder(name, protocol, version, this);
    this._objects.push(obj);
    return obj;
  }

  /**
   * Build the final GTO data structure
   */
  build(): GTOData {
    return {
      version: this._version,
      objects: this._objects.map(obj => obj.build())
    };
  }

  /**
   * Build and convert to JSON string
   */
  toJSON(indent: number = 2): string {
    return JSON.stringify(this.build(), null, indent);
  }
}

// ============================================
// Static factory methods for common protocols
// ============================================

/**
 * Create a polygon mesh builder
 */
export function polygon(name: string, version: number = 2): PolygonBuilder {
  return new PolygonBuilder(name, version);
}

/**
 * Create a transform builder
 */
export function transform(name: string, version: number = 1): TransformBuilder {
  return new TransformBuilder(name, version);
}

/**
 * Polygon mesh builder with convenience methods
 */
class PolygonBuilder {
  private _builder: GTOBuilder;
  private _obj: ObjectBuilder;
  private _pointsComp: ComponentBuilder | null = null;
  private _elementsComp: ComponentBuilder | null = null;
  private _indicesComp: ComponentBuilder | null = null;

  constructor(name: string, version: number) {
    this._builder = new GTOBuilder();
    this._obj = this._builder.object(name, 'polygon', version);
  }

  /**
   * Set vertex positions
   * @param positions - Array of [x,y,z] positions
   */
  positions(positions: number[][]): this {
    if (!this._pointsComp) {
      this._pointsComp = this._obj.component('points');
    }
    this._pointsComp.float3('position', positions);
    return this;
  }

  /**
   * Set vertex normals
   * @param normals - Array of [x,y,z] normals
   */
  normals(normals: number[][]): this {
    if (!this._pointsComp) {
      this._pointsComp = this._obj.component('points');
    }
    this._pointsComp.float3('normal', normals);
    return this;
  }

  /**
   * Set UV coordinates
   * @param uvs - Array of [u,v] coordinates
   */
  uvs(uvs: number[][]): this {
    if (!this._pointsComp) {
      this._pointsComp = this._obj.component('points');
    }
    this._pointsComp.float2('st', uvs);
    return this;
  }

  /**
   * Set polygon types (3=triangle, 4=quad, etc.)
   * @param types - Array of polygon types
   */
  types(types: number[]): this {
    if (!this._elementsComp) {
      this._elementsComp = this._obj.component('elements');
    }
    this._elementsComp.byte('type', types);
    return this;
  }

  /**
   * Set polygon sizes (vertices per polygon)
   * @param sizes - Array of polygon sizes
   */
  sizes(sizes: number[]): this {
    if (!this._elementsComp) {
      this._elementsComp = this._obj.component('elements');
    }
    this._elementsComp.short('size', sizes);
    return this;
  }

  /**
   * Set vertex indices
   * @param indices - Array of vertex indices
   */
  indices(indices: number[]): this {
    if (!this._indicesComp) {
      this._indicesComp = this._obj.component('indices');
    }
    this._indicesComp.int('vertex', indices);
    return this;
  }

  /**
   * Build the polygon mesh
   */
  build(): GTOData {
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
  private _builder: GTOBuilder;
  private _obj: ObjectBuilder;
  private _objComp: ComponentBuilder;

  constructor(name: string, version: number) {
    this._builder = new GTOBuilder();
    this._obj = this._builder.object(name, 'transform', version);
    this._objComp = this._obj.component('object');
  }

  /**
   * Set 4x4 transformation matrix
   */
  matrix(m: number[]): this {
    this._objComp.matrix4('globalMatrix', m);
    return this;
  }

  /**
   * Set parent object name
   */
  parent(name: string): this {
    this._objComp.string('parent', name);
    return this;
  }

  /**
   * Build the transform
   */
  build(): GTOData {
    this._objComp.end();
    this._obj.end();
    return this._builder.build();
  }
}

export default GTOBuilder;

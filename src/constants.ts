/**
 * GTO Constants and Type Definitions
 *
 * Based on the GTO (Graph Topology Object) file format specification
 */

/** Magic number for GTO binary files */
export const GTO_MAGIC = 0x0000029f;

/** GTO version */
export const GTO_VERSION = 4;

/** File type identifiers */
export enum FileType {
  BinaryGTO = 0,
  CompressedGTO = 1,
  TextGTO = 2
}

/** Data types supported by GTO */
export enum DataType {
  Int = 0,
  Float = 1,
  Double = 2,
  Half = 3,
  String = 4,
  Boolean = 5,
  Short = 6,
  Byte = 7,
  Int64 = 8
}

/** Reverse mapping for type names */
export const DataTypeName: Record<DataType, string> = {
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

/** Type name to DataType mapping */
export const TypeNameToDataType: Record<string, DataType> = {
  'int': DataType.Int,
  'float': DataType.Float,
  'double': DataType.Double,
  'half': DataType.Half,
  'string': DataType.String,
  'bool': DataType.Boolean,
  'short': DataType.Short,
  'byte': DataType.Byte,
  'int64': DataType.Int64
};

/** Size in bytes for each data type */
export const DataTypeSize: Record<DataType, number> = {
  [DataType.Int]: 4,
  [DataType.Float]: 4,
  [DataType.Double]: 8,
  [DataType.Half]: 2,
  [DataType.String]: 4, // String type stores indices (32-bit)
  [DataType.Boolean]: 1,
  [DataType.Short]: 2,
  [DataType.Byte]: 1,
  [DataType.Int64]: 8
};

/** Reader mode flags */
export enum ReaderMode {
  None = 0,
  HeaderOnly = 1,      // Only read header information
  RandomAccess = 2,    // Enable random access to objects
  BinaryOnly = 4,      // Only accept binary format
  TextOnly = 8         // Only accept text format
}

/** Request values for reader callbacks */
export enum Request {
  Skip = 0,            // Skip this item
  Read = 1             // Read this item
}

/** Common interpretation strings */
export const Interpretation = {
  Coordinate: 'coordinate',
  Normal: 'normal',
  Quaternion: 'quaternion',
  RGB: 'RGB',
  RGBA: 'RGBA',
  Bezier: 'bezier',
  Indices: 'indices',
  Matrix4x4: '4x4',
  Matrix3x3: '3x3',
  RowMajor: 'row-major',
  ColumnMajor: 'column-major'
} as const;

/** Header flags */
export enum HeaderFlags {
  None = 0,
  Transposed = 1       // Data is stored in transposed form
}

/**
 * Header structure for GTO files
 */
export class Header {
  magic: number = GTO_MAGIC;
  numStrings: number = 0;
  numObjects: number = 0;
  version: number = GTO_VERSION;
  flags: number = 0;
}

/**
 * Object info structure
 */
export class ObjectInfo {
  name: string = '';
  protocol: string = '';
  protocolVersion: number = 0;
  numComponents: number = 0;
  pad: number = 0;
  // Internal tracking
  _nameId: number = 0;
  _protocolId: number = 0;
  _componentOffset: number = 0;
}

/**
 * Component info structure
 */
export class ComponentInfo {
  name: string = '';
  interpretation: string = '';
  numProperties: number = 0;
  flags: number = 0;
  // Internal tracking
  _nameId: number = 0;
  _interpretationId: number = 0;
  _propertyOffset: number = 0;
  _object: ObjectInfo | null = null;
}

/**
 * Property info structure
 */
export class PropertyInfo {
  name: string = '';
  interpretation: string = '';
  type: DataType = DataType.Float;
  size: number = 0;           // Number of elements
  width: number = 1;          // Parts per element (e.g., 3 for xyz)
  dims: [number, number, number, number] = [1, 1, 1, 1]; // Up to 4 dimensional shape
  // Internal tracking
  _nameId: number = 0;
  _interpretationId: number = 0;
  _component: ComponentInfo | null = null;
  _dataOffset: number = 0;

  /**
   * Get total number of values (size * width * all dims)
   */
  get totalCount(): number {
    return this.size * this.width * this.dims.reduce((a, b) => a * b, 1);
  }

  /**
   * Get byte size of the property data
   */
  get byteSize(): number {
    return this.totalCount * DataTypeSize[this.type];
  }
}

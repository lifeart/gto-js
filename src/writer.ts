/**
 * GTO Text Format Writer
 *
 * Writes GTO data in text format (.rv files).
 * Uses a state-machine approach for building GTO files.
 */

import {
  DataType,
  DataTypeName,
  DataTypeSize,
  GTO_MAGIC,
  GTO_VERSION,
  FileType
} from './constants.js';
import { StringTable } from './string-table.js';
import { floatToHalf } from './utils.js';
import type { GTOData, ComponentData, PropertyData } from './dto.js';

/**
 * Writer states
 */
enum WriterState {
  Initial = 0,
  Object = 1,
  Component = 2,
  Closed = 3
}

/** Binary object info for assembly */
interface BinaryObjectInfo {
  nameId: number;
  protocolId: number;
  protocolVersion: number;
  numComponents: number;
  componentStartIdx: number;
}

/** Binary component info for assembly */
interface BinaryComponentInfo {
  nameId: number;
  interpretationId: number;
  numProperties: number;
  flags: number;
  childLevel: number;
  propertyStartIdx: number;
}

/** Binary property info for assembly */
interface BinaryPropertyInfo {
  nameId: number;
  interpretationId: number;
  type: DataType;
  size: number;
  width: number;
  dims: [number, number, number, number];
}

/** Pending property for two-phase API */
interface PendingProperty {
  name: string;
  type: DataType;
  size: number;
  width: number;
  interpretation: string;
}

type DataArray = number[] | string[] | boolean[] | ArrayLike<number>;

/**
 * GTO Text Format Writer
 *
 * Writes GTO files in text format using a state-machine approach.
 *
 * For text format, use the simpler inline API:
 * - beginObject/endObject
 * - beginComponent/endComponent
 * - propertyWithData (writes property declaration and data in one call)
 *
 * Or the two-phase API:
 * - Phase 1: declare all objects/components/properties
 * - Phase 2: beginData/propertyData/endData
 */
export class Writer {
  private _stringTable: StringTable = new StringTable();
  private _state: WriterState = WriterState.Initial;
  private _output: string = '';
  private _indent: number = 0;
  private _version: number = GTO_VERSION;
  private _binaryMode: boolean = false;
  private _fileType: FileType = FileType.TextGTO;
  // Binary mode storage
  private _objectInfos: BinaryObjectInfo[] = [];
  private _componentInfos: BinaryComponentInfo[] = [];
  private _propertyInfos: BinaryPropertyInfo[] = [];
  private _propertyData: number[][] = [];
  private _currentObjectIdx: number = -1;
  private _currentComponentIdx: number = -1;
  // Two-phase API storage
  private _pendingProperties: PendingProperty[] = [];
  private _propertyIndex: number = 0;

  /**
   * Intern a string into the string table
   * @param str - String or array of strings to intern
   * @returns String ID(s)
   */
  intern(str: string): number;
  intern(str: string[]): number[];
  intern(str: string | string[]): number | number[] {
    if (Array.isArray(str)) {
      return str.map(s => this._stringTable.intern(s));
    }
    return this._stringTable.intern(str);
  }

  /**
   * Lookup a string ID
   * @param str - String to lookup
   * @returns String ID or undefined
   */
  lookup(str: string): number | undefined {
    return this._stringTable.lookup(str);
  }

  /**
   * Get string from ID
   */
  stringFromId(id: number): string {
    return this._stringTable.stringFromId(id);
  }

  /**
   * Open/initialize the writer
   * @param type - File type (TextGTO or BinaryGTO)
   */
  open(type: FileType = FileType.TextGTO): boolean {
    this._fileType = type;
    this._state = WriterState.Initial;

    if (type === FileType.BinaryGTO) {
      this._binaryMode = true;
      this._objectInfos = [];
      this._componentInfos = [];
      this._propertyInfos = [];
      this._propertyData = [];
      this._currentObjectIdx = -1;
      this._currentComponentIdx = -1;
    } else {
      this._binaryMode = false;
      this._output = '';
      this._indent = 0;
    }
    return true;
  }

  /**
   * Close the writer and finalize output
   * @returns GTO text content or binary ArrayBuffer
   */
  close(): string | ArrayBuffer {
    this._state = WriterState.Closed;
    if (this._binaryMode) {
      return this._buildBinary();
    }
    return this.toString();
  }

  /**
   * Get the current output as string
   */
  toString(): string {
    return `GTOa (${this._version})\n\n${this._output}`;
  }

  /**
   * Add indentation to output
   */
  private _writeIndent(): void {
    this._output += '    '.repeat(this._indent);
  }

  /**
   * Write a line with proper indentation
   */
  private _writeLine(line: string = ''): void {
    if (line) {
      this._writeIndent();
      this._output += line;
    }
    this._output += '\n';
  }

  /**
   * Begin a new object
   * @param name - Object name
   * @param protocol - Protocol name
   * @param protocolVersion - Protocol version
   */
  beginObject(name: string, protocol: string, protocolVersion: number = 1): void {
    if (this._state === WriterState.Object || this._state === WriterState.Component) {
      throw new Error('Cannot begin object while inside another object');
    }

    this._state = WriterState.Object;

    // Intern strings
    const nameId = this.intern(name);
    const protocolId = this.intern(protocol);

    if (this._binaryMode) {
      this._currentObjectIdx = this._objectInfos.length;
      this._objectInfos.push({
        nameId,
        protocolId,
        protocolVersion,
        numComponents: 0,
        componentStartIdx: this._componentInfos.length
      });
    } else {
      // Write object header
      let header = `${name} : ${protocol}`;
      if (protocolVersion > 0) {
        header += ` (${protocolVersion})`;
      }
      this._writeLine(header);
      this._writeLine('{');
      this._indent++;
    }
  }

  /**
   * End the current object
   */
  endObject(): void {
    if (this._state !== WriterState.Object) {
      throw new Error('No object to end');
    }

    if (this._binaryMode) {
      // Update numComponents for the current object
      const objInfo = this._objectInfos[this._currentObjectIdx];
      objInfo.numComponents = this._componentInfos.length - objInfo.componentStartIdx;
      this._currentObjectIdx = -1;
    } else {
      this._indent--;
      this._writeLine('}');
      this._writeLine(); // Blank line between objects
    }
    this._state = WriterState.Initial;
  }

  /**
   * Begin a new component within the current object
   * @param name - Component name
   * @param interpretation - Optional interpretation string
   * @param transposed - Whether data is transposed
   */
  beginComponent(name: string, interpretation: string = '', transposed: boolean = false): void {
    if (this._state !== WriterState.Object) {
      throw new Error('Must be inside an object to begin component');
    }

    this._state = WriterState.Component;

    // Intern strings
    const nameId = this.intern(name);
    const interpretationId = interpretation ? this.intern(interpretation) : 0;

    if (this._binaryMode) {
      this._currentComponentIdx = this._componentInfos.length;
      this._componentInfos.push({
        nameId,
        interpretationId,
        numProperties: 0,
        flags: transposed ? 1 : 0,
        childLevel: 0,  // Nested components not yet supported in builder
        propertyStartIdx: this._propertyInfos.length
      });
    } else {
      // Write component header (quote if contains special chars)
      let header = this._quoteName(name);
      if (interpretation) {
        header += ` as ${interpretation}`;
      }
      this._writeLine(header);
      this._writeLine('{');
      this._indent++;
    }
  }

  /**
   * End the current component
   */
  endComponent(): void {
    if (this._state !== WriterState.Component) {
      throw new Error('No component to end');
    }

    if (this._binaryMode) {
      // Update numProperties for the current component
      const compInfo = this._componentInfos[this._currentComponentIdx];
      compInfo.numProperties = this._propertyInfos.length - compInfo.propertyStartIdx;
      this._currentComponentIdx = -1;
    } else {
      this._indent--;
      this._writeLine('}');
      this._writeLine(); // Blank line between components
    }
    this._state = WriterState.Object;
  }

  /**
   * Declare a property and write its data inline (recommended for text format)
   * @param name - Property name
   * @param type - Data type (DataType.*)
   * @param size - Number of elements
   * @param width - Parts per element (e.g., 3 for xyz)
   * @param interpretation - Optional interpretation string
   * @param data - The property data
   */
  propertyWithData(name: string, type: DataType, size: number, width: number, interpretation: string, data: DataArray): void {
    if (this._state !== WriterState.Component) {
      throw new Error('Must be inside a component to declare property');
    }

    // Intern strings
    const nameId = this.intern(name);
    const interpretationId = interpretation ? this.intern(interpretation) : 0;

    // Flatten data if nested
    let flatData: number[] = Array.from(data as ArrayLike<number>);
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      flatData = (data as unknown as number[][]).flat();
    }

    if (this._binaryMode) {
      // Store property info and data for later binary assembly
      this._propertyInfos.push({
        nameId,
        interpretationId,
        type,
        size,
        width,
        dims: [1, 1, 1, 1]
      });
      this._propertyData.push(flatData);
    } else {
      // Build declaration
      const typeName = DataTypeName[type];
      let declaration = typeName;

      // In GTO text format:
      // - type[N] means width=N (parts per element)
      // - size is inferred from data, never written explicitly
      if (width > 1) {
        declaration += `[${width}]`;
      }

      // Add name
      declaration += ` ${name}`;

      // Add interpretation if present
      if (interpretation) {
        declaration += ` as ${interpretation}`;
      }

      // Format data
      const formattedData = this._formatData(type, width, size, flatData);
      declaration += ` = ${formattedData}`;

      this._writeLine(declaration);
    }
  }

  /**
   * Declare a property (for two-phase API compatibility)
   * Note: For text format, prefer propertyWithData instead
   * @param name - Property name
   * @param type - Data type (DataType.*)
   * @param size - Number of elements
   * @param width - Parts per element (e.g., 3 for xyz)
   * @param interpretation - Optional interpretation string
   */
  property(name: string, type: DataType, size: number, width: number = 1, interpretation: string = ''): void {
    // For text format, we need to store pending properties
    this._pendingProperties.push({ name, type, size, width, interpretation });

    // Intern strings
    this.intern(name);
    if (interpretation) {
      this.intern(interpretation);
    }
  }

  /**
   * Begin the data section (for two-phase API)
   */
  beginData(): void {
    this._propertyIndex = 0;
  }

  /**
   * Write data for the next property (for two-phase API)
   * @param data - The property data
   */
  propertyData(data: DataArray): void {
    if (!this._pendingProperties || this._propertyIndex >= this._pendingProperties.length) {
      throw new Error('No more properties to write data for');
    }

    const prop = this._pendingProperties[this._propertyIndex++];

    // Build declaration
    const typeName = DataTypeName[prop.type];
    let declaration = typeName;

    // In GTO text format: type[width] - size is inferred from data
    if (prop.width > 1) {
      declaration += `[${prop.width}]`;
    }

    declaration += ` ${prop.name}`;
    if (prop.interpretation) {
      declaration += ` as ${prop.interpretation}`;
    }

    const flatData = Array.from(data as ArrayLike<number>);
    const formattedData = this._formatData(prop.type, prop.width, prop.size, flatData);
    declaration += ` = ${formattedData}`;

    this._writeLine(declaration);
  }

  /**
   * End the data section (for two-phase API)
   */
  endData(): void {
    this._pendingProperties = [];
    this._propertyIndex = 0;
  }

  /**
   * Format property data for text output
   */
  private _formatData(type: DataType, width: number, size: number, data: number[]): string {
    if (!data || data.length === 0) {
      return '[ ]';
    }

    // Handle string type
    if (type === DataType.String) {
      const strings = data.map(id => {
        if (typeof id === 'string') {
          return `"${this._escapeString(id)}"`;
        }
        return `"${this._escapeString(this.stringFromId(id))}"`;
      });
      // Single string value without brackets
      if (size === 1 && width === 1) {
        return strings[0];
      }
      return this._formatArray(strings, width);
    }

    // Handle numeric types
    const formatted = data.map(v => this._formatNumber(v, type));

    // Single numeric value without brackets
    if (size === 1 && width === 1) {
      return formatted[0];
    }

    return this._formatArray(formatted, width);
  }

  /**
   * Format an array with grouping by width
   */
  private _formatArray(arr: string[], width: number): string {
    if (width <= 1 || arr.length <= width) {
      return `[ ${arr.join(' ')} ]`;
    }

    // Group by width
    const groups: string[] = [];
    for (let i = 0; i < arr.length; i += width) {
      const group = arr.slice(i, i + width);
      groups.push(`[ ${group.join(' ')} ]`);
    }

    // If many groups, format with newlines
    if (groups.length > 4) {
      const indent = '    '.repeat(this._indent + 1);
      return `[\n${indent}${groups.join(`\n${indent}`)}\n${'    '.repeat(this._indent)}]`;
    }

    return `[ ${groups.join(' ')} ]`;
  }

  /**
   * Format a number for text output
   */
  private _formatNumber(value: number, type: DataType): string {
    if (type === DataType.Float || type === DataType.Double || type === DataType.Half) {
      // Ensure float representation
      if (Number.isInteger(value)) {
        return value.toFixed(1);
      }
      // Use full precision to preserve exact values
      return String(value);
    }
    return String(value);
  }

  /**
   * Escape a string for text output
   */
  private _escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Quote a name if it contains special characters
   */
  private _quoteName(name: string): string {
    // Quote if contains special chars or starts with digit
    if (/[^a-zA-Z0-9_\-.]/.test(name) || /^[0-9]/.test(name)) {
      return `"${this._escapeString(name)}"`;
    }
    return name;
  }

  // ============================================
  // Binary format writing
  // ============================================

  /**
   * Build complete binary GTO file
   */
  private _buildBinary(): ArrayBuffer {
    const littleEndian = true; // Use little-endian by default

    // Get string table bytes
    const stringTableBytes = this._stringTable.writeToBinary();

    // Calculate total size (v4 format)
    const headerSize = 20;
    const stringTableSize = stringTableBytes.byteLength;
    const objectHeaderSize = this._objectInfos.length * 20;
    const componentHeaderSize = this._componentInfos.length * 20; // v4: includes childLevel
    const propertyHeaderSize = this._propertyInfos.length * 36;   // v4: includes all 4 dims

    // Calculate data section size
    let dataSize = 0;
    for (let i = 0; i < this._propertyInfos.length; i++) {
      const propInfo = this._propertyInfos[i];
      const data = this._propertyData[i];
      const typeSize = DataTypeSize[propInfo.type] || 4;
      dataSize += data.length * typeSize;
    }

    const totalSize = headerSize + stringTableSize + objectHeaderSize +
                      componentHeaderSize + propertyHeaderSize + dataSize;

    // Create buffer
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const uint8View = new Uint8Array(buffer);
    let offset = 0;

    // Write header (20 bytes)
    view.setUint32(offset, GTO_MAGIC, littleEndian); offset += 4;
    view.setUint32(offset, this._stringTable.size, littleEndian); offset += 4;
    view.setUint32(offset, this._objectInfos.length, littleEndian); offset += 4;
    view.setUint32(offset, this._version, littleEndian); offset += 4;
    view.setUint32(offset, 0, littleEndian); offset += 4; // flags

    // Write string table
    uint8View.set(stringTableBytes, offset);
    offset += stringTableSize;

    // Write object headers (20 bytes each)
    for (const objInfo of this._objectInfos) {
      view.setUint32(offset, objInfo.nameId, littleEndian); offset += 4;
      view.setUint32(offset, objInfo.protocolId, littleEndian); offset += 4;
      view.setUint32(offset, objInfo.protocolVersion, littleEndian); offset += 4;
      view.setUint32(offset, objInfo.numComponents, littleEndian); offset += 4;
      view.setUint32(offset, 0, littleEndian); offset += 4; // pad
    }

    // Write component headers (20 bytes each for v4)
    for (const compInfo of this._componentInfos) {
      view.setUint32(offset, compInfo.nameId, littleEndian); offset += 4;
      view.setUint32(offset, compInfo.interpretationId, littleEndian); offset += 4;
      view.setUint32(offset, compInfo.numProperties, littleEndian); offset += 4;
      view.setUint32(offset, compInfo.flags, littleEndian); offset += 4;
      view.setUint32(offset, compInfo.childLevel, littleEndian); offset += 4; // v4: childLevel
    }

    // Write property headers (36 bytes each for v4 - includes all 4 dims)
    for (const propInfo of this._propertyInfos) {
      view.setUint32(offset, propInfo.nameId, littleEndian); offset += 4;
      view.setUint32(offset, propInfo.interpretationId, littleEndian); offset += 4;
      view.setUint8(offset, propInfo.type); offset += 1;
      offset += 3; // pad
      view.setUint32(offset, propInfo.size, littleEndian); offset += 4;
      view.setUint32(offset, propInfo.width, littleEndian); offset += 4;
      // v4: write all 4 dims
      view.setUint32(offset, propInfo.dims[0], littleEndian); offset += 4;
      view.setUint32(offset, propInfo.dims[1], littleEndian); offset += 4;
      view.setUint32(offset, propInfo.dims[2], littleEndian); offset += 4;
      view.setUint32(offset, propInfo.dims[3], littleEndian); offset += 4;
    }

    // Write data section
    for (let i = 0; i < this._propertyInfos.length; i++) {
      const propInfo = this._propertyInfos[i];
      const data = this._propertyData[i];

      for (const value of data) {
        this._writeBinaryValue(view, offset, propInfo.type, value, littleEndian);
        offset += DataTypeSize[propInfo.type] || 4;
      }
    }

    return buffer;
  }

  /**
   * Write a single binary value
   */
  private _writeBinaryValue(view: DataView, offset: number, type: DataType, value: number, littleEndian: boolean): void {
    switch (type) {
      case DataType.Int:
        view.setInt32(offset, value, littleEndian);
        break;
      case DataType.Float:
        view.setFloat32(offset, value, littleEndian);
        break;
      case DataType.Double:
        view.setFloat64(offset, value, littleEndian);
        break;
      case DataType.Half:
        view.setUint16(offset, floatToHalf(value), littleEndian);
        break;
      case DataType.String:
        view.setUint32(offset, value, littleEndian);
        break;
      case DataType.Boolean:
        view.setUint8(offset, value ? 1 : 0);
        break;
      case DataType.Short:
        view.setUint16(offset, value, littleEndian);
        break;
      case DataType.Byte:
        view.setUint8(offset, value);
        break;
      case DataType.Int64:
        view.setBigInt64(offset, BigInt(value), littleEndian);
        break;
      default:
        throw new Error(`Unknown data type: ${type}`);
    }
  }
}

/** Options for SimpleWriter */
export interface WriteOptions {
  binary?: boolean;
}

/**
 * Simple writer that takes structured data and outputs GTO text or binary
 */
export class SimpleWriter {
  /**
   * Write structured data to GTO format
   * @param data - Structured data object
   * @param options - Options object
   * @returns GTO text content or binary ArrayBuffer
   */
  static write(data: GTOData, options: WriteOptions = {}): string | ArrayBuffer {
    const writer = new Writer();
    const fileType = options.binary ? FileType.BinaryGTO : FileType.TextGTO;
    writer.open(fileType);

    for (const obj of data.objects) {
      writer.beginObject(obj.name, obj.protocol, obj.protocolVersion || 1);

      for (const [compName, component] of Object.entries(obj.components) as [string, ComponentData][]) {
        writer.beginComponent(compName, component.interpretation || '');

        for (const [propName, prop] of Object.entries(component.properties) as [string, PropertyData][]) {
          // Convert string type name to DataType enum
          let type: DataType;
          if (typeof prop.type === 'string') {
            const typeName = prop.type.charAt(0).toUpperCase() + prop.type.slice(1);
            type = DataType[typeName as keyof typeof DataType] as DataType;
            if (type === undefined) {
              // Handle 'bool' -> 'Boolean'
              type = prop.type === 'bool' ? DataType.Boolean : DataType.Float;
            }
          } else {
            type = prop.type as unknown as DataType;
          }

          // Flatten grouped data
          let flatData: number[] = prop.data as number[];
          if (Array.isArray(prop.data) && Array.isArray(prop.data[0])) {
            flatData = (prop.data as number[][]).flat();
          }

          // Intern strings if needed
          if (type === DataType.String && flatData.length > 0 && typeof flatData[0] === 'string') {
            flatData = (flatData as unknown as string[]).map(s => writer.intern(s));
          }

          const size = prop.size || Math.floor(flatData.length / (prop.width || 1));
          writer.propertyWithData(propName, type, size, prop.width || 1, prop.interpretation || '', flatData);
        }

        writer.endComponent();
      }

      writer.endObject();
    }

    return writer.close();
  }
}

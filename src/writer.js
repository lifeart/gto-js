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

/**
 * Writer states
 */
const WriterState = {
  Initial: 0,
  Object: 1,
  Component: 2,
  Closed: 3
};

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
  constructor() {
    this._stringTable = new StringTable();
    this._state = WriterState.Initial;
    this._output = '';
    this._indent = 0;
    this._version = GTO_VERSION;
    this._binaryMode = false;
    // Binary mode storage
    this._objectInfos = [];
    this._componentInfos = [];
    this._propertyInfos = [];
    this._propertyData = [];
  }

  /**
   * Intern a string into the string table
   * @param {string|string[]} str - String or array of strings to intern
   * @returns {number|number[]} - String ID(s)
   */
  intern(str) {
    if (Array.isArray(str)) {
      return str.map(s => this._stringTable.intern(s));
    }
    return this._stringTable.intern(str);
  }

  /**
   * Lookup a string ID
   * @param {string} str - String to lookup
   * @returns {number|undefined} - String ID or undefined
   */
  lookup(str) {
    return this._stringTable.lookup(str);
  }

  /**
   * Get string from ID
   * @param {number} id - String ID
   * @returns {string}
   */
  stringFromId(id) {
    return this._stringTable.stringFromId(id);
  }

  /**
   * Open/initialize the writer
   * @param {FileType} type - File type (TextGTO or BinaryGTO)
   * @returns {boolean}
   */
  open(type = FileType.TextGTO) {
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
   * @returns {string|ArrayBuffer} - GTO text content or binary ArrayBuffer
   */
  close() {
    this._state = WriterState.Closed;
    if (this._binaryMode) {
      return this._buildBinary();
    }
    return this.toString();
  }

  /**
   * Get the current output as string
   * @returns {string}
   */
  toString() {
    return `GTOa (${this._version})\n\n${this._output}`;
  }

  /**
   * Add indentation to output
   * @private
   */
  _writeIndent() {
    this._output += '    '.repeat(this._indent);
  }

  /**
   * Write a line with proper indentation
   * @private
   */
  _writeLine(line = '') {
    if (line) {
      this._writeIndent();
      this._output += line;
    }
    this._output += '\n';
  }

  /**
   * Begin a new object
   * @param {string} name - Object name
   * @param {string} protocol - Protocol name
   * @param {number} protocolVersion - Protocol version
   */
  beginObject(name, protocol, protocolVersion = 1) {
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
  endObject() {
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
   * @param {string} name - Component name
   * @param {string} interpretation - Optional interpretation string
   * @param {boolean} transposed - Whether data is transposed
   */
  beginComponent(name, interpretation = '', transposed = false) {
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
  endComponent() {
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
   * @param {string} name - Property name
   * @param {number} type - Data type (DataType.*)
   * @param {number} size - Number of elements
   * @param {number} width - Parts per element (e.g., 3 for xyz)
   * @param {string} interpretation - Optional interpretation string
   * @param {Array|TypedArray} data - The property data
   */
  propertyWithData(name, type, size, width, interpretation, data) {
    if (this._state !== WriterState.Component) {
      throw new Error('Must be inside a component to declare property');
    }

    // Intern strings
    const nameId = this.intern(name);
    const interpretationId = interpretation ? this.intern(interpretation) : 0;

    // Flatten data if nested
    let flatData = data;
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      flatData = data.flat();
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
      this._propertyData.push(Array.from(flatData));
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
   * @param {string} name - Property name
   * @param {number} type - Data type (DataType.*)
   * @param {number} size - Number of elements
   * @param {number} width - Parts per element (e.g., 3 for xyz)
   * @param {string} interpretation - Optional interpretation string
   */
  property(name, type, size, width = 1, interpretation = '') {
    // For text format, we need to store pending properties
    if (!this._pendingProperties) {
      this._pendingProperties = [];
    }
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
  beginData() {
    this._propertyIndex = 0;
  }

  /**
   * Write data for the next property (for two-phase API)
   * @param {Array|TypedArray} data - The property data
   */
  propertyData(data) {
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

    const formattedData = this._formatData(prop.type, prop.width, prop.size, data);
    declaration += ` = ${formattedData}`;

    this._writeLine(declaration);
  }

  /**
   * End the data section (for two-phase API)
   */
  endData() {
    this._pendingProperties = [];
    this._propertyIndex = 0;
  }

  /**
   * Format property data for text output
   * @private
   */
  _formatData(type, width, size, data) {
    if (!data || data.length === 0) {
      return '[ ]';
    }

    // Convert to array if TypedArray
    const arr = Array.from(data);

    // Handle string type
    if (type === DataType.String) {
      const strings = arr.map(id => {
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
    const formatted = arr.map(v => this._formatNumber(v, type));

    // Single numeric value without brackets
    if (size === 1 && width === 1) {
      return formatted[0];
    }

    return this._formatArray(formatted, width);
  }

  /**
   * Format an array with grouping by width
   * @private
   */
  _formatArray(arr, width) {
    if (width <= 1 || arr.length <= width) {
      return `[ ${arr.join(' ')} ]`;
    }

    // Group by width
    const groups = [];
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
   * @private
   */
  _formatNumber(value, type) {
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
   * @private
   */
  _escapeString(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Quote a name if it contains special characters
   * @private
   */
  _quoteName(name) {
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
   * @private
   * @returns {ArrayBuffer}
   */
  _buildBinary() {
    const littleEndian = true; // Use little-endian by default

    // Get string table bytes
    const stringTableBytes = this._stringTable.writeToBinary();

    // Calculate total size
    const headerSize = 20;
    const stringTableSize = stringTableBytes.byteLength;
    const objectHeaderSize = this._objectInfos.length * 20;
    const componentHeaderSize = this._componentInfos.length * 16;
    const propertyHeaderSize = this._propertyInfos.length * 24; // 20 + 4 for dims[0]

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

    // Write component headers (16 bytes each)
    for (const compInfo of this._componentInfos) {
      view.setUint32(offset, compInfo.nameId, littleEndian); offset += 4;
      view.setUint32(offset, compInfo.interpretationId, littleEndian); offset += 4;
      view.setUint32(offset, compInfo.numProperties, littleEndian); offset += 4;
      view.setUint32(offset, compInfo.flags, littleEndian); offset += 4;
    }

    // Write property headers (24 bytes each - includes dims[0])
    for (const propInfo of this._propertyInfos) {
      view.setUint32(offset, propInfo.nameId, littleEndian); offset += 4;
      view.setUint32(offset, propInfo.interpretationId, littleEndian); offset += 4;
      view.setUint8(offset, propInfo.type); offset += 1;
      offset += 3; // pad
      view.setUint32(offset, propInfo.size, littleEndian); offset += 4;
      view.setUint32(offset, propInfo.width, littleEndian); offset += 4;
      view.setUint32(offset, propInfo.dims[0], littleEndian); offset += 4; // dims[0]
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
   * @private
   */
  _writeBinaryValue(view, offset, type, value, littleEndian) {
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

/**
 * Simple writer that takes structured data and outputs GTO text or binary
 */
export class SimpleWriter {
  /**
   * Write structured data to GTO format
   * @param {Object} data - Structured data object
   * @param {Object} options - Options object
   * @param {boolean} options.binary - If true, output binary format (ArrayBuffer)
   * @returns {string|ArrayBuffer} - GTO text content or binary ArrayBuffer
   */
  static write(data, options = {}) {
    const writer = new Writer();
    const fileType = options.binary ? FileType.BinaryGTO : FileType.TextGTO;
    writer.open(fileType);

    for (const obj of data.objects) {
      writer.beginObject(obj.name, obj.protocol, obj.protocolVersion || 1);

      for (const [compName, component] of Object.entries(obj.components)) {
        writer.beginComponent(compName, component.interpretation || '');

        for (const [propName, prop] of Object.entries(component.properties)) {
          const type = typeof prop.type === 'string'
            ? DataType[prop.type.charAt(0).toUpperCase() + prop.type.slice(1)]
            : prop.type;

          // Flatten grouped data
          let flatData = prop.data;
          if (Array.isArray(prop.data) && Array.isArray(prop.data[0])) {
            flatData = prop.data.flat();
          }

          // Intern strings if needed
          if (type === DataType.String && flatData.length > 0 && typeof flatData[0] === 'string') {
            flatData = flatData.map(s => writer.intern(s));
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

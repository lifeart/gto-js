/**
 * GTO Text Format Writer
 *
 * Writes GTO data in text format (.rv files).
 * Uses a state-machine approach for building GTO files.
 */

import {
  DataType,
  DataTypeName,
  GTO_VERSION,
  FileType
} from './constants.js';
import { StringTable } from './string-table.js';

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
   * Open/initialize the writer for text output
   * @param {FileType} type - File type (only TextGTO supported)
   * @returns {boolean}
   */
  open(type = FileType.TextGTO) {
    if (type !== FileType.TextGTO) {
      console.warn('Only TextGTO format is supported, using TextGTO');
    }
    this._state = WriterState.Initial;
    this._output = '';
    this._indent = 0;
    return true;
  }

  /**
   * Close the writer and finalize output
   * @returns {string} - The complete GTO text content
   */
  close() {
    this._state = WriterState.Closed;
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
    this.intern(name);
    this.intern(protocol);

    // Write object header
    let header = `${name} : ${protocol}`;
    if (protocolVersion > 0) {
      header += ` (${protocolVersion})`;
    }
    this._writeLine(header);
    this._writeLine('{');
    this._indent++;
  }

  /**
   * End the current object
   */
  endObject() {
    if (this._state !== WriterState.Object) {
      throw new Error('No object to end');
    }

    this._indent--;
    this._writeLine('}');
    this._writeLine(); // Blank line between objects
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
    this.intern(name);
    if (interpretation) {
      this.intern(interpretation);
    }

    // Write component header (quote if contains special chars)
    let header = this._quoteName(name);
    if (interpretation) {
      header += ` as ${interpretation}`;
    }
    this._writeLine(header);
    this._writeLine('{');
    this._indent++;
  }

  /**
   * End the current component
   */
  endComponent() {
    if (this._state !== WriterState.Component) {
      throw new Error('No component to end');
    }

    this._indent--;
    this._writeLine('}');
    this._writeLine(); // Blank line between components
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
    this.intern(name);
    if (interpretation) {
      this.intern(interpretation);
    }

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
    const formattedData = this._formatData(type, width, size, data);
    declaration += ` = ${formattedData}`;

    this._writeLine(declaration);
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
}

/**
 * Simple writer that takes structured data and outputs GTO text
 */
export class SimpleWriter {
  /**
   * Write structured data to GTO text format
   * @param {Object} data - Structured data object
   * @returns {string} - GTO text content
   */
  static write(data) {
    const writer = new Writer();
    writer.open(FileType.TextGTO);

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

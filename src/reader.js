/**
 * GTO Text Format Reader
 *
 * Parses text-based GTO files (.rv format) using a callback-based architecture.
 * The text format starts with "GTOa (version)" and uses a human-readable syntax.
 */

import {
  DataType,
  DataTypeName,
  TypeNameToDataType,
  DataTypeSize,
  GTO_MAGIC,
  GTO_VERSION,
  ReaderMode,
  Request,
  Header,
  ObjectInfo,
  ComponentInfo,
  PropertyInfo
} from './constants.js';
import { StringTable } from './string-table.js';
import { halfToFloat } from './utils.js';

/**
 * Token types for lexer
 */
const TokenType = {
  EOF: 'EOF',
  IDENTIFIER: 'IDENTIFIER',
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  LBRACE: 'LBRACE',         // {
  RBRACE: 'RBRACE',         // }
  LBRACKET: 'LBRACKET',     // [
  RBRACKET: 'RBRACKET',     // ]
  LPAREN: 'LPAREN',         // (
  RPAREN: 'RPAREN',         // )
  COLON: 'COLON',           // :
  EQUALS: 'EQUALS',         // =
  COMMA: 'COMMA',           // ,
  AS: 'AS'                  // 'as' keyword
};

/**
 * Simple lexer for GTO text format
 */
class Lexer {
  constructor(input) {
    this.input = input;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
  }

  peek() {
    return this.input[this.pos] || '';
  }

  advance() {
    const ch = this.input[this.pos++] || '';
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  skipWhitespace() {
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.advance();
      } else if (ch === '#') {
        // Skip comment until end of line
        while (this.pos < this.input.length && this.peek() !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  readString() {
    const quote = this.advance(); // consume opening quote
    let str = '';
    while (this.pos < this.input.length) {
      const ch = this.advance();
      if (ch === quote) {
        break;
      } else if (ch === '\\') {
        const next = this.advance();
        switch (next) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case 'r': str += '\r'; break;
          case '\\': str += '\\'; break;
          case '"': str += '"'; break;
          case "'": str += "'"; break;
          default: str += next;
        }
      } else {
        str += ch;
      }
    }
    return { type: TokenType.STRING, value: str };
  }

  readNumber() {
    let str = '';
    let hasDecimal = false;
    let hasExponent = false;

    // Handle leading minus
    if (this.peek() === '-') {
      str += this.advance();
    }

    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch >= '0' && ch <= '9') {
        str += this.advance();
      } else if (ch === '.' && !hasDecimal && !hasExponent) {
        hasDecimal = true;
        str += this.advance();
      } else if ((ch === 'e' || ch === 'E') && !hasExponent) {
        hasExponent = true;
        str += this.advance();
        if (this.peek() === '+' || this.peek() === '-') {
          str += this.advance();
        }
      } else {
        break;
      }
    }

    const value = hasDecimal || hasExponent ? parseFloat(str) : parseInt(str, 10);
    return { type: TokenType.NUMBER, value };
  }

  readIdentifier() {
    let str = '';
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if ((ch >= 'a' && ch <= 'z') ||
          (ch >= 'A' && ch <= 'Z') ||
          (ch >= '0' && ch <= '9') ||
          ch === '_' || ch === '-' || ch === '.') {
        str += this.advance();
      } else {
        break;
      }
    }

    if (str === 'as') {
      return { type: TokenType.AS, value: str };
    }
    return { type: TokenType.IDENTIFIER, value: str };
  }

  nextToken() {
    this.skipWhitespace();

    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: null };
    }

    const ch = this.peek();

    // String literals
    if (ch === '"' || ch === "'") {
      return this.readString();
    }

    // Numbers (including negative)
    if ((ch >= '0' && ch <= '9') || (ch === '-' && this.input[this.pos + 1] >= '0' && this.input[this.pos + 1] <= '9')) {
      return this.readNumber();
    }

    // Identifiers
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      return this.readIdentifier();
    }

    // Single character tokens
    this.advance();
    switch (ch) {
      case '{': return { type: TokenType.LBRACE, value: ch };
      case '}': return { type: TokenType.RBRACE, value: ch };
      case '[': return { type: TokenType.LBRACKET, value: ch };
      case ']': return { type: TokenType.RBRACKET, value: ch };
      case '(': return { type: TokenType.LPAREN, value: ch };
      case ')': return { type: TokenType.RPAREN, value: ch };
      case ':': return { type: TokenType.COLON, value: ch };
      case '=': return { type: TokenType.EQUALS, value: ch };
      case ',': return { type: TokenType.COMMA, value: ch };
      default:
        throw new Error(`Unexpected character '${ch}' at line ${this.line}, column ${this.column}`);
    }
  }
}

/**
 * GTO Text Format Reader
 *
 * Parses GTO text files using a callback-based architecture.
 * Extend this class and override the callback methods to process the data.
 */
export class Reader {
  /**
   * Create a new Reader
   * @param {number} mode - Reader mode flags (ReaderMode.*)
   */
  constructor(mode = ReaderMode.None) {
    this._mode = mode;
    this._stringTable = new StringTable();
    this._header = new Header();
    this._objects = [];
    this._components = [];
    this._properties = [];
  }

  /**
   * Get string from string table by ID
   * @param {number} id - String index
   * @returns {string}
   */
  stringFromId(id) {
    return this._stringTable.stringFromId(id);
  }

  /**
   * Get the full string table
   * @returns {string[]}
   */
  stringTable() {
    return this._stringTable.strings;
  }

  /**
   * Get all objects (for RandomAccess mode)
   * @returns {ObjectInfo[]}
   */
  objects() {
    return this._objects;
  }

  /**
   * Get all components (for RandomAccess mode)
   * @returns {ComponentInfo[]}
   */
  components() {
    return this._components;
  }

  /**
   * Get all properties (for RandomAccess mode)
   * @returns {PropertyInfo[]}
   */
  properties() {
    return this._properties;
  }

  /**
   * Open and parse a GTO file (text or binary)
   * @param {string|ArrayBuffer|Uint8Array} content - File content
   * @param {string} name - Optional filename for error messages
   * @returns {boolean} - True if successful
   */
  open(content, name = '<string>') {
    this._filename = name;
    this._stringTable.clear();
    this._objects = [];
    this._components = [];
    this._properties = [];

    try {
      // Detect format from content type
      if (content instanceof ArrayBuffer || content instanceof Uint8Array) {
        this._parseBinary(content);
      } else if (typeof content === 'string') {
        if (content.trimStart().startsWith('GTOa')) {
          this._parse(content);
        } else {
          throw new Error('Unknown GTO format - text files must start with "GTOa"');
        }
      } else {
        throw new Error('Content must be string, ArrayBuffer, or Uint8Array');
      }
      return true;
    } catch (e) {
      console.error(`Error parsing GTO file ${name}: ${e.message}`);
      return false;
    }
  }

  /**
   * Parse the GTO text content
   * @private
   */
  _parse(content) {
    const lexer = new Lexer(content);
    this._lexer = lexer;
    this._currentToken = lexer.nextToken();

    // Parse header: GTOa (version)
    this._parseHeader();

    // Call header callback
    this.header(this._header);

    if (this._mode & ReaderMode.HeaderOnly) {
      return;
    }

    // Parse objects
    while (this._currentToken.type !== TokenType.EOF) {
      this._parseObject();
    }
  }

  /**
   * Get current token and advance
   */
  _advance() {
    const token = this._currentToken;
    this._currentToken = this._lexer.nextToken();
    return token;
  }

  /**
   * Expect a specific token type
   */
  _expect(type) {
    const token = this._currentToken;
    if (token.type !== type) {
      throw new Error(`Expected ${type} but got ${token.type} (${token.value}) at line ${this._lexer.line}`);
    }
    return this._advance();
  }

  /**
   * Parse the file header
   */
  _parseHeader() {
    // Expect "GTOa"
    const gtoToken = this._expect(TokenType.IDENTIFIER);
    if (gtoToken.value !== 'GTOa') {
      throw new Error(`Expected 'GTOa' but got '${gtoToken.value}'`);
    }

    // Expect (version)
    this._expect(TokenType.LPAREN);
    const version = this._expect(TokenType.NUMBER);
    this._expect(TokenType.RPAREN);

    this._header.version = version.value;
  }

  /**
   * Parse an object declaration
   */
  _parseObject() {
    // ObjectName : protocol (version) { ... }
    const objectInfo = new ObjectInfo();

    // Object name
    const nameToken = this._expect(TokenType.IDENTIFIER);
    objectInfo.name = nameToken.value;
    objectInfo._nameId = this._stringTable.intern(objectInfo.name);

    // Colon
    this._expect(TokenType.COLON);

    // Protocol name
    const protocolToken = this._expect(TokenType.IDENTIFIER);
    objectInfo.protocol = protocolToken.value;
    objectInfo._protocolId = this._stringTable.intern(objectInfo.protocol);

    // Protocol version (optional)
    if (this._currentToken.type === TokenType.LPAREN) {
      this._advance();
      const versionToken = this._expect(TokenType.NUMBER);
      objectInfo.protocolVersion = versionToken.value;
      this._expect(TokenType.RPAREN);
    }

    // Check if user wants this object
    const objectRequest = this.object(
      objectInfo.name,
      objectInfo.protocol,
      objectInfo.protocolVersion,
      objectInfo
    );

    objectInfo._componentOffset = this._components.length;
    this._objects.push(objectInfo);

    // Parse object body
    this._expect(TokenType.LBRACE);

    while (this._currentToken.type !== TokenType.RBRACE) {
      this._parseComponent(objectInfo, objectRequest);
    }

    this._expect(TokenType.RBRACE);

    objectInfo.numComponents = this._components.length - objectInfo._componentOffset;
  }

  /**
   * Parse a component declaration
   */
  _parseComponent(objectInfo, objectRequest) {
    const componentInfo = new ComponentInfo();
    componentInfo._object = objectInfo;

    // Component name (can be identifier or quoted string)
    let nameToken;
    if (this._currentToken.type === TokenType.STRING) {
      nameToken = this._advance();
    } else {
      nameToken = this._expect(TokenType.IDENTIFIER);
    }
    componentInfo.name = nameToken.value;
    componentInfo._nameId = this._stringTable.intern(componentInfo.name);

    // Optional interpretation: "as interpretation"
    if (this._currentToken.type === TokenType.AS) {
      this._advance();
      const interpToken = this._expect(TokenType.IDENTIFIER);
      componentInfo.interpretation = interpToken.value;
      componentInfo._interpretationId = this._stringTable.intern(componentInfo.interpretation);
    }

    // Check if user wants this component
    let componentRequest = Request.Skip;
    if (objectRequest === Request.Read) {
      componentRequest = this.component(componentInfo.name, componentInfo);
    }

    componentInfo._propertyOffset = this._properties.length;
    this._components.push(componentInfo);

    // Parse component body
    this._expect(TokenType.LBRACE);

    while (this._currentToken.type !== TokenType.RBRACE) {
      this._parseProperty(componentInfo, componentRequest);
    }

    this._expect(TokenType.RBRACE);

    componentInfo.numProperties = this._properties.length - componentInfo._propertyOffset;
  }

  /**
   * Parse a property declaration
   */
  _parseProperty(componentInfo, componentRequest) {
    const propertyInfo = new PropertyInfo();
    propertyInfo._component = componentInfo;

    // Type: float, int, double, etc.
    const typeToken = this._expect(TokenType.IDENTIFIER);
    const typeName = typeToken.value;
    if (!(typeName in TypeNameToDataType)) {
      throw new Error(`Unknown type '${typeName}' at line ${this._lexer.line}`);
    }
    propertyInfo.type = TypeNameToDataType[typeName];

    // Optional dimensions: [dim1,dim2,...]
    if (this._currentToken.type === TokenType.LBRACKET) {
      this._advance();
      const dims = [];
      dims.push(this._expect(TokenType.NUMBER).value);
      while (this._currentToken.type === TokenType.COMMA) {
        this._advance();
        dims.push(this._expect(TokenType.NUMBER).value);
      }
      this._expect(TokenType.RBRACKET);
      propertyInfo.width = dims.length === 1 ? dims[0] : 1;
      if (dims.length > 1) {
        propertyInfo.dims = dims;
      } else {
        propertyInfo.width = dims[0];
      }
    }

    // Size: [count]
    if (this._currentToken.type === TokenType.LBRACKET) {
      this._advance();
      propertyInfo.size = this._expect(TokenType.NUMBER).value;
      this._expect(TokenType.RBRACKET);
    }

    // Property name
    const nameToken = this._expect(TokenType.IDENTIFIER);
    propertyInfo.name = nameToken.value;
    propertyInfo._nameId = this._stringTable.intern(propertyInfo.name);

    // Optional interpretation: "as interpretation"
    if (this._currentToken.type === TokenType.AS) {
      this._advance();
      const interpToken = this._expect(TokenType.IDENTIFIER);
      propertyInfo.interpretation = interpToken.value;
      propertyInfo._interpretationId = this._stringTable.intern(propertyInfo.interpretation);
    }

    // Check if user wants this property
    let propertyRequest = Request.Skip;
    if (componentRequest === Request.Read) {
      propertyRequest = this.property(
        propertyInfo.name,
        propertyInfo.interpretation,
        propertyInfo
      );
    }

    this._properties.push(propertyInfo);

    // Equals sign
    this._expect(TokenType.EQUALS);

    // Parse data - can be array or single value
    let data;
    if (this._currentToken.type === TokenType.LBRACKET) {
      data = this._parseData(propertyInfo);
    } else {
      // Single value without brackets
      data = this._parseSingleValue(propertyInfo);
    }

    // Update size based on actual data
    if (propertyInfo.size === 0 && data.length > 0) {
      propertyInfo.size = Math.floor(data.length / (propertyInfo.width || 1));
    }

    if (propertyRequest === Request.Read) {
      // Call data callback
      const buffer = this.data(propertyInfo, data.length);
      if (buffer !== null) {
        // Copy data to buffer or just pass it
        this.dataRead(propertyInfo, data);
      }
    }
  }

  /**
   * Parse property data values
   */
  _parseData(propertyInfo) {
    const data = [];

    this._expect(TokenType.LBRACKET);

    while (this._currentToken.type !== TokenType.RBRACKET) {
      if (this._currentToken.type === TokenType.LBRACKET) {
        // Nested array
        const nested = this._parseNestedData(propertyInfo);
        data.push(...nested);
      } else if (this._currentToken.type === TokenType.NUMBER) {
        data.push(this._advance().value);
      } else if (this._currentToken.type === TokenType.STRING) {
        const strValue = this._advance().value;
        if (propertyInfo.type === DataType.String) {
          data.push(this._stringTable.intern(strValue));
        } else {
          data.push(strValue);
        }
      } else if (this._currentToken.type === TokenType.IDENTIFIER) {
        // Could be a string reference or special value
        const id = this._advance().value;
        if (id === 'true') {
          data.push(1);
        } else if (id === 'false') {
          data.push(0);
        } else {
          data.push(this._stringTable.intern(id));
        }
      } else {
        throw new Error(`Unexpected token ${this._currentToken.type} in data at line ${this._lexer.line}`);
      }

      // Optional comma
      if (this._currentToken.type === TokenType.COMMA) {
        this._advance();
      }
    }

    this._expect(TokenType.RBRACKET);

    return data;
  }

  /**
   * Parse nested array data
   */
  _parseNestedData(propertyInfo) {
    const data = [];

    this._expect(TokenType.LBRACKET);

    while (this._currentToken.type !== TokenType.RBRACKET) {
      if (this._currentToken.type === TokenType.LBRACKET) {
        // Further nested
        const nested = this._parseNestedData(propertyInfo);
        data.push(...nested);
      } else if (this._currentToken.type === TokenType.NUMBER) {
        data.push(this._advance().value);
      } else if (this._currentToken.type === TokenType.STRING) {
        const strValue = this._advance().value;
        if (propertyInfo.type === DataType.String) {
          data.push(this._stringTable.intern(strValue));
        } else {
          data.push(strValue);
        }
      } else if (this._currentToken.type === TokenType.IDENTIFIER) {
        const id = this._advance().value;
        if (id === 'true') {
          data.push(1);
        } else if (id === 'false') {
          data.push(0);
        } else {
          data.push(this._stringTable.intern(id));
        }
      } else {
        throw new Error(`Unexpected token ${this._currentToken.type} in nested data at line ${this._lexer.line}`);
      }

      // Optional comma
      if (this._currentToken.type === TokenType.COMMA) {
        this._advance();
      }
    }

    this._expect(TokenType.RBRACKET);

    return data;
  }

  /**
   * Parse a single value (not in array brackets)
   */
  _parseSingleValue(propertyInfo) {
    if (this._currentToken.type === TokenType.NUMBER) {
      return [this._advance().value];
    } else if (this._currentToken.type === TokenType.STRING) {
      const strValue = this._advance().value;
      if (propertyInfo.type === DataType.String) {
        return [this._stringTable.intern(strValue)];
      }
      return [strValue];
    } else if (this._currentToken.type === TokenType.IDENTIFIER) {
      const id = this._advance().value;
      if (id === 'true') {
        return [1];
      } else if (id === 'false') {
        return [0];
      }
      return [this._stringTable.intern(id)];
    }
    throw new Error(`Unexpected token ${this._currentToken.type} for single value at line ${this._lexer.line}`);
  }

  // ============================================
  // Binary format parsing
  // ============================================

  /**
   * Parse binary GTO content
   * @private
   */
  _parseBinary(content) {
    const buffer = content instanceof ArrayBuffer ? content : content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
    const view = new DataView(buffer);

    // Detect endianness from magic number
    const magic = view.getUint32(0, true); // Try little-endian first
    let littleEndian;
    if (magic === GTO_MAGIC) {
      littleEndian = true;
    } else if (view.getUint32(0, false) === GTO_MAGIC) {
      littleEndian = false;
    } else {
      throw new Error(`Invalid GTO magic number: 0x${magic.toString(16)}`);
    }

    let offset = 0;

    // Read header (20 bytes)
    offset += 4; // Skip magic
    const numStrings = view.getUint32(offset, littleEndian); offset += 4;
    const numObjects = view.getUint32(offset, littleEndian); offset += 4;
    const version = view.getUint32(offset, littleEndian); offset += 4;
    const flags = view.getUint32(offset, littleEndian); offset += 4;

    this._header.magic = GTO_MAGIC;
    this._header.numStrings = numStrings;
    this._header.numObjects = numObjects;
    this._header.version = version;
    this._header.flags = flags;

    // Call header callback
    this.header(this._header);

    if (this._mode & ReaderMode.HeaderOnly) {
      return;
    }

    // Read string table
    const stringTableBytes = this._stringTable.readFromBinary(view, offset, numStrings, littleEndian);
    offset += stringTableBytes;

    // Read object headers
    const objectHeaders = [];
    for (let i = 0; i < numObjects; i++) {
      const nameId = view.getUint32(offset, littleEndian); offset += 4;
      const protocolId = view.getUint32(offset, littleEndian); offset += 4;
      const protocolVersion = view.getUint32(offset, littleEndian); offset += 4;
      const numComponents = view.getUint32(offset, littleEndian); offset += 4;
      offset += 4; // pad

      objectHeaders.push({ nameId, protocolId, protocolVersion, numComponents });
    }

    // Count total components and properties
    let totalComponents = 0;
    for (const obj of objectHeaders) {
      totalComponents += obj.numComponents;
    }

    // Read component headers
    const componentHeaders = [];
    for (let i = 0; i < totalComponents; i++) {
      const nameId = view.getUint32(offset, littleEndian); offset += 4;
      const interpretationId = view.getUint32(offset, littleEndian); offset += 4;
      const numProperties = view.getUint32(offset, littleEndian); offset += 4;
      const compFlags = view.getUint32(offset, littleEndian); offset += 4;

      componentHeaders.push({ nameId, interpretationId, numProperties, flags: compFlags });
    }

    // Count total properties
    let totalProperties = 0;
    for (const comp of componentHeaders) {
      totalProperties += comp.numProperties;
    }

    // Read property headers
    const propertyHeaders = [];
    for (let i = 0; i < totalProperties; i++) {
      const nameId = view.getUint32(offset, littleEndian); offset += 4;
      const interpretationId = view.getUint32(offset, littleEndian); offset += 4;
      const type = view.getUint8(offset); offset += 1;
      offset += 3; // pad (1 byte + 2 bytes)
      const size = view.getUint32(offset, littleEndian); offset += 4;
      const width = view.getUint32(offset, littleEndian); offset += 4;

      // Read dims if version >= 4 (we'll read at least dims[0])
      const dims = [1, 1, 1, 1];
      if (version >= 4) {
        dims[0] = view.getUint32(offset, littleEndian); offset += 4;
      }

      propertyHeaders.push({ nameId, interpretationId, type, size, width, dims });
    }

    // Now process objects/components/properties with callbacks and read data
    let componentIdx = 0;
    let propertyIdx = 0;

    for (const objHeader of objectHeaders) {
      const objectInfo = new ObjectInfo();
      objectInfo.name = this._stringTable.stringFromId(objHeader.nameId);
      objectInfo.protocol = this._stringTable.stringFromId(objHeader.protocolId);
      objectInfo.protocolVersion = objHeader.protocolVersion;
      objectInfo.numComponents = objHeader.numComponents;
      objectInfo._nameId = objHeader.nameId;
      objectInfo._protocolId = objHeader.protocolId;
      objectInfo._componentOffset = this._components.length;

      const objectRequest = this.object(
        objectInfo.name,
        objectInfo.protocol,
        objectInfo.protocolVersion,
        objectInfo
      );

      this._objects.push(objectInfo);

      for (let c = 0; c < objHeader.numComponents; c++) {
        const compHeader = componentHeaders[componentIdx++];
        const componentInfo = new ComponentInfo();
        componentInfo.name = this._stringTable.stringFromId(compHeader.nameId);
        componentInfo.interpretation = compHeader.interpretationId > 0
          ? this._stringTable.stringFromId(compHeader.interpretationId)
          : '';
        componentInfo.numProperties = compHeader.numProperties;
        componentInfo.flags = compHeader.flags;
        componentInfo._nameId = compHeader.nameId;
        componentInfo._interpretationId = compHeader.interpretationId;
        componentInfo._object = objectInfo;
        componentInfo._propertyOffset = this._properties.length;

        let componentRequest = Request.Skip;
        if (objectRequest === Request.Read) {
          componentRequest = this.component(componentInfo.name, componentInfo);
        }

        this._components.push(componentInfo);

        for (let p = 0; p < compHeader.numProperties; p++) {
          const propHeader = propertyHeaders[propertyIdx++];
          const propertyInfo = new PropertyInfo();
          propertyInfo.name = this._stringTable.stringFromId(propHeader.nameId);
          propertyInfo.interpretation = propHeader.interpretationId > 0
            ? this._stringTable.stringFromId(propHeader.interpretationId)
            : '';
          propertyInfo.type = propHeader.type;
          propertyInfo.size = propHeader.size;
          propertyInfo.width = propHeader.width;
          propertyInfo.dims = propHeader.dims;
          propertyInfo._nameId = propHeader.nameId;
          propertyInfo._interpretationId = propHeader.interpretationId;
          propertyInfo._component = componentInfo;
          propertyInfo._dataOffset = offset;

          let propertyRequest = Request.Skip;
          if (componentRequest === Request.Read) {
            propertyRequest = this.property(
              propertyInfo.name,
              propertyInfo.interpretation,
              propertyInfo
            );
          }

          this._properties.push(propertyInfo);

          // Calculate data size and read data
          const totalCount = propertyInfo.size * propertyInfo.width;
          const typeSize = DataTypeSize[propertyInfo.type] || 4;
          const dataBytes = totalCount * typeSize;

          if (propertyRequest === Request.Read && totalCount > 0) {
            const data = this._readBinaryData(view, offset, propertyInfo, totalCount, littleEndian);
            const buffer = this.data(propertyInfo, dataBytes);
            if (buffer !== null) {
              this.dataRead(propertyInfo, data);
            }
          }

          offset += dataBytes;
        }
      }
    }
  }

  /**
   * Read binary property data
   * @private
   */
  _readBinaryData(view, offset, propertyInfo, count, littleEndian) {
    const data = [];
    const type = propertyInfo.type;
    const typeSize = DataTypeSize[type] || 4;

    for (let i = 0; i < count; i++) {
      const value = this._readBinaryValue(view, offset + i * typeSize, type, littleEndian);
      data.push(value);
    }

    return data;
  }

  /**
   * Read a single binary value
   * @private
   */
  _readBinaryValue(view, offset, type, littleEndian) {
    switch (type) {
      case DataType.Int:
        return view.getInt32(offset, littleEndian);
      case DataType.Float:
        return view.getFloat32(offset, littleEndian);
      case DataType.Double:
        return view.getFloat64(offset, littleEndian);
      case DataType.Half:
        return halfToFloat(view.getUint16(offset, littleEndian));
      case DataType.String:
        return view.getUint32(offset, littleEndian);
      case DataType.Boolean:
        return view.getUint8(offset) !== 0 ? 1 : 0;
      case DataType.Short:
        return view.getUint16(offset, littleEndian);
      case DataType.Byte:
        return view.getUint8(offset);
      case DataType.Int64:
        return Number(view.getBigInt64(offset, littleEndian));
      default:
        throw new Error(`Unknown data type: ${type}`);
    }
  }

  // ============================================
  // Callback methods - override these in subclass
  // ============================================

  /**
   * Called after the file header is read
   * @param {Header} header - The file header
   */
  header(header) {
    // Override in subclass
  }

  /**
   * Called for each object in the file
   * @param {string} name - Object name
   * @param {string} protocol - Protocol name
   * @param {number} protocolVersion - Protocol version
   * @param {ObjectInfo} info - Object info
   * @returns {number} - Request.Read to read object data, Request.Skip to skip
   */
  object(name, protocol, protocolVersion, info) {
    return Request.Read;
  }

  /**
   * Called for each component in an object
   * @param {string} name - Component name
   * @param {ComponentInfo} info - Component info
   * @returns {number} - Request.Read to read component data, Request.Skip to skip
   */
  component(name, info) {
    return Request.Read;
  }

  /**
   * Called for each property in a component
   * @param {string} name - Property name
   * @param {string} interpretation - Interpretation string
   * @param {PropertyInfo} info - Property info
   * @returns {number} - Request.Read to read property data, Request.Skip to skip
   */
  property(name, interpretation, info) {
    return Request.Read;
  }

  /**
   * Called to allocate memory for property data
   * @param {PropertyInfo} info - Property info
   * @param {number} bytes - Number of bytes needed
   * @returns {*} - Buffer to store data, or null to skip
   */
  data(info, bytes) {
    return true; // Default: accept data
  }

  /**
   * Called after property data is read
   * @param {PropertyInfo} info - Property info
   * @param {Array} data - The property data as an array
   */
  dataRead(info, data) {
    // Override in subclass
  }
}

/**
 * Simple reader that collects all data into a structured object
 */
export class SimpleReader extends Reader {
  constructor() {
    super(ReaderMode.None);
    this.result = {
      version: 0,
      objects: []
    };
    this._currentObject = null;
    this._currentComponent = null;
  }

  header(header) {
    this.result.version = header.version;
  }

  object(name, protocol, protocolVersion, info) {
    this._currentObject = {
      name,
      protocol,
      protocolVersion,
      components: {}
    };
    this.result.objects.push(this._currentObject);
    return Request.Read;
  }

  component(name, info) {
    this._currentComponent = {
      interpretation: info.interpretation,
      properties: {}
    };
    this._currentObject.components[name] = this._currentComponent;
    return Request.Read;
  }

  property(name, interpretation, info) {
    return Request.Read;
  }

  dataRead(info, data) {
    const prop = {
      type: DataTypeName[info.type],
      size: info.size,
      width: info.width,
      interpretation: info.interpretation,
      data: this._formatData(info, data)
    };
    this._currentComponent.properties[info.name] = prop;
  }

  _formatData(info, data) {
    // Convert string indices back to strings
    if (info.type === DataType.String) {
      return data.map(id => this.stringFromId(id));
    }

    // Group data by width if > 1
    if (info.width > 1) {
      const grouped = [];
      for (let i = 0; i < data.length; i += info.width) {
        grouped.push(data.slice(i, i + info.width));
      }
      return grouped;
    }

    return data;
  }
}

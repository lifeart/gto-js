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
  GTO_VERSION,
  ReaderMode,
  Request,
  Header,
  ObjectInfo,
  ComponentInfo,
  PropertyInfo
} from './constants.js';
import { StringTable } from './string-table.js';

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
   * Open and parse a GTO text file
   * @param {string} content - File content as string
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
      this._parse(content);
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

/**
 * GTO DTO (Data Transfer Object)
 *
 * Provides convenient methods to query, filter, and extract data from parsed GTO structures.
 *
 * @example
 * const dto = new GTODTO(reader.result);
 *
 * // Filter by protocol
 * const sources = dto.byProtocol('RVFileSource');
 *
 * // Get property value
 * const fps = dto.object('rv').component('session').property('fps').value();
 *
 * // Extract all media paths
 * const paths = dto.byProtocol('RVFileSource')
 *   .map(obj => obj.component('media').property('movie').value());
 */

/**
 * Property wrapper with value accessors
 */
export class PropertyDTO {
  constructor(name, data, parent) {
    this._name = name;
    this._data = data;
    this._parent = parent;
  }

  /** Property name */
  get name() { return this._name; }

  /** Data type (int, float, string, etc.) */
  get type() { return this._data.type; }

  /** Number of elements */
  get size() { return this._data.size; }

  /** Parts per element (e.g., 3 for float3) */
  get width() { return this._data.width; }

  /** Interpretation string */
  get interpretation() { return this._data.interpretation; }

  /** Raw data array */
  get data() { return this._data.data; }

  /** Parent component */
  get parent() { return this._parent; }

  /**
   * Get the value (unwraps single values from arrays)
   * @returns {*} Single value or array
   */
  value() {
    const d = this._data.data;
    if (!d || d.length === 0) return null;
    if (d.length === 1 && !Array.isArray(d[0])) return d[0];
    if (d.length === 1 && Array.isArray(d[0])) return d[0];
    return d;
  }

  /**
   * Get value at specific index
   * @param {number} index
   * @returns {*}
   */
  at(index) {
    return this._data.data?.[index] ?? null;
  }

  /**
   * Get first value
   * @returns {*}
   */
  first() {
    return this.at(0);
  }

  /**
   * Get last value
   * @returns {*}
   */
  last() {
    const d = this._data.data;
    return d?.[d.length - 1] ?? null;
  }

  /**
   * Get all values as flat array
   * @returns {Array}
   */
  flat() {
    const d = this._data.data;
    if (!d) return [];
    return d.flat(Infinity);
  }

  /**
   * Check if property exists and has data
   * @returns {boolean}
   */
  exists() {
    return this._data && this._data.data && this._data.data.length > 0;
  }

  /**
   * Get value or default if not exists
   * @param {*} defaultValue
   * @returns {*}
   */
  valueOr(defaultValue) {
    const v = this.value();
    return v !== null ? v : defaultValue;
  }

  /**
   * Map over values
   * @param {Function} fn
   * @returns {Array}
   */
  map(fn) {
    return (this._data.data || []).map(fn);
  }

  /**
   * Filter values
   * @param {Function} fn
   * @returns {Array}
   */
  filter(fn) {
    return (this._data.data || []).filter(fn);
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return { ...this._data };
  }
}

/**
 * Component wrapper with property accessors
 */
export class ComponentDTO {
  constructor(name, data, parent) {
    this._name = name;
    this._data = data;
    this._parent = parent;
    this._propertyCache = new Map();
  }

  /** Component name */
  get name() { return this._name; }

  /** Interpretation string */
  get interpretation() { return this._data.interpretation; }

  /** Parent object */
  get parent() { return this._parent; }

  /**
   * Get property by name
   * @param {string} name
   * @returns {PropertyDTO}
   */
  property(name) {
    if (!this._propertyCache.has(name)) {
      const prop = this._data.properties?.[name];
      this._propertyCache.set(name, prop ? new PropertyDTO(name, prop, this) : new NullPropertyDTO(name));
    }
    return this._propertyCache.get(name);
  }

  /**
   * Shorthand for property().value()
   * @param {string} name
   * @returns {*}
   */
  prop(name) {
    return this.property(name).value();
  }

  /**
   * Check if property exists
   * @param {string} name
   * @returns {boolean}
   */
  hasProperty(name) {
    return name in (this._data.properties || {});
  }

  /**
   * Get all property names
   * @returns {string[]}
   */
  propertyNames() {
    return Object.keys(this._data.properties || {});
  }

  /**
   * Get all properties as PropertyDTO array
   * @returns {PropertyDTO[]}
   */
  properties() {
    return this.propertyNames().map(name => this.property(name));
  }

  /**
   * Filter properties by type
   * @param {string} type - 'int', 'float', 'string', etc.
   * @returns {PropertyDTO[]}
   */
  propertiesByType(type) {
    return this.properties().filter(p => p.type === type);
  }

  /**
   * Find property matching predicate
   * @param {Function} predicate
   * @returns {PropertyDTO|null}
   */
  findProperty(predicate) {
    return this.properties().find(predicate) || null;
  }

  /**
   * Check if component exists
   * @returns {boolean}
   */
  exists() {
    return this._data !== null && this._data !== undefined;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return {
      name: this._name,
      interpretation: this.interpretation,
      properties: { ...this._data.properties }
    };
  }
}

/**
 * Null property for safe chaining
 */
class NullPropertyDTO extends PropertyDTO {
  constructor(name) {
    super(name, { type: null, size: 0, width: 0, data: [], interpretation: '' }, null);
  }
  value() { return null; }
  exists() { return false; }
}

/**
 * Null component for safe chaining
 */
class NullComponentDTO extends ComponentDTO {
  constructor(name) {
    super(name, { interpretation: '', properties: {} }, null);
  }
  exists() { return false; }
}

/**
 * Object wrapper with component accessors
 */
export class ObjectDTO {
  constructor(data) {
    this._data = data;
    this._componentCache = new Map();
  }

  /** Object name */
  get name() { return this._data.name; }

  /** Protocol name */
  get protocol() { return this._data.protocol; }

  /** Protocol version */
  get protocolVersion() { return this._data.protocolVersion; }

  /**
   * Get component by name
   * @param {string} name
   * @returns {ComponentDTO}
   */
  component(name) {
    if (!this._componentCache.has(name)) {
      const comp = this._data.components?.[name];
      this._componentCache.set(name, comp ? new ComponentDTO(name, comp, this) : new NullComponentDTO(name));
    }
    return this._componentCache.get(name);
  }

  /**
   * Shorthand: get property value from component
   * @param {string} componentName
   * @param {string} propertyName
   * @returns {*}
   */
  prop(componentName, propertyName) {
    return this.component(componentName).property(propertyName).value();
  }

  /**
   * Check if component exists
   * @param {string} name
   * @returns {boolean}
   */
  hasComponent(name) {
    return name in (this._data.components || {});
  }

  /**
   * Get all component names
   * @returns {string[]}
   */
  componentNames() {
    return Object.keys(this._data.components || {});
  }

  /**
   * Get all components as ComponentDTO array
   * @returns {ComponentDTO[]}
   */
  components() {
    return this.componentNames().map(name => this.component(name));
  }

  /**
   * Find component matching predicate
   * @param {Function} predicate
   * @returns {ComponentDTO|null}
   */
  findComponent(predicate) {
    return this.components().find(predicate) || null;
  }

  /**
   * Find component by name pattern (regex)
   * @param {RegExp|string} pattern
   * @returns {ComponentDTO[]}
   */
  componentsByPattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return this.components().filter(c => regex.test(c.name));
  }

  /**
   * Check if object matches protocol
   * @param {string} protocol
   * @returns {boolean}
   */
  isProtocol(protocol) {
    return this._data.protocol === protocol;
  }

  /**
   * Check if object exists
   * @returns {boolean}
   */
  exists() {
    return this._data !== null && this._data !== undefined;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return { ...this._data };
  }
}

/**
 * Null object for safe chaining
 */
class NullObjectDTO extends ObjectDTO {
  constructor() {
    super({ name: '', protocol: '', protocolVersion: 0, components: {} });
  }
  exists() { return false; }
}

/**
 * Collection of objects with filtering capabilities
 */
export class ObjectCollection {
  constructor(objects) {
    this._objects = objects.map(o => o instanceof ObjectDTO ? o : new ObjectDTO(o));
  }

  /** Number of objects */
  get length() { return this._objects.length; }

  /**
   * Get object by index
   * @param {number} index
   * @returns {ObjectDTO}
   */
  at(index) {
    return this._objects[index] || new NullObjectDTO();
  }

  /**
   * Get first object
   * @returns {ObjectDTO}
   */
  first() {
    return this.at(0);
  }

  /**
   * Get last object
   * @returns {ObjectDTO}
   */
  last() {
    return this.at(this._objects.length - 1);
  }

  /**
   * Filter by protocol
   * @param {string} protocol
   * @returns {ObjectCollection}
   */
  byProtocol(protocol) {
    return new ObjectCollection(this._objects.filter(o => o.protocol === protocol));
  }

  /**
   * Filter by name pattern
   * @param {RegExp|string} pattern
   * @returns {ObjectCollection}
   */
  byName(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return new ObjectCollection(this._objects.filter(o => regex.test(o.name)));
  }

  /**
   * Filter by predicate
   * @param {Function} predicate
   * @returns {ObjectCollection}
   */
  filter(predicate) {
    return new ObjectCollection(this._objects.filter(predicate));
  }

  /**
   * Find single object
   * @param {Function} predicate
   * @returns {ObjectDTO}
   */
  find(predicate) {
    return this._objects.find(predicate) || new NullObjectDTO();
  }

  /**
   * Map over objects
   * @param {Function} fn
   * @returns {Array}
   */
  map(fn) {
    return this._objects.map(fn);
  }

  /**
   * ForEach over objects
   * @param {Function} fn
   */
  forEach(fn) {
    this._objects.forEach(fn);
  }

  /**
   * Check if any object matches predicate
   * @param {Function} predicate
   * @returns {boolean}
   */
  some(predicate) {
    return this._objects.some(predicate);
  }

  /**
   * Check if all objects match predicate
   * @param {Function} predicate
   * @returns {boolean}
   */
  every(predicate) {
    return this._objects.every(predicate);
  }

  /**
   * Get all objects as array
   * @returns {ObjectDTO[]}
   */
  toArray() {
    return [...this._objects];
  }

  /**
   * Get unique protocols
   * @returns {string[]}
   */
  protocols() {
    return [...new Set(this._objects.map(o => o.protocol))];
  }

  /**
   * Group by protocol
   * @returns {Map<string, ObjectCollection>}
   */
  groupByProtocol() {
    const groups = new Map();
    for (const obj of this._objects) {
      if (!groups.has(obj.protocol)) {
        groups.set(obj.protocol, []);
      }
      groups.get(obj.protocol).push(obj);
    }
    return new Map([...groups].map(([k, v]) => [k, new ObjectCollection(v)]));
  }

  /**
   * Iterate over objects
   */
  [Symbol.iterator]() {
    return this._objects[Symbol.iterator]();
  }
}

/**
 * Main GTO DTO class
 *
 * @example
 * import { SimpleReader, GTODTO } from 'gto';
 *
 * const reader = new SimpleReader();
 * reader.open(content);
 * const dto = new GTODTO(reader.result);
 *
 * // Get session info
 * const fps = dto.object('rv').component('session').prop('fps').value();
 *
 * // Get all sources
 * const sources = dto.byProtocol('RVFileSource');
 * for (const source of sources) {
 *   console.log(source.prop('media', 'movie'));
 * }
 *
 * // Extract paint annotations
 * const paints = dto.byProtocol('RVPaint');
 * const annotations = paints.map(p =>
 *   p.componentsByPattern(/^pen:/).map(c => ({
 *     color: c.prop('color'),
 *     points: c.prop('points')
 *   }))
 * ).flat();
 */
export class GTODTO {
  /**
   * Create DTO from parsed GTO data
   * @param {Object} data - Parsed GTO data (from SimpleReader.result)
   */
  constructor(data) {
    this._data = data;
    this._objects = new ObjectCollection(data.objects || []);
    this._objectCache = new Map();
  }

  /** GTO version */
  get version() { return this._data.version; }

  /** Number of objects */
  get objectCount() { return this._objects.length; }

  /**
   * Get all objects
   * @returns {ObjectCollection}
   */
  objects() {
    return this._objects;
  }

  /**
   * Get object by exact name
   * @param {string} name
   * @returns {ObjectDTO}
   */
  object(name) {
    if (!this._objectCache.has(name)) {
      const obj = this._data.objects?.find(o => o.name === name);
      this._objectCache.set(name, obj ? new ObjectDTO(obj) : new NullObjectDTO());
    }
    return this._objectCache.get(name);
  }

  /**
   * Filter objects by protocol
   * @param {string} protocol
   * @returns {ObjectCollection}
   */
  byProtocol(protocol) {
    return this._objects.byProtocol(protocol);
  }

  /**
   * Filter objects by name pattern
   * @param {RegExp|string} pattern
   * @returns {ObjectCollection}
   */
  byName(pattern) {
    return this._objects.byName(pattern);
  }

  /**
   * Get unique protocols in the file
   * @returns {string[]}
   */
  protocols() {
    return this._objects.protocols();
  }

  /**
   * Group objects by protocol
   * @returns {Map<string, ObjectCollection>}
   */
  groupByProtocol() {
    return this._objects.groupByProtocol();
  }

  /**
   * Find first object matching predicate
   * @param {Function} predicate
   * @returns {ObjectDTO}
   */
  find(predicate) {
    return this._objects.find(predicate);
  }

  /**
   * Filter objects by predicate
   * @param {Function} predicate
   * @returns {ObjectCollection}
   */
  filter(predicate) {
    return this._objects.filter(predicate);
  }

  // ============================================
  // RV Session specific helpers
  // ============================================

  /**
   * Get session object (RVSession)
   * @returns {ObjectDTO}
   */
  session() {
    return this.byProtocol('RVSession').first();
  }

  /**
   * Get all source groups
   * @returns {ObjectCollection}
   */
  sourceGroups() {
    return this.byProtocol('RVSourceGroup');
  }

  /**
   * Get all file sources
   * @returns {ObjectCollection}
   */
  fileSources() {
    return this.byProtocol('RVFileSource');
  }

  /**
   * Get connection graph object
   * @returns {ObjectDTO}
   */
  connections() {
    return this.byProtocol('connection').first();
  }

  /**
   * Get all paint/annotation objects
   * @returns {ObjectCollection}
   */
  paints() {
    return this.byProtocol('RVPaint');
  }

  /**
   * Extract media file paths
   * @returns {string[]}
   */
  mediaPaths() {
    return this.fileSources()
      .map(s => s.component('media').property('movie').value())
      .filter(Boolean);
  }

  /**
   * Get timeline info
   * @returns {Object}
   */
  timeline() {
    const session = this.session().component('session');
    return {
      range: session.prop('range') || [1, 100],
      region: session.prop('region') || [1, 100],
      fps: session.prop('fps') || 24,
      currentFrame: session.prop('currentFrame') || 1,
      marks: session.prop('marks') || []
    };
  }

  /**
   * Get node connections as array of [from, to] pairs
   * @returns {Array<[string, string]>}
   */
  connectionEdges() {
    return this.connections().component('evaluation').property('connections').value() || [];
  }

  /**
   * Extract all annotations (pen strokes, text)
   * @returns {Array}
   */
  annotations() {
    const result = [];
    for (const paint of this.paints()) {
      for (const comp of paint.components()) {
        if (comp.name.startsWith('pen:') || comp.name.startsWith('text:')) {
          const parts = comp.name.split(':');
          result.push({
            type: parts[0],
            id: parts[1],
            frame: parseInt(parts[2]) || 0,
            user: parts[3] || '',
            node: paint.name,
            color: comp.prop('color'),
            points: comp.prop('points'),
            text: comp.prop('text'),
            brush: comp.prop('brush')
          });
        }
      }
    }
    return result;
  }

  /**
   * Convert to plain object
   * @returns {Object}
   */
  toObject() {
    return { ...this._data };
  }

  /**
   * Convert to JSON string
   * @param {number} indent
   * @returns {string}
   */
  toJSON(indent = 2) {
    return JSON.stringify(this._data, null, indent);
  }
}

export default GTODTO;

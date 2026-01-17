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

/** Property data structure */
export interface PropertyData {
  type: string;
  size: number;
  width: number;
  interpretation: string;
  data: unknown[];
}

/** Component data structure */
export interface ComponentData {
  interpretation: string;
  properties: Record<string, PropertyData>;
}

/** Object data structure */
export interface ObjectData {
  name: string;
  protocol: string;
  protocolVersion: number;
  components: Record<string, ComponentData>;
}

/** GTO file data structure */
export interface GTOData {
  version: number;
  objects: ObjectData[];
}

/** Timeline info structure */
export interface TimelineInfo {
  range: number[];
  region: number[];
  fps: number;
  currentFrame: number;
  marks: unknown[];
}

/** Paint effects settings structure */
export interface PaintEffectsInfo {
  ghost: number;
  ghostBefore: number;
  ghostAfter: number;
  hold: number;
}

/** Annotation structure */
export interface Annotation {
  type: string;
  id: string;
  frame: number;
  user: string;
  node: string;
  color: unknown;
  points: unknown;
  text: unknown;
  brush: unknown;
  startFrame?: number;
  duration?: number;
  ghost?: number;
  ghostBefore?: number;
  ghostAfter?: number;
  hold?: number;
}

/**
 * Property wrapper with value accessors
 */
export class PropertyDTO {
  protected _name: string;
  protected _data: PropertyData;
  protected _parent: ComponentDTO | null;

  constructor(name: string, data: PropertyData, parent: ComponentDTO | null) {
    this._name = name;
    this._data = data;
    this._parent = parent;
  }

  /** Property name */
  get name(): string { return this._name; }

  /** Data type (int, float, string, etc.) */
  get type(): string { return this._data.type; }

  /** Number of elements */
  get size(): number { return this._data.size; }

  /** Parts per element (e.g., 3 for float3) */
  get width(): number { return this._data.width; }

  /** Interpretation string */
  get interpretation(): string { return this._data.interpretation; }

  /** Raw data array */
  get data(): unknown[] { return this._data.data; }

  /** Parent component */
  get parent(): ComponentDTO | null { return this._parent; }

  /**
   * Get the value (unwraps single values from arrays)
   * @returns Single value or array
   */
  value(): unknown {
    const d = this._data.data;
    if (!d || d.length === 0) return null;
    if (d.length === 1 && !Array.isArray(d[0])) return d[0];
    if (d.length === 1 && Array.isArray(d[0])) return d[0];
    return d;
  }

  /**
   * Get value at specific index
   */
  at(index: number): unknown {
    return this._data.data?.[index] ?? null;
  }

  /**
   * Get first value
   */
  first(): unknown {
    return this.at(0);
  }

  /**
   * Get last value
   */
  last(): unknown {
    const d = this._data.data;
    return d?.[d.length - 1] ?? null;
  }

  /**
   * Get all values as flat array
   */
  flat(): unknown[] {
    const d = this._data.data;
    if (!d) return [];
    return d.flat(Infinity);
  }

  /**
   * Check if property exists and has data
   */
  exists(): boolean {
    return this._data && this._data.data && this._data.data.length > 0;
  }

  /**
   * Get value or default if not exists
   */
  valueOr<T>(defaultValue: T): unknown | T {
    const v = this.value();
    return v !== null ? v : defaultValue;
  }

  /**
   * Map over values
   */
  map<T>(fn: (value: unknown, index: number) => T): T[] {
    return (this._data.data || []).map(fn);
  }

  /**
   * Filter values
   */
  filter(fn: (value: unknown, index: number) => boolean): unknown[] {
    return (this._data.data || []).filter(fn);
  }

  /**
   * Convert to plain object
   */
  toObject(): PropertyData {
    return { ...this._data };
  }
}

/**
 * Null property for safe chaining
 */
class NullPropertyDTO extends PropertyDTO {
  constructor(name: string) {
    super(name, { type: '', size: 0, width: 0, data: [], interpretation: '' }, null);
  }
  override value(): null { return null; }
  override exists(): boolean { return false; }
}

/**
 * Component wrapper with property accessors
 */
export class ComponentDTO {
  protected _name: string;
  protected _data: ComponentData;
  protected _parent: ObjectDTO | null;
  private _propertyCache: Map<string, PropertyDTO> = new Map();

  constructor(name: string, data: ComponentData, parent: ObjectDTO | null) {
    this._name = name;
    this._data = data;
    this._parent = parent;
  }

  /** Component name */
  get name(): string { return this._name; }

  /** Interpretation string */
  get interpretation(): string { return this._data.interpretation; }

  /** Parent object */
  get parent(): ObjectDTO | null { return this._parent; }

  /**
   * Get property by name
   */
  property(name: string): PropertyDTO {
    if (!this._propertyCache.has(name)) {
      const prop = this._data.properties?.[name];
      this._propertyCache.set(name, prop ? new PropertyDTO(name, prop, this) : new NullPropertyDTO(name));
    }
    return this._propertyCache.get(name)!;
  }

  /**
   * Shorthand for property().value()
   */
  prop(name: string): unknown {
    return this.property(name).value();
  }

  /**
   * Check if property exists
   */
  hasProperty(name: string): boolean {
    return name in (this._data.properties || {});
  }

  /**
   * Get all property names
   */
  propertyNames(): string[] {
    return Object.keys(this._data.properties || {});
  }

  /**
   * Get all properties as PropertyDTO array
   */
  properties(): PropertyDTO[] {
    return this.propertyNames().map(name => this.property(name));
  }

  /**
   * Filter properties by type
   * @param type - 'int', 'float', 'string', etc.
   */
  propertiesByType(type: string): PropertyDTO[] {
    return this.properties().filter(p => p.type === type);
  }

  /**
   * Find property matching predicate
   */
  findProperty(predicate: (p: PropertyDTO) => boolean): PropertyDTO | null {
    return this.properties().find(predicate) || null;
  }

  /**
   * Check if component exists
   */
  exists(): boolean {
    return this._data !== null && this._data !== undefined;
  }

  /**
   * Convert to plain object
   */
  toObject(): { name: string; interpretation: string; properties: Record<string, PropertyData> } {
    return {
      name: this._name,
      interpretation: this.interpretation,
      properties: { ...this._data.properties }
    };
  }
}

/**
 * Null component for safe chaining
 */
class NullComponentDTO extends ComponentDTO {
  constructor(name: string) {
    super(name, { interpretation: '', properties: {} }, null);
  }
  override exists(): boolean { return false; }
}

/**
 * Object wrapper with component accessors
 */
export class ObjectDTO {
  protected _data: ObjectData;
  private _componentCache: Map<string, ComponentDTO> = new Map();

  constructor(data: ObjectData) {
    this._data = data;
  }

  /** Object name */
  get name(): string { return this._data.name; }

  /** Protocol name */
  get protocol(): string { return this._data.protocol; }

  /** Protocol version */
  get protocolVersion(): number { return this._data.protocolVersion; }

  /**
   * Get component by name
   */
  component(name: string): ComponentDTO {
    if (!this._componentCache.has(name)) {
      const comp = this._data.components?.[name];
      this._componentCache.set(name, comp ? new ComponentDTO(name, comp, this) : new NullComponentDTO(name));
    }
    return this._componentCache.get(name)!;
  }

  /**
   * Shorthand: get property value from component
   */
  prop(componentName: string, propertyName: string): unknown {
    return this.component(componentName).property(propertyName).value();
  }

  /**
   * Check if component exists
   */
  hasComponent(name: string): boolean {
    return name in (this._data.components || {});
  }

  /**
   * Get all component names
   */
  componentNames(): string[] {
    return Object.keys(this._data.components || {});
  }

  /**
   * Get all components as ComponentDTO array
   */
  components(): ComponentDTO[] {
    return this.componentNames().map(name => this.component(name));
  }

  /**
   * Find component matching predicate
   */
  findComponent(predicate: (c: ComponentDTO) => boolean): ComponentDTO | null {
    return this.components().find(predicate) || null;
  }

  /**
   * Find component by name pattern (regex)
   */
  componentsByPattern(pattern: RegExp | string): ComponentDTO[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return this.components().filter(c => regex.test(c.name));
  }

  /**
   * Check if object matches protocol
   */
  isProtocol(protocol: string): boolean {
    return this._data.protocol === protocol;
  }

  /**
   * Check if object exists
   */
  exists(): boolean {
    return this._data !== null && this._data !== undefined;
  }

  /**
   * Convert to plain object
   */
  toObject(): ObjectData {
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
  override exists(): boolean { return false; }
}

/**
 * Collection of objects with filtering capabilities
 */
export class ObjectCollection {
  private _objects: ObjectDTO[];

  constructor(objects: (ObjectDTO | ObjectData)[]) {
    this._objects = objects.map(o => o instanceof ObjectDTO ? o : new ObjectDTO(o));
  }

  /** Number of objects */
  get length(): number { return this._objects.length; }

  /**
   * Get object by index
   */
  at(index: number): ObjectDTO {
    return this._objects[index] || new NullObjectDTO();
  }

  /**
   * Get first object
   */
  first(): ObjectDTO {
    return this.at(0);
  }

  /**
   * Get last object
   */
  last(): ObjectDTO {
    return this.at(this._objects.length - 1);
  }

  /**
   * Filter by protocol
   */
  byProtocol(protocol: string): ObjectCollection {
    return new ObjectCollection(this._objects.filter(o => o.protocol === protocol));
  }

  /**
   * Filter by name pattern
   */
  byName(pattern: RegExp | string): ObjectCollection {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return new ObjectCollection(this._objects.filter(o => regex.test(o.name)));
  }

  /**
   * Filter by predicate
   */
  filter(predicate: (o: ObjectDTO) => boolean): ObjectCollection {
    return new ObjectCollection(this._objects.filter(predicate));
  }

  /**
   * Find single object
   */
  find(predicate: (o: ObjectDTO) => boolean): ObjectDTO {
    return this._objects.find(predicate) || new NullObjectDTO();
  }

  /**
   * Map over objects
   */
  map<T>(fn: (o: ObjectDTO) => T): T[] {
    return this._objects.map(fn);
  }

  /**
   * ForEach over objects
   */
  forEach(fn: (o: ObjectDTO) => void): void {
    this._objects.forEach(fn);
  }

  /**
   * Check if any object matches predicate
   */
  some(predicate: (o: ObjectDTO) => boolean): boolean {
    return this._objects.some(predicate);
  }

  /**
   * Check if all objects match predicate
   */
  every(predicate: (o: ObjectDTO) => boolean): boolean {
    return this._objects.every(predicate);
  }

  /**
   * Get all objects as array
   */
  toArray(): ObjectDTO[] {
    return [...this._objects];
  }

  /**
   * Get unique protocols
   */
  protocols(): string[] {
    return [...new Set(this._objects.map(o => o.protocol))];
  }

  /**
   * Group by protocol
   */
  groupByProtocol(): Map<string, ObjectCollection> {
    const groups = new Map<string, ObjectDTO[]>();
    for (const obj of this._objects) {
      if (!groups.has(obj.protocol)) {
        groups.set(obj.protocol, []);
      }
      groups.get(obj.protocol)!.push(obj);
    }
    return new Map([...groups].map(([k, v]) => [k, new ObjectCollection(v)]));
  }

  /**
   * Iterate over objects
   */
  [Symbol.iterator](): Iterator<ObjectDTO> {
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
  private _data: GTOData;
  private _objects: ObjectCollection;
  private _objectCache: Map<string, ObjectDTO> = new Map();

  /**
   * Create DTO from parsed GTO data
   * @param data - Parsed GTO data (from SimpleReader.result)
   */
  constructor(data: GTOData) {
    this._data = data;
    this._objects = new ObjectCollection(data.objects || []);
  }

  /** GTO version */
  get version(): number { return this._data.version; }

  /** Number of objects */
  get objectCount(): number { return this._objects.length; }

  /**
   * Get all objects
   */
  objects(): ObjectCollection {
    return this._objects;
  }

  /**
   * Get object by exact name
   */
  object(name: string): ObjectDTO {
    if (!this._objectCache.has(name)) {
      const obj = this._data.objects?.find(o => o.name === name);
      this._objectCache.set(name, obj ? new ObjectDTO(obj) : new NullObjectDTO());
    }
    return this._objectCache.get(name)!;
  }

  /**
   * Filter objects by protocol
   */
  byProtocol(protocol: string): ObjectCollection {
    return this._objects.byProtocol(protocol);
  }

  /**
   * Filter objects by name pattern
   */
  byName(pattern: RegExp | string): ObjectCollection {
    return this._objects.byName(pattern);
  }

  /**
   * Get unique protocols in the file
   */
  protocols(): string[] {
    return this._objects.protocols();
  }

  /**
   * Group objects by protocol
   */
  groupByProtocol(): Map<string, ObjectCollection> {
    return this._objects.groupByProtocol();
  }

  /**
   * Find first object matching predicate
   */
  find(predicate: (o: ObjectDTO) => boolean): ObjectDTO {
    return this._objects.find(predicate);
  }

  /**
   * Filter objects by predicate
   */
  filter(predicate: (o: ObjectDTO) => boolean): ObjectCollection {
    return this._objects.filter(predicate);
  }

  // ============================================
  // RV Session specific helpers
  // ============================================

  /**
   * Get session object (RVSession)
   */
  session(): ObjectDTO {
    return this.byProtocol('RVSession').first();
  }

  /**
   * Get all source groups
   */
  sourceGroups(): ObjectCollection {
    return this.byProtocol('RVSourceGroup');
  }

  /**
   * Get all file sources
   */
  fileSources(): ObjectCollection {
    return this.byProtocol('RVFileSource');
  }

  /**
   * Get connection graph object
   */
  connections(): ObjectDTO {
    return this.byProtocol('connection').first();
  }

  /**
   * Get all paint/annotation objects
   */
  paints(): ObjectCollection {
    return this.byProtocol('RVPaint');
  }

  /**
   * Extract media file paths
   */
  mediaPaths(): string[] {
    return this.fileSources()
      .map(s => s.component('media').property('movie').value() as string)
      .filter(Boolean);
  }

  /**
   * Get timeline info
   */
  timeline(): TimelineInfo {
    const session = this.session().component('session');
    return {
      range: (session.prop('range') as number[]) || [1, 100],
      region: (session.prop('region') as number[]) || [1, 100],
      fps: (session.prop('fps') as number) || 24,
      currentFrame: (session.prop('currentFrame') as number) || 1,
      marks: (session.prop('marks') as unknown[]) || []
    };
  }

  /**
   * Get global paint effects settings
   */
  paintEffects(): PaintEffectsInfo {
    const session = this.session().component('paintEffects');
    return {
      ghost: (session.prop('ghost') as number) || 0,
      ghostBefore: (session.prop('ghostBefore') as number) || 3,
      ghostAfter: (session.prop('ghostAfter') as number) || 3,
      hold: (session.prop('hold') as number) || 0
    };
  }

  /**
   * Get node connections as array of [from, to] pairs
   */
  connectionEdges(): Array<[string, string]> {
    return (this.connections().component('evaluation').property('connections').value() as Array<[string, string]>) || [];
  }

  /**
   * Extract all annotations (pen strokes, text)
   */
  annotations(): Annotation[] {
    const result: Annotation[] = [];
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
            brush: comp.prop('brush'),
            startFrame: comp.prop('startFrame') as number,
            duration: comp.prop('duration') as number,
            ghost: comp.prop('ghost') as number,
            ghostBefore: comp.prop('ghostBefore') as number,
            ghostAfter: comp.prop('ghostAfter') as number,
            hold: comp.prop('hold') as number
          });
        }
      }
    }
    return result;
  }

  /**
   * Convert to plain object
   */
  toObject(): GTOData {
    return { ...this._data };
  }

  /**
   * Convert to JSON string
   */
  toJSON(indent: number = 2): string {
    return JSON.stringify(this._data, null, indent);
  }
}

export default GTODTO;

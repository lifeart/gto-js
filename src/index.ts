/**
 * GTO (Graph Topology Object) TypeScript Library
 *
 * A TypeScript implementation of the GTO file format for text-based (.rv) and binary (.gto) files.
 *
 * @example
 * // Reading a GTO file
 * import { SimpleReader } from 'gto';
 *
 * const reader = new SimpleReader();
 * reader.open(fileContent);
 * console.log(reader.result);
 *
 * @example
 * // Writing a GTO file
 * import { Writer, DataType, FileType } from 'gto';
 *
 * const writer = new Writer();
 * writer.open(FileType.TextGTO);
 * writer.beginObject('cube', 'polygon', 2);
 * writer.beginComponent('points');
 * writer.property('position', DataType.Float, 8, 3);
 * writer.endComponent();
 * writer.endObject();
 * writer.beginData();
 * writer.propertyData([0, 0, 0, 1, 0, 0, ...]);
 * writer.endData();
 * const output = writer.close();
 */

// Constants and types
export {
  GTO_MAGIC,
  GTO_VERSION,
  FileType,
  DataType,
  DataTypeName,
  TypeNameToDataType,
  DataTypeSize,
  ReaderMode,
  Request,
  Interpretation,
  HeaderFlags,
  Header,
  ObjectInfo,
  ComponentInfo,
  PropertyInfo
} from './constants.js';

// String table
export { StringTable } from './string-table.js';

// Reader classes
export { Reader, SimpleReader } from './reader.js';

// Writer classes
export { Writer, SimpleWriter } from './writer.js';
export type { WriteOptions } from './writer.js';

// Builder
export { GTOBuilder, polygon, transform } from './builder.js';

// DTO (Data Transfer Object)
export { GTODTO, ObjectDTO, ComponentDTO, PropertyDTO, ObjectCollection } from './dto.js';
export type {
  GTOData,
  ObjectData,
  ComponentData,
  PropertyData,
  TimelineInfo,
  Annotation,
  SessionInfo,
  SourceInfo,
  PaintEffectsInfo,
  EDLEntry,
  ValidationResult,
  BatchResult,
  MediaValidation,
  SourceOptions,
  ColorCorrectionOptions,
  CDLOptions,
  Transform2DOptions,
  LayoutOptions,
  StereoOptions
} from './dto.js';

// Utilities
export {
  halfToFloat,
  floatToHalf,
  isLittleEndian,
  parseDimensions,
  formatDimensions
} from './utils.js';

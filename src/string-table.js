/**
 * String Table Management for GTO files
 *
 * The string table stores all strings used in a GTO file.
 * In binary format, strings are stored as null-terminated sequences,
 * and referenced by their index throughout the file.
 */

export class StringTable {
  constructor() {
    this._strings = [];           // Array of strings (index -> string)
    this._lookup = new Map();     // Reverse lookup (string -> index)
  }

  /**
   * Clear the string table
   */
  clear() {
    this._strings = [];
    this._lookup.clear();
  }

  /**
   * Get number of strings in the table
   */
  get size() {
    return this._strings.length;
  }

  /**
   * Get all strings as an array
   */
  get strings() {
    return [...this._strings];
  }

  /**
   * Add a string to the table (for reading)
   * @param {string} str - String to add
   * @returns {number} - Index of the string
   */
  add(str) {
    const index = this._strings.length;
    this._strings.push(str);
    this._lookup.set(str, index);
    return index;
  }

  /**
   * Intern a string - add if not present, return index
   * @param {string} str - String to intern
   * @returns {number} - Index of the string
   */
  intern(str) {
    const existing = this._lookup.get(str);
    if (existing !== undefined) {
      return existing;
    }
    return this.add(str);
  }

  /**
   * Lookup a string by index
   * @param {number} index - Index of the string
   * @returns {string} - The string at the index
   */
  stringFromId(index) {
    if (index < 0 || index >= this._strings.length) {
      throw new Error(`String index ${index} out of range (0-${this._strings.length - 1})`);
    }
    return this._strings[index];
  }

  /**
   * Lookup an index by string
   * @param {string} str - String to lookup
   * @returns {number|undefined} - Index of the string, or undefined if not found
   */
  lookup(str) {
    return this._lookup.get(str);
  }

  /**
   * Check if a string exists in the table
   * @param {string} str - String to check
   * @returns {boolean}
   */
  has(str) {
    return this._lookup.has(str);
  }

  /**
   * Read string table from a DataView (binary format)
   * @param {DataView} view - DataView containing the string data
   * @param {number} offset - Starting offset in the view
   * @param {number} numStrings - Number of strings to read
   * @param {boolean} littleEndian - Byte order
   * @returns {number} - Number of bytes consumed
   */
  readFromBinary(view, offset, numStrings, littleEndian = true) {
    this.clear();
    let pos = offset;

    for (let i = 0; i < numStrings; i++) {
      let str = '';
      while (pos < view.byteLength) {
        const byte = view.getUint8(pos++);
        if (byte === 0) break;
        str += String.fromCharCode(byte);
      }
      this.add(str);
    }

    return pos - offset;
  }

  /**
   * Write string table to binary format
   * @returns {Uint8Array} - Binary representation of the string table
   */
  writeToBinary() {
    // Calculate total size needed
    let totalSize = 0;
    for (const str of this._strings) {
      totalSize += new TextEncoder().encode(str).length + 1; // +1 for null terminator
    }

    const buffer = new Uint8Array(totalSize);
    let offset = 0;

    const encoder = new TextEncoder();
    for (const str of this._strings) {
      const encoded = encoder.encode(str);
      buffer.set(encoded, offset);
      offset += encoded.length;
      buffer[offset++] = 0; // Null terminator
    }

    return buffer;
  }
}

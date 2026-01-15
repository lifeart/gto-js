/**
 * String Table Management for GTO files
 *
 * The string table stores all strings used in a GTO file.
 * In binary format, strings are stored as null-terminated sequences,
 * and referenced by their index throughout the file.
 */

export class StringTable {
  private _strings: string[] = [];           // Array of strings (index -> string)
  private _lookup: Map<string, number> = new Map();     // Reverse lookup (string -> index)

  /**
   * Clear the string table
   */
  clear(): void {
    this._strings = [];
    this._lookup.clear();
  }

  /**
   * Get number of strings in the table
   */
  get size(): number {
    return this._strings.length;
  }

  /**
   * Get all strings as an array
   */
  get strings(): string[] {
    return [...this._strings];
  }

  /**
   * Add a string to the table (for reading)
   * @param str - String to add
   * @returns Index of the string
   */
  add(str: string): number {
    const index = this._strings.length;
    this._strings.push(str);
    this._lookup.set(str, index);
    return index;
  }

  /**
   * Intern a string - add if not present, return index
   * @param str - String to intern
   * @returns Index of the string
   */
  intern(str: string): number {
    const existing = this._lookup.get(str);
    if (existing !== undefined) {
      return existing;
    }
    return this.add(str);
  }

  /**
   * Lookup a string by index
   * @param index - Index of the string
   * @returns The string at the index
   */
  stringFromId(index: number): string {
    if (index < 0 || index >= this._strings.length) {
      throw new Error(`String index ${index} out of range (0-${this._strings.length - 1})`);
    }
    return this._strings[index];
  }

  /**
   * Lookup an index by string
   * @param str - String to lookup
   * @returns Index of the string, or undefined if not found
   */
  lookup(str: string): number | undefined {
    return this._lookup.get(str);
  }

  /**
   * Check if a string exists in the table
   * @param str - String to check
   */
  has(str: string): boolean {
    return this._lookup.has(str);
  }

  /**
   * Read string table from a DataView (binary format)
   * @param view - DataView containing the string data
   * @param offset - Starting offset in the view
   * @param numStrings - Number of strings to read
   * @param _littleEndian - Byte order (unused, strings are byte-aligned)
   * @returns Number of bytes consumed
   */
  readFromBinary(view: DataView, offset: number, numStrings: number, _littleEndian: boolean = true): number {
    this.clear();
    let pos = offset;
    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < numStrings; i++) {
      // Find the null terminator
      let endPos = pos;
      while (endPos < view.byteLength && view.getUint8(endPos) !== 0) {
        endPos++;
      }
      // Decode the UTF-8 bytes
      const bytes = new Uint8Array(view.buffer, view.byteOffset + pos, endPos - pos);
      const str = decoder.decode(bytes);
      this.add(str);
      pos = endPos + 1; // Skip past null terminator
    }

    return pos - offset;
  }

  /**
   * Write string table to binary format
   * @returns Binary representation of the string table
   */
  writeToBinary(): Uint8Array {
    // Calculate total size needed
    const encoder = new TextEncoder();
    let totalSize = 0;
    for (const str of this._strings) {
      totalSize += encoder.encode(str).length + 1; // +1 for null terminator
    }

    const buffer = new Uint8Array(totalSize);
    let bufferOffset = 0;

    for (const str of this._strings) {
      const encoded = encoder.encode(str);
      buffer.set(encoded, bufferOffset);
      bufferOffset += encoded.length;
      buffer[bufferOffset++] = 0; // Null terminator
    }

    return buffer;
  }
}

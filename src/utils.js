/**
 * Utility functions for GTO library
 */

/**
 * Convert a 16-bit half-precision float to 32-bit float
 * @param {number} half - 16-bit half-precision float as integer
 * @returns {number} - 32-bit float value
 */
export function halfToFloat(half) {
  const sign = (half >> 15) & 0x1;
  const exponent = (half >> 10) & 0x1f;
  const mantissa = half & 0x3ff;

  if (exponent === 0) {
    if (mantissa === 0) {
      // Zero
      return sign ? -0 : 0;
    }
    // Denormalized number
    const f = mantissa / 1024;
    return (sign ? -1 : 1) * f * Math.pow(2, -14);
  } else if (exponent === 31) {
    if (mantissa === 0) {
      // Infinity
      return sign ? -Infinity : Infinity;
    }
    // NaN
    return NaN;
  }

  // Normalized number
  const f = 1 + mantissa / 1024;
  return (sign ? -1 : 1) * f * Math.pow(2, exponent - 15);
}

/**
 * Convert a 32-bit float to 16-bit half-precision float
 * @param {number} float32 - 32-bit float value
 * @returns {number} - 16-bit half-precision float as integer
 */
export function floatToHalf(float32) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setFloat32(0, float32, true);
  const bits = view.getUint32(0, true);

  const sign = (bits >> 31) & 0x1;
  const exponent = (bits >> 23) & 0xff;
  const mantissa = bits & 0x7fffff;

  if (exponent === 0) {
    // Zero or denormalized
    return sign << 15;
  } else if (exponent === 255) {
    // Infinity or NaN
    if (mantissa === 0) {
      return (sign << 15) | 0x7c00;
    }
    return (sign << 15) | 0x7c00 | (mantissa >> 13);
  }

  const newExponent = exponent - 127 + 15;
  if (newExponent >= 31) {
    // Overflow to infinity
    return (sign << 15) | 0x7c00;
  } else if (newExponent <= 0) {
    // Underflow to zero or denormalized
    if (newExponent < -10) {
      return sign << 15;
    }
    const m = (mantissa | 0x800000) >> (1 - newExponent + 13);
    return (sign << 15) | m;
  }

  return (sign << 15) | (newExponent << 10) | (mantissa >> 13);
}

/**
 * Swap byte order for 16-bit values
 * @param {number} value - 16-bit value
 * @returns {number} - Byte-swapped value
 */
export function swap16(value) {
  return ((value & 0xff) << 8) | ((value >> 8) & 0xff);
}

/**
 * Swap byte order for 32-bit values
 * @param {number} value - 32-bit value
 * @returns {number} - Byte-swapped value
 */
export function swap32(value) {
  return (
    ((value & 0xff) << 24) |
    ((value & 0xff00) << 8) |
    ((value >> 8) & 0xff00) |
    ((value >> 24) & 0xff)
  );
}

/**
 * Swap byte order for 64-bit values (as BigInt)
 * @param {bigint} value - 64-bit value
 * @returns {bigint} - Byte-swapped value
 */
export function swap64(value) {
  const hi = Number(value >> 32n) >>> 0;
  const lo = Number(value & 0xffffffffn) >>> 0;
  return (BigInt(swap32(lo)) << 32n) | BigInt(swap32(hi));
}

/**
 * Detect system endianness
 * @returns {boolean} - True if little-endian
 */
export function isLittleEndian() {
  const buffer = new ArrayBuffer(2);
  new DataView(buffer).setInt16(0, 256, true);
  return new Int16Array(buffer)[0] === 256;
}

/**
 * Align offset to next boundary
 * @param {number} offset - Current offset
 * @param {number} alignment - Alignment boundary
 * @returns {number} - Aligned offset
 */
export function alignTo(offset, alignment) {
  return Math.ceil(offset / alignment) * alignment;
}

/**
 * Parse dimension string like "[4,10,20,30]" to array
 * @param {string} dimStr - Dimension string
 * @returns {number[]} - Array of dimensions
 */
export function parseDimensions(dimStr) {
  if (!dimStr || dimStr === '[]') return [1];
  const inner = dimStr.slice(1, -1); // Remove [ and ]
  if (!inner) return [1];
  return inner.split(',').map(s => parseInt(s.trim(), 10));
}

/**
 * Format dimensions array to string
 * @param {number[]} dims - Array of dimensions
 * @returns {string} - Dimension string
 */
export function formatDimensions(dims) {
  if (!dims || dims.length === 0 || (dims.length === 1 && dims[0] === 1)) {
    return '';
  }
  return `[${dims.join(',')}]`;
}

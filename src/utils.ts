import {ExportedBigInt} from './types'

/**
 * Create a new array fill with a base value
 * @param size - The size of the array
 * @param defaultValue - The default value used to fill the array. If it's a function, it will be invoked to get the default value.
 * @return A newly allocated array
 * @memberof Utils
 */
export function allocateArray<T>(
  size: number,
  defaultValue: T | (() => T)
): Array<T> {
  const array: Array<T> = new Array<T>(size)
  const getDefault =
    typeof defaultValue === 'function'
      ? (defaultValue as () => T)
      : () => defaultValue
  for (let ind = 0; ind < size; ind++) {
    array[ind] = getDefault()
  }
  return array
}

/**
 * Return a number to its Hex format by padding zeroes if length mod 4 != 0
 * @param elem the element to transform in HEX
 * @returns the HEX number padded of zeroes
 */
export function numberToHex(elem: number): string {
  let e = Number(elem).toString(16)
  if (e.length % 4 !== 0) {
    e = '0'.repeat(4 - (e.length % 4)) + e
  }
  return e
}

/**
 * Generate a random int between two bounds (included)
 * @param min - The lower bound
 * @param max - The upper bound
 * @param random - Function used to generate random floats
 * @return A random int bewteen lower and upper bound (included)
 * @memberof Utils
 * @author Thomas Minier
 */
export function randomInt(
  min: number,
  max: number,
  random?: () => number
): number {
  if (random === undefined) {
    random = Math.random
  }
  min = Math.ceil(min)
  max = Math.floor(max)
  const rn = random()
  return Math.floor(rn * (max - min + 1)) + min
}

/**
 * Return true if the buffer is empty, i.e., all value are equals to 0.
 * @param  buffer - The buffer to inspect
 * @return True if the buffer only contains zero, False otherwise
 * @author Arnaud Grall
 */
export function isEmptyBuffer(buffer: Buffer | null): boolean {
  if (buffer === null || !buffer) return true
  for (const value of buffer) {
    if (value !== 0) {
      return false
    }
  }
  return true
}

/**
 * Return the default seed used in the package
 * @return A seed as a big integer
 * @author Arnaud Grall
 */
export function getDefaultSeed(): bigint {
  return 0x1234567890n
}

/**
 * Return the non-destructive XOR of two Uint8Array
 * @param a - The Uint8Array to copy, then to xor with b
 * @param b - The Uint8Array to xor with
 * @return The results of the XOR between the two Uint8Array
 * @author Arnaud Grall
 */
export function xorUint8Array(a: Uint8Array, b: Uint8Array): Uint8Array {
  const length = Math.max(a.length, b.length)
  const buffer = new Uint8Array(length).fill(0)
  for (let i = 0; i < length; ++i) {
    if (i < a.length && i < b.length) {
      buffer[length - i - 1] = a[a.length - i - 1] ^ b[b.length - i - 1]
    } else if (i < a.length && i >= b.length) {
      buffer[length - i - 1] ^= a[a.length - i - 1]
    } else if (i < b.length && i >= a.length) {
      buffer[length - i - 1] ^= b[b.length - i - 1]
    }
  }
  // now need to remove leading zeros in the buffer if any
  let start = 0
  const it = buffer.values()
  let value = it.next()
  while (!value.done && value.value === 0) {
    start++
    value = it.next()
  }
  return Uint8Array.prototype.slice.call(buffer, start)
}

/**
 * Perform an equality check between 2 Uint8Array
 * @param a
 * @param b
 * @returns
 */
export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Return the absolute value of a bigint
 * @param n
 * @returns
 */
export function getBigIntAbs(n: bigint): bigint {
  return n < 0n ? -n : n
}

/**
 * Export a bigint into a serializable format
 * @param value
 * @returns
 */
export function exportBigInt(value: bigint): ExportedBigInt {
  return {
    $bf$bigint: value.toString(),
  }
}

/**
 * Import a serialized bigint into a Bigint
 * @param value
 * @returns
 */
export function importBigInt(value: ExportedBigInt) {
  return BigInt(value.$bf$bigint)
}

const max = 2n ** (64n - 1n) - 1n
export function bigIntToNumber(int: bigint): number {
  if (int > max) throw new Error("Number doesn't fit in signed 64-bit integer!")
  return Number(BigInt.asIntN(64, int))
}

/**
 * Return the next nearest power of 2 of the specified input
 * @param x
 * @returns
 */
export function getNearestPow2(x: bigint) {
  x--
  x |= x >> 1n
  x |= x >> 2n
  x |= x >> 4n
  x |= x >> 8n
  x |= x >> 16n
  x |= x >> 32n
  x++
  return x
}

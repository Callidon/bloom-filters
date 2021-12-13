/* file : utils.ts
MIT License

Copyright (c) 2017-2020 Thomas Minier & Arnaud Grall

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import XXH from 'xxhashjs'

/**
 * Utilitaries functions
 * @namespace Utils
 * @private
 */

/* JSDOC typedef */
/**
 * @typedef {TwoHashes} Two hashes of the same value, as computed by {@link hashTwice}.
 * @property {number} first - The result of the first hashing function applied to a value
 * @property {number} second - The result of the second hashing function applied to a value
 * @memberof Utils
 */
export interface TwoHashes {
  first: number
  second: number
}

/**
 * Templated TwoHashes type
 */
export interface TwoHashesTemplated<T> {
  first: T
  second: T
}

/**
 * TwoHashes type in number and int format
 */
export interface TwoHashesIntAndString {
  int: TwoHashesTemplated<number>
  string: TwoHashesTemplated<string>
}

/**
 * Data type of an hashable value, must be string, ArrayBuffer or Buffer.
 */
export type HashableInput = string | ArrayBuffer | Buffer

/**
 * @internal
 * Internal variable for switching XXH hash function from/to 32/64 bits type.
 * Can be overrided as long as you respect the XXH.HashInterface type.
 * Only .toNumber() is used in the package. see {@link serialize}
 */
let serialize_function: XXH.HashInterface = XXH.h64

/**
 * Allow to switch the hash function between XXH.h32 or XXH.h64 bits ({@link serialize_function})
 * @param base 32 or 64 by default
 * @returns
 */
export function switchSerializationType(base: any = 64) {
  switch (base) {
    case 32:
      serialize_function = XXH.h32
      break
    case 64:
    default:
      serialize_function = XXH.h64
  }
}

/**
 * Hash an element of type {@link HashableInput} into {@link Number}
 * Can be overrided as long as you return a value of type {@link Number}
 * Don't forget to use the seed when hashing, otherwise if some kind of randomness is in the process 
 * you may have inconsistent behaviors between 2 runs.
 * @param element
 * @param seed
 * @returns A 64bits floating point {@link Number}
 */
export function serialize(element: HashableInput, seed?: number) {
  if (!seed) {
    seed = getDefaultSeed()
  }
  return Number(serialize_function(element, seed).toNumber())
}

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
  const array: Array<T> = new Array(size)
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
function numberToHex(elem: number): string {
  let e = Number(elem).toString(16)
  if (e.length % 4 !== 0) {
    e = '0'.repeat(4 - (e.length % 4)) + e
  }
  return e
}

/**
 * (64-bits only) Hash a value into two values (in hex or integer format)
 * @param  value - The value to hash
 * @param  asInt - (optional) If True, the values will be returned as an integer. Otherwise, as hexadecimal values.
 * @param seed the seed used for hashing
 * @return The results of the hash functions applied to the value (in hex or integer)
 * @memberof Utils
 * @author Arnaud Grall & Thomas Minier
 */
export function hashTwice(value: HashableInput, seed?: number): TwoHashes {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  return {
    first: serialize(value, seed + 1),
    second: serialize(value, seed + 2),
  }
}

/**
 * Hash twice an element into their HEX string representations
 * @param value
 * @param seed
 * @returns TwoHashesTemplated<string>
 */
export function hashTwiceAsString(
  value: HashableInput,
  seed?: number
): TwoHashesTemplated<string> {
  const {first, second} = hashTwice(value, seed)
  return {
    first: numberToHex(first),
    second: numberToHex(second),
  }
}

/**
 * (64-bits only) Same as hashTwice but return Numbers and String equivalent
 * @param  val the value to hash
 * @param  seed the seed to change when hashing
 * @return TwoHashesIntAndString
 * @author Arnaud Grall
 */
export function HashTwiceIntAndString(
  val: HashableInput,
  seed?: number
): TwoHashesIntAndString {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  const one = hashIntAndString(val, seed + 1)
  const two = hashIntAndString(val, seed + 2)
  return {
    int: {
      first: one.int,
      second: two.int,
    },
    string: {
      first: one.string,
      second: two.string,
    },
  }
}

/**
 * Hash an item as an unsigned int
 * @param  elem - Element to hash
 * @param  seed - The hash seed. If its is UINT32 make sure to set the length to 32
 * @param  length - The length of hashes (defaults to 32 bits)
 * @return The hash value as an unsigned int
 * @author Arnaud Grall
 */
export function hashAsInt(elem: HashableInput, seed?: number): number {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  return serialize(elem, seed)
}

/**
 * Hash an item and return its number and HEX string representation
 * @param  elem - Element to hash
 * @param  seed - The hash seed. If its is UINT32 make sure to set the length to 32
 * @param  base - The base in which the string will be returned, default: 16
 * @param  length - The length of hashes (defaults to 32 bits)
 * @return The item hased as an int and a string
 * @author Arnaud Grall
 */
export function hashIntAndString(elem: HashableInput, seed?: number) {
  const hash = hashAsInt(elem, seed)
  return {int: hash, string: numberToHex(hash)}
}

/**
 * Apply enhanced Double Hashing to produce a n-hash
 * @see {@link http://peterd.org/pcd-diss.pdf} s6.5.4
 * @param  n - The indice of the hash function we want to produce
 * @param  hashA - The result of the first hash function applied to a value.
 * @param  hashB - The result of the second hash function applied to a value.
 * @param  size - The size of the datastructures associated to the hash context (ex: the size of a Bloom Filter)
 * @return The result of hash_n applied to a value.
 * @memberof Utils
 * @author Thomas Minier
 * @author Arnaud Grall
 */
export function doubleHashing(
  n: number,
  hashA: number,
  hashB: number,
  size: number
): number {
  return Math.abs((hashA + n * hashB + Math.floor((n ** 3 - n) / 6)) % size)
}

/**
 * Generate a set of distinct indexes on interval [0, size) using the double hashing technique
 * For generating efficiently distinct indexes we re-hash after detecting a cycle by changing slightly the seed.
 * It has the effect of generating faster distinct indexes without loosing entirely the utility of the double hashing.
 * For small number of indexes it will work perfectly. For a number close to the size, and size very large
 * Advise: do not generate `size` indexes for a large interval. In practice, size should be equal
 * to the number of hash functions used and is often low.
 *
 * @param  element  - The element to hash
 * @param  size     - the range on which we can generate an index [0, size) = size
 * @param  number   - The number of indexes desired
 * @param  seed     - The seed used
 * @return Array<number>
 * @author Arnaud Grall
 * @author Simon Woolf (SimonWoolf)
 */
export function getDistinctIndexes(
  element: HashableInput,
  size: number,
  number: number,
  seed?: number
): Array<number> {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  let n = 0
  const indexes: Set<number> = new Set()
  let hashes = hashTwice(element, seed)
  // let cycle = 0
  while (indexes.size < number) {
    const ind = hashes.first % size
    if (!indexes.has(ind)) {
      indexes.add(ind)
    }
    hashes.first = (hashes.first + hashes.second) % size
    hashes.second = (hashes.second + n) % size
    n++

    if (n > size) {
      // Enhanced double hashing stops cycles of length less than `size` in the case where
      // size is coprime with the second hash. But you still get cycles of length `size`.
      // So if we reach there and haven't finished, append a prime to the input and
      // rehash.
      seed++
      hashes = hashTwice(element, seed)
    }
  }
  return [...indexes.values()]
}

/**
 * Generate N indexes on range [0, size)
 * It uses the double hashing technique to generate the indexes.
 * It hash twice the value only once before generating the indexes.
 * Warning: you can have a lot of modulo collisions.
 * @param  element    - The element to hash
 * @param  size       - The range on which we can generate the index, exclusive
 * @param  hashCount  - The number of indexes we want
 * @return An array of indexes on range [0, size)
 */
export function getIndexes(
  element: HashableInput,
  size: number,
  hashCount: number,
  seed?: number
): Array<number> {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  const arr = []
  const hashes = hashTwice(element, seed)
  for (let i = 0; i < hashCount; i++) {
    arr.push(doubleHashing(i, hashes.first, hashes.second, size))
  }
  return arr
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
 * Return the non-destructive XOR of two buffers
 * @param a - The buffer to copy, then to xor with b
 * @param b - The buffer to xor with
 * @return The results of the XOR between the two buffers
 * @author Arnaud Grall
 */
export function xorBuffer(a: Buffer, b: Buffer): Buffer {
  const length = Math.max(a.length, b.length)
  const buffer = Buffer.allocUnsafe(length).fill(0)
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
  return buffer.slice(start)
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
 * @return A seed as a floating point number
 * @author Arnaud Grall
 */
export function getDefaultSeed(): number {
  return 0x1234567890
}

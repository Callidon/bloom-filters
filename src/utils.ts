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
  first: number,
  second: number
}

export type HashableInput = string | ArrayBuffer | Buffer

/**
 * Create a new array fill with a base value
 * @param size - The size of the array
 * @param defaultValue - The default value used to fill the array. If it's a function, it will be invoked to get the default value.
 * @return A newly allocated array
 * @memberof Utils
 */
export function allocateArray<T> (size: number, defaultValue: T | (() => T)): Array<T> {
  const array: Array<T> = new Array(size)
  const getDefault = (typeof defaultValue === 'function') ? defaultValue as () => T : () => defaultValue
  for (let ind = 0; ind < size; ind++) {
    array[ind] = getDefault()
  }
  return array
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
export function hashTwice (value: HashableInput, asInt?: boolean, seed?: number): TwoHashes {
  if (asInt === undefined) {
    asInt = false
  }
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  const f = XXH.h64(value, seed + 1)
  const l = XXH.h64(value, seed + 2)
  if (asInt) {
    return {
      first: f.toNumber(),
      second: l.toNumber()
    }
  } else {
    let one = f.toString(16)
    if (one.length < 16) {
      one = '0'.repeat(16 - one.length) + one
    }
    let two = l.toString(16)
    if (two.length < 16) {
      two = '0'.repeat(16 - two.length) + two
    }
    return {
      first: Number(one),
      second: Number(two)
    }
  }
}

export function hashTwiceAsString (value: HashableInput, seed?: number) {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
const f = XXH.h64(value, seed + 1)
const l = XXH.h64(value, seed + 2)
  let one = f.toString(16)
  if (one.length < 16) one = '0'.repeat(16 - one.length) + one
  let two = l.toString(16)
  if (two.length < 16) two = '0'.repeat(16 - two.length) + two
  return {
    first: one,
    second: two
  }
}

/**
 * (64-bits only) Same as hashTwice but return Numbers and String equivalent
 * @param  val the value to hash
 * @param  seed the seed to change when hashing
 * @return A object of shape {int: {first: <number>, second: <number>}, string: {first: <hex-string>, second: <hex-string>}
 * @author Arnaud Grall
 */
export function allInOneHashTwice (val: HashableInput, seed?: number) {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  const one = XXH.h64(val, seed + 1)
  const two = XXH.h64(val, seed + 2)
  let stringOne = one.toString(16)
  if (stringOne.length < 16) stringOne = '0'.repeat(16 - stringOne.length) + stringOne
  let stringTwo = two.toString(16)
  if (stringTwo.length < 16) stringTwo = '0'.repeat(16 - stringTwo.length) + stringTwo

  return {
    int: {
      first: one.toNumber(),
      second: two.toNumber()
    },
    string: {
      first: stringOne,
      second: stringTwo
    }
  }
}

/**
 * Apply Double Hashing to produce a n-hash
 *
 * This implementation used directly the value produced by the two hash functions instead of the functions themselves.
 * @see {@link http://citeseer.ist.psu.edu/viewdoc/download;jsessionid=4060353E67A356EF9528D2C57C064F5A?doi=10.1.1.152.579&rep=rep1&type=pdf} for more details about double hashing.
 * @param  n - The indice of the hash function we want to produce
 * @param  hashA - The result of the first hash function applied to a value.
 * @param  hashB - The result of the second hash function applied to a value.
 * @param  size - The size of the datastructures associated to the hash context (ex: the size of a Bloom Filter)
 * @return The result of hash_n applied to a value.
 * @memberof Utils
 * @author Thomas Minier
 */
export function doubleHashing (n: number, hashA: number, hashB: number, size: number): number {
  return Math.abs((hashA + n * hashB) % size)
}

/**
 * Generate a set of distinct indexes on interval [0, size) using the double hashing technique
 * @param  element  - The element to hash
 * @param  size     - the range on which we can generate an index [0, size) = size
 * @param  number   - The number of indexes desired
 * @param  seed     - The seed used
 * @return A array of indexes
 * @author Arnaud Grall
 */
export function getDistinctIndices (element: HashableInput, size: number, number: number, seed?: number): Array<number> {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  function getDistinctIndicesBis (n: number, elem: HashableInput, size: number, count: number, indexes: Array<number> = []): Array<number> {
    if (indexes.length === count) {
      return indexes
    } else {
      const hashes = hashTwice(elem, true, seed! + size % n)
      const ind = doubleHashing(n, hashes.first, hashes.second, size)
      if (indexes.includes(ind)) {
        // console.log('generate index: %d for %s', ind, elem)
        return getDistinctIndicesBis(n + 1, elem, size, count, indexes)
      } else {
        // console.log('already found: %d for %s', ind, elem)
        indexes.push(ind)
        return getDistinctIndicesBis(n + 1, elem, size, count, indexes)
      }
    }
  }
  return getDistinctIndicesBis(1, element, size, number)
}

/**
 * Generate hashCount indexes, one index per [0, size)
 * it uses the double hashing technique to generate the indexes
 * @param  element    - The element to hash
 * @param  size       - The range on which we can g-enerate the index, exclusive
 * @param  hashCount  - The number of indexes we want
 * @return An array of indexes
 */
export function getIndices (element: HashableInput, size: number, hashCount: number, seed?: number): Array<number> {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  const arr = []
  for (let i = 1; i <= hashCount; i++) {
    const hashes = hashTwice(element, true, seed + size % i)
    arr.push(doubleHashing(i, hashes.first, hashes.second, size))
  }
  if (arr.length !== hashCount) throw new Error('report this, please, shouldnt be of different size')
  return arr
}

/**
 * Generate a random int bewteen two bounds (included)
 * @param min - The lower bound
 * @param max - The upper bound
 * @param random - Function used to generate random floats
 * @return A random int bewteen lower and upper bound (included)
 * @memberof Utils
 * @author Thomas Minier
 */
export function randomInt (min: number, max: number, random?: () => number): number {
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
export function xorBuffer (a: Buffer, b: Buffer): Buffer {
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
  const buf2 = buffer.slice(start)
  return buf2
}

/**
 * Return true if the buffer is empty, i.e., all value are equals to 0.
 * @param  buffer - The buffer to inspect
 * @return True if the buffer only contains zero, False otherwise
 * @author Arnaud Grall
 */
export function isEmptyBuffer (buffer: Buffer | null): boolean {
  if (buffer === null || !buffer) return true
  for(let value of buffer) {
    if (value !== 0) {
      return false
    }
  }
  return true
  // const json = buffer.toJSON()
  // let i = 0
  // let found = false
  // while (!found && i < json.data.length) {
  //   if (json.data[i] !== 0) {
  //     found = true
  //   }
  //   i++
  // }
  // return !found
}

/**
 * Hash an item as an unsigned int
 * @param  elem - Element to hash
 * @param  seed - The hash seed. If its is UINT32 make sure to set the length to 32
 * @param  length - The length of hashes (defaults to 64 bits)
 * @return The hash value as an unsigned int
 * @author Arnaud Grall
 */
export function hashAsInt (elem: HashableInput, seed?: number, length?: number): number {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  switch (length) {
    case 32:
      return XXH.h32(elem, seed).toNumber()
    case 64:
      return XXH.h64(elem, seed).toNumber()
    default:
      return XXH.h64(elem, seed).toNumber()
  }
}

/**
 * Hash an item as a string
 * @param  elem - Element to hash
 * @param  seed - The hash seed. If its is UINT32 make sure to set the length to 32
 * @param  base - The base in which the string will be returned, default: 16
 * @param  length - The length of hashes (defaults to 64 bits)
 * @return The hashed value as a string
 * @author Arnaud Grall
 */
export function hashAsString (elem: HashableInput, seed?: number, base?: number, length?: number): string {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  if (base === undefined) {
    base = 16
  }
  if (length === undefined) {
    length = 64
  }
  let hash
  switch (length) {
    case 32:
      hash = XXH.h32(elem, seed)
      break
    case 64:
      hash = XXH.h64(elem, seed)
      break
    default:
      hash = XXH.h64(elem, seed)
      break
  }
  let result: string = ''
  if (base === 16) {
    result = hash.toString(base)
    if (result.length < (length / 4)) {
      result = '0'.repeat((length / 4) - result.length) + result
    }
  } else if (base === 2) {
    result = hex2bin(hash.toString(16))
    if (result.length < length) {
      result = '0'.repeat(length - result.length) + result
    }
  }
  return result
}

/**
 * Hash an item as a string
 * @param  elem - Element to hash
 * @param  seed - The hash seed. If its is UINT32 make sure to set the length to 32
 * @param  base - The base in which the string will be returned, default: 16
 * @param  length - The length of hashes (defaults to 64 bits)
 * @return The item hased as an int and a string
 * @author Arnaud Grall
 */
export function hashIntAndString (elem: HashableInput, seed?: number, base?: number, length?: number) {
  if (seed === undefined) {
    seed = getDefaultSeed()
  }
  if (base === undefined) {
    base = 16
  }
  if (length === undefined) {
    length = 64
  }
  let hash
  switch (length) {
    case 32:
      hash = XXH.h32(elem, seed)
      break
    case 64:
      hash = XXH.h64(elem, seed)
      break
    default:
      hash = XXH.h64(elem, seed)
      break
  }
  let result: string = ''
  if (base === 16) {
    result = hash.toString(base)
    if (result.length < (length / 4)) {
      result = '0'.repeat((length / 4) - result.length) + result
    }
  } else if (base === 2) {
    result = hex2bin(hash.toString(16))
    if (result.length < length) {
      result = '0'.repeat(length - result.length) + result
    }
  }
  return { int: hash.toNumber(), string: result }
}

/**
 * Return the default seed used in the package
 * @return A ssed as a floating point number
 * @author Arnaud Grall
 */
export function getDefaultSeed (): number {
  return 0x1234567890
}

/**
 * Return the next power of 2 of x
 * @param  x - Value
 * @return The next power of 2 of x
 */
export function power2 (x: number): number {
  return Math.ceil(Math.pow(2, Math.floor(Math.log(x) / Math.log(2))))
}

/**
 * Convert an hex string into a binary string
 * @param  hex  - A base 16 string
 * @return A base 2 string
 */
export function hex2bin (hex: string): string {
  return parseInt(hex, 16).toString(2)
}

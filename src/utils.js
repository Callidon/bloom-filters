/* file : utils.js
MIT License

Copyright (c) 2017 Thomas Minier & Arnaud Grall

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

const XXH = require('xxhashjs')

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

/**
 * Create a new array fill with a base value
 * @param  {int} size - The size of the array
 * @param  {*} defaultValue - The default value used to fill the array. If it's a function, it will be invoked to get the default value.
 * @return {Array} A newly allocated array
 * @memberof Utils
 */
const allocateArray = (size, defaultValue) => {
  const array = new Array(size)
  const getDefault = (typeof defaultValue !== 'function') ? () => defaultValue : defaultValue
  for (let ind = 0; ind < size; ind++) {
    array[ind] = getDefault()
  }
  return array
}

/**
 * Hash a value into two values (in hex or integer format)
 *
 * It uses XXHASH algorithms: xxHash is an extremely fast non-cryptographic hash algorithm, working at speeds close to RAM limits. It is proposed in two flavors, 32 and 64 bits.
 * @see {@link https://cyan4973.github.io/xxHash/} for more details about XXHASH
 * @param  {string|ArrayBuffer|Buffer} value - The value to hash
 * @param  {boolean} [asInt=false] - (optional) If True, the values will be returned as an integer. Otherwise, as hexadecimal values.
 * @param {Number} seed the seed used for hashing
 * @return {TwoHashes} The results of the hash functions applied to the value (in hex or integer)
 * @memberof Utils
 */
const hashTwice = (value, asInt = false, seed = getDefaultSeed()) => {
  const length = 16
  if (asInt) {
    return {
      first: XXH.h64(value, seed + 1).toNumber(),
      second: XXH.h64(value, seed + 2).toNumber()
    }
  } else {
    let one = XXH.h64(value, seed + 1).toString(16)
    if (one.length < length) one = '0'.repeat(length - one.length) + one
    // const one = murmur.x64.hash128(val, seed + 1)
    let two = XXH.h64(value, seed + 2).toString(16)
    if (two.length < length) two = '0'.repeat(length - two.length) + two
    return {
      first: one,
      second: two
    }
  }
}

/**
 * Same as hashTwice but return Numbers and String equivalent
 * @param  {string|ArrayBuffer|Buffer} val the value to hash
 * @param  {Number} seed the seed to change when hashing
 * @return {Object} {int: {first: <number>, second: <number>}, string: {first: <hex-string>, second: <hex-string>}
 */
const allInOneHashTwice = (val, seed = 0) => {
  const length = 16
  let one = XXH.h64(val, seed + 1)
  let two = XXH.h64(val, seed + 2)
  let stringOne = one.toString(length)
  if (stringOne.length < length) stringOne = '0'.repeat(length - stringOne.length) + stringOne

  let stringTwo = two.toString(length)
  if (stringTwo.length < length) stringTwo = '0'.repeat(length - stringTwo.length) + stringTwo

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
 * @param  {int} n - The indice of the hash function we want to produce
 * @param  {int} hashA - The result of the first hash function applied to a value.
 * @param  {int} hashB - The result of the second hash function applied to a value.
 * @param  {int} size - The size of the datastructures associated to the hash context (ex: the size of a Bloom Filter)
 * @return {int} - The result of hash_n applied to a value.
 * @memberof Utils
 */
const doubleHashing = (n, hashA, hashB, size) => {
  return Math.abs(hashA + n * hashB) % size
}

/**
 * Generate x distinct indexes on [0, size) using the double hashing technique
 * @param  {*} element   The element to hash
 * @param  {Number} size      [description]
 * @param  {Number} hashcount The number of indexes desired
 * @param  {Number} seed the seed used
 * @return {Number[]}           index among [0, size)
 */
const getDistinctIndices = (element, size, hashcount, seed = getDefaultSeed()) => {
  const getDistinctIndicesBis = (n, elem, size, count, indexes = new Map()) => {
    const hashes = hashTwice(n + elem, true, seed)
    const ind = doubleHashing(n, hashes.first, hashes.second, size)
    if (indexes.has(ind)) {
      return getDistinctIndicesBis(n + 1, elem, size, count, indexes)
    } else {
      indexes.set(ind, ind)
      if (indexes.size === count) {
        return [...indexes.keys()]
      } else {
        return getDistinctIndicesBis(n + 1, elem, size, count, indexes)
      }
    }
  }
  return getDistinctIndicesBis(1, element, size, hashcount)
}

/**
 * Generate a random int bewteen two bounds (included)
 * @param {int} min - The lower bound
 * @param {int} max - The upper bound
 * @return {int} A random int bewteen lower and upper bound (included)
 * @memberof Utils
 */
const randomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Return the non-destructive XOR of 2 buffers
 * @param  {Buffer} a                          the buffer to copy, then to xor with b
 * @param  {Buffer} b                          the buffer to xor with
 * @param  {Object} [options={}]               options to pass to the new buffer
 */
function xorBuffer (a, b, options = {}, val = true) {
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
  // now need to remove leading zeroes in the buffer if any
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
 * Return true if the buffer isEmpty, aka all value are equals to 0.
 * @param  {Buffer}  buffer the buffer to inspect
 * @return {Boolean}        true if empty or null or undefined, false otherwise
 */
function isEmptyBuffer (buffer) {
  if (buffer === null || !buffer) return true
  const json = buffer.toJSON()
  let i = 0
  let found = false
  while (!found && i < json.data.length) {
    if (json.data[i] !== 0) {
      found = true
    }
    i++
  }
  return !found
}

/**
 * Return a hash as un unsigned int
 * @param  {string|ArrayBuffer|Buffer} elem        [description]
 * @param  {Number|UINT32|UINT64} [seed=getDefaultSeed()] If the seed is UINT32 make sure to set the length to 32
 * @param  {Number} [length=64] the version used 32 or 64, default: 64
 * @return {Number}  the hash as unsigned int
 */
function hashAsInt (elem, seed = getDefaultSeed(), length = 64) {
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
 * Return a hash as a string
 * @param  {string|ArrayBuffer|Buffer} elem        [description]
 * @param  {Number|UINT32|UINT64} [seed=getDefaultSeed()] If the seed is UINT32 make sure to set the length to 32
 * @param  {Number} [base=16]   the base in which the string will be returned, default: 16
 * @param  {Number} [length=64] the version used 32 or 64, default: 64
 * @return {string} the hash as string
 */
function hashAsString (elem, seed = getDefaultSeed(), base = 16, length = 64) {
  let hash
  switch (length) {
    case 32:
      hash = XXH.h32(elem, seed).toString(base)
      break
    case 64:
      hash = XXH.h64(elem, seed).toString(base)
      break
    default:
      hash = XXH.h64(elem, seed).toString(base)
      break
  }
  if (hash.length < base) {
    hash = '0'.repeat(base - hash.length) + hash
  }
  return hash
}

/**
 * Return a hash as an unsigned int and as string
 * @param  {string|ArrayBuffer|Buffer} elem        [description]
 * @param  {Number|UINT32|UINT64} [seed=getDefaultSeed()] If the seed is UINT32 make sure to set the length to 32
 * @param  {Number} [base=16]   the base in which the string will be returned, default: 16
 * @param  {Number} [length=64] the version used 32 or 64, default: 64
 * @return {Object}             A hash with its number and string version
 */
function hashIntAndString (elem, seed = getDefaultSeed(), base = 16, length = 64) {
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
  let string = hash.toString(base)
  if (string.length < base) {
    string = '0'.repeat(base - string.length) + string
  }
  return { int: hash.toNumber(), string }
}

/**
 * Return the seed used in the package by default
 * @return {Number}
 */
function getDefaultSeed () {
  return 0x1234567890
}

module.exports = {
  getDefaultSeed,
  hashAsInt,
  hashAsString,
  hashIntAndString,
  getDistinctIndices,
  allInOneHashTwice,
  isEmptyBuffer,
  xorBuffer,
  allocateArray,
  hashTwice,
  doubleHashing,
  randomInt
}
